/* eslint-disable */
// Migration: is_featured, testimonials, advertisements (local mirror)
const fs = require('fs');
const envFile = fs.readFileSync('/app/.env', 'utf8');
envFile.split('\n').forEach((l) => {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});
const { Client } = require('pg');

const SQL = `
-- 1. Featured raffle
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_raffles_featured ON raffles(is_featured) WHERE is_featured = true;

-- 2. Testimonials (winner testimonies, admin moderated)
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, raffle_id)
);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);

-- 3. Advertisements (local mirror of Supabase schema, so admin project can push here later)
CREATE TABLE IF NOT EXISTS advertisements (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID,
  client_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'en cours',
  is_active BOOLEAN DEFAULT true,
  zone TEXT,
  inner_link TEXT,
  external_link TEXT,
  target TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ads_zone_active ON advertisements(zone, is_active, status);
`;

const SEED = `
-- Mark iPhone as featured
UPDATE raffles SET is_featured = true WHERE slug='iphone-15-pro-max';

-- Seed DefMaks zones if none exist
INSERT INTO advertisements (title, description, image_url, start_date, end_date, status, is_active, zone, external_link, target)
SELECT 'Meet DefMaks 2025 !', 'Découvrez l''écosystème DefMaks.', 'https://ucarecdn.com/3ce456eb-dde0-4acd-a56d-8dcc2cad8786/meetDefmaks.png', now() - interval '1 day', now() + interval '365 days', 'en cours', true, 'home', 'https://defmaks.com/', ARRAY['Punchy', 'ALL']
WHERE NOT EXISTS (SELECT 1 FROM advertisements WHERE zone='home' AND is_active=true);

INSERT INTO advertisements (title, description, image_url, start_date, end_date, status, is_active, zone, external_link, target)
SELECT 'Meet Lokko 2026 !', 'In-Read Banner Lokko & DefMaks', 'https://ucarecdn.com/6396e774-b7f5-4dbe-97de-85ffd257b3d7/-/preview/1000x384/', now() - interval '1 day', now() + interval '365 days', 'en cours', true, 'in_read', 'https://defmaks.com/', ARRAY['Punchy', 'ALL']
WHERE NOT EXISTS (SELECT 1 FROM advertisements WHERE zone='in_read' AND is_active=true);

INSERT INTO advertisements (title, description, image_url, start_date, end_date, status, is_active, zone, external_link, target)
SELECT 'Opportunité DefMaks', 'Inner Page Banner DefMaks', 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/', now() - interval '1 day', now() + interval '365 days', 'en cours', true, 'inner', 'https://defmaks.com/', ARRAY['Punchy', 'ALL']
WHERE NOT EXISTS (SELECT 1 FROM advertisements WHERE zone='inner' AND is_active=true);

INSERT INTO advertisements (title, description, image_url, start_date, end_date, status, is_active, zone, external_link, target)
SELECT 'Grand Tirage Punchy', 'Single Detail Page Banner', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80', now() - interval '1 day', now() + interval '365 days', 'en cours', true, 'single', 'https://defmaks.com/', ARRAY['Punchy', 'ALL']
WHERE NOT EXISTS (SELECT 1 FROM advertisements WHERE zone='single' AND is_active=true);

INSERT INTO advertisements (title, description, image_url, start_date, end_date, status, is_active, zone, external_link, target)
SELECT 'DefMaks Full Width', 'Large Page Banner', 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/', now() - interval '1 day', now() + interval '365 days', 'en cours', true, 'page', 'https://defmaks.com/', ARRAY['Punchy', 'ALL']
WHERE NOT EXISTS (SELECT 1 FROM advertisements WHERE zone='page' AND is_active=true);

INSERT INTO advertisements (title, description, image_url, start_date, end_date, status, is_active, zone, external_link, target)
SELECT 'Lokko DefMaks Secondary', 'Void Secondary Banner', 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/', now() - interval '1 day', now() + interval '365 days', 'en cours', true, 'void', 'http://lokko.defmaks.com/', ARRAY['Punchy', 'ALL']
WHERE NOT EXISTS (SELECT 1 FROM advertisements WHERE zone='void' AND is_active=true);
`;

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    console.log('✓ Connected to Neon');
    await client.query(SQL);
    console.log('✓ Migration applied');
    await client.query(SEED);
    console.log('✓ Seed OK');
    const { rows: featured } = await client.query('SELECT title, is_featured FROM raffles WHERE is_featured=true');
    console.log('Featured:', featured);
    const { rows: ads } = await client.query('SELECT id, title, zone FROM advertisements WHERE zone=$1', ['home']);
    console.log('Home ads:', ads);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
