# Rapport Technique : Géolocalisation des Vues et Partages

## 1. État Actuel
Actuellement, les vues et les partages sont de simples compteurs incrémentés (colonnes `views_count` et `shares_count`) dans la table `raffles`. L'API `POST /api/raffles/[slug]/track` ne prend aucun paramètre supplémentaire que le type d'action.

## 2. Objectif
Le but est d'ajouter un suivi (tracking) détaillé de ces événements pour enregistrer *qui* a vu ou partagé, *quand*, et surtout *où* (ville, commune), afin d'affiner le ciblage et proposer des recommandations géolocalisées.

## 3. Plan d'Architecture & Base de Données

### A. Création de la table `raffle_tracking_logs`
Nous allons créer une nouvelle table dans PostgreSQL pour archiver chaque événement.

```sql
CREATE TABLE IF NOT EXISTS raffle_tracking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(20) NOT NULL, -- 'VIEW' ou 'SHARE'
    city VARCHAR(100),
    commune VARCHAR(100),
    ip_address VARCHAR(45), -- Optionnel, pour le tracking visiteur
    user_agent TEXT, -- Optionnel, pour statistiques d'appareils
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour accélérer les requêtes de statistiques géographiques
CREATE INDEX idx_raffle_tracking_loc ON raffle_tracking_logs(city, commune, action_type);
```

### B. Évolution de l'API (`app/api/[[...path]]/route.ts`)
La route `/api/raffles/[slug]/track` devra être modifiée.

**Nouvelle logique de l'API :**
1. **Identifier l'utilisateur :** Le frontend devra envoyer un token JWT (ou le numéro de téléphone) s'il est connecté.
2. **Récupérer la localisation :**
   - **Si utilisateur connecté :** On récupère sa `city` et `commune` via la table `users`.
   - **Si visiteur anonyme :** On peut utiliser l'en-tête `x-forwarded-for` et un service comme Vercel Edge Geo (`req.geo`) ou ip-api pour deviner la ville.
3. **Double écriture :**
   - L'API continue d'incrémenter le compteur rapide (`views_count` ou `shares_count`) dans la table `raffles`.
   - L'API insère une nouvelle ligne détaillée dans `raffle_tracking_logs`.

### C. Modification du Frontend (`app/raffles/[slug]/RaffleDetailClient.jsx`)
La fonction `registerShare` (et l'équivalent pour les vues) doit être mise à jour pour inclure l'identité de l'utilisateur.

```javascript
// Exemple de modification
const registerShare = async () => {
  try {
    const userPhone = localStorage.getItem('punchy_user_phone'); // ou le state auth
    await fetch(`/api/raffles/${raffle.slug}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          type: 'share',
          phone_number: userPhone // Facultatif, permet l'identification
      }),
    });
  } catch (e) {
    console.warn('Share track error:', e);
  }
};
```

## 4. Exploitation Future des Données
Une fois cette table remplie, l'administration pourra :
- **Requêter les tendances par commune :** `SELECT commune, COUNT(*) as vues FROM raffle_tracking_logs WHERE raffle_id = X GROUP BY commune`
- **Recommandations :** Si un utilisateur se connecte depuis la "Gombe", le backend fera un `SELECT raffle_id FROM raffle_tracking_logs WHERE commune = 'Gombe' GROUP BY raffle_id ORDER BY COUNT(*) DESC LIMIT 5` pour lui suggérer les tombolas les plus populaires de sa commune.

---
*Ce rapport technique peut être partagé avec l'équipe d'administration pour la synchronisation de la prochaine étape de développement.*
