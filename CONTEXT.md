# CONTEXT.md — Vision & Contexte Business

## 🎯 Vision

**Punchy** est une plateforme de tombola participative mobile-first qui démocratise l'accès à des biens de valeur (smartphones, motos, électroménager, mode) via un ticket unitaire à **1 dollar US**. Le tirage utilise un algorithme **cryptographiquement vérifiable** (SHA-256), garantissant l'équité et la transparence à chaque participant.

---

## 🌍 Marché cible

### Zone géographique
- **Primaire** : République Démocratique du Congo (RDC) — Kinshasa, Lubumbashi, Goma, Bukavu
- **Secondaire** : Afrique francophone (Congo-Brazzaville, Rwanda, Burundi)
- **Devise** : USD (majoritaire) + CDF (Franc Congolais)

### Persona utilisateur

**👤 Jean-Pierre, 28 ans, Kinshasa**
- Vendeur ambulant, revenu ~150$/mois
- Utilise M-Pesa quotidiennement
- N'a jamais possédé de smartphone haut de gamme
- Passe 3h/jour sur son Android low-end (Facebook, WhatsApp)
- **Frustration** : les tombolas classiques sont opaques, réservées aux riches, ou frauduleuses
- **Rêve** : gagner un iPhone / une moto sans avoir à dépenser une fortune

**👤 Marie, 34 ans, Goma**
- Commerçante, tient une échoppe de produits cosmétiques
- Cherche à s'équiper (frigo, TV) à moindre coût
- Méfiante des "tirages truqués"
- **Frustration** : preuves de livraison inexistantes chez les concurrents
- **Confiance requise** : voir des vraies photos/vidéos de vainqueurs recevant leur lot

---

## 💡 Proposition de valeur

### Pour l'utilisateur
1. **Ticket ultra-accessible** — 1$ = ~2500 CDF, le prix d'un pain
2. **Paiement local instantané** — Mobile Money (M-Pesa / Orange / Airtel) → confirmation USSD
3. **Transparence totale** — chaque tirage vérifiable par tous via SHA-256
4. **Preuves de livraison** — photos/vidéos des vainqueurs recevant leur lot
5. **PWA installable** — pas besoin de télécharger 100 Mo sur le Play Store

### Pour l'écosystème DEFMAKS
- **Acquisition virale** — chaque vainqueur devient un ambassadeur (témoignages photo/vidéo)
- **Revenus prévisibles** — margin sur chaque tombola remplie
- **Cross-selling** — les publicités (zone `home`, `inner`, etc.) monétisent le trafic
- **Data** — comportement d'achat, préférences catégories, opérateur MM préféré

---

## 🏆 Différenciateurs

| Feature | Punchy | Tombolas classiques |
|---|---|---|
| Prix ticket | **1$** unique | Variable (5-50$) |
| Tirage | **SHA-256 public** | Opaque, sur foi |
| Preuve | **Vidéo/photo obligatoire** | Rarement fournie |
| Paiement | **Mobile Money natif** | Cash, virement lent |
| UX | **PWA mobile-first** | Site web ou physique |
| Transparence | **Vérifiable dans le navigateur** | Aucune |

---

## 📊 Modèle économique

### Sources de revenus
1. **Marge sur tombolas** — différence entre `max_tickets × 1$` et coût d'acquisition du lot (~40-60% de marge)
2. **Sponsoring & pubs** — table `advertisements` (zones `home`, `inner`, `single`) louées à des marques locales (DefMaks, MC Distri, opérateurs télécom)
3. **Featured raffles** — mise en avant premium pour partenaires

### KPIs clés
- **Ticket velocity** — vitesse moyenne de vente (tickets/heure)
- **Fill rate** — % tombolas atteignant `max_tickets` avant `ends_at`
- **Repeat rate** — % utilisateurs achetant ≥ 2 tickets dans le mois
- **Testimonial rate** — % vainqueurs soumettant un témoignage validé
- **CAC / LTV** — coût d'acquisition vs valeur vie client

---

## 🧭 Roadmap produit

### Phase 1 — MVP (✅ livré)
- Home discovery, achat tickets, USSD flow, tirage SHA-256, page transparence, page profil avec témoignages, PWA installable

### Phase 2 — Confiance & viralité (en cours)
- Wall des témoignages approuvés en carousel story-like
- Vidéos courtes (10s) en plus de la photo
- Partage social direct (WhatsApp / Facebook)
- Push notifications web (draw imminent, gain, ticket restant)

### Phase 3 — Croissance
- **Referral bonus** — 1 ticket offert par ami invité qui achète
- **Gamification** — badges (Premier gain, Fidèle 10 tickets, Ambassadeur 5 témoignages)
- **Wallet** — crédit virtuel rechargeable pour éviter les frais MM répétés
- **Multi-devise** — CDF natif en plus d'USD

### Phase 4 — Scalabilité
- Authentification OTP SMS
- Cron réconciliation transactions PENDING
- API publique pour agents affiliés
- Extension géographique (Rwanda, Cameroun)

---

## 🎨 Design principles

1. **Mobile-first strict** — max-width 512px, bottom-nav 4 items
2. **Dark mode par défaut** — moins consommateur de batterie sur OLED
3. **Contraste élevé** — lisible en plein soleil (usage extérieur)
4. **Animations parcimonieuses** — Framer Motion pour transitions clés seulement
5. **Feedback immédiat** — chaque action → toast + loader + optimistic update
6. **Français naturel** — pas de jargon technique, ton chaleureux ("Vos numéros porte-bonheur", "Bonne chance ! 🍀")

---

## 🤝 Partenaires actuels

- **DefMaks Group** — investisseur principal, fournisseur des lots premium
- **TwigaPaie** — passerelle Mobile Money (M-Pesa, Orange, Airtel RDC)
- **Uploadcare** — hébergement médias (photos, témoignages)
- **Neon** — base de données PostgreSQL serverless
- **Supabase** — Edge Functions + hébergement publicités

---

**Made in RDC 🇨🇩 · Un ticket à 1$. Change ta vie.**
