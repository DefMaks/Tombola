/* eslint-disable */
// Neon Postgres — Create procedures + seed. Schema already exists.
const fs = require('fs');
const envFile = fs.readFileSync('/app/.env', 'utf8');
envFile.split('\n').forEach((l) => {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});
const { Client } = require('pg');

const PROCEDURES = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS fulfill_raffle_tickets(UUID, UUID, UUID, INT);
DROP FUNCTION IF EXISTS execute_fair_raffle_draw(UUID, TEXT);

-- fulfill_raffle_tickets: atomic booking with FOR UPDATE lock
CREATE OR REPLACE FUNCTION fulfill_raffle_tickets(
  p_raffle_id UUID,
  p_user_id UUID,
  p_transaction_id UUID,
  p_quantity INT
) RETURNS TABLE(ticket_id UUID, ticket_number INT) AS $$
DECLARE
  v_current INT;
  v_max INT;
  v_status raffle_status;
  i INT;
  v_new_id UUID;
  v_new_num INT;
BEGIN
  SELECT tickets_sold, max_tickets, status
    INTO v_current, v_max, v_status
  FROM raffles WHERE id = p_raffle_id FOR UPDATE;

  IF v_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Raffle not active (status=%)', v_status;
  END IF;

  IF v_current + p_quantity > v_max THEN
    RAISE EXCEPTION 'Not enough tickets left (available=%)', (v_max - v_current);
  END IF;

  FOR i IN 1..p_quantity LOOP
    v_new_num := v_current + i;
    INSERT INTO tickets (raffle_id, user_id, transaction_id, ticket_number, status, purchased_at)
    VALUES (p_raffle_id, p_user_id, p_transaction_id, v_new_num, 'CONFIRMED', now())
    RETURNING id INTO v_new_id;
    ticket_id := v_new_id;
    ticket_number := v_new_num;
    RETURN NEXT;
  END LOOP;

  UPDATE raffles SET tickets_sold = v_current + p_quantity, updated_at = now() WHERE id = p_raffle_id;

  -- Auto-move to PENDING_DRAW when full
  IF (v_current + p_quantity) >= v_max THEN
    UPDATE raffles SET status = 'PENDING_DRAW' WHERE id = p_raffle_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- execute_fair_raffle_draw: SHA-256 fair draw (works with actual tickets)
CREATE OR REPLACE FUNCTION execute_fair_raffle_draw(
  p_raffle_id UUID,
  p_seed_prefix TEXT DEFAULT NULL
) RETURNS TABLE(winning_ticket_number INT, winning_ticket_id UUID, seed TEXT, hash_hex TEXT) AS $$
DECLARE
  v_tickets_sold INT;
  v_actual_count INT;
  v_seed TEXT;
  v_hash TEXT;
  v_hash_int NUMERIC;
  v_offset INT;
  v_winning_num INT;
  v_winning_id UUID;
BEGIN
  SELECT tickets_sold INTO v_tickets_sold FROM raffles WHERE id = p_raffle_id FOR UPDATE;
  SELECT COUNT(*) INTO v_actual_count FROM tickets WHERE raffle_id = p_raffle_id AND status = 'CONFIRMED';

  IF v_actual_count = 0 THEN
    RAISE EXCEPTION 'No confirmed tickets, cannot draw';
  END IF;

  v_seed := COALESCE(p_seed_prefix, 'DEFMAKS_RAFFLE') || '|' ||
            p_raffle_id::text || '|' ||
            v_actual_count::text || '|' ||
            extract(epoch from now())::text;

  v_hash := encode(digest(v_seed, 'sha256'), 'hex');
  v_hash_int := ('x' || substring(v_hash from 1 for 12))::bit(48)::bigint;
  v_offset := (abs(v_hash_int::bigint) % v_actual_count)::int;

  SELECT id, ticket_number INTO v_winning_id, v_winning_num
  FROM tickets
  WHERE raffle_id = p_raffle_id AND status = 'CONFIRMED'
  ORDER BY ticket_number
  LIMIT 1 OFFSET v_offset;

  UPDATE raffles SET
    status = 'COMPLETED',
    winning_ticket_id = v_winning_id,
    draw_seed = v_seed,
    drawn_at = now(),
    updated_at = now()
  WHERE id = p_raffle_id;

  winning_ticket_number := v_winning_num;
  winning_ticket_id := v_winning_id;
  seed := v_seed;
  hash_hex := v_hash;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
`;

const SEED = `
DO $$
DECLARE
  cat_tech UUID; cat_fashion UUID; cat_vehicles UUID; cat_appliances UUID;
BEGIN
  IF (SELECT COUNT(*) FROM categories) = 0 THEN
    INSERT INTO categories (name, slug, icon_url) VALUES
      ('Tech', 'tech', 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png'),
      ('Fashion', 'fashion', 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png'),
      ('Vehicles', 'vehicles', 'https://cdn-icons-png.flaticon.com/512/743/743007.png'),
      ('Appliances', 'appliances', 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png');
  END IF;
END $$;

DO $$
DECLARE
  cat_tech UUID; cat_fashion UUID; cat_vehicles UUID; cat_appliances UUID;
  r1 UUID; r2 UUID; r3 UUID; r4 UUID; r5 UUID;
BEGIN
  IF (SELECT COUNT(*) FROM raffles) = 0 THEN
    SELECT id INTO cat_tech FROM categories WHERE slug='tech';
    SELECT id INTO cat_fashion FROM categories WHERE slug='fashion';
    SELECT id INTO cat_vehicles FROM categories WHERE slug='vehicles';
    SELECT id INTO cat_appliances FROM categories WHERE slug='appliances';

    INSERT INTO raffles (category_id, title, slug, description, ticket_price, currency, max_tickets, tickets_sold, type, status, hero_image_url, starts_at, ends_at)
    VALUES (cat_tech, 'iPhone 15 Pro Max 256GB', 'iphone-15-pro-max', 'Le tout dernier iPhone 15 Pro Max, boîte scellée, garantie internationale. Tirage garanti dès que 1200 tickets vendus.', 1, 'USD', 1200, 847, 'THRESHOLD', 'ACTIVE', 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=800&q=80', now(), now() + interval '7 days')
    RETURNING id INTO r1;

    INSERT INTO raffles (category_id, title, slug, description, ticket_price, currency, max_tickets, tickets_sold, type, status, hero_image_url, starts_at, ends_at)
    VALUES (cat_vehicles, 'Moto Yamaha MT-15 2024', 'yamaha-mt-15', 'Moto sportive Yamaha MT-15, neuve, immatriculée. Livraison à Kinshasa incluse.', 1, 'USD', 3500, 1234, 'THRESHOLD', 'ACTIVE', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80', now(), now() + interval '14 days')
    RETURNING id INTO r2;

    INSERT INTO raffles (category_id, title, slug, description, ticket_price, currency, max_tickets, tickets_sold, type, status, hero_image_url, starts_at, ends_at)
    VALUES (cat_appliances, 'Smart TV Samsung 65" 4K', 'samsung-tv-65', 'Samsung 65 pouces QLED 4K. Livraison + installation gratuite en RDC.', 1, 'USD', 800, 512, 'WEEKLY', 'ACTIVE', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80', now(), now() + interval '3 days')
    RETURNING id INTO r3;

    INSERT INTO raffles (category_id, title, slug, description, ticket_price, currency, max_tickets, tickets_sold, type, status, hero_image_url, starts_at, ends_at)
    VALUES (cat_fashion, 'Nike Air Jordan 1 Retro', 'air-jordan-1', 'Sneakers Nike Air Jordan 1 Retro High OG, taille au choix du gagnant.', 1, 'USD', 200, 156, 'DAILY', 'ACTIVE', 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80', now(), now() + interval '1 day')
    RETURNING id INTO r4;

    INSERT INTO raffles (category_id, title, slug, description, ticket_price, currency, max_tickets, tickets_sold, type, status, hero_image_url, starts_at, ends_at)
    VALUES (cat_tech, 'MacBook Pro M3 14"', 'macbook-pro-m3', 'MacBook Pro 14 pouces avec puce M3, 16GB RAM, 512GB SSD. Neuf sous emballage Apple.', 1, 'USD', 2000, 1789, 'MONTHLY', 'ACTIVE', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', now(), now() + interval '20 days')
    RETURNING id INTO r5;

    INSERT INTO raffle_medias (raffle_id, type, url, caption, display_order) VALUES
      (r1, 'IMAGE', 'https://images.unsplash.com/photo-1695048132832-6a1c46a3d9f5?w=1200&q=80', 'Vue de face', 1),
      (r1, 'IMAGE', 'https://images.unsplash.com/photo-1697284959512-4c9c1b64c68e?w=1200&q=80', 'Boîte scellée', 2),
      (r2, 'IMAGE', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80', 'Yamaha MT-15', 1),
      (r3, 'IMAGE', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', 'Samsung QLED', 1),
      (r4, 'IMAGE', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80', 'Air Jordan side', 1),
      (r5, 'IMAGE', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1200&q=80', 'MacBook Pro', 1);
  END IF;
END $$;
`;

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    console.log('✓ Connected to Neon');
    await client.query(PROCEDURES);
    console.log('✓ Procedures created');
    await client.query(SEED);
    console.log('✓ Seed data OK');
    const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM raffles');
    console.log('→ raffles count:', rows[0].c);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
