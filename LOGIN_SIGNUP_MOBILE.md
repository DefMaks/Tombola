Pour configurer le **Mobile Auth / Signup / Signin + OTP avec Neon Auth** pour Punchy, la particularité clé de ton schéma de base de données réside dans l'existence de deux tables distinctes :

1. `neon_auth.user` : géré directement par le moteur d'authentification Neon Auth (orienté email / identifiers).
2. `public.users` : la table profil métier Punchy (contenant `phone_number`, `full_name`, `role`, etc.), qui est liée aux tickets, transactions et témoignages.

Pour assurer la synchronisation parfaite lors du flux OTP par SMS/Email, nous avons besoin d'un **Trigger PostgreSQL de synchronisation**, suivi des routes API du backend.

---

### Step 1 : Trigger PostgreSQL de Synchronisation (`neon_auth.user` ➔ `public.users`)

Exécute ce script SQL dans ton instance Neon. Chaque fois qu'un utilisateur est créé ou vérifié dans `neon_auth.user`, son enregistrement correspondant est automatiquement créé ou mis à jour dans `public.users`.

```sql
-- Fonction de synchronisation automatique
CREATE OR REPLACE FUNCTION public.handle_neon_auth_user_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone_number, full_name, email, is_verified, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''), -- Le numéro de téléphone ou identifiant OTP est mappé ici
    NEW.name,
    NEW.email,
    NEW."emailVerified",
    NEW."createdAt",
    NEW."updatedAt"
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur la table neon_auth.user
DROP TRIGGER IF EXISTS on_neon_auth_user_created ON neon_auth.user;
CREATE TRIGGER on_neon_auth_user_created
  AFTER INSERT OR UPDATE ON neon_auth.user
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_neon_auth_user_sync();

```

---

### Step 2 : Route API - Demande de Code OTP (`/api/auth/send-otp`)

Cette route reçoit le numéro de téléphone du client mobile, génère un OTP temporaire dans `neon_auth.verification` et envoie le code via ton service SMS (ou TwigaPaie SMS / SMS Gateway local).

```typescript
// app/api/auth/send-otp/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Instance Drizzle / PG Client
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Numéro de téléphone requis.' },
        { status: 400 }
      );
    }

    // Normalisation au format 243XXXXXXXXX
    let cleanPhone = phoneNumber.trim().replace(/\s+/g, '').replace(/^\+/, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '243' + cleanPhone.substring(1);

    // Génération d'un code OTP à 6 chiffres
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Valide 10 minutes

    // Insertion/Update du token dans neon_auth.verification
    await db.execute(`
      INSERT INTO "neon_auth"."verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${cleanPhone}, ${otpCode}, ${expiresAt.toISOString()}, NOW(), NOW())
    `);

    // TODO: Envoyer l'OTP par SMS (ex: TwigaPaie SMS / Provider local RDC)
    console.log(`[OTP DEBUG] Code pour ${cleanPhone} : ${otpCode}`);

    return NextResponse.json({
      success: true,
      message: 'Code OTP envoyé avec succès.',
    });
  } catch (error: any) {
    console.error('Erreur send-otp :', error);
    return NextResponse.json(
      { error: 'Échec d’envoi de l’OTP.' },
      { status: 500 }
    );
  }
}

```

---

### Step 3 : Route API - Vérification OTP & Connexion (`/api/auth/verify-otp`)

Cette route valide l'OTP, crée l'utilisateur dans `neon_auth.user` (ce qui déclenche la synchro vers `public.users`) et émet un jeton de session enregistré dans `neon_auth.session`.

```typescript
// app/api/auth/verify-otp/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { phoneNumber, otpCode, fullName } = await req.json();

    let cleanPhone = phoneNumber.trim().replace(/\s+/g, '').replace(/^\+/, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '243' + cleanPhone.substring(1);

    // 1. Vérification du code OTP
    const verificationRes = await db.execute(`
      SELECT * FROM "neon_auth"."verification"
      WHERE "identifier" = ${cleanPhone} 
        AND "value" = ${otpCode}
        AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (!verificationRes.rows || verificationRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Code OTP invalide ou expiré.' },
        { status: 400 }
      );
    }

    // 2. Récupération ou création de l'utilisateur dans neon_auth.user
    let userRes = await db.execute(`
      SELECT * FROM "neon_auth"."user" WHERE "email" = ${cleanPhone} LIMIT 1
    `);

    let userId: string;

    if (userRes.rows.length === 0) {
      // Création du nouvel utilisateur
      const newUser = await db.execute(`
        INSERT INTO "neon_auth"."user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(), 
          ${fullName || 'Joueur Punchy'}, 
          ${cleanPhone}, 
          TRUE, 
          NOW(), 
          NOW()
        )
        RETURNING "id"
      `);
      userId = newUser.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
    }

    // 3. Suppression du jeton d'OTP utilisé
    await db.execute(`
      DELETE FROM "neon_auth"."verification" WHERE "identifier" = ${cleanPhone}
    `);

    // 4. Génération du Token de Session Neon Auth
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

    await db.execute(`
      INSERT INTO "neon_auth"."session" ("id", "token", "userId", "expiresAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${sessionToken}, ${userId}, ${sessionExpiresAt.toISOString()}, NOW(), NOW())
    `);

    return NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: userId,
        phoneNumber: cleanPhone,
        fullName: fullName || 'Joueur Punchy',
      },
    });
  } catch (error: any) {
    console.error('Erreur verify-otp :', error);
    return NextResponse.json(
      { error: 'Échec de la vérification OTP.' },
      { status: 500 }
    );
  }
}

```

---

### Step 4 : Client React Native / Mobile Expo (`AuthService.ts`)

Voici le module prêt à copier/coller dans ton application mobile pour gérer l'ensemble du flux :

```typescript
// services/AuthService.ts
const API_BASE_URL = 'https://punchy.cd/api';

export class AuthService {
  /**
   * Étape 1 : Demande du code OTP par SMS
   */
  static async requestOtp(phoneNumber: string) {
    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de l’envoi de l’OTP');
    return data;
  }

  /**
   * Étape 2 : Validation du code OTP et obtention du Session Token
   */
  static async verifyOtp(phoneNumber: string, otpCode: string, fullName?: string) {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, otpCode, fullName }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Code OTP invalide');

    // Sauvegarder data.token dans AsyncStorage / SecureStore
    return data;
  }
}

```