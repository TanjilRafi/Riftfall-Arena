"""Redis-backed snapshot cache.

The simulation reads region state far more often than it writes it, so snapshots are
cached with a short TTL and invalidated on write. A cache failure must never take the
tick down: every read degrades to a repository read, every write to a no-op.
"""

from __future__ import annotations

import json
import logging
from typing import Awaitable, Callable

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.economy.models import CommodityState, RegionSnapshot

logger = logging.getLogger(__name__)

_KEY_PREFIX = "vance:region"


class RegionCache:
    def __init__(self, redis: Redis, ttl_seconds: int = 30) -> None:
        self._redis = redis
        self._ttl = ttl_seconds

    async def get_or_load(
        self,
        region_id: str,
        loader: Callable[[str], Awaitable[RegionSnapshot]],
    ) -> RegionSnapshot:
        cached = await self._get(region_id)
        if cached is not None:
            return cached

        snapshot = await loader(region_id)
        await self.put(snapshot)
        return snapshot

    async def put(self, snapshot: RegionSnapshot) -> None:
        try:
            await self._redis.set(
                _key(snapshot.region_id), _encode(snapshot), ex=self._ttl
            )
        except RedisError:
            logger.warning("cache write failed for %s", snapshot.region_id, exc_info=True)

    async def invalidate(self, region_id: str) -> None:
        try:
            await self._redis.delete(_key(region_id))
        except RedisError:
            logger.warning("cache invalidate failed for %s", region_id, exc_info=True)

    async def _get(self, region_id: str) -> RegionSnapshot | None:
        try:
            raw = await self._redis.get(_key(region_id))
        except RedisError:
            logger.warning("cache read failed for %s", region_id, exc_info=True)
            return None

        if raw is None:
            return None

        try:
            return _decode(raw)
        except (ValueError, KeyError, TypeError):
            logger.warning("discarding malformed cache entry for %s", region_id, exc_info=True)
            await self.invalidate(region_id)
            return None


def _key(region_id: str) -> str:
    return f"{_KEY_PREFIX}:{region_id}"


def _encode(snapshot: RegionSnapshot) -> str:
    return json.dumps(
        {
            "region_id": snapshot.region_id,
            "revision": snapshot.revision,
            "updated_at": snapshot.updated_at,
            "commodities": [
                {
                    "good": state.good,
                    "supply": state.supply,
                    "demand": state.demand,
                    "price_multiplier": state.price_multiplier,
                }
                for state in snapshot.commodities.values()
            ],
        }
    )


def _decode(raw: str | bytes) -> RegionSnapshot:
    payload = json.loads(raw)
    commodities = {
        entry["good"]: CommodityState(
            good=entry["good"],
            supply=float(entry["supply"]),
            demand=float(entry["demand"]),
            price_multiplier=float(entry["price_multiplier"]),
        )
        for entry in payload["commodities"]
    }
    return RegionSnapshot(
        region_id=payload["region_id"],
        commodities=commodities,
        revision=int(payload["revision"]),
        updated_at=float(payload["updated_at"]),
    )
