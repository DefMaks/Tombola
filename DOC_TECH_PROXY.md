Voici la proposition globale complète et structurée à soumettre à l'équipe Supabase (ou à votre revue d'architecture) pour avis et validation.

Elle est découpée en **3 parties** :

1. **L'Edge Function Centrale Maître** (`twigapaie-proxy`) hébergée sur le projet central DefMaks.
2. **Le Helper / SDK Client TypeScript Universel** réutilisable dans tous vos projets (Lokko, Punchy, MyGlim, Katuni, etc.).
3. **Un exemple d'Edge Function Webhook Métier** (ex: projet **Punchy**) montrant la réception, le traitement de l'idempotence et le crédit des objets du jeu.

---

### Part 1: Central Edge Function Proxy (`twigapaie-proxy`)

*Hébergée sur le projet Supabase Maître (DefMaks).*

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Variables d'environnement sécurisées
const TWIGAPAIE_API_URL =
  Deno.env.get('TWIGAPAIE_API_URL') ||
  'https://api-gateway-production-9ad5.up.railway.app/api';
const TWIGAPAIE_API_KEY = Deno.env.get('TWIGAPAIE_API_KEY') || '';

// Whitelist optionnelle des endpoints autorisés sur TwigaPaie pour des raisons de sécurité
const ALLOWED_ENDPOINTS = [
  '/payments/payment-service',
  '/payments/payment-check',
  '/payments/verify-status',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

serve(async (req) => {
  // 1. Gestion des requêtes OPTIONS (CORS Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: Record<string, any> = {};
    const contentType = req.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      try {
        body = await req.json();
      } catch (_) {
        // Corps vide ou invalide
      }
    }

    // 2. Extraire les métadonnées de contrôle DefMaks
    const dmksOption = body.dmks; // Ex: 'webhook'
    const clientWebhookUrl = body.client_webhook_url; // URL de destination du projet métier
    const endpoint = body.endpoint || '/payments/payment-service';
    const httpMethod = (body.method || 'POST').toUpperCase();

    // 3. Validation de sécurité de l'endpoint
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const isAllowed = ALLOWED_ENDPOINTS.some((allowed) => path.startsWith(allowed));
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: `Endpoint '${path}' non autorisé.` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Nettoyage de la charge utile (on retire les paramètres réservés au proxy)
    const {
      endpoint: _,
      method: __,
      dmks: ___,
      client_webhook_url: ____,
      ...cleanBody
    } = body;

    const targetUrl = `${TWIGAPAIE_API_URL}${path}`;

    // 5. Relais vers l'API TwigaPaie
    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        Authorization: `Bearer ${TWIGAPAIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    if (httpMethod !== 'GET' && httpMethod !== 'HEAD' && Object.keys(cleanBody).length > 0) {
      fetchOptions.body = JSON.stringify(cleanBody);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch (_) {
      responseData = { raw: responseText };
    }

    // 6. Feature DefMaks : Déclenchement automatique du Webhook lors du Polling/Check
    if (dmksOption === 'webhook' && response.ok) {
      const apiData = responseData?.data || responseData;
      const statusCode = Number(apiData?.status);

      // Si le statut TwigaPaie signale un succès (Status 2 = Payé)
      if (statusCode === 2 && clientWebhookUrl) {
        console.log(`[Proxy DMKS] Payment Confirmed! Relaying asynchronously to ${clientWebhookUrl}`);

        // Notification asynchrone non-bloquante du backend métier
        fetch(clientWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'DEFMAKS_TWIGAPAIE_PROXY',
            event: 'PAYMENT_SUCCESS',
            payload: responseData,
          }),
        }).catch((err) =>
          console.error('❌ Erreur lors du relais Webhook client :', err)
        );
      }
    }

    // 7. Renvoi transparent au client
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('🚨 [Proxy Error] :', error);
    return new Response(
      JSON.stringify({ error: 'Proxy Internal Error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

```

---

### Part 2: SDK / Client TypeScript Universel (`TwigaPaieClient.ts`)

*À intégrer dans n'importe quelle application cliente (Lokko, Punchy, MyGlim).*

```typescript
export interface InitiatePaymentParams {
  amount: number;
  currency: 'USD' | 'CDF';
  phoneNumber: string;
  orderId: string; // Ex: "PUNCHY-GEMS-50-USR992" ou "LOKKO-RENT-402"
  channel?: string; // Ex: "MPESA", "ORANGE", "AIRTEL"
}

export interface CheckPaymentParams {
  orderId: string;
  triggerWebhookOnSuccess?: boolean;
}

export class UniversalTwigaPaieClient {
  private proxyUrl: string;
  private clientWebhookUrl?: string;

  constructor(proxyUrl: string, clientWebhookUrl?: string) {
    this.proxyUrl = proxyUrl;
    this.clientWebhookUrl = clientWebhookUrl;
  }

  /**
   * Initialise un paiement via le Proxy DefMaks
   */
  async initiatePayment(params: InitiatePaymentParams) {
    const payload = {
      endpoint: '/payments/payment-service',
      method: 'POST',
      amount: params.amount,
      currency: params.currency,
      phone_number: params.phoneNumber,
      order_id: params.orderId,
      channel: params.channel,
    };

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return await response.json();
  }

  /**
   * Vérifie le statut d'un paiement (Polling) et déclenche automatiquement le webhook métier si payé
   */
  async checkPaymentStatus(params: CheckPaymentParams) {
    const payload: Record<string, any> = {
      endpoint: '/payments/payment-check',
      method: 'POST',
      order_id: params.orderId,
    };

    if (params.triggerWebhookOnSuccess && this.clientWebhookUrl) {
      payload.dmks = 'webhook';
      payload.client_webhook_url = this.clientWebhookUrl;
    }

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return await response.json();
  }
}

```

---

### Part 3: Webhook Métier + Idempotence (Exemple Projet `Punchy`)

*Edge Function locale au projet (ex: `punchy-project.supabase.co/functions/v1/twigapaie-webhook`).*

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const body = await req.json();
    const data = body.payload?.data || body.payload || body;
    
    const orderId: string = data.order_id || data.external_reference;
    const status: number = Number(data.status);

    // On ne traite que les paiements validés (Status 2)
    if (status !== 2 || !orderId) {
      return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 });
    }

    // 1. GESTION DE L'IDEMPOTENCE (Table `processed_transactions`)
    // On essaie d'insérer l'orderId dans une table avec contrainte UNIQUE
    const { error: insertError } = await supabase
      .from('processed_transactions')
      .insert([{ transaction_ref: orderId, status: 'COMPLETED' }]);

    if (insertError) {
      // Code PG 23505 = Violated Unique Constraint (Doublon détecté !)
      if (insertError.code === '23505') {
        console.log(`⚠️ Transactions ${orderId} déjà traitée (Idempotence active). Ignoré.`);
        return new Response(
          JSON.stringify({ status: 'already_processed', order_id: orderId }),
          { status: 200 }
        );
      }
      throw insertError;
    }

    // 2. DÉCOUPAGE MÉTIER DE L'ORDER_ID (Convention Ex: "PUNCHY-GEMS-500-USR992")
    const parts = orderId.split('-');
    const appName = parts[0];     // "PUNCHY"
    const itemType = parts[1];    // "GEMS"
    const quantity = parseInt(parts[2], 10); // 500
    const userId = parts[3];      // "USR992"

    if (appName === 'PUNCHY' && itemType === 'GEMS') {
      // Créditer l'utilisateur dans la BDD de Punchy
      const { error: updateError } = await supabase.rpc('add_user_gems', {
        user_id_param: userId,
        gems_to_add: quantity,
      });

      if (updateError) throw updateError;

      console.log(`✅ ${quantity} Gemmes créditées avec succès pour l'utilisateur ${userId}`);
    }

    return new Response(JSON.stringify({ status: 'success', order_id: orderId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erreur Traitement Webhook :', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

```

---

### Résumé de l'Architecture à Présenter

| Composant | Rôle principal | Dépendance Métier |
| --- | --- | --- |
| **`twigapaie-proxy`** *(Maître DefMaks)* | Masquage de la clé API, routage HTTP universel, déclencheur optionnel de Webhook. | **0%** (Agnostique) |
| **`TwigaPaieClient`** *(SDK)* | Encapsulation des requêtes REST vers le Proxy avec formatage d'URL. | **0%** (Agnostique) |
| **`order_id`** *(Convention)* | Injecte le domaine métier (`PUNCHY-GEMS-500-USR992` ou `LOKKO-RENT-102`). | **100%** (Métier) |
| **`Webhook Local`** *(Satellite)* | Valide l'idempotence via Postgres (`UNIQUE constraint`) et applique les règles métiers. | **100%** (Métier) |