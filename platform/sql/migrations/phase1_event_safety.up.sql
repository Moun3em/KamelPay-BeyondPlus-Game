BEGIN;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS outage_scheduled_at TIMESTAMPTZ;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS outage_extra_hint BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS teams_outage_schedule_idx ON teams(outage_scheduled_at)
  WHERE outage_scheduled_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS operations (
  idempotency_key     TEXT PRIMARY KEY,
  scope               TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  response            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

COMMIT;
