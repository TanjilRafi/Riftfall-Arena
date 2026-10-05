"""Ingest and query surface for the macro-economy service.

The UE5 dedicated server holds one WebSocket open and streams gameplay events; it never
waits on the simulation. Prices are pulled over REST on a slower cadence.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field
from redis.asyncio import Redis

from app.core.cache import RegionCache
from app.core.config import Settings, get_settings
from app.db.postgres_repository import PostgresEconomyRepository
from app.economy.loop import EconomyEngine
from app.economy.models import EventKind, WorldEvent

logger = logging.getLogger(__name__)


class WorldEventIn(BaseModel):
    region_id: str = Field(min_length=1, max_length=64)
    kind: EventKind
    good: str = Field(min_length=1, max_length=64)
    magnitude: float = Field(ge=0.0, le=1e6)
    faction_id: int | None = Field(default=None, ge=0)
    occurred_at: float = 0.0

    def to_domain(self) -> WorldEvent:
        return WorldEvent(
            region_id=self.region_id,
            kind=self.kind,
            good=self.good,
            magnitude=self.magnitude,
            faction_id=self.faction_id,
            occurred_at=self.occurred_at,
        )


class EventBatchIn(BaseModel):
    events: list[WorldEventIn] = Field(max_length=1024)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()

    pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=settings.db_pool_min_size,
        max_size=settings.db_pool_max_size,
    )
    redis = Redis.from_url(settings.redis_url, decode_responses=True)

    engine = EconomyEngine(
        repository=PostgresEconomyRepository(pool),
        cache=RegionCache(redis, ttl_seconds=settings.cache_ttl_seconds),
        tick_interval=settings.tick_interval_seconds,
        idle_refresh_seconds=settings.idle_refresh_seconds,
    )

    app.state.engine = engine
    app.state.pool = pool
    runner = asyncio.create_task(engine.run(), name="economy-engine")

    try:
        yield
    finally:
        engine.stop()
        runner.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await runner
        await redis.aclose()
        await pool.close()


app = FastAPI(title="Vance Macro-Economy", lifespan=lifespan)


@app.post("/events", status_code=status.HTTP_202_ACCEPTED)
async def ingest_events(batch: EventBatchIn) -> dict[str, int]:
    await app.state.engine.submit(event.to_domain() for event in batch.events)
    return {"accepted": len(batch.events)}


@app.get("/regions/{region_id}/prices")
async def region_prices(region_id: str) -> dict[str, float]:
    row = await app.state.pool.fetch(
        "SELECT good, price_multiplier FROM market_saturation WHERE region_id = $1",
        region_id,
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unknown region")

    return {record["good"]: float(record["price_multiplier"]) for record in row}


@app.websocket("/ws/server-events")
async def server_event_socket(websocket: WebSocket) -> None:
    settings: Settings = get_settings()
    token = websocket.query_params.get("token", "")

    if not settings.server_ingest_token or not secrets.compare_digest(
        token, settings.server_ingest_token
    ):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    try:
        while True:
            payload = await websocket.receive_json()
            batch = EventBatchIn.model_validate(payload)
            await app.state.engine.submit(event.to_domain() for event in batch.events)
    except WebSocketDisconnect:
        logger.info("dedicated server disconnected from event socket")
    except ValueError:
        logger.warning("rejecting malformed event frame", exc_info=True)
        await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA)
