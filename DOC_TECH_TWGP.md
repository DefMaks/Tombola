Voici les spécifications d'intégration et la structure des payloads de **TwigaPaie** pour le traitement des paiements Mobile Money et l'implémentation du Webhook de confirmation.

---

## 1. Documentation Technique de l'API TwigaPaie

### Architecture d'Intégration

L'intégration s'effectue en deux phases :

1. **Initiation du Paiement (Outbound) :** Votre backend (ou la Supabase Edge Function Proxy) envoie une requête POST pour initier la collecte Mobile Money.
2. **Confirmation Asynchrone / Callback (Inbound) :** TwigaPaie envoie un HTTP POST à votre Webhook lorsque le statut de la transaction passe à `SUCCESS` ou `FAILED`.

---

### Phase 1 : Initiation de la Transaction (Deposit)

**Endpoint Proxy :** `POST [https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/create-defmaks-transaction](https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/create-defmaks-transaction)`

**Headers :**

```http
Content-Type: application/json

```

#### Exemple de Payload d'Initiation (Request) :

```json
{
  "wallet_id": "03def227-a52c-44be-aa6c-5c1939ec374d",
  "amount": 10.00,
  "currency": "USD",
  "transaction_type": "DEPOSIT",
  "transaction_platform": "EMONEY",
  "description": "Achat 2 ticket(s) Tombola Punchy #DMKS-9842",
  "external_reference": "MERCH-PUNCHY-1770781322",
  "customer_phone_number": "+243810000000",
  "payment_operator": "AIRTEL"
}

```

#### Exemple de Réponse d'Initiation (Response 200 OK) :

```json
{
  "status": "SUCCESS",
  "code": "200",
  "message": "Transaction initiated successfully. Waiting for customer USSD confirmation.",
  "data": {
    "transaction_id": "TWIGA-TX-883920194",
    "merchant_reference": "MERCH-PUNCHY-1770781322",
    "status": "PENDING",
    "amount": 10.00,
    "currency": "USD",
    "created_at": "2026-08-11T03:42:00Z"
  }
}

```

---

### Phase 2 : Callback / Webhook TwigaPaie (Notification de Statut)

Une fois le code PIN USSD saisi par l'utilisateur sur son téléphone, TwigaPaie envoie la notification suivante sur votre endpoint Webhook (`/api/webhooks/twigapaie`).

#### Exemple de Payload Webhook reçu par votre serveur :

```json
{
  "event": "transaction.updated",
  "transaction_id": "TWIGA-TX-883920194",
  "merchant_reference": "MERCH-PUNCHY-1770781322",
  "external_reference": "MERCH-PUNCHY-1770781322",
  "status": "SUCCESS",
  "amount": 10.00,
  "currency": "USD",
  "customer_phone": "+243810000000",
  "operator": "AirtelMoney",
  "paid_at": "2026-08-11T03:42:15Z",
  "metadata": {
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "raffle_id": "e3a890a1-7d12-4f3b-8711-2099f1234567",
    "quantity": 2
  },
  "signature": "a8f5f167f44f4964e6c998dee827110c"
}

```

---

## 2. Implémentation du Webhook Handler dans Next.js (Route Handler)

Ce handler intercepte la confirmation TwigaPaie, valide le paiement, et exécute la fonction SQL atomique `fulfill_raffle_tickets` sur votre base Neon.

Fichier : `app/api/webhooks/twigapaie/route.ts`

```ts
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Initialisation du client SQL Neon
const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // 1. Vérification du statut de la transaction
    if (payload.status !== 'SUCCESS') {
      console.warn(`[TwigaPaie Webhook] Transaction non réussie: ${payload.merchant_reference} (${payload.status})`);
      return NextResponse.json({ received: true, status: 'ignored' }, { status: 200 });
    }

    // 2. Extraction des métadonnées et paramètres
    const {
      transaction_id: provider_reference,
      merchant_reference,
      customer_phone: phone_used,
      operator,
      amount,
      currency,
      metadata
    } = payload;

    // Métadonnées injectées lors de la commande
    const raffle_id = metadata?.raffle_id;
    const user_id = metadata?.user_id;
    const quantity = parseInt(metadata?.quantity || '1', 10);

    if (!raffle_id || !user_id) {
      return NextResponse.json({ error: 'Missing metadata parameters' }, { status: 400 });
    }

    // 3. Appel de la fonction atomique SQL `fulfill_raffle_tickets` dans Neon
    const result = await sql`
      SELECT * FROM fulfill_raffle_tickets(
        ${raffle_id}::UUID,
        ${user_id}::UUID,
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

    console.log(`[Punchy Webhook Success] Tickets réservés:`, {
      transaction_id: fulfilledTransaction.transaction_id,
      tickets: fulfilledTransaction.ticket_numbers
    });

    // 4. Réponse 200 OK requise par TwigaPaie pour acquitter le callback
    return NextResponse.json({
      success: true,
      transaction_id: fulfilledTransaction.transaction_id,
      ticket_numbers: fulfilledTransaction.ticket_numbers
    }, { status: 200 });

  } catch (error: any) {
    console.error('[TwigaPaie Webhook Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

```