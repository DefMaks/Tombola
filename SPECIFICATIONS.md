# SPECIFICATIONS.md — Spécifications fonctionnelles & techniques

> Document contractuel pour l'équipe produit, back-office et intégrateurs tiers.

---

## 1. Vocabulaire métier

| Terme | Définition |
|---|---|
| **Tombola (Raffle)** | Un tirage au sort avec une quantité maximale de tickets à 1$ |
| **Ticket** | Un droit de participation individuel numéroté (1 à N) |
| **Draw** | Le tirage cryptographique désignant le ticket gagnant |
| **Seed** | Chaîne unique combinée qui alimente le hash SHA-256 |
| **Threshold** | Type de tombola qui se tire dès que `tickets_sold >= max_tickets` |
| **Featured** | Tombola mise en avant en haut de la page d'accueil (1 à la fois recommandé) |
| **Testimonial** | Témoignage photo + texte laissé par un vainqueur, modéré avant publication |
| **Ad / Publicité** | Contenu sponsorisé affiché par zone (home, inner, single, etc.) |

---

## 2. Règles fonctionnelles

### 2.1 Achat de tickets

**Conditions** :
- La tombola doit être en statut `ACTIVE`
- `quantity <= max_tickets - tickets_sold`
- `quantity ∈ [1, 100]`
- Le numéro de téléphone doit être fourni + un opérateur (M-Pesa / Orange / Airtel)

**Flow** :
1. Frontend appelle `POST /api/payment/initiate`
2. Backend crée/récupère l'utilisateur par numéro (upsert)
3. Backend appelle **TwigaPaie proxy** avec `external_reference = DMKS_RAFFLE_<epoch>_<rand>`
4. Backend crée `transactions` en `PENDING` (raw_response stocké)
5. Frontend affiche l'écran USSD + réf marchande
6. TwigaPaie push USSD au téléphone → utilisateur confirme code PIN
7. Confirmation → `POST /api/payment/confirm` → **`fulfill_raffle_tickets()`** (atomique)
8. Tickets créés avec statut `CONFIRMED`, numéros séquentiels
9. Si `tickets_sold >= max_tickets` → raffle passe en `PENDING_DRAW`

**Idempotence** :
- Chaque `transactions` a un `merchant_reference` unique
- Réappel de `confirm` sur une tx `SUCCESS` → 400 `Already SUCCESS`

### 2.2 Tirage équitable (SHA-256)

**Formule** :
```
confirmed_count = COUNT(tickets WHERE raffle_id = X AND status = 'CONFIRMED')
seed = 'DEFMAKS_1USD_RAFFLE' | raffle_id | confirmed_count | epoch_seconds
hash = SHA-256(seed).hex
index = |bit_to_bigint(hash[0..12])| mod confirmed_count
winning_ticket = tickets ORDER BY ticket_number LIMIT 1 OFFSET index
```

**Post-tirage** :
- `raffles.status = 'COMPLETED'`
- `raffles.winning_ticket_id = <id>`
- `raffles.draw_seed = <seed>`
- `raffles.drawn_at = now()`

**Vérification** : n'importe qui peut recalculer `SHA-256(seed)` dans son navigateur via `crypto.subtle.digest('SHA-256', encoder.encode(seed))` et comparer au `hash_hex` retourné par l'API. En cas de match, l'équité est prouvée mathématiquement.

### 2.3 Témoignages

**Conditions pour soumettre** :
- L'utilisateur doit exister (`users.phone_number`)
- Une tombola avec `raffles.winning_ticket_id` doit référencer un ticket dont `user_id` est celui de l'utilisateur
- Aucun `testimonials` existant pour ce couple `(user_id, raffle_id)` (contrainte UNIQUE)

**Champs requis** :
- `photo_url` — URL Uploadcare (upload direct depuis le client)
- `message` — texte 10-500 caractères

**Statuts** : `PENDING` (défaut) → `APPROVED` ou `REJECTED` (modération admin externe)

**Affichage UI** :
- Bouton **"Laisser un témoignage"** visible si aucun `testimonials` pour cette tombola
- Après soumission, bouton **disparaît**, remplacé par badge de statut :
  - `PENDING` → ⏰ "En attente de modération"
  - `APPROVED` → ✅ "Approuvé"
  - `REJECTED` → ❌ "Refusé"

### 2.4 Publicités (advertisements)

**Source primaire** : Supabase REST (`hcpogyjdbtcxndzpyjvd`)  
**Source fallback** : Neon local mirror (table `advertisements`)

**Filtres appliqués** :
- `zone = :param`
- `is_active = true`
- `status = 'en cours'` (Supabase) — ou entre `start_date` et `end_date` (Neon)
- Trié par `created_at DESC`, limité à 5

**Zones support** : `home`, `inner`, `single`, `page`, `coinshop`, `in_read`, `adv`, `void`

**Interaction** :
- Si `external_link` → ouverture nouvel onglet
- Sinon si `inner_link` → routage interne
- Sinon → bloc statique non-cliquable

### 2.5 Featured raffle

**Règle** : `raffles.is_featured = true` — 1 tombola active à la fois idéalement.  
**Rendu** : bloc premium au-dessus de la grille "🔥 Tombolas actives", avec badge "⭐ MIS EN AVANT", image 16:10, bouton "Participer →".

---

## 3. Modèle de données

### 3.1 Tables

#### `users`
```sql
id              UUID PK
phone_number    VARCHAR UNIQUE NOT NULL
full_name       VARCHAR
role            user_role DEFAULT 'USER'
created_at      TIMESTAMPTZ
```

#### `categories`
```sql
id          UUID PK
name        TEXT
slug        TEXT UNIQUE
icon_url    TEXT
```

#### `raffles`
```sql
id                    UUID PK
category_id           UUID FK → categories
title                 TEXT
slug                  TEXT UNIQUE
description           TEXT
ticket_price          NUMERIC(10,2) DEFAULT 1
currency              TEXT DEFAULT 'USD'
max_tickets           INT NOT NULL
tickets_sold          INT DEFAULT 0
type                  raffle_type   -- DAILY | WEEKLY | MONTHLY | THRESHOLD
status                raffle_status -- DRAFT | ACTIVE | PAUSED | PENDING_DRAW | COMPLETED | CANCELLED
winning_ticket_id     UUID
draw_seed             TEXT
starts_at             TIMESTAMPTZ NOT NULL
ends_at               TIMESTAMPTZ
drawn_at              TIMESTAMPTZ
hero_image_url        TEXT
is_featured           BOOLEAN DEFAULT false
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

#### `tickets`
```sql
id                UUID PK
raffle_id         UUID FK → raffles ON DELETE CASCADE
user_id           UUID FK → users
transaction_id    UUID FK → transactions
ticket_number     INT NOT NULL
status            ticket_status DEFAULT 'CONFIRMED'
purchased_at      TIMESTAMPTZ
UNIQUE (raffle_id, ticket_number)
```

#### `transactions`
```sql
id                    UUID PK
user_id               UUID FK → users
raffle_id             UUID FK → raffles
provider_reference    TEXT
merchant_reference    TEXT UNIQUE NOT NULL
phone_used            TEXT
operator              TEXT   -- MPESA | ORANGE | AIRTEL
amount                NUMERIC(12,2)
currency              TEXT DEFAULT 'USD'
quantity              INT DEFAULT 1
status                transaction_status DEFAULT 'PENDING'  -- PENDING | SUCCESS | FAILED | REFUNDED
raw_response          JSONB
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

#### `raffle_medias`
```sql
id              UUID PK
raffle_id       UUID FK → raffles ON DELETE CASCADE
type            media_type   -- IMAGE | VIDEO_PROOF
url             TEXT
caption         TEXT
display_order   INT
created_at      TIMESTAMPTZ
```

#### `testimonials`
```sql
id            UUID PK
user_id       UUID FK → users
raffle_id     UUID FK → raffles
ticket_id     UUID FK → tickets
photo_url     TEXT NOT NULL
message       TEXT NOT NULL
status        TEXT DEFAULT 'PENDING'  -- PENDING | APPROVED | REJECTED
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
UNIQUE (user_id, raffle_id)
```

#### `advertisements` (mirror Supabase)
```sql
id              BIGSERIAL PK
title           TEXT NOT NULL
description     TEXT
image_url       TEXT NOT NULL
start_date      TIMESTAMPTZ NOT NULL
end_date        TIMESTAMPTZ NOT NULL
status          TEXT DEFAULT 'en cours'
is_active       BOOLEAN DEFAULT true
zone            TEXT
inner_link      TEXT
external_link   TEXT
target          TEXT[]
created_at      TIMESTAMPTZ
```

---

## 4. Contrats API

### 4.1 POST `/api/payment/initiate`

**Body** :
```json
{
  "raffle_slug": "iphone-15-pro-max",
  "quantity": 5,
  "phone_number": "+243812345678",
  "operator": "MPESA",
  "full_name": "Jean Muamba"   // optionnel
}
```

**Response 200** :
```json
{
  "transaction": { "id": "uuid", "status": "PENDING", "merchant_reference": "DMKS_RAFFLE_..." },
  "twiga": { "ok": false, "status": 401, "data": {...} },
  "message": "..."
}
```

### 4.2 POST `/api/payment/confirm`

**Body** :
```json
{ "transaction_id": "uuid", "success": true }
```

**Response 200** :
```json
{
  "transaction": { "status": "SUCCESS" },
  "tickets": [ { "ticket_id": "uuid", "ticket_number": 157 } ]
}
```

### 4.3 GET `/api/transparency/:idOrSlug`

**Response 200** :
```json
{
  "raffle": { "id": "...", "draw_seed": "DEFMAKS_1USD_RAFFLE|...", "drawn_at": "..." },
  "winning_ticket": { "id": "...", "ticket_number": 157 },
  "winner_user": { "phone_number": "+243****78" },
  "verified_hash": "c6f..."
}
```

### 4.4 POST `/api/testimonials`

**Body** :
```json
{
  "phone": "+243812345678",
  "raffle_slug": "air-jordan-1",
  "photo_url": "https://ucarecdn.com/xxx/",
  "message": "Merci DEFMAKS !"
}
```

**Response 200** : testimonial complet en `PENDING`  
**Response 403** : `Not a winner of this raffle`  
**Response 409** : `Témoignage déjà soumis`

---

## 5. Contraintes non-fonctionnelles

### 5.1 Performance
- p95 API < 400 ms
- LCP < 2.5s sur 4G RDC
- Polling temps réel : 4s (détails) / 15s (home) / 60s (ads)

### 5.2 Disponibilité
- SLA cible : 99.5% (~3.6h downtime/mois)
- Failover Supabase → Neon mirror pour les pubs (implémenté)

### 5.3 Sécurité
- HTTPS obligatoire (Kubernetes Ingress)
- Toutes les requêtes DB paramétrées
- Numéros PII masqués en public
- Anon key Supabase respecte RLS

### 5.4 Accessibilité
- Contraste WCAG AA minimum (dark theme validé)
- Touch targets ≥ 44×44 px
- Alt text sur toutes les images de tombolas

### 5.5 PWA
- Installable via manifest
- Standalone display
- Theme color `#0F172A`
- iOS Add-to-Home-Screen banner Safari (custom)

---

## 6. Environnements

| Env | URL | DB | Deploy |
|---|---|---|---|
| Local | `http://localhost:3000` | Neon dev branch | `yarn dev` |
| Preview | `${NEXT_PUBLIC_BASE_URL}` | Neon main | Supervisor auto |
| Prod | *à définir* | Neon main (fork prod) | Vercel / Fly.io recommandé |

---

## 7. Glossaire d'acronymes

- **PWA** : Progressive Web App
- **RDC** : République Démocratique du Congo
- **USSD** : Unstructured Supplementary Service Data (paiement Mobile Money interactif)
- **MM** : Mobile Money (M-Pesa, Orange Money, Airtel Money)
- **RLS** : Row-Level Security (Supabase)
- **SHA-256** : Secure Hash Algorithm 256-bit (fonction de hachage cryptographique)
- **PII** : Personally Identifiable Information
- **LCP** : Largest Contentful Paint (métrique Core Web Vital)
- **CDF** : Franc Congolais (devise RDC)

---

**Version du document** : 2.0 · **Dernière mise à jour** : 2026-08-04
