CREATE TABLE IF NOT EXISTS rooms (
  code       TEXT PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'drawn'
  created_at INTEGER NOT NULL,
  drawn_at   INTEGER
);

CREATE TABLE IF NOT EXISTS participants (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code    TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  name_key     TEXT NOT NULL,               -- lower-case name, unique per room
  pass_salt    TEXT NOT NULL,
  pass_hash    TEXT NOT NULL,
  token_hash   TEXT NOT NULL,
  is_host      INTEGER NOT NULL DEFAULT 0,
  target_id    INTEGER,                     -- the person this one gives a gift to
  joined_at    INTEGER NOT NULL,
  failed       INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  UNIQUE (room_code, name_key)
);

CREATE INDEX IF NOT EXISTS idx_participants_token ON participants (token_hash);
