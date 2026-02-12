SQL Table: user_media
-- user_media table (one active per kind enforced by app logic)
CREATE TABLE IF NOT EXISTS user_media (
  media_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('profile_photo', 'resume', 'showreel')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  resource_type TEXT NOT NULL CHECK (resource_type IN ('image', 'raw', 'video')),
  public_id TEXT NOT NULL,
  secure_url TEXT NOT NULL,
  format TEXT,
  bytes INTEGER,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_media_user_kind_active
  ON user_media(user_id, kind, is_active);