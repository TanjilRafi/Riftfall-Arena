"""asyncpg implementation of EconomyRepository."""

from __future__ import annotations

import asyncpg

from app.economy.models import CommodityState, RegionSnapshot


class PostgresEconomyRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def load_region(self, region_id: str) -> RegionSnapshot:
        rows = await self._pool.fetch(
            """
            SELECT good, supply, demand, price_multiplier, revision,
                   EXTRACT(EPOCH FROM updated_at) AS updated_at
            FROM market_saturation
            WHERE region_id = $1
            """,
            region_id,
        )

        commodities = {
            row["good"]: CommodityState(
                good=row["good"],
                supply=float(row["supply"]),
                demand=float(row["demand"]),
                price_multiplier=float(row["price_multiplier"]),
            )
            for row in rows
        }

        return RegionSnapshot(
            region_id=region_id,
            commodities=commodities,
            revision=max((int(row["revision"]) for row in rows), default=0),
            updated_at=max((float(row["updated_at"]) for row in rows), default=0.0),
        )

    async def save_region(self, snapshot: RegionSnapshot) -> None:
        records = [
            (
                snapshot.region_id,
                state.good,
                state.supply,
                state.demand,
                state.price_multiplier,
                snapshot.revision,
            )
            for state in snapshot.commodities.values()
        ]

        async with self._pool.acquire() as connection:
            async with connection.transaction():
                await connection.executemany(
                    """
                    INSERT INTO market_saturation
                        (region_id, good, supply, demand, price_multiplier, revision, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (region_id, good) DO UPDATE SET
                        supply = EXCLUDED.supply,
                        demand = EXCLUDED.demand,
                        price_multiplier = EXCLUDED.price_multiplier,
                        revision = EXCLUDED.revision,
                        updated_at = NOW()
                    WHERE market_saturation.revision < EXCLUDED.revision
                    """,
                    records,
                )

    async def regions_due(self, older_than_seconds: float) -> list[str]:
        rows = await self._pool.fetch(
            """
            SELECT DISTINCT region_id
            FROM market_saturation
            WHERE updated_at < NOW() - make_interval(secs => $1)
            """,
            older_than_seconds,
        )
        return [row["region_id"] for row in rows]

    async def apply_territory_delta(
        self, region_id: str, faction_deltas: dict[int, float]
    ) -> None:
        if not faction_deltas:
            return

        records = [
            (region_id, faction_id, delta) for faction_id, delta in faction_deltas.items()
        ]

        async with self._pool.acquire() as connection:
            async with connection.transaction():
                await connection.executemany(
                    """
                    INSERT INTO faction_territory
                        (region_id, faction_id, control_weight, hostility, updated_at)
                    VALUES ($1, $2, GREATEST($3, 0), 0, NOW())
                    ON CONFLICT (region_id, faction_id) DO UPDATE SET
                        control_weight = GREATEST(
                            faction_territory.control_weight + EXCLUDED.control_weight, 0),
                        updated_at = NOW()
                    """,
                    records,
                )
