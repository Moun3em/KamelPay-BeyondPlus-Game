-- Five-Corner Compliance Simulation — PRD §3 schema
-- Seeded at deploy from cards_seed.json. cards never mutated during play.

CREATE TABLE IF NOT EXISTS cards (
  card_id            TEXT PRIMARY KEY,
  qr                 TEXT UNIQUE NOT NULL,
  deck               TEXT NOT NULL,
  archetype          TEXT NOT NULL,
  owner_table        INT  NOT NULL,
  validity           TEXT,
  correct_action     TEXT,
  penalty_aed        INT DEFAULT 0,
  locked_until_phase TEXT,
  payload            JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  table_no           INT PRIMARY KEY,
  pin                TEXT UNIQUE NOT NULL,
  display_name       TEXT,
  capital_aed        BIGINT NOT NULL DEFAULT 1000000,
  ledger_closed      BOOLEAN DEFAULT FALSE,
  outage_active      BOOLEAN DEFAULT FALSE,
  outage_started_at  TIMESTAMPTZ,
  outage_resolved_at TIMESTAMPTZ,
  green_unlocked     BOOLEAN DEFAULT FALSE,
  badges             TEXT[] DEFAULT '{}',
  penalty_cap_aed    INT,
  impl_immunity      BOOLEAN DEFAULT FALSE,
  final_multiplier   BOOLEAN DEFAULT FALSE,
  outage_loss_aed    BIGINT NOT NULL DEFAULT 0,
  outage_wrong_tries INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS devices (
  device_id          UUID PRIMARY KEY,
  table_no           INT REFERENCES teams(table_no),
  role               TEXT,
  last_seen          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (table_no, role)
);

CREATE TABLE IF NOT EXISTS events (
  id                 BIGSERIAL PRIMARY KEY,
  at                 TIMESTAMPTZ DEFAULT now(),
  table_no           INT NOT NULL,
  actor_role         TEXT,
  kind               TEXT NOT NULL,
  card_id            TEXT REFERENCES cards(card_id),
  delta_aed          BIGINT NOT NULL DEFAULT 0,
  meta               JSONB,
  idempotency_key    TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS card_positions (
  card_id            TEXT PRIMARY KEY REFERENCES cards(card_id),
  held_by_table      INT NOT NULL,
  state              TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS game_state (
  id                 INT PRIMARY KEY DEFAULT 1,
  phase              TEXT DEFAULT 'LOBBY',
  clock_started_at   TIMESTAMPTZ,
  clock_paused_at    TIMESTAMPTZ,
  paused_ms_total    INT DEFAULT 0,
  narrative_banner   TEXT
);

CREATE INDEX IF NOT EXISTS events_table_idx ON events(table_no);
CREATE INDEX IF NOT EXISTS events_kind_idx ON events(kind);
CREATE INDEX IF NOT EXISTS devices_table_idx ON devices(table_no);
CREATE INDEX IF NOT EXISTS card_positions_held_idx ON card_positions(held_by_table);
