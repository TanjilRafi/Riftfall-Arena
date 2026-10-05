"""Value objects shared by the economy simulation.

Everything here is immutable and free of I/O so the tick math can be unit tested
without a database, a cache, or an event loop.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from enum import Enum

EPSILON = 1e-6


class EventKind(str, Enum):
    STRUCTURE_COLLAPSED = "structure_collapsed"
    RESOURCE_EXTRACTED = "resource_extracted"
    TRADE_SETTLED = "trade_settled"
    UNIT_MIGRATION = "unit_migration"


@dataclass(frozen=True, slots=True)
class WorldEvent:
    """One thing that happened in a UE5 dedicated server instance."""

    region_id: str
    kind: EventKind
    good: str
    magnitude: float
    faction_id: int | None = None
    occurred_at: float = 0.0


@dataclass(frozen=True, slots=True)
class CommodityState:
    good: str
    supply: float
    demand: float
    price_multiplier: float = 1.0

    def with_deltas(self, supply_delta: float, demand_delta: float) -> CommodityState:
        return replace(
            self,
            supply=max(self.supply + supply_delta, 0.0),
            demand=max(self.demand + demand_delta, 0.0),
        )


@dataclass(frozen=True, slots=True)
class RegionSnapshot:
    region_id: str
    commodities: dict[str, CommodityState]
    revision: int = 0
    updated_at: float = 0.0


@dataclass(slots=True)
class RegionBatch:
    """Aggregated events for one region and one tick.

    A thousand individual bandit movements collapse into a handful of float sums here,
    which is the whole point: the simulation never walks per-agent state.
    """

    region_id: str
    supply_delta: dict[str, float] = field(default_factory=dict)
    demand_delta: dict[str, float] = field(default_factory=dict)
    territory_delta: dict[int, float] = field(default_factory=dict)
    event_count: int = 0

    def absorb(self, event: WorldEvent) -> None:
        self.event_count += 1

        if event.kind is EventKind.STRUCTURE_COLLAPSED:
            self.demand_delta[event.good] = (
                self.demand_delta.get(event.good, 0.0) + event.magnitude
            )
        elif event.kind is EventKind.RESOURCE_EXTRACTED:
            self.supply_delta[event.good] = (
                self.supply_delta.get(event.good, 0.0) + event.magnitude
            )
        elif event.kind is EventKind.TRADE_SETTLED:
            self.supply_delta[event.good] = (
                self.supply_delta.get(event.good, 0.0) - event.magnitude
            )
        elif event.kind is EventKind.UNIT_MIGRATION and event.faction_id is not None:
            self.territory_delta[event.faction_id] = (
                self.territory_delta.get(event.faction_id, 0.0) + event.magnitude
            )

    def merge(self, other: RegionBatch) -> None:
        for good, value in other.supply_delta.items():
            self.supply_delta[good] = self.supply_delta.get(good, 0.0) + value
        for good, value in other.demand_delta.items():
            self.demand_delta[good] = self.demand_delta.get(good, 0.0) + value
        for faction, value in other.territory_delta.items():
            self.territory_delta[faction] = self.territory_delta.get(faction, 0.0) + value
        self.event_count += other.event_count


@dataclass(frozen=True, slots=True)
class RegionTickResult:
    region_id: str
    snapshot: RegionSnapshot
    changed_goods: tuple[str, ...]
    events_absorbed: int
