# Architecture & Intégration de l'Administration Punchy

Ce document consigne toutes les indications techniques et architecturales pour l'administration de Punchy, hébergée sur le dépôt dédié :
- **Dépôt GitHub Admin** : [https://github.com/DefMaks/Tombola](https://github.com/DefMaks/Tombola)
- **Session AI Studio Admin** : [https://aistudio.google.com/apps/c87d2493-110c-424b-b632-f8d60db73e28](https://aistudio.google.com/apps/c87d2493-110c-424b-b632-f8d60db73e28)
- **Application Client / PWA Joueur (ce dépôt)** : Interface mobile joueur, participation aux rounds, paiements Mobile Money (TwigaPaie / Africa's Talking) et réception des notifications Web-Push.

---

## 1. Séparation des Responsabilités

| Domaine | Application Client (`Punchy PWA`) | Application Admin (`Tombola / Admin`) |
| :--- | :--- | :--- |
| **Rôle** | Expérience Joueur, Achat de tickets (Punches), Profil, PWA | Gestion des tirages, validation des gagnants, déclenchement des pushs & SMS, finances |
| **Interface** | Mobile-First, thème sombre (#0F172A), zéro composant admin | Tableau de bord de gestion (Back-office Tombola) |
| **Base de Données** | PostgreSQL partagée (Cloud SQL) | PostgreSQL partagée (Cloud SQL) |
| **Notifications Push** | Collecte des souscriptions (`sw.js`) via `/api/notifications/subscribe` | Configuration des modèles, programmation des heures (08h30/18h30), envoi de notifications flash |
| **Cron Jobs** | Déclenchement automatique via `/api/cron/notifications` | Consultation des métriques et historiques des envois |

---

## 2. Base de Données Partagée (PostgreSQL)

Les deux applications (Client et Admin) sont connectées à la même instance PostgreSQL. Voici les tables utilisées pour le système de notifications et l'administration :

### A. Table `push_subscribers`
Stocke les abonnements Web-Push des navigateurs et smartphones (Android Chrome, iOS Safari PWA, etc.) :
```sql
CREATE TABLE IF NOT EXISTS push_subscribers (
  id VARCHAR(64) PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  user_id VARCHAR(64),
  city VARCHAR(64) DEFAULT 'Kinshasa',
  commune VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_notified_at TIMESTAMP WITH TIME ZONE
);
```

### B. Table `push_settings`
Configuration globale du système d'automatisation des notifications :
```sql
CREATE TABLE IF NOT EXISTS push_settings (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'global',
  is_enabled BOOLEAN DEFAULT TRUE,
  morning_time VARCHAR(10) DEFAULT '08:30',
  evening_time VARCHAR(10) DEFAULT '18:30',
  morning_sent_date VARCHAR(20),
  evening_sent_date VARCHAR(20),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### C. Table `push_templates`
Gabarits de notifications (12 modèles officiels) :
```sql
CREATE TABLE IF NOT EXISTS push_templates (
  id VARCHAR(64) PRIMARY KEY,
  slot VARCHAR(32) NOT NULL, -- 'morning', 'evening', 'event', 'transactional'
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  url VARCHAR(255) DEFAULT '/',
  is_active BOOLEAN DEFAULT TRUE,
  badge VARCHAR(64) DEFAULT 'Round du Jour',
  variables JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### D. Table `push_history_logs`
Traçabilité complète des envois et métriques de délivrabilité :
```sql
CREATE TABLE IF NOT EXISTS push_history_logs (
  id VARCHAR(64) PRIMARY KEY,
  template_id VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  target_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  trigger_type VARCHAR(32) DEFAULT 'manual', -- 'morning_cron', 'evening_cron', 'manual', 'event'
  error_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Les 12 Gabarits Officiels de Notifications

Ces 12 modèles sont pré-configurés et peuvent être exploités ou modifiés depuis l'application d'administration `Tombola` :

### Créneaux du Matin (08h30 - Kinshasa)
1. **`morning_draw_today`** : « 🌅 Punchy Matin : Nouveau Round disponible ! »
   * Corps : *Participe dès maintenant pour tenter de remporter la cagnotte du jour.*
2. **`morning_special_round`** : « ⚡ Round Spécial en cours ! »
   * Corps : *Le Round {round_name} est ouvert ! Ne laisse pas passer ta chance.*
3. **`morning_winner_alert`** : « 🏆 Félicitations au gagnant d'hier ! »
   * Corps : *Hier, un Puncher a empoché la cagnotte. Aujourd'hui, c'est peut-être toi !*
4. **`morning_weekend_pot`** : « 🎉 Super Cagnotte du Week-end ! »
   * Corps : *Les gains grimpent ce week-end sur Punchy. Prends ton Punch à 1$ !*

### Créneaux du Soir (18h30 - Kinshasa)
5. **`evening_draw_tonight_non_particip`** : « ⏳ Plus que quelques heures avant le tirage ! »
   * Corps : *Tu n'as pas encore validé ton Punch pour le tirage de ce soir. Fonce !*
6. **`evening_last_call`** : « 🚨 Dernier appel : Fermeture du Round dans 1h ! »
   * Corps : *Les compteurs tournent. Valide ton ticket avant le verrouillage.*
7. **`evening_flash_round`** : « 🔥 Round Flash : Cagnotte débloquée ! »
   * Corps : *Un tirage express a lieu ce soir. Reçois ton résultat en direct.*
8. **`evening_weekend_fever`** : « 🌙 Soirée Punchy : Tirage des Champions ! »
   * Corps : *La cagnotte est au sommet. Vérifie tes tickets actifs !*

### Événements & Transactionnel
9. **`custom_flash`** : « 📢 Alerte Flash Punchy »
   * Modèle personnalisable pour diffusions urgentes / annonces spéciales.
10. **`ticket_confirmed`** : « 🎟️ Punch Validé ! »
   * Corps : *Ton ticket pour le {round_name} est bien enregistré. Bonne chance !*
11. **`winner_congrats`** : « 🏆 TU AS GAGNÉ SUR PUNCHY ! »
   * Corps : *Félicitations ! Tu remportes {amount} USD sur le {round_name}.*
12. **`wallet_funded`** : « 💳 Dépôt confirmé »
   * Corps : *Ton compte Punchy a été crédité avec succès.*

---

## 4. Clés VAPID (Web-Push Standard RFC 8292)

Pour assurer la cohérence cryptographique entre le navigateur joueur et l'envoi depuis le serveur admin, les deux applications doivent partager les mêmes clés VAPID :

```env
VAPID_PUBLIC_KEY=BG7gKH2UhWQPx9DHfWbl7UIO-HQ7MNqMyNXqkatfP9ewwZcdfPPha8P27orLqhfbEHsmG0cW37GreLFqwnykrr4
VAPID_PRIVATE_KEY=Vk7AJtKqFlulvbxEQuuvec9gR2QuPKY04dO2YchEhgg
VAPID_SUBJECT=mailto:contact@punchy.cd
```

*Note : La clé publique est distribuée automatiquement aux clients via l'endpoint `/api/notifications/subscribe`.*

---

## 5. Endpoints API Disponibles sur le Client Punchy

L'application client expose les routes suivantes :

| Méthode | Route | Usage |
| :--- | :--- | :--- |
| `GET` | `/api/notifications/subscribe` | Renvoie `{ success: true, publicKey }` pour permettre au navigateur d'enregistrer la souscription push. |
| `POST` | `/api/notifications/subscribe` | Enregistre l'abonnement push d'un utilisateur dans la table `push_subscribers`. |
| `GET` | `/api/cron/notifications` | Déclenché par un scheduler externe (ex: Vercel Cron, Google Cloud Scheduler) toutes les minutes ou à 08h30 / 18h30. Vérifie le créneau Kinshasa (UTC+1) et envoie automatiquement la campagne du jour. |
| `GET / POST` | `/api/admin/notifications` | API interne de secours pour piloter les réglages et déclencher un envoi flash (accessible via Bearer token ou appel serveur). |

---

## 6. Actions pour l'application Admin `Tombola`

Dans le projet [https://github.com/DefMaks/Tombola](https://github.com/DefMaks/Tombola) :
1. **Connecter la même URL de base de données** (`DATABASE_URL`).
2. **Utiliser le package standard `web-push`** de Node.js avec les clés VAPID ci-dessus pour envoyer des notifications push directement à partir de la table `push_subscribers`.
3. **Nettoyer les abonnements obsolètes** : Si Google/Mozilla renvoie un code HTTP `410 Gone` ou `404 Not Found` lors d'un envoi push, passer `is_active = FALSE` sur la ligne correspondante dans `push_subscribers`.
