# 📖 Manuel d'Implémentation : Tombolas Territoriales & Profils Joueurs (Kinshasa)
> **Application cible :** [`https://github.com/DefMaks/Tombola`](https://github.com/DefMaks/Tombola)  
> **Base de données :** Neon PostgreSQL  
> **Date :** Août 2026

---

## 1. Migration SQL de la Base de Données (Neon PostgreSQL)

Exécutez ce script SQL sur votre instance Neon pour ajouter les colonnes requises aux tables `raffles` et `users` :

```sql
-- 1. Table des tombolas (raffles)
ALTER TABLE raffles 
ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) DEFAULT 'CITY', -- 'CITY' (Toute la ville) ou 'COMMUNE'
ADD COLUMN IF NOT EXISTS target_city VARCHAR(100) DEFAULT 'Kinshasa',
ADD COLUMN IF NOT EXISTS target_commune VARCHAR(100) DEFAULT NULL, -- Ex: 'Gombe', 'Lemba', 'Limete'
ADD COLUMN IF NOT EXISTS min_participants INT DEFAULT 1, -- Quorum minimum requis pour autoriser le tirage
ADD COLUMN IF NOT EXISTS winners_count INT DEFAULT 1; -- Nombre de vainqueurs (1 à 5 max, lots égaux)

-- 2. Table des utilisateurs (users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Kinshasa',
ADD COLUMN IF NOT EXISTS commune VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commune_updated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commune_locked_until TIMESTAMPTZ DEFAULT NULL;

-- 3. Index recommandés pour la performance du ciblage géographique
CREATE INDEX IF NOT EXISTS idx_raffles_scope ON raffles (scope_type, target_city, target_commune);
CREATE INDEX IF NOT EXISTS idx_users_commune ON users (city, commune);
```

---

## 2. Référentiel des 24 Communes de Kinshasa

Créez le fichier de constantes `src/constants/communes.ts` :

```typescript
export const KINSHASA_COMMUNES = [
  'Bandalungwa',
  'Barumbu',
  'Bumbu',
  'Gombe',
  'Kalamu',
  'Kasa-Vubu',
  'Kimbanseke',
  'Kinshasa',
  'Kisenso',
  'Lemba',
  'Limete',
  'Lingwala',
  'Makala',
  'Maluku',
  'Masina',
  'Matete',
  'Mont-Ngafula',
  'Ndjili',
  'Ngaba',
  'Ngaliema',
  'Ngiri-Ngiri',
  'Nsele',
  'Selembao',
] as const;

export type KinshasaCommune = typeof KINSHASA_COMMUNES[number];
```

---

## 3. Inscription Utilisateur (Signup) avec Sélection de Commune

Lors de l'inscription d'un nouvel utilisateur :
1. Proposez obligatoirement la sélection parmi les 24 communes de Kinshasa.
2. Initialisez automatiquement le champ `commune_locked_until` à **90 jours dans le futur (`NOW() + INTERVAL '90 days'`)**.

### Exemple d'API Route d'Inscription (`/api/auth/signup` ou fonction serveur) :

```typescript
import { sql } from '@/lib/neon';

export async function handleSignup(userData: {
  fullName: string;
  phoneNumber: string;
  email?: string;
  commune: string;
}) {
  const [newUser] = await sql`
    INSERT INTO users (
      full_name,
      phone_number,
      email,
      city,
      commune,
      commune_updated_at,
      commune_locked_until,
      created_at,
      updated_at
    ) VALUES (
      ${userData.fullName},
      ${userData.phoneNumber},
      ${userData.email || null},
      'Kinshasa',
      ${userData.commune},
      NOW(),
      NOW() + INTERVAL '90 days',
      NOW(),
      NOW()
    )
    RETURNING id, full_name, phone_number, city, commune, commune_locked_until;
  `;

  return newUser;
}
```

---

## 4. Règle Anti-Opportunisme : Verrouillage de la Commune pendant 3 Mois (90j)

Dans l'espace **Mon Profil / Paramètres**, l'utilisateur peut consulter sa commune. S'il tente de la modifier :
- Si `new Date() < new Date(user.commune_locked_until)` : **Refuser la modification** et afficher la date de fin de verrouillage et le nombre de jours restants.
- Si le délai de 90 jours est dépassé : **Autoriser la modification** et réinitialiser `commune_locked_until` à `NOW() + INTERVAL '90 days'`.

### Exemple de Fonction Backend (`updateUserCommune`) :

```typescript
export async function updateUserCommune(userId: string, newCommune: string) {
  // 1. Vérification de l'utilisateur existant
  const [user] = await sql`
    SELECT id, commune, commune_locked_until 
    FROM users 
    WHERE id = ${userId}::uuid
  `;

  if (!user) {
    return { success: false, message: 'Utilisateur introuvable.' };
  }

  // 2. Contrôle du verrou temporel
  if (user.commune_locked_until) {
    const lockDate = new Date(user.commune_locked_until);
    const now = new Date();

    if (lockDate.getTime() > now.getTime()) {
      const remainingDays = Math.ceil((lockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        success: false,
        remainingDays,
        message: `Votre commune est verrouillée pour 3 mois. Modification impossible avant le ${lockDate.toLocaleDateString('fr-FR')} (encore ${remainingDays} jour(s) de blocage).`,
      };
    }
  }

  // 3. Mise à jour de la commune et réinitialisation du verrou de 90 jours
  const [updated] = await sql`
    UPDATE users 
    SET 
      commune = ${newCommune},
      commune_updated_at = NOW(),
      commune_locked_until = NOW() + INTERVAL '90 days',
      updated_at = NOW()
    WHERE id = ${userId}::uuid
    RETURNING id, commune, commune_locked_until;
  `;

  return {
    success: true,
    message: `Commune mise à jour avec succès : "${newCommune}". Nouveau verrou de 3 mois activé.`,
    user: updated,
  };
}
```

---

## 5. Filtrage & Affichage des Tombolas Côté Utilisateur

### Règle d'Affichage :
Un utilisateur connecté résidant à **Lemba** doit voir :
1. Les tombolas de **Tout Kinshasa** (`scope_type = 'CITY'` ou `target_commune IS NULL`).
2. Les tombolas spécifiques à **Lemba** (`scope_type = 'COMMUNE' AND target_commune = 'Lemba'`).
*(Les tombolas exclusives à Gombe, Limete, etc. ne sont pas affichées dans son flux).*

### Requête SQL :

```typescript
export async function getVisibleTombolas(userCommune?: string | null) {
  if (!userCommune) {
    // Utilisateur non connecté : tombolas globales de toute la ville
    return await sql`
      SELECT * FROM raffles 
      WHERE (scope_type = 'CITY' OR target_commune IS NULL)
        AND status IN ('ACTIVE', 'SCHEDULED')
      ORDER BY created_at DESC;
    `;
  }

  // Utilisateur connecté : Kinshasa + Sa commune
  return await sql`
    SELECT * FROM raffles 
    WHERE (scope_type = 'CITY' OR target_commune IS NULL)
       OR (scope_type = 'COMMUNE' AND LOWER(target_commune) = LOWER(${userCommune}))
    ORDER BY 
      CASE WHEN LOWER(target_commune) = LOWER(${userCommune}) THEN 0 ELSE 1 END,
      created_at DESC;
  `;
}
```

---

## 6. Contrôle Serveur à l'Achat de Tickets

Avant d'accepter un paiement ou de générer des tickets pour une tombola communale, assurez-vous de vérifier l'éligibilité du joueur côté backend :

```typescript
export async function validateTicketPurchase(userId: string, raffleId: string) {
  const [raffle] = await sql`SELECT id, title, scope_type, target_commune FROM raffles WHERE id = ${raffleId}::uuid`;
  const [user] = await sql`SELECT id, full_name, commune FROM users WHERE id = ${userId}::uuid`;

  if (!raffle || !user) {
    throw new Error('Données invalides.');
  }

  // Si la tombola est communale, le joueur doit résider dans cette même commune
  if (raffle.scope_type === 'COMMUNE' && raffle.target_commune) {
    if ((user.commune || '').toLowerCase() !== raffle.target_commune.toLowerCase()) {
      throw new Error(
        `Cette tombola est exclusivement réservée aux résidents de la commune de ${raffle.target_commune}. Votre commune enregistrée est : "${user.commune || 'Non définie'}".`
      );
    }
  }

  return { eligible: true };
}
```

---

## 7. Composants UI & Expérience Utilisateur

### A. Badge de Portée Territoriale sur les Cartes
```tsx
{raffle.scope_type === 'COMMUNE' && raffle.target_commune ? (
  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
    📍 Réservé aux résidents de {raffle.target_commune}
  </span>
) : (
  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
    🌆 Toute la ville de Kinshasa
  </span>
)}
```

### B. Badge 1 à 5 Gagnants (Option A : Lots Égaux)
```tsx
<span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
  🏆 {raffle.winners_count} Gagnant(s) (Parts Égales)
</span>
```

### C. Jauge du Quorum Minimal Requis
```tsx
<div className="space-y-1 mt-2">
  <div className="flex justify-between text-[11px] text-slate-400">
    <span>Quorum requis</span>
    <span className="font-bold text-slate-200">
      {raffle.tickets_sold} / {raffle.min_participants} participants
    </span>
  </div>
  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-300 ${
        raffle.tickets_sold >= raffle.min_participants ? 'bg-emerald-500' : 'bg-amber-500'
      }`}
      style={{
        width: `${Math.min(100, (raffle.tickets_sold / Math.max(1, raffle.min_participants)) * 100)}%`,
      }}
    />
  </div>
  {raffle.tickets_sold < raffle.min_participants && (
    <p className="text-[10px] text-amber-400/90 italic">
      * Tirage déclenché dès que le seuil de {raffle.min_participants} participants est atteint.
    </p>
  )}
</div>
```

---

## 8. Tableau de Synthèse des Règles Métier

| Fonctionnalité | Règle Métier | Implémentation |
| :--- | :--- | :--- |
| **Portée Géographique** | Ville (Kinshasa) ou Commune spécifique | Champ `scope_type` ('CITY'/'COMMUNE') et `target_commune` |
| **Inscription (Signup)** | Saisie obligatoire de la commune de résidence | Sélecteur des 24 communes au formulaire d'inscription |
| **Verrouillage Commune** | 3 mois (90 jours) de blocage strict | `commune_locked_until = now() + interval '90 days'` |
| **Visibilité Joueur** | Kinshasa + Commune de résidence uniquement | Filtre SQL `target_commune IS NULL OR target_commune = user.commune` |
| **Éligibilité d'Achat** | Blocage serveur si commune différente | Validation `user.commune === raffle.target_commune` |
| **Vainqueurs Multiples** | 1 à 5 gagnants (Option A : Lots égaux) | Paramètre `winners_count` et distribution égale des gains |
| **Quorum Minimum** | Pas de tirage si seuil non atteint | Paramètre `min_participants` requis avant validation du tirage |
