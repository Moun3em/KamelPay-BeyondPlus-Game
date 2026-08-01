-- Additive: Event Mode flag (self-driving timeline + auto announcements).
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS event_mode BOOLEAN NOT NULL DEFAULT FALSE;
