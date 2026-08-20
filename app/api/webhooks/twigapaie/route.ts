import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Initialisation de la connexion Neon (PostgreSQL)
const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Extraction uniforme des données (support direct TwigaPaie + Relais Proxy DefMaks)
    const payload = body.payload?.data || body.payload || body;

    const rawStatus = payload.status || payload.event;
    const isSuccess =
      rawStatus === 'SUCCESS' ||
      rawStatus === 2 ||
      rawStatus === 'PAYMENT_SUCCESS' ||
      body.event === 'PAYMENT_SUCCESS';

    if (!isSuccess) {
      console.warn(
        `[Punchy Webhook] Transaction ignorée (non validée) :`,
        payload.merchant_reference || payload.order_id
      );
      return NextResponse.json({ received: true, status: 'ignored' }, { status: 200 });
    }

    // Identifiants et métadonnées
    const provider_reference = payload.transaction_id || payload.provider_reference || 'N/A';
    const merchant_reference = payload.merchant_reference || payload.external_reference || payload.order_id;
    const phone_used = payload.customer_phone || payload.phone_number || '';
    const operator = payload.operator || payload.channel || 'MobileMoney';
    const amount = payload.amount ?? 0;
    const currency = payload.currency || 'USD';

    const metadata = payload.metadata || {};
    const raffle_id = metadata.raffle_id;
    const user_id = metadata.user_id;
    const quantity = parseInt(metadata.quantity || '1', 10);

    if (!merchant_reference) {
      return NextResponse.json({ error: 'Missing order_id / merchant_reference' }, { status: 400 });
    }

    // Exécution de l'imputation atomique SQL dans Neon
    const result = await sql`
      SELECT * FROM fulfill_raffle_tickets(
        ${raffle_id || null}::UUID,
        ${user_id || null}::UUID,
        ${quantity}::INTEGER,
        ${merchant_reference}::VARCHAR,
        ${provider_reference}::VARCHAR,
        ${phone_used}::VARCHAR,
        ${operator}::VARCHAR,
        ${amount}::NUMERIC,
        ${currency}::VARCHAR,
        ${JSON.stringify(payload)}::JSONB
      );
    `;

    const fulfilledTransaction = result[0];

    console.log(`✅ [Punchy Webhook] Succès traitement pour Order: ${merchant_reference}`);

    return NextResponse.json(
      {
        success: true,
        transaction_id: fulfilledTransaction?.transaction_id,
        ticket_numbers: fulfilledTransaction?.ticket_numbers,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ [Punchy Webhook Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

