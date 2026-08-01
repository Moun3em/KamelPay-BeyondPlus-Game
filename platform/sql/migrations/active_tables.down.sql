-- Rollback for the additive active_tables column (data loss acceptable only pre-event).
ALTER TABLE game_state DROP COLUMN IF EXISTS active_tables;
