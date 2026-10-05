"""The macro-economy tick.

Three invariants hold this together:

1. Events are aggregated per region before any math runs, so a thousand agent moves
   cost one region update rather than a thousand.
2. A region is never simulated concurrently with itself. Overlapping requests coalesce
   onto the in-flight task, and events that arrive mid-tick are requeued, not dropped.
3. One region failing is not the tick failing. Failures are logged, the region's cache
   entry is invalidated, and the next tick retries from persisted state.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable, Iterable
from typing import Protocol

from app.economy.models import RegionBatch, RegionSnapshot, RegionTickResult, WorldEvent
from app.economy.pricing import settle_region
from app.economy.repository import EconomyRepository

logger = logging.getLogger(__name__)


class SnapshotCache(Protocol):
    async def get_or_load(
        self,
        region_id: str,
        loader: Callable[[str], Awaitable[RegionSnapshot]],
    ) -> RegionSnapshot: ...

    async def put(self, snapshot: RegionSnapshot) -> None: ...

    async def invalidate(self, region_id: str) -> None: ...


class EconomyEngine:
    def __init__(
        self,
        repository: EconomyRepository,
        cache: SnapshotCache,
        *,
        tick_interval: float = 5.0,
        idle_refresh_seconds: float = 300.0,
    ) -> None:
        self._repository = repository
        self._cache = cache
        self._tick_interval = tick_interval
        self._idle_refresh_seconds = idle_refresh_seconds

        self._pending: dict[str, RegionBatch] = {}
        self._pending_lock = asyncio.Lock()
        self._in_flight: dict[str, asyncio.Task[RegionTickResult]] = {}
        self._requeues: set[asyncio.Task[None]] = set()
        self._stopping = asyncio.Event()

    async def submit(self, events: Iterable[WorldEvent]) -> None:
        """Ingest events from a UE5 dedicated server. Cheap, non-blocking, aggregate-only."""
        async with self._pending_lock:
            for event in events:
                batch = self._pending.get(event.region_id)
                if batch is None:
                    batch = RegionBatch(region_id=event.region_id)
                    self._pending[event.region_id] = batch
                batch.absorb(event)

    async def run(self) -> None:
        while not self._stopping.is_set():
            started = time.monotonic()
            try:
                await self._run_tick()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("economy tick failed wholesale; continuing")

            await self._sleep_remaining(started)

    def stop(self) -> None:
        self._stopping.set()

    async def _run_tick(self) -> None:
        batches = await self._drain_pending()
        region_ids = set(batches) | set(await self._idle_regions())

        if not region_ids:
            return

        tasks = [self._tick_region_deduped(rid, batches.get(rid)) for rid in region_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        settled = sum(1 for result in results if isinstance(result, RegionTickResult))
        logger.debug("tick settled %d/%d regions", settled, len(results))

    async def _drain_pending(self) -> dict[str, RegionBatch]:
        async with self._pending_lock:
            drained = self._pending
            self._pending = {}
            return drained

    async def _idle_regions(self) -> list[str]:
        try:
            return await self._repository.regions_due(self._idle_refresh_seconds)
        except Exception:
            logger.exception("could not list idle regions; ticking event-driven regions only")
            return []

    def _tick_region_deduped(
        self, region_id: str, batch: RegionBatch | None
    ) -> asyncio.Future[RegionTickResult]:
        """Coalesce onto an in-flight tick rather than simulating a region twice."""
        existing = self._in_flight.get(region_id)
        if existing is not None and not existing.done():
            if batch is not None:
                requeue = asyncio.create_task(self._requeue(batch))
                self._requeues.add(requeue)
                requeue.add_done_callback(self._requeues.discard)
            return existing

        task = asyncio.create_task(
            self._tick_region(region_id, batch), name=f"economy-tick:{region_id}"
        )
        self._in_flight[region_id] = task
        task.add_done_callback(lambda _, rid=region_id: self._in_flight.pop(rid, None))
        return task

    async def _requeue(self, batch: RegionBatch) -> None:
        """Events that raced an in-flight tick are folded into the next one."""
        async with self._pending_lock:
            existing = self._pending.get(batch.region_id)
            if existing is None:
                self._pending[batch.region_id] = batch
            else:
                existing.merge(batch)

    async def _tick_region(self, region_id: str, batch: RegionBatch | None) -> RegionTickResult:
        try:
            snapshot = await self._cache.get_or_load(region_id, self._repository.load_region)

            settled, changed = settle_region(snapshot, batch, now=time.time())

            await self._repository.save_region(settled)
            await self._cache.put(settled)

            if batch is not None and batch.territory_delta:
                await self._repository.apply_territory_delta(region_id, batch.territory_delta)

            return RegionTickResult(
                region_id=region_id,
                snapshot=settled,
                changed_goods=changed,
                events_absorbed=batch.event_count if batch else 0,
            )
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("region tick failed: %s", region_id)
            await self._cache.invalidate(region_id)
            if batch is not None:
                await self._requeue(batch)
            raise

    async def _sleep_remaining(self, started: float) -> None:
        elapsed = time.monotonic() - started
        if elapsed > self._tick_interval:
            logger.warning("tick overran budget: %.2fs > %.2fs", elapsed, self._tick_interval)
            return

        try:
            await asyncio.wait_for(
                self._stopping.wait(), timeout=self._tick_interval - elapsed
            )
        except asyncio.TimeoutError:
            pass
