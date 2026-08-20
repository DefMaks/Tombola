// TwigaPaie proxy call via DefMaks Supabase Edge Function (twigapaie-proxy)

function normalizePhone(phone, operator) {
  let cleaned = String(phone || '').trim().replace(/[\s\-\+\(\)]/g, '');
  if (!cleaned) return '';

  // Simulator format (starts with 1)
  if (/^1\d{7,11}$/.test(cleaned)) {
    return cleaned;
  }

  // Extract core 9 local digits for DRC (remove 243 or leading 0)
  let core = cleaned;
  if (core.startsWith('243')) {
    core = core.substring(3);
  }
  if (core.startsWith('0')) {
    core = core.substring(1);
  }

  const opUpper = String(operator || '').toUpperCase();

  // Airtel: 97XXXXXXX, 98XXXXXXX, 99XXXXXXX (9 digits, NO 0, NO 243)
  if (opUpper === 'AIRTEL' || /^(97|98|99)/.test(core)) {
    return core;
  }

  // Orange Money: 080XXXXXXX, 084XXXXXXX, 085XXXXXXX, 089XXXXXXX (10 digits starting with 0)
  if (opUpper === 'ORANGE' || /^(80|84|85|89)/.test(core)) {
    return '0' + core;
  }

  // Africell: 090XXXXXXX (10 digits starting with 090)
  if (opUpper === 'AFRICELL' || /^90/.test(core)) {
    return '0' + core;
  }

  // Vodacom: 243 + 81/82/83 or 081/082/083
  if (opUpper === 'VODACOM' || /^(81|82|83)/.test(core)) {
    return '243' + core;
  }

  // Fallback pattern matching
  if (core.length === 9) {
    if (/^(97|98|99)/.test(core)) return core;
    if (/^(80|84|85|89|90)/.test(core)) return '0' + core;
    if (/^(81|82|83)/.test(core)) return '243' + core;
  }

  return cleaned;
}

function getTwigaHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (supabaseAnonKey) {
    headers['apikey'] = supabaseAnonKey;
    headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
  }
  return headers;
}

export async function initiateTwigaPayment({ raffle_id, amount, currency, phone_number, quantity, operator }) {
  const merchantRef = `DMKS_RAFFLE_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const proxyUrl = process.env.NEXT_PUBLIC_DEFMAKS_PROXY_URL || 'https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/twigapaie-proxy';
  const formattedPhone = normalizePhone(phone_number, operator);

  const body = {
    endpoint: '/payments/payment-service',
    method: 'POST',
    amount: String(amount),
    currency: String(currency || 'USD').toUpperCase(),
    customer_phone_number: formattedPhone,
    customer_phone: formattedPhone,
    payment_operator: operator,
    channel: operator,
    external_reference: merchantRef,
    client_order_id: merchantRef,
    order_id: merchantRef,
    description: `Achat ${quantity} ticket(s) Tombola Punchy #${merchantRef}`,
  };

  console.log(`🚀 [TWIGA PROXY INITIATE REQUEST] Url: ${proxyUrl}`, JSON.stringify(body));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: getTwigaHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    console.log(`📥 [TWIGA PROXY INITIATE RESPONSE] Status: ${response.status}`, JSON.stringify(parsed));

    return {
      ok: response.ok,
      status: response.status,
      data: parsed,
      merchantRef,
      requestBody: body,
      formattedPhone,
    };
  } catch (e) {
    console.error('❌ [TWIGA PROXY INITIATE ERROR]:', e.message);
    return {
      ok: false,
      status: 0,
      data: { error: e.message },
      merchantRef,
      requestBody: body,
      formattedPhone,
    };
  }
}

export async function checkTwigaPaymentStatus(merchantRef) {
  if (!merchantRef) return null;
  const proxyUrl = process.env.NEXT_PUBLIC_DEFMAKS_PROXY_URL || 'https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/twigapaie-proxy';
  const clientWebhookUrl = process.env.NEXT_PUBLIC_PUNCHY_WEBHOOK_URL || 'https://punchy.cd/api/webhooks/twigapaie';

  const body = {
    endpoint: '/payments/payment-check',
    method: 'POST',
    order_id: merchantRef,
    client_order_id: merchantRef,
    external_reference: merchantRef,
    dmks: 'webhook',
    client_webhook_url: clientWebhookUrl,
  };

  console.log(`🔍 [TWIGA PROXY CHECK REQUEST] Order: ${merchantRef}`, JSON.stringify(body));

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: getTwigaHeaders(),
      body: JSON.stringify(body),
    });

    const parsed = await response.json().catch(() => ({}));
    console.log(`📥 [TWIGA PROXY CHECK RESPONSE] Order: ${merchantRef}`, JSON.stringify(parsed));
    return parsed;
  } catch (e) {
    console.error('❌ [TWIGA PROXY CHECK ERROR]:', e.message);
    return null;
  }
}

export function isTwigaPaymentSuccess(res) {
  if (!res) return false;

  if (res.event === 'PAYMENT_SUCCESS' || res.payload?.event === 'PAYMENT_SUCCESS') {
    return true;
  }

  // Dig into nested data if present
  const data = (Array.isArray(res.data) ? res.data[0] : res.data) ||
               (Array.isArray(res.payload?.data) ? res.payload?.data[0] : res.payload?.data) ||
               res.payload ||
               res;

  const candidateValues = [
    data?.status,
    data?.transaction_status,
    data?.payment_status,
    data?.state,
    data?.code,
    res?.payment_status,
    res?.transaction_status,
    // Only check top-level res.status if it's not standard HTTP 200/201
    (res?.status !== 200 && res?.status !== '200' && res?.status !== 201 && res?.status !== '201') ? res?.status : undefined,
  ].filter(v => v !== undefined && v !== null);

  for (const val of candidateValues) {
    const num = Number(val);
    const str = String(val).trim().toUpperCase();
    if (
      num === 2 ||
      str === '2' ||
      str === 'SUCCESS' ||
      str === 'PAYMENT_SUCCESS' ||
      str === 'PAID' ||
      str === 'COMPLETED' ||
      str === 'CONFIRMED' ||
      str === 'ACCEPTED'
    ) {
      return true;
    }
  }

  if (typeof data?.message === 'string') {
    const msg = data.message.toLowerCase();
    if (msg.includes('success') || msg.includes('effectué') || msg.includes('payé')) {
      return true;
    }
  }

  return false;
}

export function isTwigaPaymentFailed(res) {
  if (!res) return false;

  const data = (Array.isArray(res.data) ? res.data[0] : res.data) ||
               (Array.isArray(res.payload?.data) ? res.payload?.data[0] : res.payload?.data) ||
               res.payload ||
               res;

  const candidateValues = [
    data?.status,
    data?.transaction_status,
    data?.payment_status,
    data?.state,
    res?.payment_status,
    res?.transaction_status,
    (res?.status !== 200 && res?.status !== '200') ? res?.status : undefined,
  ].filter(v => v !== undefined && v !== null);

  for (const val of candidateValues) {
    const num = Number(val);
    const str = String(val).trim().toUpperCase();
    if (
      num === 3 ||
      num === 4 ||
      str === '3' ||
      str === '4' ||
      str === 'FAILED' ||
      str === 'CANCELLED' ||
      str === 'CANCELED' ||
      str === 'REJECTED' ||
      str === 'EXPIRED' ||
      str === 'DECLINED'
    ) {
      return true;
    }
  }

  return false;
}


