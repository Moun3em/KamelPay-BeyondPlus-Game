BEGIN;

DROP TABLE IF EXISTS operations;
DROP INDEX IF EXISTS teams_outage_schedule_idx;
ALTER TABLE teams DROP COLUMN IF EXISTS outage_extra_hint;
ALTER TABLE teams DROP COLUMN IF EXISTS outage_scheduled_at;

COMMIT;
