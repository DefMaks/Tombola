# Politique et Stratégie des Notifications Push - Punchy

Ce document détaille la politique éditoriale, les règles de déclenchement temporel, et la gestion des notifications push Web / PWA pour l'application **Punchy**.  
Il sert de cahier des charges et de guide pour **l'équipe d'administration**, qui aura la main sur la rédaction des textes, les créneaux horaires et l'ajustement des règles d'arbitrage.

---

## 1. Principes Fondamentaux & Éthique Anti-Spam

1. **La règle du "Golden Push" (1 notification max par créneau) :**  
   Même si plusieurs rounds sont actifs simultanément, un utilisateur ne reçoit au maximum qu'**une seule notification le matin** et **une seule notification le soir**.
2. **Pas de bruit sans valeur :**  
   Si aucun round n'est actif ou si aucun événement significatif n'a lieu, **aucune notification n'est envoyée**.
3. **Redirection contextuelle :**  
   Chaque clic sur une notification doit ouvrir directement l'application sur la page exacte concernée (la page du round `/raffles/{slug}` ou la liste filtrée).
4. **Fuseau horaire de référence :**  
   Toutes les heures sont planifiées selon le fuseau horaire de **Kinshasa / RDC (WAT, UTC+1)**.

---

## 2. Typologie des Rounds & Temporalités de Tirage

| Catégorie de Round | Durée type | Fréquence de tirage | Rôle dans l'engagement |
| :--- | :--- | :--- | :--- |
| **Quotidien (Express)** | ~24 heures | Tous les soirs (ex: 20h00) | Habitude quotidienne, excitation immédiate |
| **Hebdomadaire** | 7 jours | Fin de semaine (ex: Dimanche soir) | Anticipation sur quelques jours, panier moyen plus élevé |
| **Mensuel** | 30 jours | Fin de chaque mois | Grand rendez-vous régulier avec lot premium |
| **Ultime (Personnalisé)** | Variable (ex: 15, 45, 60 jours ou lié à un palier) | Fixé à une date événementielle ou au palier 100% | Événement exceptionnel, très forte attractivité |

---

## 3. Les Créneaux de Diffusion Quotidiens

### 🌅 Créneau Matin : Découverte & Nouveautés (Plage recommandée : 08h30 - 09h00)

* **Objectif :** Informer des nouveaux rounds disponibles pour la journée ou la semaine.
* **Conditions de déclenchement :** 
  * Uniquement s'il y a au moins un nouveau round lancé dans les dernières 24h ou en cours d'ouverture.
* **Arbre de décision :**
  * **Cas 1 : Un seul nouveau round lancé**  
    * *Cible :* Renvoi direct vers `/raffles/{slug}`.
  * **Cas 2 : Plusieurs nouveaux rounds lancés**  
    * *Cible :* Renvoi vers l'accueil `/`.
  * **Cas 3 : Aucun nouveau round**  
    * *Action :* Ne rien envoyer.

---

### 🌆 Créneau Soir : Urgence, Compte à Rebours & Tirages (Plage recommandée : 18h00 - 19h00)

* **Objectif :** Inciter à la validation des derniers punches avant le tirage ou informer de l'imminence des résultats.
* **Conditions de déclenchement :**
  * Uniquement s'il y a un tirage le soir même ou un événement majeur (palier critique).
* **Règles d'arbitrage de priorité (La règle du Golden Push) :**
  1. **Priorité 1 (Urgence absolue) :** Un tirage a lieu ce soir même (Round Quotidien ou fin de Round Hebdo/Mensuel/Ultime).
  2. **Priorité 2 (Palier critique) :** Un Round Ultime ou Mensuel a franchi un palier important (ex: 80% des tickets vendus).
  3. **Priorité 3 (Rappel de weekend) :** Round Hebdo dont le tirage est prévu dans les 24h/48h.
  4. **Priorité 4 :** Si aucun tirage n'est imminent, aucune notification n'est envoyée ce soir-là.

---

## 4. Matrice des Modèles de Messages (Éditables par l'Administration)

L'administration disposera d'une interface ou d'une table de configuration pour personnaliser ces textes et utiliser les variables dynamiques :
* `{titre}` : Nom du round ou du lot
* `{duree}` : Temps restant (ex: "2 heures", "24h")
* `{pourcentage}` : Taux d'avancement des tickets (ex: "80%")
* `{places_restantes}` : Nombre de tickets restants

### A. Modèles du Matin (08h30 - 09h00)

| Type de Round | Titre suggéré | Corps du message |
| :--- | :--- | :--- |
| **Quotidien (1 seul)** | ⚡ Nouveau Round Express | Tente ta chance aujourd'hui pour remporter {titre} ! Tirage ce soir. |
| **Plusieurs Rounds** | 🎉 De nouveaux Rounds sont ouverts ! | De nouveaux lots sont à décrocher aujourd'hui. Rendez-vous sur Punchy ! |
| **Hebdomadaire** | 📅 Round de la Semaine | Le Round hebdomadaire pour {titre} est lancé ! Tu as jusqu'à dimanche. |
| **Mensuel** | 🌟 Grand Round du Mois | {titre} est en jeu ce mois-ci ! Découvre le gros lot dès maintenant. |
| **Ultime** | 👑 ROUND ULTIME LANCÉ | {titre} est disponible ! Une chance rare sur Punchy, places limitées. |

---

### B. Modèles du Soir (18h00 - 19h00)

| Contexte / Urgence | Titre suggéré | Corps du message |
| :--- | :--- | :--- |
| **Tirage ce soir (Quotidien)** | ⏰ Tirage dans {duree} ! | Les derniers punches pour {titre} se jouent maintenant. As-tu le tien ? |
| **Tirage ce soir (Joueur ayant déjà un ticket)** | 🍀 Ton tirage a lieu ce soir ! | Le tirage de {titre} approche. Reste connecté pour découvrir le gagnant ! |
| **Hebdo (Samedi/Dimanche)** | ⏳ Dernière ligne droite | Plus que {duree} avant le tirage du Round Hebdomadaire {titre} ! |
| **Palier critique (Ultime / Mensuel)** | 🔥 {pourcentage} des places déjà prises ! | Le Round Ultime pour {titre} s'accélère. Ne rate pas les derniers tickets ! |
| **Jour J du Round Ultime** | 👑 LE GRAND JOUR | Le tirage du Round Ultime {titre} a lieu ce soir ! Qui sera le grand vainqueur ? |

---

### C. Modèles Événements Flash (Envoi Immédiat)

| Contexte Flash | Titre suggéré | Corps du message |
| :--- | :--- | :--- |
| **Annonce Vainqueur en direct** | 🎉 Annonce du gagnant en direct ! | Le tirage de {titre} vient de désigner son vainqueur ! Viens vérifier si c'est toi. |
| **Clôture Imminente (Dernières places)** | ⚡ Dernières places disponibles ! | Clôture imminente pour {titre}. Saisis ton punch avant qu'il ne soit trop tard ! |

---

## 5. Personnalisation & Segmentation des Joueurs

Pour maximiser le taux de conversion sans agacer les utilisateurs, le système prévoit deux niveaux de segmentation :

### 1. Statut de participation au Round
* **Pour le non-participant :** Message d'incitation à l'action (*« Découvre {titre} et tente ta chance pour 1$ »*).
* **Pour le participant existant :** Message de suspense et de rétention (*« Ton tirage a lieu ce soir ! Tiens-toi prêt pour les résultats »*).

### 2. Ciblage territorial (Communes de Kinshasa)
* Si un round est configuré avec une restriction territoriale (ex: **COMMUNE : Gombe, Bandalungwa, Lemba, etc.**) :
  * Seuls les utilisateurs enregistrés dans cette commune reçoivent la notification push correspondante.
  * Les utilisateurs des autres communes ne sont pas pollués par une offre à laquelle ils ne sont pas éligibles.

---

## 6. Paramètres Administrables

L'interface d'administration permettra de configurer :
1. **Activer / Suspendre** les notifications push globales en 1 clic.
2. **Heures des créneaux :**
   * Heure du matin (par défaut : 08h30 ou 09h00).
   * Heure du soir (par défaut : 18h30).
3. **Personnalisation des gabarits de texte** avec insertion des balises dynamiques.
4. **Possibilité d'envoi immédiat ("Push Flash") :**  
   Pour annoncer un événement exceptionnel en direct (ex: annonce immédiate du gagnant d'un Round Ultime).
