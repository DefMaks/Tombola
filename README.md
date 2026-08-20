# Punchy — Tombola participative DEFMAKS 🎟️

> **PWA mobile-first** de tombolas participatives à **1$** avec tirage cryptographique équitable **SHA-256**, paiement Mobile Money (M-Pesa / Orange / Airtel) via TwigaPaie, et transparence publique vérifiable.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org) [![Neon](https://img.shields.io/badge/Postgres-Neon-blue)](https://neon.tech) [![Supabase](https://img.shields.io/badge/Ads-Supabase-3ECF8E)](https://supabase.com) [![PWA](https://img.shields.io/badge/PWA-installable-purple)](/)

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js ≥ 20
- Yarn (jamais npm)
- Une base **Neon Postgres** (connection string)
- Un projet **Supabase** avec l'Edge Function `create-defmaks-transaction` déployée
- Un compte **Uploadcare** (pour les photos de témoignages)

### Variables d'environnement (`/app/.env`)

```env
# Base de données principale (Neon)
DATABASE_URL=postgresql://<user>:<pwd>@<host>.neon.tech/neondb?sslmode=require

# Payment gateway (TwigaPaie proxy via Supabase Edge Function)
TWIGA_PROXY_URL=https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/create-defmaks-transaction
TWIGA_WALLET_ID=03def227-a52c-44be-aa6c-5c1939ec374d

# Upload photos témoignages
UPLOADCARE_PUBLIC_KEY=<public_key>
NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=<public_key>

# Publicités (Supabase REST)
SUPABASE_URL=https://hcpogyjdbtcxndzpyjvd.supabase.co
SUPABASE_ANON_KEY=<eyJhbGci...>

# Variables Emergent (ne pas modifier)
MONGO_URL=mongodb://localhost:27017
NEXT_PUBLIC_BASE_URL=<url publique>
```

### Installation

```bash
cd /app
yarn install
node scripts/init-db.js       # crée procédures SQL + seed data
node scripts/migrate-v2.js    # migrations v2 (featured, testimonials, ads)
sudo supervisorctl restart nextjs
```

### Accès
- Local : http://localhost:3000
- Public : `${NEXT_PUBLIC_BASE_URL}`

---

## 🎨 Stack technique

| Couche | Technologie |
|---|---|
| Framework | **Next.js 15** (App Router) |
| UI | React 19 + Tailwind CSS + shadcn/ui + Lucide + Framer Motion |
| Data-fetching | TanStack Query (polling temps réel) |
| Base de données | **Neon Postgres** (via `pg`) |
| Auth | Aucune (MVP — identification par n° téléphone) |
| Storage média | Uploadcare (upload direct depuis le client) |
| Paiement | TwigaPaie via Supabase Edge Function `create-defmaks-transaction` |
| Publicités | Supabase REST API (`advertisements` table, mirror Neon) |
| PWA | Manifest standalone, iOS Add-to-Home-Screen banner, theme `#0F172A` |

---

## 📱 Pages

| Route | Description |
|---|---|
| `/` | Home — pub, tombola featured, grille active, gagnants récents |
| `/raffles/[slug]` | Détails, achat de tickets (M-Pesa/Orange/Airtel), USSD |
| `/my-tickets` | 3 onglets : tickets actifs, gains, transactions |
| `/transparency` | Liste des tombolas vérifiables |
| `/transparency/[raffleId]` | Seed + hash SHA-256 + vérification navigateur `crypto.subtle` |
| `/profile` | Compte + gestion témoignages (photo + texte) si vainqueur |

---

## 🔑 Endpoints API (préfixe `/api`)

### Public
- `GET /categories` — Liste catégories
- `GET /raffles?category=&status=` — Liste tombolas
- `GET /raffles/:slug` — Détail (medias inclus)
- `GET /raffles/:slug/live` — Compteur tickets temps réel
- `GET /raffles/:slug/recent-tickets` — 10 dernières ventes (phones masqués)
- `GET /ads/:zone` — Publicités (Supabase live, fallback Neon)
- `GET /transparency/:idOrSlug` — Détails tirage + hash serveur

### Paiement
- `POST /payment/initiate` — Appelle TwigaPaie, crée `transactions` PENDING
- `POST /payment/confirm` — Marque SUCCESS + `fulfill_raffle_tickets`
- `GET /payment/status/:txId` — Statut d'une transaction

### Utilisateur (identifié par phone)
- `GET /my/tickets?phone=`
- `GET /my/winning?phone=`
- `GET /my/transactions?phone=`
- `POST /testimonials` — Soumet un témoignage (vainqueur uniquement)
- `GET /testimonials?phone=[&raffle_slug=]`

### Admin (à protéger via reverse proxy / mTLS / clé secrète)
- `GET /admin/raffles`
- `POST /admin/raffles`
- `POST /admin/raffles/:id/draw`
- `POST /admin/raffles/:id/media`
- `POST /admin/raffles/:id/status`

Voir [`ADMIN.md`](./ADMIN.md) pour le détail.

---

## 🎲 Équité du tirage — SHA-256

```
seed = 'DEFMAKS_1USD_RAFFLE' | raffle_id | confirmed_count | epoch
hash = SHA-256(seed) (hex)
index = abs(int(hash[0..12], 16)) mod confirmed_count
winning = tickets ordered by ticket_number LIMIT 1 OFFSET index
```

Le `seed` et le `hash` sont **publics** sur `/transparency/[slug]` et peuvent être **recalculés dans le navigateur** via `crypto.subtle.digest('SHA-256', ...)`.

---

## 📚 Documentation

- [`CONTEXT.md`](./CONTEXT.md) — Contexte business & vision produit
- [`SPECIFICATIONS.md`](./SPECIFICATIONS.md) — Spécifications fonctionnelles & techniques
- [`ADMIN.md`](./ADMIN.md) — Guide de l'administration externe
- [`AUDIT.md`](./AUDIT.md) — Audit sécurité / dette technique / roadmap

---

## 🐛 Debug

```bash
tail -f /var/log/supervisor/nextjs.out.log
tail -f /var/log/supervisor/nextjs.err.log
```

Base de données :
```bash
node -e "require('/app/lib/db').query('SELECT count(*) FROM tickets').then(r => console.log(r.rows))"
```

---

**Made in RDC 🇨🇩 · DEFMAKS · 2026**
