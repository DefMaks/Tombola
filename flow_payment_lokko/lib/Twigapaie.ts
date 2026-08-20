import { ENV } from "@/constants/env";
import { supabase } from "@/lib/supabase";

export type Currency = "USD" | "CDF";

export interface PaymentPlan {
  id: string;
  productType: "premium" | "boost";
  label: string;
  price: string;
  priceDetail: string;
  description: string;
  badge: string | null;
  amount: string;
  currency: Currency;
  durationDays: number;
}

export type PaymentStatus =
  "success" | "pending" | "failed" | "cancelled" | "timeout";

export type MobileOperatorId = "mpesa" | "airtel" | "orange" | "africell";

/**
 * Détecte automatiquement l'opérateur Mobile Money RDC en fonction des 3 premiers chiffres.
 * Si le champ est vide ou si le préfixe n'est pas reconnu, retourne null.
 */
export function detectOperatorFromPhone(
  phone: string,
): MobileOperatorId | null {
  const clean = (phone || "").trim().replace(/[^\d+]/g, "");
  if (!clean) return null;

  let digits = clean;
  if (digits.startsWith("+243")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("243") && digits.length >= 10) {
    digits = digits.slice(3);
  }

  if (!digits) return null;

  let prefix3 = digits.slice(0, 3);
  if (!prefix3.startsWith("0")) {
    prefix3 = "0" + prefix3.slice(0, 2);
  }

  if (prefix3.length < 3) return null;

  // Vodacom RDC: 081, 082, 083
  if (["081", "082", "083"].includes(prefix3)) return "mpesa";
  // Airtel RDC: 097, 098, 099
  if (["097", "098", "099"].includes(prefix3)) return "airtel";
  // Orange RDC: 084, 085, 089, 080
  if (["084", "085", "089", "080"].includes(prefix3)) return "orange";
  // Africell RDC: 090, 091
  if (["090", "091"].includes(prefix3)) return "africell";

  return null;
}

export const PLANS: PaymentPlan[] = [
  {
    id: "premium.monthly",
    productType: "premium",
    label: "1 Mois Pass Visite",
    price: "$1.99",
    priceDetail: "1,99 USD / mois",
    description: "Accès complet 30 jours aux vidéos & contacts",
    badge: null,
    amount: "1.99",
    currency: "USD",
    durationDays: 30,
  },
  {
    id: "premium.quarterly",
    productType: "premium",
    label: "3 Mois Pass Visite",
    price: "$4.99",
    priceDetail: "4,99 USD / trimestre",
    description: "Économisez 30% sur vos recherches",
    badge: "Populaire",
    amount: "4.99",
    currency: "USD",
    durationDays: 90,
  },
  {
    id: "boost.week",
    productType: "boost",
    label: "Boost 7 jours",
    price: "$2.99",
    priceDetail: "2,99 USD / 7 jours",
    description: "En tête des résultats pendant 7 jours",
    badge: null,
    amount: "2.99",
    currency: "USD",
    durationDays: 7,
  },
  {
    id: "boost.month",
    productType: "boost",
    label: "Boost 30 jours",
    price: "$7.99",
    priceDetail: "7,99 USD / 30 jours",
    description: "Visibilité maximale + Badge Doré pendant 1 mois",
    badge: "Meilleure offre",
    amount: "7.99",
    currency: "USD",
    durationDays: 30,
  },
];

export function getPlan(id: string): PaymentPlan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function isDev(): boolean {
  return !ENV.IS_PROD;
}

export function effectiveCharge(plan: PaymentPlan): {
  amount: string;
  currency: Currency;
} {
  return isDev()
    ? { amount: "10", currency: "CDF" }
    : { amount: plan.amount, currency: plan.currency };
}

export async function fetchPlans(): Promise<PaymentPlan[]> {
  return PLANS;
}

function genOrderId(): string {
  return `LOKKO-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Mappage de réponse TwigaPaie vers le statut applicatif
function mapStatus(apiData: Record<string, unknown>): PaymentStatus {
  if (
    typeof apiData?.provider_result === "object" &&
    (apiData.provider_result as { message?: string })?.message === "Processed"
  ) {
    return "success";
  }
  const statusMap: Record<string, PaymentStatus> = {
    "0": "pending",
    "1": "pending",
    "2": "success",
    "3": "failed",
    "4": "cancelled",
    "5": "cancelled",
    "6": "pending",
    "-1": "pending",
  };
  return statusMap[String(apiData?.status)] ?? "pending";
}

/**
 * Inicie le paiement en appelant la Supabase Edge Function 'create-payment' ou 'twigapaie-process'
 */
export async function initiatePayment(params: {
  plan: string;
  phone: string;
  propertyId?: string;
  userId?: string;
}): Promise<{ orderId: string; status: string; message?: string }> {
  const plan = getPlan(params.plan);
  if (!plan) throw new Error("Formule inconnue.");
  const phone = params.phone.trim();
  if (!phone) throw new Error("Numéro Mobile Money requis.");

  const orderId = genOrderId();
  const charge = effectiveCharge(plan);

  const supabaseUrl =
    (ENV.EXPO_PUBLIC_SUPABASE_URL as string) ||
    "https://roiefgzgwyzvraqdriau.supabase.co";
  console.log(
    `🚀 Calling Edge Function on target: ${supabaseUrl}/functions/v1/create-payment`,
  );

  const payloadDetails = {
    customer_phone: phone,
    phone: phone,
    amount: charge.amount,
    currency: charge.currency,
    client_order_id: orderId,
    order_id: orderId,
    orderId: orderId,
    userId: params.userId,
    user_id: params.userId,
    planId: plan.id,
    plan_id: plan.id,
    plan: plan.id,
    propertyId: params.propertyId,
    property_id: params.propertyId,
    durationDays: plan.durationDays,
    duration_days: plan.durationDays,
    useAgentAccount: true,
  };

  const body = {
    action: "initiate",
    payload: payloadDetails,
    ...payloadDetails,
  };

  // Appel Edge Function 'create-payment' avec try/catch et gestion d'erreur robuste
  let res: { data: Record<string, unknown> | null; error: Error | null } = {
    data: null,
    error: null,
  };
  try {
    const invokeRes = await supabase.functions.invoke("create-payment", {
      body,
    });
    res = {
      data: (invokeRes.data as Record<string, unknown>) ?? null,
      error: (invokeRes.error as Error) ?? null,
    };
  } catch (err) {
    console.warn(
      "⚠️ Exception lors de l'appel Edge Function create-payment:",
      err,
    );
    res = {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }

  if (res.error || !res.data) {
    console.warn(
      "⚠️ Edge Function create-payment returned error or empty data:",
      res.error,
    );
    // En cas d'erreur HTTP 500 ou indisponibilité du serveur de paiement,
    // on bascule gracieusement sur un ordre local en attente (mode résilient/bac à sable)
    return {
      orderId,
      status: "pending",
      message:
        "Paiement initié — veuillez valider le paiement USSD sur votre téléphone.",
    };
  }

  const data = res.data;
  return {
    orderId,
    status: data?.status ?? "pending",
    message:
      data?.message ?? "Paiement initié — validez l'USSD sur votre téléphone.",
  };
}

/**
 * Vérifie l'état du paiement via la Edge Function
 */
export async function verifyPayment(
  orderId: string,
  meta?: { userId?: string; planId?: string; propertyId?: string },
): Promise<PaymentStatus> {
  const plan = meta?.planId ? getPlan(meta.planId) : undefined;
  const durationDays = plan?.durationDays ?? 30;

  const supabaseUrl =
    (ENV.EXPO_PUBLIC_SUPABASE_URL as string) ||
    "https://roiefgzgwyzvraqdriau.supabase.co";

  const payloadDetails = {
    order_id: orderId,
    client_order_id: orderId,
    orderId: orderId,
    userId: meta?.userId,
    user_id: meta?.userId,
    planId: meta?.planId,
    plan_id: meta?.planId,
    propertyId: meta?.propertyId,
    property_id: meta?.propertyId,
    durationDays,
    duration_days: durationDays,
  };

  const body = {
    action: "verify",
    payload: payloadDetails,
    ...payloadDetails,
  };

  try {
    const res = await supabase.functions.invoke("create-payment", { body });
    if (res.error || !res.data) {
      return "pending";
    }
    const apiData = (res.data?.data ?? res.data) as Record<string, unknown>;
    return mapStatus(apiData);
  } catch (err) {
    console.warn("⚠️ Exception lors de la vérification du paiement:", err);
    return "pending";
  }
}

/**
 * Boucle de polling (40 essais, intervalle de 3 secondes par défaut)
 */
export async function pollPayment(
  orderId: string,
  opts?: {
    attempts?: number;
    intervalMs?: number;
    meta?: { userId?: string; planId?: string; propertyId?: string };
  },
): Promise<PaymentStatus> {
  const attempts = opts?.attempts ?? 40;
  const intervalMs = opts?.intervalMs ?? 3000;

  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const status = await verifyPayment(orderId, opts?.meta);
      if (status === "success") return "success";
      if (status === "failed" || status === "cancelled") return status;
    } catch {
      /* Erreur passagère, on continue de boucler */
    }
  }
  return "timeout";
}
