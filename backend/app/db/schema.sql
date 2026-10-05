-- Persistent macro-state for the Vance world simulation.

CREATE TABLE IF NOT EXISTS market_saturation (
    region_id        TEXT        NOT NULL,
    good             TEXT        NOT NULL,
    supply           DOUBLE PRECISION NOT NULL DEFAULT 0,
    demand           DOUBLE PRECISION NOT NULL DEFAULT 0,
    price_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0
        CHECK (price_multiplier > 0),
    -- Monotonic per region; save_region uses it to drop out-of-order tick writes.
    revision         BIGINT      NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (region_id, good)
);

CREATE INDEX IF NOT EXISTS market_saturation_stale_idx
    ON market_saturation (updated_at);


CREATE TABLE IF NOT EXISTS faction_territory (
    region_id      TEXT        NOT NULL,
    faction_id     INTEGER     NOT NULL,
    control_weight DOUBLE PRECISION NOT NULL DEFAULT 0
        CHECK (control_weight >= 0),
    hostility      SMALLINT    NOT NULL DEFAULT 0
        CHECK (hostility BETWEEN -100 AND 100),
    border_hash    TEXT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (region_id, faction_id)
);

CREATE INDEX IF NOT EXISTS faction_territory_faction_idx
    ON faction_territory (faction_id, control_weight DESC);


CREATE TABLE IF NOT EXISTS gemstone_purity_grid (
    node_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id     UUID        NOT NULL,
    region_id    TEXT        NOT NULL,
    element_tag  TEXT        NOT NULL,
    lattice      SMALLINT    NOT NULL CHECK (lattice BETWEEN 0 AND 9),
    stability    REAL        NOT NULL CHECK (stability BETWEEN 0 AND 1),
    purity       REAL        NOT NULL CHECK (purity BETWEEN 0 AND 1),
    refine_count INTEGER     NOT NULL DEFAULT 0,
    -- Refining is destructive; a fractured node stays in the grid as sink evidence.
    fractured    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gemstone_owner_idx
    ON gemstone_purity_grid (owner_id) WHERE NOT fractured;

CREATE INDEX IF NOT EXISTS gemstone_region_element_idx
    ON gemstone_purity_grid (region_id, element_tag);
