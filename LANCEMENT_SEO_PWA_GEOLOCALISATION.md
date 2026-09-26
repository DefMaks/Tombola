# Feuille de Route : Lancement Propre, SEO, PWA & Stratégie Géolocalisation

Ce document synthétise les orientations techniques, SEO, PWA et les décisions stratégiques concernant la gestion des utilisateurs situés hors de Kinshasa / RDC. Il sert de référence pour la phase d'implémentation.

---

## 1. Fichiers & Configurations Techniques pour le Lancement

### 1.1. Plan de Site (`sitemap.xml`)
* **Statut :** Fortement recommandé.
* **Approche recommandée (Next.js App Router) :** `app/sitemap.ts` (génération dynamique).
* **Rôle :**
  * Indexation continue des pages statiques (`/`, `/faq`, `/cgu`, `/mentions-legales`, `/reglement-sha256`).
  * Indexation automatique des pages de chaque tombola (`/raffles/[slug]`) avec date de dernière modification `lastModified` et priorité haute (`priority: 0.9`).
  * Évite toute maintenance manuelle d'un fichier XML statique lors de l'ajout de nouveaux rounds.

### 1.2. Directives Robots (`robots.txt`)
* **Statut :** Indispensable.
* **Emplacement :** `public/robots.txt` ou `app/robots.ts`.
* **Configuration cible :**
  ```txt
  User-agent: *
  Allow: /
  Disallow: /admin/
  Disallow: /api/
  Disallow: /checkout/
  Disallow: /auth/

  Sitemap: https://punchy.cd/sitemap.xml
  ```
* **Objectif :** Empêcher le crawl inutile ou dangereux des webhooks de paiement, de l'espace admin et des endpoints d'API, tout en orientant immédiatement Googlebot vers le sitemap.

### 1.3. Google Search Console & Validation de Domaine
* **Méthode recommandée :** Enregistrement **DNS TXT** sur le nom de domaine (via Cloudflare ou le registrar).
  * Valide la propriété sur l'ensemble du domaine et de ses éventuels sous-domaines.
  * Zéro impact sur le code, zéro balise superflue.
* **Méthode de repli :** Fichier HTML déposé dans `/public/` ou balise `<meta name="google-site-verification" content="..." />`.

### 1.4. Balises Open Graph & Partages Sociaux (Priorité P0)
En RDC, WhatsApp et Facebook sont les premiers leviers de viralité et de conversion.
* **Image par défaut (`/public/og-image.jpg`) :**
  * Résolution : 1200 × 630 px.
  * Visuel percutant Punchy avec le slogan : *"Choisis ton Round, lâche ton Punch et repars avec le gros lot !"*.
* **Open Graph Dynamique par Tombola (`/raffles/[slug]`) :**
  * `og:title` : Nom du produit (ex: *Montre connectée Oraimo 4 - Round Punchy*).
  * `og:description` : *"Tente ta chance pour seulement 1$. Tirage équitable certifié SHA-256."*.
  * `og:image` : Image du produit du round en haute qualité.
  * `og:url` : URL canonique du round.

### 1.5. Spécificités Apple & PWA
* **`apple-touch-icon.png` (180 × 180 px) :**
  * Indispensable pour les utilisateurs iOS / Safari ajoutant le raccourci sur leur écran d'accueil.
  * Fond plein (non transparent) pour éviter le carré noir imposé par iOS.
* **`manifest.json` :**
  * Déjà configuré avec le nouveau slogan.
  * S'assurer de la présence des icônes `icon-192.png` et `icon-512.png` pour l'invite automatique d'installation sur Android.
* **`browserconfig.xml` :**
  * **Abandonné** (obsolète, vestige d'Internet Explorer / Windows Phone).

---

## 2. Stratégie pour les Visiteurs Hors RDC / Hors Kinshasa

### 2.1. Analyse des Contraintes et Risques
1. **Risque SEO majeur (Googlebot) :**
   * Les serveurs de crawl de Google se trouvent aux États-Unis et en Europe.
   * Si le site redirige ou bloque les visiteurs non-congolais avec un code HTTP 403 ou une redirection vers `/indisponible`, Googlebot verra un site vide et **n'indexera aucune page**.
2. **Opportunité Diaspora :**
   * Une partie importante de la diaspora (Belgique, France, Canada, Afrique du Sud) consulte le site pour offrir des tickets à des proches résidant à Kinshasa. Les bloquer fermerait ce marché.

### 2.2. Solution Retenue : Le "Soft Wall" (Bannière Contextuelle + Waitlist + Sécurité Checkout)

```
[Visiteur arrive sur le site]
            │
    Détection IP (Header Serveur / Cloudflare)
            │
   ┌────────┴────────┐
   ▼                 ▼
Kinshasa (RDC)     Hors Kinshasa / International
   │                 │
Navigation         Navigation libre (SEO & Découverte préservés)
standard           + Bannière discrète : "Punchy arrive bientôt à {Ville}, {Pays}"
                   + Bouton Waitlist / WhatsApp : "Prévenez-moi du lancement"
                   │
                   ▼
        [Tentative d'achat / Checkout]
                   │
        Modal de confirmation impérative :
        "Le lot doit obligatoirement être retiré à Kinshasa.
         Confirmez-vous avoir un bénéficiaire sur place ?"
```

### 2.3. Détails de l'Expérience Visiteur International

1. **Bannière non intrusive en haut de page :**
   * Exemple de message :  
     > *"👋 Vous visitez Punchy depuis {Ville}, {Pays}. Nos rounds et remises de lots sont actuellement exclusifs à Kinshasa (RDC)."*
   * CTA : *"Être prévenu de l'ouverture chez vous"* ou *"Contacter l'équipe"*.
2. **Module de Capture de Leads (Waitlist d'Expansion) :**
   * Collecte du numéro WhatsApp ou de l'e-mail avec sélection de la ville (ex: Lubumbashi, Goma, Matadi, Brazzaville, Paris, Bruxelles).
   * Permet de constituer une base de données qualifiée avant d'ouvrir une nouvelle ville ou de proposer une option spéciale diaspora.
3. **Sécurisation du Processus d'Achat :**
   * Lors du paiement (M-Pesa, Orange Money, Airtel Money), vérifier que le numéro fourni est bien au format RDC (`+243...`).
   * Afficher une case à cocher obligatoire : *"Je certifie être en mesure de récupérer le lot à Kinshasa ou de désigner un mandataire local."*.

---

## 3. Plan d'Implémentation Technique Prévu

| Étape | Composant / Fichier | Action à réaliser |
|---|---|---|
| **Étape 1** | `public/robots.txt` | Mettre en place les exclusions (`/api/`, `/admin/`, `/checkout/`) et la référence au sitemap. |
| **Étape 2** | `app/sitemap.ts` | Générateur dynamique interrogeant les rounds actifs et terminés en DB. |
| **Étape 3** | Balises Open Graph (`app/layout.tsx` & `app/raffles/[slug]/page.tsx`) | Métadonnées de partage pour WhatsApp/Facebook avec image dynamique par lot. |
| **Étape 4** | Assets visuels (`/public/`) | Vérifier `og-image.jpg` (1200x630) et `apple-touch-icon.png` (180x180). |
| **Étape 5** | Détection Géo & Bannière (`components/GeoBanner.tsx`) | Détection via en-tête IP/service léger sans géolocalisation intrusive. |
| **Étape 6** | Endpoint Waitlist (`app/api/waitlist/route.ts`) | Enregistrement des contacts hors zone pour les futures ouvertures. |
| **Étape 7** | Sécurité Checkout | Vérification et avertissement explicite sur le retrait à Kinshasa avant paiement. |
