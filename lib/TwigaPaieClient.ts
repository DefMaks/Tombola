// lib/TwigaPaieClient.ts
export interface InitiatePaymentParams {
  amount: number;
  currency: 'USD' | 'CDF';
  phoneNumber: string;
  orderId: string; // Exemple: "PUNCHY-TICKET-DMKS-9842"
  channel?: string; // "AIRTEL", "MPESA", "ORANGE"
  description?: string;
}

export interface CheckPaymentParams {
  orderId: string;
  triggerWebhookOnSuccess?: boolean;
}

const DEFMAKS_PROXY_URL =
  process.env.NEXT_PUBLIC_DEFMAKS_PROXY_URL ||
  'https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/twigapaie-proxy';

const PUNCHY_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_PUNCHY_WEBHOOK_URL ||
  'https://punchy.cd/api/webhooks/twigapaie';

/**
 * Normalise les numéros de téléphone selon l'opérateur (format attendu par TwigaPaie)
 */
function normalizePhone(phone: string, operator?: string): string {
  let cleaned = String(phone || '').trim().replace(/[\s\-\+\(\)]/g, '');
  if (!cleaned) return '';

  // Format simulateur (commence par 1)
  if (/^1\d{7,11}$/.test(cleaned)) {
    return cleaned;
  }

  // Extraction des 9 chiffres locaux RDC
  let core = cleaned;
  if (core.startsWith('243')) {
    core = core.substring(3);
  }
  if (core.startsWith('0')) {
    core = core.substring(1);
  }

  const opUpper = String(operator || '').toUpperCase();

  // Airtel: 97XXXXXXX, 98XXXXXXX, 99XXXXXXX (9 chiffres, SANS 0, SANS 243)
  if (opUpper === 'AIRTEL' || /^(97|98|99)/.test(core)) {
    return core;
  }

  // Orange Money: 080XXXXXXX, 084XXXXXXX, 085XXXXXXX, 089XXXXXXX (10 chiffres, commence par 0)
  if (opUpper === 'ORANGE' || /^(80|84|85|89)/.test(core)) {
    return '0' + core;
  }

  // Africell: 090XXXXXXX (10 chiffres, commence par 090)
  if (opUpper === 'AFRICELL' || /^90/.test(core)) {
    return '0' + core;
  }

  // Vodacom: 243 + 81/82/83 (12 chiffres)
  if (opUpper === 'VODACOM' || opUpper === 'MPESA' || opUpper === 'M-PESA' || /^(81|82|83)/.test(core)) {
    return '243' + core;
  }

  // Fallback par défaut si l'opérateur n'est pas clair
  if (core.length === 9) {
    if (/^(97|98|99)/.test(core)) return core;
    if (/^(80|84|85|89|90)/.test(core)) return '0' + core;
    if (/^(81|82|83)/.test(core)) return '243' + core;
  }

  return cleaned;
}

export class TwigaPaieClient {
  private proxyUrl: string;
  private clientWebhookUrl: string;

  constructor(proxyUrl = DEFMAKS_PROXY_URL, clientWebhookUrl = PUNCHY_WEBHOOK_URL) {
    this.proxyUrl = proxyUrl;
    this.clientWebhookUrl = clientWebhookUrl;
  }

  /**
   * Initialise un paiement Mobile Money via le Proxy DefMaks
   */
  async initiatePayment(params: InitiatePaymentParams) {
    const formattedPhone = normalizePhone(params.phoneNumber, params.channel);

    const payload = {
      endpoint: '/payments/payment-service',
      method: 'POST',
      amount: String(params.amount),
      currency: params.currency.toUpperCase(),
      // Clés de compatibilité TwigaPaie
      customer_phone_number: formattedPhone,
      customer_phone: formattedPhone,
      payment_operator: params.channel,
      channel: params.channel,
      external_reference: params.orderId,
      client_order_id: params.orderId,
      order_id: params.orderId,
      description: params.description ?? `Achat Punchy #${params.orderId}`,
    };

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        responseData.message ||
        responseData.error ||
        `Échec de l'initiation du paiement USSD (${response.status})`
      );
    }

    return responseData;
  }

  /**
   * Polling du statut avec déclenchement optionnel du Webhook Métier (dmks: 'webhook')
   */
  async checkPaymentStatus(params: CheckPaymentParams) {
    const payload: Record<string, any> = {
      endpoint: '/payments/payment-check',
      method: 'POST',
      order_id: params.orderId,
      client_order_id: params.orderId,
    };

    if (params.triggerWebhookOnSuccess) {
      payload.dmks = 'webhook';
      payload.client_webhook_url = this.clientWebhookUrl;
    }

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        responseData.message ||
        responseData.error ||
        'Échec de la vérification du statut.'
      );
    }

    return responseData;
  }
}

export const twigaPaieClient = new TwigaPaieClient();