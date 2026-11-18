-- Optional wishes, typed when joining. Only the giver sees them, after the spin.
ALTER TABLE participants ADD COLUMN wishes TEXT NOT NULL DEFAULT '';
