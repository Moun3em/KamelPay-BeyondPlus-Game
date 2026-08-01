-- Rollback for the additive event_mode column.
ALTER TABLE game_state DROP COLUMN IF EXISTS event_mode;
