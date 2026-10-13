// Google Analytics 4 (GA4) Client Utilities

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Envoie un événement de page vue
 */
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) return;
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

/**
 * Événement personnalisé générique
 */
export const trackEvent = (action: string, params: Record<string, any> = {}) => {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) return;
  window.gtag('event', action, params);
};

/**
 * Vue détaillée d'une tombola (e-commerce standard: view_item)
 */
export const trackRaffleView = (raffle: {
  id: string | number;
  title: string;
  ticketPrice?: number;
  category?: string;
}) => {
  trackEvent('view_item', {
    currency: 'XOF',
    value: raffle.ticketPrice || 0,
    items: [
      {
        item_id: String(raffle.id),
        item_name: raffle.title,
        item_category: raffle.category || 'Tombola',
        price: raffle.ticketPrice || 0,
        quantity: 1,
      },
    ],
  });
};

/**
 * Achat de ticket confirmé (e-commerce standard: purchase)
 */
export const trackTicketPurchase = (data: {
  transactionId?: string;
  raffleId: string | number;
  raffleTitle: string;
  ticketCount: number;
  totalAmount: number;
  paymentMethod?: string;
}) => {
  trackEvent('purchase', {
    transaction_id: data.transactionId || `tx_${Date.now()}`,
    value: data.totalAmount,
    currency: 'XOF',
    payment_type: data.paymentMethod || 'Mobile Money',
    items: [
      {
        item_id: String(data.raffleId),
        item_name: data.raffleTitle,
        item_category: 'Ticket',
        price: data.ticketCount > 0 ? Math.round(data.totalAmount / data.ticketCount) : data.totalAmount,
        quantity: data.ticketCount,
      },
    ],
  });
};

/**
 * Partage d'une tombola (standard: share)
 */
export const trackShare = (data: {
  raffleId: string | number;
  method?: string;
}) => {
  trackEvent('share', {
    method: data.method || 'whatsapp',
    content_type: 'raffle',
    item_id: String(data.raffleId),
  });
};

/**
 * Connexion réussie (standard: login)
 */
export const trackLogin = (method = 'phone_otp') => {
  trackEvent('login', {
    method,
  });
};
