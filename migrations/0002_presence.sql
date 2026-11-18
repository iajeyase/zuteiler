-- Last time the person's browser asked for the room (used for the online dot).
ALTER TABLE participants ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0;
