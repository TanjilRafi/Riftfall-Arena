# Vance Arena — Base44 Dev Environment

## What this repo is

A 3D arena shooter game (`frontend/`, Three.js + Vite) paired with a macro-economy
simulation backend (`backend/`, FastAPI + Postgres + Redis) designed for an Unreal
Engine 5 game (`Source/`, C++ plugin that cannot run in a browser).

## Architecture

- **Game frontend** (`frontend/`) — Three.js 3D first-person shooter, served by Vite dev
  server on host port **3000** (container 5173). Live reload active. This is the preview
  entry point.
- **Backend API** (`backend/`) — FastAPI economy service on host port **8000** (container 8000).
  Postgres 16 + Redis 7 with a one-shot migration applying `schema.sql`.
- **UE5 plugin** (`Source/`) — C++ game code; not runnable in this environment.

## Running

`docker compose -f docker-compose.base44.yml up -d` starts everything:
postgres, redis, migrate (one-shot), api (backend), web (game).

The game installs npm deps on startup and runs `vite` with live reload.
The API installs pip deps and runs `uvicorn --reload`.

## Game controls

WASD move · Mouse look (pointer lock) · Click shoot · R reload · Shift sprint · Space jump

## Game architecture (frontend/src/)

- `main.js` — scene/camera/renderer setup, input handling, game loop
- `arena.js` — 3D map (floor, walls, cover), collision AABBs, spawn points
- `player.js` — FPS controller (movement, mouse look, jump, health, collision)
- `weapon.js` — shooting (raycast hitscan, muzzle flash, tracers, ammo, reload)
- `enemy.js` — enemy bots (AI chase, line-of-sight attacks, health bars, death anim)
- `hud.js` — HUD overlay (health, score, wave, ammo, hit markers, kill feed)
- `game.js` — game manager (state machine, wave spawning, scoring, game over)

## Building for itch.io

`cd frontend && npm run build` produces `frontend/dist/` — a static HTML5 build
uploadable to itch.io as a web game (playable in-browser).

## Backend verification

- `GET /docs` → Swagger UI (port 8000)
- `POST /events` → ingest gameplay events
- `GET /regions/{id}/prices` → computed prices after economy tick

## Tests

Backend: `cd backend && pip install -e .[dev] && pytest`
