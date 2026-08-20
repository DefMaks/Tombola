# ADMIN.md — Gestion & Modération Punchy

> **L'administration est pilotée dans un projet externe.** Ce document décrit la **structure**, les **endpoints API**, les **procédures SQL** et les **actions administratives** disponibles côté back-end Punchy.

---

## 1. Base de données (Neon Postgres)

Connexion : `DATABASE_URL` (variable d'environnement `/app/.env`).

### Tables principales

| Table | Rôle |
|---|---|
| `users` | Comptes utilisateurs (phone_number, full_name, role) |
| `categories` | Catégories de tombolas (Tech, Fashion, Vehicles, Appliances) |
| `raffles` | Tombolas (avec colonne **`is_featured`** pour mise en avant) |
| `transactions` | Paiements TwigaPaie (PENDING / SUCCESS / FAILED) |
| `tickets` | Tickets achetés (numérotation atomique) |
| `raffle_medias` | Photos/vidéos produits + preuves de livraison |
| `testimonials` | Témoignages vainqueurs à modérer (**PENDING / APPROVED / REJECTED**) |
| `advertisements` | Publicités affichées par zone (mirror du schéma Supabase) |

### Enums

- `raffle_status` : `DRAFT`, `ACTIVE`, `PAUSED`, `PENDING_DRAW`, `COMPLETED`, `CANCELLED`
- `raffle_type` : `DAILY`, `WEEKLY`, `MONTHLY`, `THRESHOLD`
- `ticket_status` : `PENDING`, `CONFIRMED`, `CANCELLED`
- `transaction_status` : `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`
- `user_role` : `USER`, `ADMIN`, `AUDITOR`
- `media_type` : `IMAGE`, `VIDEO_PROOF`

### Procédures SQL

#### `fulfill_raffle_tickets(raffle_id, user_id, transaction_id, quantity)`
Réservation atomique de tickets avec `SELECT ... FOR UPDATE`.
Auto-passe la tombola en `PENDING_DRAW` si `tickets_sold >= max_tickets`.

```sql
SELECT * FROM fulfill_raffle_tickets(
  'uuid-raffle', 'uuid-user', 'uuid-tx', 5
);
```

#### `execute_fair_raffle_draw(raffle_id, seed_prefix?)`
Tirage cryptographique SHA-256.
Seed = `<prefix>|<raffle_id>|<confirmed_count>|<epoch>`.
Winner index = `abs(hash_int(first 48 bits)) % confirmed_count`.
Met à jour `raffles.status='COMPLETED'`, `winning_ticket_id`, `draw_seed`, `drawn_at`.

```sql
SELECT * FROM execute_fair_raffle_draw(
  'uuid-raffle', 'DEFMAKS_1USD_RAFFLE'
);
-- Returns: winning_ticket_number, winning_ticket_id, seed, hash_hex
```

---

## 2. Endpoints API Admin

Base URL : `${NEXT_PUBLIC_BASE_URL}/api`

### Tombolas

| Méthode | Endpoint | Body/Params |
|---|---|---|
| `GET`  | `/admin/raffles` | Liste toutes les tombolas (tous statuts) |
| `POST` | `/admin/raffles` | `{ title, description, ticket_price, currency, max_tickets, type, category_slug, hero_image_url, ends_in_days, is_featured? }` |
| `POST` | `/admin/raffles/:id/draw` | Déclenche le tirage SHA-256 |
| `POST` | `/admin/raffles/:id/media` | `{ type: 'IMAGE'\|'VIDEO_PROOF', url, caption }` |
| `POST` | `/admin/raffles/:id/status` | `{ status: 'ACTIVE'\|'PAUSED'\|... }` |

### Témoignages (modération)

> À ajouter côté admin externe : liste + approve/reject.

Requêtes SQL types :

```sql
-- Liste PENDING
SELECT t.*, u.phone_number, r.title AS raffle_title
FROM testimonials t
JOIN users u ON u.id = t.user_id
JOIN raffles r ON r.id = t.raffle_id
WHERE t.status = 'PENDING'
ORDER BY t.created_at DESC;

-- Approuver
UPDATE testimonials SET status='APPROVED', updated_at=now() WHERE id='...';

-- Rejeter
UPDATE testimonials SET status='REJECTED', updated_at=now() WHERE id='...';
```

### Publicités (advertisements)

Table locale sur Neon (mirror schéma Supabase). Zones supportées : `home`, `inner`, `single`, `page`, `coinshop`, `in_read`, `adv`, `void`.

```sql
INSERT INTO advertisements (title, description, image_url, start_date, end_date, status, is_active, zone, external_link)
VALUES ('Titre', 'Desc', 'https://...', now(), now() + interval '30 days', 'en cours', true, 'home', 'https://defmaks.com');
```

> ✅ L'API `/api/ads/:zone` (public, GET) tente d'abord Supabase REST si `SUPABASE_ANON_KEY` est présente dans l'env, sinon fallback sur Neon.

---

## 3. Actions administratives à implémenter côté back-office

1. **CRUD Tombolas**
   - Créer / éditer / suspendre / supprimer
   - Marquer `is_featured = true` (seule 1 tombola à la fois recommandé)
   - Uploader photos/vidéos → `raffle_medias`

2. **Tirage** — déclencher manuellement `execute_fair_raffle_draw()` ou automatiser via cron quand `tickets_sold = max_tickets`.

3. **Modération témoignages** — liste PENDING → approve/reject.

4. **Gestion pubs** — CRUD sur `advertisements` par zone.

5. **Vérification paiements** — inspecter `transactions.raw_response` pour debug TwigaPaie (statut, provider_reference).

6. **Réconciliation** — cron qui vérifie les transactions `PENDING > 15 min` et interroge TwigaPaie pour marquer `SUCCESS`/`FAILED`.

---

## 4. Variables d'environnement

```env
DATABASE_URL=postgresql://...neon.tech/neondb   # Base de données Punchy
TWIGA_PROXY_URL=https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/create-defmaks-transaction
TWIGA_WALLET_ID=03def227-a52c-44be-aa6c-5c1939ec374d
UPLOADCARE_PUBLIC_KEY=46beee9be2df550b8604    # Upload photos témoignages
NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=46beee9be2df550b8604
SUPABASE_ANON_KEY=<clé anon pour lire advertisements côté serveur>  # OPTIONNEL
```

---

## 5. Sécurité & équité

- Toutes les insertions de tickets passent par `fulfill_raffle_tickets()` (transaction + FOR UPDATE lock).
- Le `draw_seed` est **public** et **vérifiable** par n'importe qui via `/transparency/[slug]` (calcul SHA-256 dans le navigateur).
- Les numéros de téléphone sont **masqués** en public (ex: `+243****78`).
- Aucune authentification utilisateur en MVP — identification par numéro téléphone (à durcir avant production).

---

**Contact technique** : voir README.md pour la stack et les endpoints publics.
