# Rapport d'Implémentation & Réponse Opérationnelle
## Politique et Stratégie des Notifications Push — Punchy

**Destinataires :** Direction Générale, Équipe d'Administration & Responsables Marketing Punchy  
**Document de référence :** `politique_push_notifications.md`  
**Date d'homologation :** Octobre 2026  
**Statut :** Conforme, Déployé & Opérationnel  

---

## 1. Synthèse Exécutive

Le présent rapport atteste de la prise en compte intégrale et de la mise en production des directives contenues dans le document stratégique **`politique_push_notifications.md`**.  

L'application **Punchy** est désormais dotée d'une section dédiée : le **« Centre de notifications »**, accessible directement depuis le menu principal d'administration. Cette interface permet à l'équipe de pilotage d'appliquer avec rigueur les principes d'engagement, tout en préservant la confiance des utilisateurs grâce à des garde-fous stricts contre le spam et la saturation publicitaire.

---

## 2. Validation Point par Point de la Politique

### A. Principes Fondamentaux & Éthique Anti-Spam
| Règle Stratégique | Statut d'implémentation | Modalité dans l'interface |
| :--- | :--- | :--- |
| **La règle du "Golden Push"** *(1 notif max / créneau)* | **Validé & Actif** | Compteur de quota visuel en temps réel indiquant l'état d'éligibilité pour le créneau du matin et celui du soir. |
| **Pas de bruit sans valeur** | **Validé & Actif** | Si aucun round n'est actif ou si aucun tirage n'est prévu, le système bloque tout envoi automatique. |
| **Redirection contextuelle** | **Validé & Actif** | Chaque message intègre son URL de destination directe vers le round concerné (`/raffles/{slug}`) ou le catalogue d'accueil. |
| **Fuseau horaire de référence (Kinshasa - WAT, UTC+1)** | **Validé & Actif** | Horloge officielle de Kinshasa affichée en direct en en-tête de page pour un calage horaire sans décalage. |

---

### B. Gestion des Créneaux de Diffusion Quotidiens

#### 🌅 1. Créneau Matin : Découverte & Nouveautés
* **Plage horaire configurée :** 08h30 (ajustable selon les besoins de l'équipe).
* **Arbre de décision intégré :**
  1. **Un seul nouveau round lancé :** Notification ciblée avec ouverture directe de la fiche du lot.
  2. **Plusieurs rounds ouverts :** Notification d'ensemble invitant les joueurs à découvrir les nouveautés du jour sur l'accueil.
  3. **Aucun nouveau round :** Règle de silence absolu respectée.

#### 🌆 2. Créneau Soir : Urgence, Compte à Rebours & Tirages
* **Plage horaire configurée :** 18h30 (ajustable selon les besoins de l'équipe).
* **Arbitrage automatique des priorités (Golden Push) :**
  1. **Priorité 1 (Urgence absolue) :** Tirage ayant lieu le soir même.
  2. **Priorité 2 (Palier critique) :** Round Ultime ou Mensuel ayant dépassé 80 % des tickets réservés.
  3. **Priorité 3 (Rappel de fin de semaine) :** Round Hebdomadaire approchant de sa date d'échéance.
  4. **Priorité 4 :** Aucune notification superflue si les conditions ne sont pas réunies.

---

### C. Matrice des Modèles & Gabarits de Messages

L'administration dispose de **12 modèles éditoriaux** préconfigurés, couvrant l'ensemble des scénarios de la politique et entièrement personnalisables :

#### 1. Balises dynamiques intégrées
Les modèles acceptent et remplacent automatiquement les balises suivantes lors de l'envoi :
* `{titre}` : Nom officiel du round ou du lot mis en jeu (ex. *iPhone 15 Pro Max*, *PlayStation 5*).
* `{duree}` : Compte à rebours restant (ex. *2 heures*, *24h*).
* `{pourcentage}` : Taux d'avancement des tickets (ex. *80 %*, *95 %*).
* `{places_restantes}` : Nombre de punches encore disponibles.

#### 2. Répertoire des modèles préconfigurés
* **Matin :**
  * *Quotidien Express :* « Tente ta chance aujourd'hui pour remporter {titre} ! Tirage ce soir. »
  * *Multi-Rounds :* « De nouveaux lots sont à décrocher aujourd'hui. Rendez-vous sur Punchy ! »
  * *Hebdomadaire :* « Le Round hebdomadaire pour {titre} est lancé ! Tu as jusqu'à dimanche. »
  * *Mensuel :* « {titre} est en jeu ce mois-ci ! Découvre le gros lot dès maintenant. »
  * *Ultime :* « {titre} est disponible ! Une chance rare sur Punchy, places limitées. »
* **Soir :**
  * *Tirage ce soir (Non-participant) :* « Les derniers punches pour {titre} se jouent maintenant. As-tu le tien ? »
  * *Tirage ce soir (Participant) :* « Le tirage de {titre} approche. Reste connecté pour découvrir le gagnant ! »
  * *Dernière ligne droite (Weekend) :* « Plus que {duree} avant le tirage du Round Hebdomadaire {titre} ! »
  * *Palier critique (80%) :* « Le Round Ultime pour {titre} s'accélère. Ne rate pas les derniers tickets ! »
  * *Jour J Ultime :* « Le tirage du Round Ultime {titre} a lieu ce soir ! Qui sera le grand vainqueur ? »
* **Événements Flash :**
  * *Annonce du gagnant en direct :* « Le tirage de {titre} vient de désigner son vainqueur ! Viens vérifier si c'est toi. »
  * *Dernières places disponibles :* « Clôture imminente pour {titre}. Saisis ton punch avant qu'il ne soit trop tard ! »

#### 3. Simulateur mobile interactif
L'équipe peut tester et prévisualiser immédiatement l'affichage du push sur smartphone (formats iOS et Android) avec simulation en temps réel du texte et des balises injectées.

---

### D. Personnalisation & Segmentation

Pour éviter toute pollution de l'audience, deux filtres stricts sont appliqués :

1. **Segmentation par niveau d'engagement :**
   * **Joueur non inscrit au round :** Ton engageant et incitatif, invitant à la découverte.
   * **Joueur détenant déjà un ticket :** Ton axé sur la rétention, le suspense et l'invitation à suivre le tirage.
2. **Ciblage territorial par commune de Kinshasa :**
   * Intégration des **24 communes de Kinshasa** (Gombe, Bandalungwa, Lemba, Limete, Kasa-Vubu, Ngaliema, Matete, etc.).
   * Si un round est réservé ou privilégié dans un quartier précis, les résidents des autres communes ne reçoivent aucune notification.

---

### E. Outils d'Administration & Gestion de Crise

1. **Interrupteur général 1-clic :**  
   Situé en haut du Centre de notifications, un bouton permet d'activer ou d'interrompre l'ensemble des diffusions push en cas d'imprévu, sans manipuler de réglages complexes.
2. **Envoi immédiat (« Push Flash ») :**  
   Interface d'alerte instantanée conçue pour les annonces exceptionnelles (proclamation du vainqueur d'un Round Ultime, événement surprise). L'administrateur saisit son texte, choisit le round et la cible, prévisualise sur smartphone puis diffuse en un clic.
3. **Journal de bord et traçabilité :**  
   Historique chronologique des envois répertoriant les heures de diffusion, le créneau, les messages transmis, le public ciblé, le volume d'abonnés touchés et le taux d'ouverture.

---

## 3. Recommandations Pratiques pour l'Équipe

1. **Consulter l'horloge de Kinshasa avant tout envoi :** Veiller à ce que les diffusions du matin respectent la fenêtre 08h30 - 09h00 et celles du soir la fenêtre 18h00 - 19h00.
2. **Limiter les Push Flash :** Réserver cette modalité aux victoires majeures et aux événements uniques pour préserver la réactivité de la communauté.
3. **Vérifier l'aperçu smartphone :** Toujours vérifier la lisibilité du titre et du message sur le simulateur avant de valider une modification de gabarit.

---

**Conclusion :**  
La stratégie définie dans `politique_push_notifications.md` est totalement opérationnelle. Elle offre à l'équipe Punchy un outil ergonomique, respectueux des joueurs et orienté vers une performance optimale des rounds.
