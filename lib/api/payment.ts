import { formatDRCPhone } from '@/lib/auth/actions';

export interface InitiatePaymentParams {
  raffle_slug: string;
  quantity: number;
  phone_number: string;
  operator: string;
  full_name?: string;
}

/**
 * Initiate a Mobile Money payment transaction via TwigaPaie proxy
 */
export async function initiatePayment(params: InitiatePaymentParams) {
  const formattedPhone = formatDRCPhone(params.phone_number);
  if (!formattedPhone || formattedPhone.length < 12) {
    throw new Error('Veuillez entrer un numéro RDC valide (ex: 0820000000 ou +243820000000)');
  }

  const res = await fetch('/api/payment/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      phone_number: formattedPhone,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erreur lors de l\'initialisation du paiement');
  }

  return {
    ...data,
    formattedPhone,
  };
}

/**
 * Check transaction status (useful for webhooks auto-polling)
 */
export async function checkPaymentStatus(transactionId: string) {
  if (!transactionId) return null;
  const res = await fetch(`/api/payment/status/${transactionId}`);
  if (!res.ok) return null;
  return await res.json();
}

/**
 * Confirm transaction (for demo / simulation mode)
 */
export async function confirmPaymentDemo(transactionId: string, success: boolean = true) {
  const res = await fetch('/api/payment/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id: transactionId, success }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erreur lors de la confirmation du paiement');
  }

  return data;
}
