"""Persistence boundary for the economy simulation.

The engine depends on this protocol, never on a driver, so the tick logic tests against
an in-memory fake and the storage layer can be swapped without touching the simulation.
"""

from __future__ import annotations

from typing import Protocol

from app.economy.models import RegionSnapshot


class EconomyRepository(Protocol):
    async def load_region(self, region_id: str) -> RegionSnapshot: ...

    async def save_region(self, snapshot: RegionSnapshot) -> None: ...

    async def regions_due(self, older_than_seconds: float) -> list[str]: ...

    async def apply_territory_delta(
        self, region_id: str, faction_deltas: dict[int, float]
    ) -> None: ...
