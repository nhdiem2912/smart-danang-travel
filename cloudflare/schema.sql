CREATE TABLE IF NOT EXISTS chat_limits (
  bucket TEXT PRIMARY KEY,
  used INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_limits_expiry ON chat_limits(expires_at);
