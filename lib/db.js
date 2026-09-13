import { Pool } from 'pg';
import crypto from 'crypto';

let _pool = null;
let _useMock = false;

// Seed Data for In-Memory Fallback
const catTechId = 'c1000000-0000-0000-0000-000000000001';
const catFashionId = 'c1000000-0000-0000-0000-000000000002';
const catVehiclesId = 'c1000000-0000-0000-0000-000000000003';
const catAppliancesId = 'c1000000-0000-0000-0000-000000000004';

const r1Id = 'r1000000-0000-0000-0000-000000000001';
const r2Id = 'r1000000-0000-0000-0000-000000000002';
const r3Id = 'r1000000-0000-0000-0000-000000000003';
const r4Id = 'r1000000-0000-0000-0000-000000000004';
const r5Id = 'r1000000-0000-0000-0000-000000000005';

const memDb = {
  categories: [
    { id: catTechId, name: 'Tech', slug: 'tech', icon_url: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png' },
    { id: catFashionId, name: 'Fashion', slug: 'fashion', icon_url: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png' },
    { id: catVehiclesId, name: 'Vehicles', slug: 'vehicles', icon_url: 'https://cdn-icons-png.flaticon.com/512/743/743007.png' },
    { id: catAppliancesId, name: 'Appliances', slug: 'appliances', icon_url: 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png' },
  ],
  raffles: [
    {
      id: r1Id,
      category_id: catTechId,
      title: 'iPhone 15 Pro Max 256GB',
      slug: 'iphone-15-pro-max',
      description: 'Le tout dernier iPhone 15 Pro Max, boîte scellée, garantie internationale. Tirage garanti dès que 1200 tickets vendus.',
      ticket_price: 1,
      currency: 'USD',
      max_tickets: 1200,
      tickets_sold: 847,
      type: 'THRESHOLD',
      status: 'ACTIVE',
      is_featured: true,
      scope_type: 'CITY',
      target_city: 'Kinshasa',
      target_commune: null,
      min_participants: 500,
      winners_count: 1,
      hero_image_url: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=800&q=80',
      starts_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      winning_ticket_id: null,
      draw_seed: null,
      drawn_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: r2Id,
      category_id: catVehiclesId,
      title: 'Moto Yamaha MT-15 2024',
      slug: 'yamaha-mt-15',
      description: 'Moto sportive Yamaha MT-15, neuve, immatriculée. Livraison à Kinshasa incluse.',
      ticket_price: 1,
      currency: 'USD',
      max_tickets: 3500,
      tickets_sold: 1234,
      type: 'THRESHOLD',
      status: 'ACTIVE',
      is_featured: false,
      scope_type: 'CITY',
      target_city: 'Kinshasa',
      target_commune: null,
      min_participants: 1000,
      winners_count: 1,
      hero_image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
      starts_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      winning_ticket_id: null,
      draw_seed: null,
      drawn_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: r3Id,
      category_id: catAppliancesId,
      title: 'Smart TV Samsung 65" 4K',
      slug: 'samsung-tv-65',
      description: 'Samsung 65 pouces QLED 4K. Livraison + installation gratuite en RDC.',
      ticket_price: 1,
      currency: 'USD',
      max_tickets: 800,
      tickets_sold: 512,
      type: 'WEEKLY',
      status: 'ACTIVE',
      is_featured: false,
      scope_type: 'COMMUNE',
      target_city: 'Kinshasa',
      target_commune: 'Lemba',
      min_participants: 300,
      winners_count: 2,
      hero_image_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
      starts_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
      winning_ticket_id: null,
      draw_seed: null,
      drawn_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: r4Id,
      category_id: catFashionId,
      title: 'Nike Air Jordan 1 Retro',
      slug: 'air-jordan-1',
      description: 'Sneakers Nike Air Jordan 1 Retro High OG, taille au choix du gagnant.',
      ticket_price: 1,
      currency: 'USD',
      max_tickets: 200,
      tickets_sold: 156,
      type: 'DAILY',
      status: 'ACTIVE',
      is_featured: false,
      scope_type: 'COMMUNE',
      target_city: 'Kinshasa',
      target_commune: 'Gombe',
      min_participants: 100,
      winners_count: 1,
      hero_image_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80',
      starts_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      ends_at: new Date(Date.now() + 1 * 86400000).toISOString(),
      winning_ticket_id: null,
      draw_seed: null,
      drawn_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: r5Id,
      category_id: catTechId,
      title: 'MacBook Pro M3 14"',
      slug: 'macbook-pro-m3',
      description: 'MacBook Pro 14 pouces avec puce M3, 16GB RAM, 512GB SSD. Neuf sous emballage Apple.',
      ticket_price: 1,
      currency: 'USD',
      max_tickets: 2000,
      tickets_sold: 1789,
      type: 'MONTHLY',
      status: 'ACTIVE',
      is_featured: false,
      scope_type: 'CITY',
      target_city: 'Kinshasa',
      target_commune: null,
      min_participants: 1200,
      winners_count: 1,
      hero_image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      starts_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      ends_at: new Date(Date.now() + 20 * 86400000).toISOString(),
      winning_ticket_id: null,
      draw_seed: null,
      drawn_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  raffle_medias: [
    { id: 'm1', raffle_id: r1Id, type: 'IMAGE', url: 'https://images.unsplash.com/photo-1695048132832-6a1c46a3d9f5?w=1200&q=80', caption: 'Vue de face', display_order: 1 },
    { id: 'm2', raffle_id: r1Id, type: 'IMAGE', url: 'https://images.unsplash.com/photo-1697284959512-4c9c1b64c68e?w=1200&q=80', caption: 'Boîte scellée', display_order: 2 },
    { id: 'm3', raffle_id: r2Id, type: 'IMAGE', url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80', caption: 'Yamaha MT-15', display_order: 1 },
    { id: 'm4', raffle_id: r3Id, type: 'IMAGE', url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', caption: 'Samsung QLED', display_order: 1 },
    { id: 'm5', raffle_id: r4Id, type: 'IMAGE', url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80', caption: 'Air Jordan side', display_order: 1 },
    { id: 'm6', raffle_id: r5Id, type: 'IMAGE', url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1200&q=80', caption: 'MacBook Pro', display_order: 1 },
  ],
  users: [
    { id: 'u1001', full_name: 'Jean Mukendi', phone_number: '+243812345678', city: 'Kinshasa', commune: 'Lemba', commune_locked_until: new Date(Date.now() + 80 * 86400000).toISOString() },
    { id: 'u1002', full_name: 'Alain Kalala', phone_number: '+243996767377', city: 'Kinshasa', commune: 'Gombe', commune_locked_until: new Date(Date.now() + 65 * 86400000).toISOString() },
    { id: 'u1003', full_name: 'DefMaks Test', phone_number: '+243822032855', city: 'Kinshasa', commune: 'Lemba', commune_locked_until: new Date(Date.now() + 90 * 86400000).toISOString() },
    { id: 'u1004', full_name: 'Chantal Bakanza', phone_number: '+243820000000', city: 'Kinshasa', commune: null, commune_locked_until: null },
  ],
  tickets: [],
  transactions: [],
  advertisements: [
    {
      id: 1,
      title: 'Meet DefMaks 2025 !',
      description: 'Découvrez l\'écosystème DefMaks et nos opportunités uniques.',
      image_url: 'https://ucarecdn.com/3ce456eb-dde0-4acd-a56d-8dcc2cad8786/meetDefmaks.png',
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'en cours',
      is_active: true,
      zone: 'home',
      source: 'neon',
      _source: 'neon ads',
      external_link: 'https://defmaks.com/',
      target: ['Punchy', 'ALL'],
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'Meet Lokko 2026 !',
      description: 'In-Read Banner Lokko & DefMaks',
      image_url: 'https://ucarecdn.com/6396e774-b7f5-4dbe-97de-85ffd257b3d7/-/preview/1000x384/',
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'en cours',
      is_active: true,
      zone: 'in_read',
      source: 'neon',
      _source: 'neon ads',
      external_link: 'https://defmaks.com/',
      target: ['Punchy', 'ALL'],
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      title: 'Opportunité DefMaks',
      description: 'Inner Page Banner DefMaks',
      image_url: 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/',
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'en cours',
      is_active: true,
      zone: 'inner',
      source: 'neon',
      _source: 'neon ads',
      external_link: 'https://defmaks.com/',
      target: ['Punchy', 'ALL'],
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      title: 'Grand Tirage Punchy',
      description: 'Single Detail Page Banner',
      image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80',
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'en cours',
      is_active: true,
      zone: 'single',
      source: 'neon',
      _source: 'neon ads',
      external_link: 'https://defmaks.com/',
      target: ['Punchy', 'ALL'],
      created_at: new Date().toISOString(),
    },
    {
      id: 5,
      title: 'DefMaks Full Width',
      description: 'Large Page Banner',
      image_url: 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/',
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'en cours',
      is_active: true,
      zone: 'page',
      source: 'neon',
      _source: 'neon ads',
      external_link: 'https://defmaks.com/',
      target: ['Punchy', 'ALL'],
      created_at: new Date().toISOString(),
    },
    {
      id: 6,
      title: 'Lokko DefMaks Secondary',
      description: 'Void Secondary Banner',
      image_url: 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/',
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'en cours',
      is_active: true,
      zone: 'void',
      source: 'neon',
      _source: 'neon ads',
      external_link: 'http://lokko.defmaks.com/',
      target: ['Punchy', 'ALL'],
      created_at: new Date().toISOString(),
    },
  ],
  testimonials: [
    {
      id: 't1001',
      user_id: 'u1001',
      raffle_id: r1Id,
      photo_url: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=800&q=80',
      message: 'Incroyable ! J\'ai participé avec seulement 1$ et j\'ai remporté l\'iPhone 15 Pro Max. Reçu en 24h à Kinshasa !',
      status: 'APPROVED',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 't1002',
      user_id: 'u1002',
      raffle_id: r4Id,
      photo_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80',
      message: 'Au début je pensais que c\'était faux, mais j\'ai rapidement été contacté pour la remise du lot. Mes Air Jordan sont magnifiques.',
      status: 'APPROVED',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 't1003',
      user_id: 'u1003',
      raffle_id: r5Id,
      photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      message: 'GRAND GAGNANT DE LA SEMAINE ! Mon MacBook Pro M3 livré sous emballage scellé avec garantie Apple. C\'est du réel !',
      status: 'APPROVED',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 't1004',
      user_id: 'u1004',
      raffle_id: r2Id,
      photo_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
      message: 'VAINQUEUR OFFICIEL DU MOIS ! La moto Yamaha MT-15 neuve m\'a été remise en main propre à Kinshasa. Opportunité unique pour 1$ !',
      status: 'APPROVED',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
  ],
  otp_codes: [],
};

let _tablesInitialized = false;

async function ensureTables(pool) {
  if (_tablesInitialized || !pool) return;
  _tablesInitialized = true;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          phone_number VARCHAR(30) UNIQUE NOT NULL,
          full_name VARCHAR(100),
          email VARCHAR(100),
          password_hash VARCHAR(255),
          role VARCHAR(20) DEFAULT 'USER',
          city VARCHAR(100) DEFAULT 'Kinshasa',
          commune VARCHAR(100) DEFAULT NULL,
          commune_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          commune_locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Kinshasa';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS commune VARCHAR(100) DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS commune_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS commune_locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

        CREATE TABLE IF NOT EXISTS otp_codes (
          id SERIAL PRIMARY KEY,
          phone_number VARCHAR(30) NOT NULL,
          code VARCHAR(10) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone_number);
        CREATE INDEX IF NOT EXISTS idx_users_commune ON users (city, commune);

        -- Territorial Raffles Columns
        ALTER TABLE raffles ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) DEFAULT 'CITY';
        ALTER TABLE raffles ADD COLUMN IF NOT EXISTS target_city VARCHAR(100) DEFAULT 'Kinshasa';
        ALTER TABLE raffles ADD COLUMN IF NOT EXISTS target_commune VARCHAR(100) DEFAULT NULL;
        ALTER TABLE raffles ADD COLUMN IF NOT EXISTS min_participants INT DEFAULT 1;
        ALTER TABLE raffles ADD COLUMN IF NOT EXISTS winners_count INT DEFAULT 1;
        CREATE INDEX IF NOT EXISTS idx_raffles_scope ON raffles (scope_type, target_city, target_commune);
      `);
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('[AI Studio] Auto table init warning:', err.message);
  }
}

export function getPool() {
  if (_useMock) return null;
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      _useMock = true;
      console.warn('[AI Studio] DATABASE_URL missing — using in-memory database');
      return null;
    }
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,

      max: 5,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30_000,
    });
  }
  return _pool;
}

export async function query(sql, params = []) {
  const pool = getPool();
  if (pool && !_useMock) {
    await ensureTables(pool);
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(sql, params);
        return res;
      } finally {
        client.release();
      }
    } catch (e) {
      console.warn('[AI Studio] PostgreSQL query failed, switching to in-memory fallback:', e.message);
      _useMock = true;
    }
  }

  // In-Memory Execution Logic
  return runMockQuery(sql, params);
}

export async function one(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows[0] || null;
}

export async function many(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows;
}

function runMockQuery(sql, params = []) {
  const s = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT * FROM categories
  if (s.includes('FROM categories')) {
    const list = [...memDb.categories].sort((a, b) => a.name.localeCompare(b.name));
    return { rows: list };
  }

  // 2. fulfill_raffle_tickets
  if (s.includes('fulfill_raffle_tickets')) {
    const [raffle_id, user_id, transaction_id, quantity] = params;
    const raffle = memDb.raffles.find((r) => r.id === raffle_id);
    if (!raffle) throw new Error('Raffle not found');
    if (raffle.status !== 'ACTIVE') throw new Error(`Raffle not active (status=${raffle.status})`);
    const available = raffle.max_tickets - raffle.tickets_sold;
    if (quantity > available) throw new Error(`Not enough tickets left (available=${available})`);

    const createdTickets = [];
    const v_current = raffle.tickets_sold;
    for (let i = 1; i <= quantity; i++) {
      const v_new_num = v_current + i;
      const tId = crypto.randomUUID();
      const t = {
        id: tId,
        raffle_id,
        user_id,
        transaction_id,
        ticket_number: v_new_num,
        status: 'CONFIRMED',
        purchased_at: new Date().toISOString(),
      };
      memDb.tickets.push(t);
      createdTickets.push({ ticket_id: tId, ticket_number: v_new_num });
    }

    raffle.tickets_sold = v_current + quantity;
    raffle.updated_at = new Date().toISOString();
    if (raffle.tickets_sold >= raffle.max_tickets) {
      raffle.status = 'PENDING_DRAW';
    }

    return { rows: createdTickets };
  }

  // 3. execute_fair_raffle_draw
  if (s.includes('execute_fair_raffle_draw')) {
    const [raffle_id, seed_prefix] = params;
    const raffle = memDb.raffles.find((r) => r.id === raffle_id);
    if (!raffle) throw new Error('Raffle not found');
    const confirmed = memDb.tickets.filter((t) => t.raffle_id === raffle_id && t.status === 'CONFIRMED');
    if (confirmed.length === 0) throw new Error('No confirmed tickets, cannot draw');

    const v_seed = `${seed_prefix || 'DEFMAKS_RAFFLE'}|${raffle_id}|${confirmed.length}|${Math.floor(Date.now() / 1000)}`;
    const v_hash = crypto.createHash('sha256').update(v_seed).digest('hex');
    const hashInt = parseInt(v_hash.substring(0, 12), 16);
    const v_offset = Math.abs(hashInt) % confirmed.length;

    confirmed.sort((a, b) => a.ticket_number - b.ticket_number);
    const winning = confirmed[v_offset];

    raffle.status = 'COMPLETED';
    raffle.winning_ticket_id = winning.id;
    raffle.draw_seed = v_seed;
    raffle.drawn_at = new Date().toISOString();
    raffle.updated_at = new Date().toISOString();

    return {
      rows: [
        {
          winning_ticket_number: winning.ticket_number,
          winning_ticket_id: winning.id,
          seed: v_seed,
          hash_hex: v_hash,
        },
      ],
    };
  }

  // 4. USERS
  if (s.includes('FROM users WHERE phone_number=')) {
    const phone = params[0];
    const u = memDb.users.find((x) => x.phone_number === phone);
    return { rows: u ? [u] : [] };
  }
  if (s.includes('FROM users WHERE id=')) {
    const id = params[0];
    const u = memDb.users.find((x) => x.id === id);
    return { rows: u ? [u] : [] };
  }
  if (s.includes('INSERT INTO users')) {
    const [phone_number, full_name, role] = params;
    const newUser = {
      id: crypto.randomUUID(),
      phone_number,
      full_name,
      role: role || 'USER',
      created_at: new Date().toISOString(),
    };
    memDb.users.push(newUser);
    return { rows: [newUser] };
  }

  // 5. TRANSACTIONS
  if (s.includes('INSERT INTO transactions')) {
    const [user_id, provider_reference, merchant_reference, phone_used, operator, amount, currency, status, raw_response, raffle_id, quantity] = params;
    const tx = {
      id: crypto.randomUUID(),
      user_id,
      provider_reference,
      merchant_reference,
      phone_used,
      operator,
      amount,
      currency,
      status,
      raw_response,
      raffle_id,
      quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memDb.transactions.push(tx);
    return { rows: [tx] };
  }

  if (s.includes('FROM transactions WHERE id=')) {
    const id = params[0];
    const tx = memDb.transactions.find((t) => t.id === id);
    return { rows: tx ? [tx] : [] };
  }

  if (s.includes('UPDATE transactions SET status=')) {
    const id = params[params.length - 1];
    const statusMatch = s.match(/status='([^']+)'/);
    const tx = memDb.transactions.find((t) => t.id === id);
    if (tx) {
      if (statusMatch) tx.status = statusMatch[1];
      tx.updated_at = new Date().toISOString();
    }
    return { rows: tx ? [tx] : [] };
  }

  if (s.includes('FROM transactions tx')) {
    const user_id = params[0];
    const userTxs = memDb.transactions
      .filter((t) => t.user_id === user_id)
      .map((tx) => {
        const raffle = memDb.raffles.find((r) => r.id === tx.raffle_id);
        return { ...tx, raffle_title: raffle?.title || null, raffle_slug: raffle?.slug || null };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: userTxs };
  }

  // 6. TICKETS
  if (s.includes('SELECT ticket_number, id FROM tickets WHERE transaction_id=')) {
    const txId = params[0];
    const list = memDb.tickets.filter((t) => t.transaction_id === txId).sort((a, b) => a.ticket_number - b.ticket_number);
    return { rows: list };
  }
  if (s.includes('FROM tickets WHERE id=')) {
    const id = params[0];
    const t = memDb.tickets.find((x) => x.id === id);
    return { rows: t ? [t] : [] };
  }
  if (s.includes('FROM tickets t LEFT JOIN users u ON u.id=t.user_id WHERE t.raffle_id=')) {
    const raffleId = params[0];
    const list = memDb.tickets
      .filter((t) => t.raffle_id === raffleId && t.status === 'CONFIRMED')
      .map((t) => {
        const u = memDb.users.find((x) => x.id === t.user_id);
        return { ticket_number: t.ticket_number, purchased_at: t.purchased_at, phone_number: u?.phone_number || '' };
      })
      .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at))
      .slice(0, 10);
    return { rows: list };
  }

  if (s.includes('FROM tickets t JOIN raffles r ON r.id=t.raffle_id WHERE t.user_id=')) {
    const user_id = params[0];
    const list = memDb.tickets
      .filter((t) => t.user_id === user_id && t.status === 'CONFIRMED')
      .map((t) => {
        const r = memDb.raffles.find((x) => x.id === t.raffle_id);
        return {
          id: t.id,
          ticket_number: t.ticket_number,
          status: t.status,
          purchased_at: t.purchased_at,
          raffle_id: r?.id,
          title: r?.title,
          slug: r?.slug,
          hero_image_url: r?.hero_image_url,
          raffle_status: r?.status,
          winning_ticket_id: r?.winning_ticket_id,
        };
      })
      .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
    return { rows: list };
  }

  if (s.includes('WHERE r.winning_ticket_id=t.id AND t.user_id=')) {
    const user_id = params[0];
    const list = memDb.tickets
      .filter((t) => t.user_id === user_id)
      .filter((t) => {
        const r = memDb.raffles.find((x) => x.id === t.raffle_id);
        return r && r.winning_ticket_id === t.id;
      })
      .map((t) => {
        const r = memDb.raffles.find((x) => x.id === t.raffle_id);
        return {
          id: t.id,
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          raffle_id: r?.id,
          title: r?.title,
          slug: r?.slug,
          hero_image_url: r?.hero_image_url,
          drawn_at: r?.drawn_at,
          draw_seed: r?.draw_seed,
        };
      });
    return { rows: list };
  }

  // 7. RAFFLES
  if (s.includes('FROM raffles WHERE id=') || s.includes('FROM raffles WHERE slug=')) {
    const val = params[0];
    const r = memDb.raffles.find((x) => x.id === val || x.slug === val);
    return { rows: r ? [r] : [] };
  }

  if (s.includes('SELECT id, tickets_sold, max_tickets, status FROM raffles WHERE slug=')) {
    const slug = params[0];
    const r = memDb.raffles.find((x) => x.slug === slug);
    return { rows: r ? [{ id: r.id, tickets_sold: r.tickets_sold, max_tickets: r.max_tickets, status: r.status }] : [] };
  }

  if (s.includes('FROM raffles r LEFT JOIN categories c')) {
    let list = memDb.raffles.map((r) => {
      const c = memDb.categories.find((cat) => cat.id === r.category_id);
      return { ...r, category_slug: c?.slug || null, category_name: c?.name || null };
    });

    if (params.length > 0) {
      if (s.includes('WHERE r.slug=$1')) {
        const slug = params[0];
        list = list.filter((r) => r.slug === slug);
      } else if (s.includes('WHERE r.id::text=$1 OR r.slug=$1')) {
        const idOrSlug = params[0];
        list = list.filter((r) => r.id === idOrSlug || r.slug === idOrSlug);
      } else if (s.includes('c.slug=$')) {
        const catSlug = params[params.length - 1];
        list = list.filter((r) => r.category_slug === catSlug);
      }
    }

    return { rows: list };
  }

  if (s.includes('INSERT INTO raffles')) {
    const [category_id, title, slug, description, ticket_price, currency, max_tickets, type, hero_image_url, ends_in_days] = params;
    const r = {
      id: crypto.randomUUID(),
      category_id,
      title,
      slug,
      description,
      ticket_price: Number(ticket_price) || 1,
      currency: currency || 'USD',
      max_tickets: Number(max_tickets) || 100,
      tickets_sold: 0,
      type: type || 'THRESHOLD',
      status: 'ACTIVE',
      is_featured: false,
      hero_image_url,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + (parseInt(ends_in_days, 10) || 7) * 86400000).toISOString(),
      winning_ticket_id: null,
      draw_seed: null,
      drawn_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memDb.raffles.push(r);
    return { rows: [r] };
  }

  if (s.includes('UPDATE raffles SET status=')) {
    const [status, id] = params;
    const r = memDb.raffles.find((x) => x.id === id);
    if (r) {
      r.status = status;
      r.updated_at = new Date().toISOString();
    }
    return { rows: r ? [r] : [] };
  }

  // 8. RAFFLE MEDIAS
  if (s.includes('FROM raffle_medias WHERE raffle_id=')) {
    const raffleId = params[0];
    const list = memDb.raffle_medias.filter((m) => m.raffle_id === raffleId).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return { rows: list };
  }
  if (s.includes('INSERT INTO raffle_medias')) {
    const [raffle_id, type, url, caption] = params;
    const m = {
      id: crypto.randomUUID(),
      raffle_id,
      type: type || 'IMAGE',
      url,
      caption: caption || null,
      display_order: memDb.raffle_medias.length + 1,
    };
    memDb.raffle_medias.push(m);
    return { rows: [m] };
  }

  // 9. ADVERTISEMENTS
  if (s.includes('FROM advertisements')) {
    const zone = params[0] || 'home';
    let list = memDb.advertisements.filter((a) => a.zone === zone && a.is_active);
    if (list.length === 0) {
      list = memDb.advertisements.filter((a) => a.is_active);
    }
    return { rows: list };
  }

  // 10. TESTIMONIALS
  if (s.includes('FROM testimonials')) {
    if (s.includes('WHERE t.user_id=') || s.includes('WHERE user_id=')) {
      const [user_id, raffle_id] = params;
      if (raffle_id) {
        const t = memDb.testimonials.find((x) => x.user_id === user_id && x.raffle_id === raffle_id);
        return { rows: t ? [t] : [] };
      }
      const list = memDb.testimonials
        .filter((x) => x.user_id === user_id)
        .map((t) => {
          const r = memDb.raffles.find((x) => x.id === t.raffle_id);
          return { ...t, raffle_title: r?.title, raffle_slug: r?.slug };
        });
      return { rows: list };
    }

    // Public list of testimonials
    const list = memDb.testimonials.map((t) => {
      const u = memDb.users.find((x) => x.id === t.user_id);
      const r = memDb.raffles.find((x) => x.id === t.raffle_id);
      return {
        id: t.id,
        message: t.message,
        photo_url: t.photo_url || r?.hero_image_url,
        status: t.status,
        created_at: t.created_at,
        full_name: u?.full_name || u?.phone_number || 'Gagnant Punchy',
        phone_number: u?.phone_number,
        title: r?.title,
        slug: r?.slug,
        hero_image_url: r?.hero_image_url,
        raffle_type: r?.type || 'DAILY'
      };
    });
    return { rows: list };
  }
  if (s.includes('INSERT INTO testimonials')) {
    const [user_id, raffle_id, ticket_id, photo_url, message] = params;
    const t = {
      id: crypto.randomUUID(),
      user_id,
      raffle_id,
      ticket_id,
      photo_url,
      message,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memDb.testimonials.push(t);
    return { rows: [t] };
  }

  // 11. OTP CODES
  if (s.includes('INSERT INTO otp_codes')) {
    const [phone_number, code, expires_at] = params;
    const row = {
      id: memDb.otp_codes.length + 1,
      phone_number,
      code,
      expires_at: new Date(expires_at).toISOString(),
      used: false,
      created_at: new Date().toISOString(),
    };
    memDb.otp_codes.push(row);
    return { rows: [row] };
  }

  if (s.includes('FROM otp_codes')) {
    const [phone, code] = params;
    const now = new Date();
    const matches = memDb.otp_codes.filter(
      (x) => x.phone_number === phone && (!code || x.code === code) && !x.used && new Date(x.expires_at) > now
    );
    return { rows: matches };
  }

  if (s.includes('UPDATE otp_codes SET used=')) {
    const phone = params[0];
    memDb.otp_codes.forEach((x) => {
      if (x.phone_number === phone) x.used = true;
    });
    return { rows: [] };
  }

  // Generic fallback
  return { rows: [] };
}
