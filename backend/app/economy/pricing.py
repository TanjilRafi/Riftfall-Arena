"""Pure supply/demand math. No I/O, no state, no clock."""

from __future__ import annotations

from app.economy.models import EPSILON, CommodityState, RegionBatch, RegionSnapshot

PRICE_FLOOR = 0.25
PRICE_CEILING = 6.0


def settle_region(
    snapshot: RegionSnapshot,
    batch: RegionBatch | None,
    *,
    elasticity: float = 0.6,
    smoothing: float = 0.25,
    decay: float = 0.02,
    now: float,
) -> tuple[RegionSnapshot, tuple[str, ...]]:
    """Apply a tick's aggregated deltas and re-price every commodity in the region."""

    changed: list[str] = []
    commodities: dict[str, CommodityState] = {}

    goods = set(snapshot.commodities)
    if batch is not None:
        goods |= set(batch.supply_delta) | set(batch.demand_delta)

    for good in goods:
        current = snapshot.commodities.get(good) or CommodityState(good, supply=0.0, demand=0.0)

        supply_delta = batch.supply_delta.get(good, 0.0) if batch else 0.0
        demand_delta = batch.demand_delta.get(good, 0.0) if batch else 0.0

        adjusted = current.with_deltas(supply_delta, demand_delta)
        adjusted = _decay_demand(adjusted, decay)

        target = _target_multiplier(adjusted, elasticity)
        multiplier = _lerp(adjusted.price_multiplier, target, smoothing)

        settled = CommodityState(
            good=good,
            supply=adjusted.supply,
            demand=adjusted.demand,
            price_multiplier=multiplier,
        )
        commodities[good] = settled

        if _materially_different(current, settled):
            changed.append(good)

    settled_snapshot = RegionSnapshot(
        region_id=snapshot.region_id,
        commodities=commodities,
        revision=snapshot.revision + 1,
        updated_at=now,
    )
    return settled_snapshot, tuple(sorted(changed))


def _materially_different(before: CommodityState, after: CommodityState, tolerance: float = 1e-4) -> bool:
    """Suppresses broadcast churn from smoothing that never fully settles."""
    return (
        abs(before.price_multiplier - after.price_multiplier) > tolerance
        or abs(before.supply - after.supply) > tolerance
        or abs(before.demand - after.demand) > tolerance
    )


def _target_multiplier(state: CommodityState, elasticity: float) -> float:
    pressure = state.demand / max(state.supply, EPSILON)
    return _clamp(pressure**elasticity, PRICE_FLOOR, PRICE_CEILING)


def _decay_demand(state: CommodityState, decay: float) -> CommodityState:
    """Unmet demand bleeds off so a single collapsed wall does not inflate masonry forever."""
    return CommodityState(
        good=state.good,
        supply=state.supply,
        demand=state.demand * (1.0 - decay),
        price_multiplier=state.price_multiplier,
    )


def _lerp(current: float, target: float, alpha: float) -> float:
    return current + (target - current) * alpha


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))
