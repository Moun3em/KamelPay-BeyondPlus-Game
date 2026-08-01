-- Additive: runtime-scoped active table count (3–10). Existing rows get 10.
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS active_tables INT NOT NULL DEFAULT 10;
