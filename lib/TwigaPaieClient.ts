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
 * Normalise les numéros de téléphone pour la RDC au format strict "243XXXXXXXXX"
 */
function normalizePhone(phone: string): string {
  let cleaned = phone.trim().replace(/\s+/g, '').replace(/^\+/, '');

  if (cleaned.startsWith('0')) {
    cleaned = '243' + cleaned.substring(1);
  } else if (!cleaned.startsWith('243') && cleaned.length === 9) {
    cleaned = '243' + cleaned;
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
    const formattedPhone = normalizePhone(params.phoneNumber);

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