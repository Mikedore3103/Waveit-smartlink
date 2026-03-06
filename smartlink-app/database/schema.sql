-- PostgreSQL schema for Music Smartlink app
-- Enables gen_random_uuid() for UUID primary keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_slug TEXT UNIQUE,
  bio TEXT,
  avatar_image TEXT,
  profile_theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  cover_image TEXT,
  slug TEXT NOT NULL UNIQUE,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  share_title TEXT,
  share_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_links_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_links (
  id BIGSERIAL PRIMARY KEY,
  link_id UUID NOT NULL,
  platform_name TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  CONSTRAINT fk_platform_links_link
    FOREIGN KEY (link_id)
    REFERENCES links(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics (
  id BIGSERIAL PRIMARY KEY,
  link_id UUID NOT NULL,
  platform_clicked TEXT,
  country TEXT,
  device TEXT,
  referrer TEXT,
  ip_address INET,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_analytics_link
    FOREIGN KEY (link_id)
    REFERENCES links(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestone_notifications (
  id BIGSERIAL PRIMARY KEY,
  link_id UUID NOT NULL,
  milestone_clicks INTEGER NOT NULL,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_milestone_link
    FOREIGN KEY (link_id)
    REFERENCES links(id)
    ON DELETE CASCADE,
  CONSTRAINT uq_milestone UNIQUE (link_id, milestone_clicks)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_slug TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_theme JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_email TEXT;
ALTER TABLE links ADD COLUMN IF NOT EXISTS theme JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE links ADD COLUMN IF NOT EXISTS share_title TEXT;
ALTER TABLE links ADD COLUMN IF NOT EXISTS share_description TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS utm_content TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_artist_slug'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT uq_users_artist_slug UNIQUE (artist_slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
CREATE INDEX IF NOT EXISTS idx_users_artist_slug ON users(artist_slug);
CREATE INDEX IF NOT EXISTS idx_platform_links_link_id ON platform_links(link_id);
CREATE INDEX IF NOT EXISTS idx_analytics_link_id ON analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_link_created_at ON analytics(link_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_link_platform ON analytics(link_id, platform_clicked);
CREATE INDEX IF NOT EXISTS idx_analytics_link_country ON analytics(link_id, country);
CREATE INDEX IF NOT EXISTS idx_analytics_link_device ON analytics(link_id, device);
CREATE INDEX IF NOT EXISTS idx_analytics_link_utm_campaign ON analytics(link_id, utm_campaign);
