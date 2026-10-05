from __future__ import annotations

import asyncio

import pytest

from app.economy.loop import EconomyEngine
from app.economy.models import CommodityState, EventKind, RegionSnapshot, WorldEvent


class FakeRepository:
    def __init__(self, snapshot: RegionSnapshot) -> None:
        self.snapshot = snapshot
        self.saves: list[RegionSnapshot] = []
        self.territory_calls: list[tuple[str, dict[int, float]]] = []
        self.load_calls = 0
        self.load_gate: asyncio.Event | None = None

    async def load_region(self, region_id: str) -> RegionSnapshot:
        self.load_calls += 1
        if self.load_gate is not None:
            await self.load_gate.wait()
        return self.snapshot

    async def save_region(self, snapshot: RegionSnapshot) -> None:
        self.saves.append(snapshot)
        self.snapshot = snapshot

    async def regions_due(self, older_than_seconds: float) -> list[str]:
        return []

    async def apply_territory_delta(self, region_id: str, faction_deltas: dict[int, float]) -> None:
        self.territory_calls.append((region_id, dict(faction_deltas)))


class FakeCache:
    def __init__(self) -> None:
        self.entries: dict[str, RegionSnapshot] = {}
        self.invalidations: list[str] = []

    async def get_or_load(self, region_id, loader):
        cached = self.entries.get(region_id)
        if cached is not None:
            return cached
        snapshot = await loader(region_id)
        self.entries[region_id] = snapshot
        return snapshot

    async def put(self, snapshot: RegionSnapshot) -> None:
        self.entries[snapshot.region_id] = snapshot

    async def invalidate(self, region_id: str) -> None:
        self.invalidations.append(region_id)
        self.entries.pop(region_id, None)


def make_engine(snapshot: RegionSnapshot) -> tuple[EconomyEngine, FakeRepository, FakeCache]:
    repository = FakeRepository(snapshot)
    cache = FakeCache()
    engine = EconomyEngine(repository, cache, tick_interval=0.01)
    return engine, repository, cache


def snapshot_with(good: str, supply: float, demand: float) -> RegionSnapshot:
    return RegionSnapshot(
        region_id="ashmoor",
        commodities={good: CommodityState(good=good, supply=supply, demand=demand)},
    )


@pytest.mark.asyncio
async def test_collapsed_structure_raises_demand_and_price():
    engine, repository, _ = make_engine(snapshot_with("masonry", supply=100.0, demand=100.0))

    await engine.submit(
        [
            WorldEvent("ashmoor", EventKind.STRUCTURE_COLLAPSED, "masonry", 40.0)
            for _ in range(5)
        ]
    )
    await engine._run_tick()

    settled = repository.saves[-1].commodities["masonry"]
    assert settled.demand > 100.0
    assert settled.price_multiplier > 1.0


@pytest.mark.asyncio
async def test_bulk_migrations_collapse_into_one_territory_write():
    engine, repository, _ = make_engine(snapshot_with("grain", supply=50.0, demand=50.0))

    await engine.submit(
        [WorldEvent("ashmoor", EventKind.UNIT_MIGRATION, "grain", 1.0, faction_id=7)] * 500
    )
    await engine._run_tick()

    assert repository.territory_calls == [("ashmoor", {7: 500.0})]


@pytest.mark.asyncio
async def test_overlapping_ticks_coalesce_onto_one_task():
    engine, repository, _ = make_engine(snapshot_with("iron", supply=10.0, demand=10.0))
    repository.load_gate = asyncio.Event()

    first = engine._tick_region_deduped("ashmoor", None)
    second = engine._tick_region_deduped("ashmoor", None)
    assert first is second

    repository.load_gate.set()
    await first

    assert repository.load_calls == 1


@pytest.mark.asyncio
async def test_failed_region_requeues_its_batch_and_drops_cache():
    engine, repository, cache = make_engine(snapshot_with("iron", supply=10.0, demand=10.0))

    async def explode(_: RegionSnapshot) -> None:
        raise RuntimeError("connection reset")

    repository.save_region = explode

    await engine.submit([WorldEvent("ashmoor", EventKind.RESOURCE_EXTRACTED, "iron", 5.0)])
    await engine._run_tick()

    assert cache.invalidations == ["ashmoor"]
    assert "ashmoor" in engine._pending
    assert engine._pending["ashmoor"].supply_delta == {"iron": 5.0}
