import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDbClient() {
  const connStr = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
  return neon(connStr);
}

const FALLBACK_SECRET = 'punchy_reconcile_sec_2026';
const TWIGAPAIE_PROXY_URL = 'https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/twigapaie-proxy';
const SUPABASE_KEY = process.env.DMKS_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

async function reconcile() {
  const sql = getDbClient();
  const pendingTxs = (await sql`
    SELECT id, user_id, raffle_id, amount, currency, quantity, status, provider_reference, merchant_reference, phone_used, created_at
    FROM transactions
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT 50
  `) as any[];

  let reconciled = 0;
  let expired = 0;

  for (const tx of pendingTxs) {
    const ageMinutes = Math.floor((Date.now() - new Date(tx.created_at).getTime()) / 60000);

    // Si moins de 45 secondes, l'utilisateur tape son PIN USSD
    if (ageMinutes === 0) continue;

    // Si plus de 2 heures, session USSD expirée
    if (ageMinutes >= 120) {
      await sql`UPDATE transactions SET status = 'FAILED', updated_at = NOW() WHERE id = ${tx.id}::uuid`;
      expired++;
      continue;
    }

    // Vérification TwigaPaie
    try {
      const res = await fetch(TWIGAPAIE_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          action: 'check_status',
          order_id: tx.merchant_reference || tx.id,
          transaction_id: tx.provider_reference || undefined,
        }),
      });
      const data = await res.json();
      const st = (data?.status || '').toUpperCase();

      if (st === 'SUCCESS' || st === 'COMPLETED') {
        await sql`
          UPDATE transactions 
          SET status = 'SUCCESS', updated_at = NOW(), provider_reference = COALESCE(${data.transaction_id || null}, provider_reference)
          WHERE id = ${tx.id}::uuid
        `;

        if (tx.raffle_id) {
          const qty = Math.max(1, Number(tx.quantity) || Math.floor(Number(tx.amount) || 1));
          const maxNumRow = (await sql`SELECT COALESCE(MAX(ticket_number), 0)::int as max_num FROM tickets WHERE raffle_id = ${tx.raffle_id}::uuid`) as any[];
          const startNum = Number(maxNumRow[0]?.max_num || 0);

          for (let i = 1; i <= qty; i++) {
            await sql`
              INSERT INTO tickets (id, raffle_id, user_id, transaction_id, ticket_number, status, purchased_at)
              VALUES (gen_random_uuid(), ${tx.raffle_id}::uuid, ${tx.user_id || null}::uuid, ${tx.id}::uuid, ${startNum + i}, 'CONFIRMED', NOW())
            `;
          }
          await sql`UPDATE raffles SET tickets_sold = COALESCE(tickets_sold, 0) + ${qty}, updated_at = NOW() WHERE id = ${tx.raffle_id}::uuid`;
        }
        reconciled++;
      } else if (st === 'FAILED' || st === 'CANCELLED') {
        await sql`UPDATE transactions SET status = 'FAILED', updated_at = NOW() WHERE id = ${tx.id}::uuid`;
        expired++;
      }
    } catch (e) {}
  }

  return { success: true, pending_scanned: pendingTxs.length, reconciled_success: reconciled, marked_failed: expired };
}

export async function GET(req: Request) {
  const secretHeader = req.headers.get('x-admin-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = new URL(req.url);
  const secretQuery = url.searchParams.get('secret');
  const provided = (secretHeader || secretQuery || '').trim();

  const expectedSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET || FALLBACK_SECRET;
  if (provided !== expectedSecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await reconcile();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return GET(req);
}
