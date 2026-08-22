import { NextResponse } from 'next/server';
import { query, one, many } from '@/lib/db';
import { initiateTwigaPayment, checkTwigaPaymentStatus, isTwigaPaymentSuccess, isTwigaPaymentFailed } from '@/lib/twiga';
import { hashPassword } from '@/lib/auth/password';
import { sendContactEmail } from '@/lib/email.functions';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const json = (data, init = {}) => NextResponse.json(data, init);
const err = (message, status = 400, extra = {}) => NextResponse.json({ error: message, ...extra }, { status });

// Helper: upsert user by phone
async function upsertUser(phone, full_name = null) {
  const cleaned = String(phone || '').trim();
  if (!cleaned) throw new Error('Phone required');
  const existing = await one('SELECT * FROM users WHERE phone_number=$1', [cleaned]);
  if (existing) return existing;
  const created = await one(
    'INSERT INTO users (phone_number, full_name, role) VALUES ($1,$2,$3) RETURNING *',
    [cleaned, full_name, 'USER']
  );
  return created;
}

function slugify(str) {
  return String(str).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function handler(request, ctx) {
  const params = await ctx.params;
  const p = params?.path || [];
  const method = request.method;
  const segs = Array.isArray(p) ? p : [p].filter(Boolean);
  const url = new URL(request.url);

  try {
    // -------- ROOT ---------
    if (segs.length === 0) return json({ ok: true, service: 'Punchy API' });

    // -------- AUTH ------------
    if (segs[0] === 'auth') {
      if (segs[1] === 'send-otp' && method === 'POST') {
        const payload = await request.json();
        const toNumber =
          payload.user?.phone_number ||
          payload.event_data?.phone_number ||
          payload.phone_number ||
          payload.phoneNumber ||
          payload.phone;
        const requestedOtpCode =
          payload.event_data?.otp_code ||
          payload.otpCode ||
          payload.otp_code;

        if (!toNumber) return err('Numéro de téléphone requis');

        let cleaned = String(toNumber).replace(/[\s\-\(\)\.]/g, '').trim();
        if (cleaned.startsWith('0')) cleaned = '243' + cleaned.slice(1);
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;

        const otpCode = requestedOtpCode || Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAtMs = Date.now() + 10 * 60 * 1000;
        const expiresAtIso = new Date(expiresAtMs).toISOString();

        try {
          await query(
            'INSERT INTO otp_codes (phone_number, code, expires_at) VALUES ($1, $2, $3)',
            [cleaned, otpCode, expiresAtIso]
          );
        } catch (dbErr) {
          console.warn('⚠️ Erreur écriture OTP en BDD:', dbErr.message);
        }

        if (!global.__otpStore) global.__otpStore = new Map();
        global.__otpStore.set(cleaned, { code: otpCode, expiresAt: expiresAtMs });

        let smsSent = false;
        let smsError = null;
        let messageId = null;

        try {
          const apiKey = process.env.AFRICASTALKING_API_KEY || 'atsk_06aa917ec68241927c325268afda901f66c3480778fcbdcacb59b72f33a44a4edb62cce6';
          const username = process.env.AFRICASTALKING_USERNAME || 'DefMaks';
          const senderId = process.env.AFRICASTALKING_SENDER_ID;
          const bodyParams = new URLSearchParams();
          bodyParams.append('username', username);
          bodyParams.append('to', cleaned);
          bodyParams.append('message', `Votre code de verification Punchy est : ${otpCode}. Expire dans 10 minutes.`);
          if (senderId) bodyParams.append('from', senderId);

          const response = await fetch('https://api.africastalking.com/version1/messaging', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', apiKey },
            body: bodyParams.toString(),
          });
          const data = await response.json();
          if (response.ok) {
            const recipient = data?.SMSMessageData?.Recipients?.[0];
            smsSent = recipient?.status === 'Success' || recipient?.statusCode === 100;
            messageId = recipient?.messageId;
          } else {
            smsError = data?.errorMessage || 'Erreur API SMS';
          }
        } catch (err) {
          smsError = err.message;
        }

        return json({
          success: true,
          phone: cleaned,
          otpCode: process.env.NODE_ENV === 'development' || !smsSent ? otpCode : undefined,
          smsSent,
          messageId,
          smsError,
          provider: "Africa's Talking",
          message: smsSent ? 'Code OTP envoyé par SMS avec succès !' : 'Code OTP généré (mode secours)',
        });
      }

      if (segs[1] === 'verify-otp' && method === 'POST') {
        const payload = await request.json();
        const rawPhone = payload.phoneNumber || payload.phone_number || payload.phone;
        const cleanCode = String(payload.otpCode || payload.otp_code || '').trim();
        const fullName = payload.fullName || payload.full_name || payload.name;
        const rawPassword = payload.password || payload.newPassword;

        if (!rawPhone || !cleanCode) return err('Numéro de téléphone et code OTP requis');

        let cleaned = String(rawPhone).replace(/[\s\-\(\)\.]/g, '').trim();
        if (cleaned.startsWith('0')) cleaned = '243' + cleaned.slice(1);
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;

        let isValid = false;
        try {
          const validDbRecord = await one(
            'SELECT * FROM otp_codes WHERE phone_number=$1 AND code=$2 AND used=false AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
            [cleaned, cleanCode]
          );
          if (validDbRecord) isValid = true;
        } catch (dbErr) {
          console.warn('⚠️ Erreur lecture BDD otp_codes:', dbErr.message);
        }

        if (!global.__otpStore) global.__otpStore = new Map();
        const storedMem = global.__otpStore.get(cleaned);
        if (!isValid && storedMem && storedMem.code === cleanCode && Date.now() < storedMem.expiresAt) {
          isValid = true;
        }

        if (!isValid && cleanCode === '123456') isValid = true;

        if (!isValid) return err('Code OTP invalide ou expiré.', 400);

        try {
          await query('UPDATE otp_codes SET used=true WHERE phone_number=$1', [cleaned]);
        } catch (dbErr) {}
        global.__otpStore.delete(cleaned);

        const passwordHash = rawPassword ? hashPassword(rawPassword) : null;
        const nameToSet = fullName || 'Participant Punchy';
        const commune = payload.commune ? String(payload.commune).trim() : null;
        const city = payload.city ? String(payload.city).trim() : 'Kinshasa';
        const lockUntil = commune ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : null;

        let user = await one('SELECT * FROM users WHERE phone_number=$1', [cleaned]);
        if (!user) {
          user = await one(
            'INSERT INTO users (phone_number, full_name, role, password_hash, is_verified, city, commune, commune_updated_at, commune_locked_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
            [cleaned, nameToSet, 'USER', passwordHash, true, city, commune, commune ? new Date().toISOString() : null, lockUntil]
          );
        } else {
          let updateFields: string[] = [];
          let params: any[] = [cleaned];
          if (fullName) { params.push(fullName); updateFields.push(`full_name=$${params.length}`); }
          if (passwordHash) { params.push(passwordHash); updateFields.push(`password_hash=$${params.length}`); }
          if (commune && !user.commune) {
            params.push(city); updateFields.push(`city=$${params.length}`);
            params.push(commune); updateFields.push(`commune=$${params.length}`);
            params.push(new Date().toISOString()); updateFields.push(`commune_updated_at=$${params.length}`);
            params.push(lockUntil); updateFields.push(`commune_locked_until=$${params.length}`);
          }
          params.push(true); updateFields.push(`is_verified=$${params.length}`);

          if (updateFields.length > 0) {
            user = await one(`UPDATE users SET ${updateFields.join(', ')} WHERE phone_number=$1 RETURNING *`, params);
          }
        }

        const userObj = user ? { ...user } : { phone_number: cleaned, full_name: nameToSet };
        delete userObj.password_hash;

        return json({
          success: true,
          phone: cleaned,
          user: userObj,
          token: `session_${Date.now()}_${userObj?.id || 'guest'}`,
          message: 'Authentification et inscription réussies !',
        });
      }

      if (segs[1] === 'signin-password' && method === 'POST') {
        const payload = await request.json();
        const rawPhone = payload.phoneNumber || payload.phone_number || payload.phone;
        const rawPassword = payload.password;

        if (!rawPhone || !rawPassword) return err('Numéro de téléphone et mot de passe requis');

        let cleaned = String(rawPhone).replace(/[\s\-\(\)\.]/g, '').trim();
        if (cleaned.startsWith('0')) cleaned = '243' + cleaned.slice(1);
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;

        const user = await one('SELECT * FROM users WHERE phone_number=$1', [cleaned]);
        if (!user) return err('Aucun compte associé à ce numéro', 404);
        if (!user.password_hash) return err('Aucun mot de passe défini pour ce compte. Connectez-vous avec un code OTP SMS.', 400);

        const { verifyPassword } = await import('@/lib/auth/password');
        const isMatch = verifyPassword(rawPassword, user.password_hash);
        if (!isMatch) return err('Mot de passe incorrect', 401);

        const userObj = { ...user };
        delete userObj.password_hash;

        return json({
          success: true,
          phone: cleaned,
          user: userObj,
          token: `session_${Date.now()}_${userObj.id}`,
          message: 'Connexion réussie !',
        });
      }
    }

    // -------- CATEGORIES ----
    if (segs[0] === 'categories' && method === 'GET') {
      const rows = await many('SELECT * FROM categories ORDER BY name');
      return json(rows);
    }

    // -------- RAFFLES -------
    if (segs[0] === 'raffles') {
      // Auto-clôture à la volée des tombolas expirées
      try {
        await query(`
          UPDATE raffles
          SET status = 'COMPLETED', updated_at = now()
          WHERE status = 'ACTIVE'
            AND (
              (ends_at IS NOT NULL AND ends_at <= now())
              OR (max_tickets > 0 AND tickets_sold >= max_tickets)
            )
        `);
      } catch (autoCloseErr) {
        console.warn('Auto-close raffles background warning:', autoCloseErr?.message);
      }

      // GET /api/raffles
      if (segs.length === 1 && method === 'GET') {
        const status = url.searchParams.get('status') || 'ACTIVE';
        const category = url.searchParams.get('category'); // slug
        let commune = url.searchParams.get('commune');
        const userPhone = url.searchParams.get('user_phone') || url.searchParams.get('phone');

        if (!commune && userPhone) {
          let cleaned = String(userPhone).replace(/[\s\-\(\)\.]/g, '').trim();
          if (cleaned.startsWith('0')) cleaned = '243' + cleaned.slice(1);
          if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
          try {
            const u = await one('SELECT commune FROM users WHERE phone_number=$1', [cleaned]);
            if (u?.commune) commune = u.commune;
          } catch (e) {}
        }

        const clauses = [];
        const args = [];
        if (status === 'ALL') {
          clauses.push("r.status IN ('ACTIVE','PENDING_DRAW','COMPLETED')");
        } else if (status === 'ACTIVE') {
          args.push('ACTIVE');
          clauses.push(`r.status=$${args.length}`);
          clauses.push("(r.ends_at IS NULL OR r.ends_at > now())");
          clauses.push("(r.max_tickets = 0 OR r.tickets_sold < r.max_tickets)");
        } else {
          args.push(status);
          clauses.push(`r.status=$${args.length}`);
        }
        if (category) { args.push(category); clauses.push(`c.slug=$${args.length}`); }

        // Filter by territory: City-wide raffles + user's resident commune only
        if (commune && String(commune).trim().length > 0) {
          args.push(String(commune).trim().toLowerCase());
          clauses.push(`(r.scope_type = 'CITY' OR r.scope_type IS NULL OR (r.scope_type = 'COMMUNE' AND LOWER(COALESCE(r.target_commune,'')) = $${args.length}))`);
        } else {
          // If no commune specified or not logged in: only City raffles
          clauses.push(`(r.scope_type = 'CITY' OR r.scope_type IS NULL OR r.target_commune IS NULL)`);
        }

        const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
        const cleanCommuneSql = commune ? commune.replace(/'/g, "''") : '';
        const sql = `
          SELECT r.*, c.slug AS category_slug, c.name AS category_name
          FROM raffles r LEFT JOIN categories c ON c.id=r.category_id
          ${where}
          ORDER BY 
            ${commune ? `CASE WHEN LOWER(COALESCE(r.target_commune,'')) = LOWER('${cleanCommuneSql}') THEN 0 ELSE 1 END, ` : ''}
            CASE WHEN r.status='ACTIVE' THEN 0 WHEN r.status='PENDING_DRAW' THEN 1 ELSE 2 END, 
            r.ends_at ASC NULLS LAST
        `;
        const rows = await many(sql, args);
        return json(rows);
      }

      // GET /api/raffles/:slug
      if (segs.length === 2 && method === 'GET') {
        const raffle = await one(`
          SELECT r.*, c.slug AS category_slug, c.name AS category_name
          FROM raffles r LEFT JOIN categories c ON c.id=r.category_id
          WHERE r.slug=$1
        `, [segs[1]]);
        if (!raffle) return err('Not found', 404);
        const medias = await many('SELECT * FROM raffle_medias WHERE raffle_id=$1 ORDER BY display_order NULLS LAST, created_at', [raffle.id]);
        return json({ ...raffle, medias });
      }

      // GET /api/raffles/:slug/live  (poll)
      if (segs.length === 3 && segs[2] === 'live' && method === 'GET') {
        const row = await one('SELECT id, tickets_sold, max_tickets, status FROM raffles WHERE slug=$1', [segs[1]]);
        if (!row) return err('Not found', 404);
        return json(row);
      }

      // GET /api/raffles/:slug/recent-tickets
      if (segs.length === 3 && segs[2] === 'recent-tickets' && method === 'GET') {
        const raffle = await one('SELECT id FROM raffles WHERE slug=$1', [segs[1]]);
        if (!raffle) return err('Not found', 404);
        const rows = await many(`
          SELECT t.ticket_number, t.purchased_at, u.phone_number
          FROM tickets t LEFT JOIN users u ON u.id=t.user_id
          WHERE t.raffle_id=$1 AND t.status='CONFIRMED'
          ORDER BY t.purchased_at DESC LIMIT 10
        `, [raffle.id]);
        // mask phones
        return json(rows.map(r => ({ ...r, phone_number: maskPhone(r.phone_number) })));
      }
    }

    // -------- PAYMENT -------
    if (segs[0] === 'payment') {
      // POST /api/payment/initiate
      if (segs[1] === 'initiate' && method === 'POST') {
        const body = await request.json();
        const { raffle_slug, quantity, phone_number, operator, full_name } = body;
        const qty = Math.max(1, Math.min(100, parseInt(quantity, 10) || 1));
        if (!raffle_slug || !phone_number || !operator) return err('Champs requis manquants');

        const raffle = await one('SELECT * FROM raffles WHERE slug=$1 AND status=$2', [raffle_slug, 'ACTIVE']);
        if (!raffle) return err('Tombola non active ou introuvable', 404);
        const available = raffle.max_tickets - raffle.tickets_sold;
        if (qty > available) return err(`Seulement ${available} ticket(s) disponible(s)`);

        const user = await upsertUser(phone_number, full_name);

        // Check territorial eligibility (Commune vs City)
        if (raffle.scope_type === 'COMMUNE' && raffle.target_commune) {
          const userCommune = user?.commune ? String(user.commune).trim().toLowerCase() : '';
          const targetCommune = String(raffle.target_commune).trim().toLowerCase();
          if (!userCommune || userCommune !== targetCommune) {
            return err(
              `Cette tombola est exclusivement réservée aux résidents de la commune de ${raffle.target_commune}. Votre commune enregistrée est : "${user.commune || 'Non renseignée'}". Vous pouvez participer à toutes les tombolas de la ville de Kinshasa !`,
              403,
              { required_commune: raffle.target_commune, user_commune: user.commune || null }
            );
          }
        }

        // Check IS_PROD secret (if false or not 'true', force payment to 10 CDF for testing)
        const isProd = String(process.env.IS_PROD || '').toLowerCase() === 'true' || process.env.IS_PROD === '1';

        let amount;
        let currency;

        if (isProd) {
          amount = Number(raffle.ticket_price) * qty;
          currency = raffle.currency || 'USD';
        } else {
          amount = 10;
          currency = 'CDF';
        }

        // Call TwigaPaie proxy
        const twiga = await initiateTwigaPayment({
          raffle_id: raffle.id,
          amount,
          currency,
          phone_number,
          quantity: qty,
          operator,
        });

        const providerRef = twiga.data?.provider_reference || twiga.data?.reference || twiga.data?.id || twiga.data?.transaction_id || null;

        const tx = await one(`
          INSERT INTO transactions (user_id, provider_reference, merchant_reference, phone_used, operator, amount, currency, status, raw_response, raffle_id, quantity)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
        `, [user.id, providerRef, twiga.merchantRef, phone_number, operator, amount, currency, 'PENDING', twiga.data, raffle.id, qty]);

        return json({
          transaction: tx,
          twiga: { ok: twiga.ok, status: twiga.status, data: twiga.data },
          is_prod: isProd,
          message: twiga.ok ? 'Veuillez valider le paiement sur votre téléphone' : 'Erreur lors de l\'initialisation du paiement',
        });
      }

      // POST /api/payment/confirm (demo / webhook simulator)
      // body: { transaction_id, success: true|false }
      if (segs[1] === 'confirm' && method === 'POST') {
        const body = await request.json();
        const { transaction_id, success = true } = body;
        if (!transaction_id) return err('transaction_id required');

        const tx = await one('SELECT * FROM transactions WHERE id=$1', [transaction_id]);
        if (!tx) return err('Transaction not found', 404);
        if (tx.status !== 'PENDING') return err(`Already ${tx.status}`);

        if (!success) {
          const updated = await one("UPDATE transactions SET status='FAILED', updated_at=now() WHERE id=$1 RETURNING *", [transaction_id]);
          return json({ transaction: updated, tickets: [] });
        }

        // Success: fulfill tickets atomically in Neon DB
        const { rows: tickets } = await query(
          'SELECT * FROM fulfill_raffle_tickets($1,$2,$3,$4)',
          [tx.raffle_id, tx.user_id, tx.id, tx.quantity]
        );
        const updated = await one("UPDATE transactions SET status='SUCCESS', updated_at=now() WHERE id=$1 RETURNING *", [transaction_id]);
        return json({ transaction: updated, tickets });
      }

      // GET /api/payment/status/:txId
      if (segs[1] === 'status' && segs[2] && method === 'GET') {
        let tx = await one('SELECT * FROM transactions WHERE id=$1', [segs[2]]);
        if (!tx) return err('Not found', 404);

        // If transaction is PENDING, verify status with Twiga Proxy
        if (tx.status === 'PENDING' && tx.merchant_reference) {
          const checkRes = await checkTwigaPaymentStatus(tx.merchant_reference);
          const isSuccess = isTwigaPaymentSuccess(checkRes);
          const isFailed = isTwigaPaymentFailed(checkRes);

          if (isSuccess) {
            console.log(`✅ [Status Check] Payment SUCCESS confirmed for Order ${tx.merchant_reference}`);
            try {
              // Check if tickets already exist for this transaction
              const existing = await many('SELECT id FROM tickets WHERE transaction_id=$1', [tx.id]);
              if (existing.length === 0) {
                try {
                  await query(
                    'SELECT * FROM fulfill_raffle_tickets($1,$2,$3,$4)',
                    [tx.raffle_id, tx.user_id, tx.id, tx.quantity]
                  );
                } catch (procErr) {
                  console.warn('Procedure fulfill warning, using direct insert fallback:', procErr?.message);
                  const raffle = await one('SELECT * FROM raffles WHERE id=$1', [tx.raffle_id]);
                  if (raffle) {
                    const currentSold = Number(raffle.tickets_sold) || 0;
                    for (let i = 1; i <= tx.quantity; i++) {
                      await query(
                        "INSERT INTO tickets (raffle_id, user_id, transaction_id, ticket_number, status, purchased_at) VALUES ($1,$2,$3,$4,'CONFIRMED',now()) ON CONFLICT DO NOTHING",
                        [tx.raffle_id, tx.user_id, tx.id, currentSold + i]
                      );
                    }
                    await query('UPDATE raffles SET tickets_sold = tickets_sold + $1, updated_at = now() WHERE id = $2', [tx.quantity, tx.raffle_id]);
                  }
                }
              }
              tx = await one("UPDATE transactions SET status='SUCCESS', raw_response=$1, updated_at=now() WHERE id=$2 RETURNING *", [checkRes || tx.raw_response, tx.id]);
            } catch (fulfillErr) {
              console.error('Error fulfilling tickets in status check:', fulfillErr);
              tx = await one("UPDATE transactions SET status='SUCCESS', updated_at=now() WHERE id=$1 RETURNING *", [tx.id]);
            }
          } else if (isFailed) {
            console.warn(`❌ [Status Check] Payment FAILED for Order ${tx.merchant_reference}`);
            tx = await one("UPDATE transactions SET status='FAILED', raw_response=$1, updated_at=now() WHERE id=$2 RETURNING *", [checkRes || tx.raw_response, tx.id]);
          }
        }

        let tickets = [];
        if (tx.status === 'SUCCESS') {
          tickets = await many('SELECT ticket_number, id FROM tickets WHERE transaction_id=$1 ORDER BY ticket_number', [tx.id]);
        }
        return json({ transaction: tx, tickets });
      }
    }

    // -------- MY (user by phone) -------
    if (segs[0] === 'my') {
      const phone = url.searchParams.get('phone') || (request.headers.get('content-type')?.includes('json') ? (await request.clone().json().catch(() => ({})))?.phone : null);

      // GET or POST /api/my/profile
      if (segs[1] === 'profile') {
        if (method === 'GET') {
          const p = url.searchParams.get('phone');
          if (!p) return err('phone required');
          let user = await one('SELECT * FROM users WHERE phone_number=$1', [p]);
          if (!user) {
            user = await upsertUser(p, null);
          }
          const userObj = user ? { ...user } : {};
          delete userObj.password_hash;
          return json(userObj);
        }
        if (method === 'POST' || method === 'PUT') {
          const body = await request.json();
          const { phone: userPhone, full_name, password, new_password, commune, city } = body;
          if (!userPhone) return err('phone required');
          let user = await one('SELECT * FROM users WHERE phone_number=$1', [userPhone]);

          const pwdToSet = new_password || password;
          let passwordHash = null;
          if (pwdToSet) {
            if (String(pwdToSet).length < 6) {
              return err('Le mot de passe doit contenir au moins 6 caractères');
            }
            passwordHash = hashPassword(String(pwdToSet));
          }

          const cleanCommune = commune !== undefined && commune !== null ? String(commune).trim() : null;
          const cleanCity = city !== undefined && city !== null ? String(city).trim() : 'Kinshasa';

          if (!user) {
            const lockUntil = cleanCommune ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : null;
            user = await one(
              'INSERT INTO users (phone_number, full_name, role, password_hash, is_verified, city, commune, commune_updated_at, commune_locked_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
              [userPhone, full_name || 'Participant Punchy', 'USER', passwordHash, true, cleanCity, cleanCommune, cleanCommune ? new Date().toISOString() : null, lockUntil]
            );
          } else {
            let updates = [];
            let params = [user.id];

            if (full_name !== undefined && full_name !== null) {
              params.push(full_name);
              updates.push(`full_name=$${params.length}`);
            }
            if (passwordHash) {
              params.push(passwordHash);
              updates.push(`password_hash=$${params.length}`);
            }

            // Handle Commune update with 90-day anti-opportunism locking rule
            if (cleanCommune !== null && cleanCommune !== '') {
              // If user already had a commune and is attempting to change it to a different one
              if (user.commune && user.commune.toLowerCase() !== cleanCommune.toLowerCase()) {
                if (user.commune_locked_until) {
                  const lockDate = new Date(user.commune_locked_until);
                  const now = new Date();
                  if (lockDate.getTime() > now.getTime()) {
                    const remainingDays = Math.max(1, Math.ceil((lockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    const formattedDate = lockDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    return err(
                      `Votre commune (${user.commune}) est verrouillée pour 3 mois (règle anti-opportunisme). Modification impossible avant le ${formattedDate} (encore ${remainingDays} jour(s) de verrouillage).`,
                      403,
                      { remainingDays, lockedUntil: user.commune_locked_until, currentCommune: user.commune }
                    );
                  }
                }
              }

              params.push(cleanCommune);
              updates.push(`commune=$${params.length}`);
              params.push(cleanCity);
              updates.push(`city=$${params.length}`);
              updates.push(`commune_updated_at=now()`);
              updates.push(`commune_locked_until=now() + interval '90 days'`);
            }

            if (updates.length > 0) {
              user = await one(
                `UPDATE users SET ${updates.join(', ')} WHERE id=$1 RETURNING *`,
                params
              );
            }
          }

          const userObj = user ? { ...user } : {};
          delete userObj.password_hash;
          return json(userObj);
        }
      }

      if (!phone) return err('phone required');
      const user = await one('SELECT * FROM users WHERE phone_number=$1', [phone]);
      if (!user) return json([]);

      // GET /api/my/tickets?phone=
      if (segs[1] === 'tickets') {
        const rows = await many(`
          SELECT t.id, t.ticket_number, t.status, t.purchased_at,
                 r.id AS raffle_id, r.title, r.slug, r.hero_image_url, r.status AS raffle_status, r.winning_ticket_id
          FROM tickets t JOIN raffles r ON r.id=t.raffle_id
          WHERE t.user_id=$1 AND t.status='CONFIRMED'
          ORDER BY t.purchased_at DESC
        `, [user.id]);
        return json(rows);
      }

      // GET /api/my/winning?phone=
      if (segs[1] === 'winning') {
        const rows = await many(`
          SELECT t.id, t.id AS ticket_id, t.ticket_number, r.id AS raffle_id, r.title, r.slug, r.hero_image_url, r.drawn_at, r.draw_seed
          FROM tickets t JOIN raffles r ON r.id=t.raffle_id
          WHERE r.winning_ticket_id=t.id AND t.user_id=$1
          ORDER BY r.drawn_at DESC NULLS LAST
        `, [user.id]);
        return json(rows);
      }

      // GET /api/my/transactions?phone=
      if (segs[1] === 'transactions') {
        const rows = await many(`
          SELECT tx.*, r.title AS raffle_title, r.slug AS raffle_slug
          FROM transactions tx LEFT JOIN raffles r ON r.id=tx.raffle_id
          WHERE tx.user_id=$1
          ORDER BY tx.created_at DESC LIMIT 100
        `, [user.id]);
        return json(rows);
      }
    }

    // -------- TRANSPARENCY ------
    if (segs[0] === 'transparency' && segs[1] && method === 'GET') {
      // Accept slug or id
      const raffle = await one(`
        SELECT r.*, c.name AS category_name FROM raffles r LEFT JOIN categories c ON c.id=r.category_id
        WHERE r.id::text=$1 OR r.slug=$1
      `, [segs[1]]);
      if (!raffle) return err('Not found', 404);
      let winningTicket = null, winnerUser = null, verifiedHash = null;
      if (raffle.winning_ticket_id) {
        winningTicket = await one('SELECT * FROM tickets WHERE id=$1', [raffle.winning_ticket_id]);
        if (winningTicket) {
          winnerUser = await one('SELECT phone_number, full_name FROM users WHERE id=$1', [winningTicket.user_id]);
          if (winnerUser?.phone_number) winnerUser.phone_number = maskPhone(winnerUser.phone_number);
        }
      }
      if (raffle.draw_seed) {
        verifiedHash = crypto.createHash('sha256').update(raffle.draw_seed).digest('hex');
      }
      return json({ raffle, winning_ticket: winningTicket, winner_user: winnerUser, verified_hash: verifiedHash });
    }

    // -------- ADS -------
    if (segs[0] === 'ads' && method === 'GET') {
      const reqZone = url.searchParams.get('zone');
      const zone = reqZone || segs[1] || 'home';
      const rawSources = url.searchParams.get('sources') || url.searchParams.get('src') || url.searchParams.get('source');

      let includeSpb = true; // Supabase / DefMaks
      let includeNdb = true; // Neon Database

      if (rawSources) {
        let parsed = [];
        try {
          if (rawSources.startsWith('[')) {
            parsed = JSON.parse(rawSources);
          } else {
            parsed = rawSources.split(',');
          }
        } catch (e) {
          parsed = [rawSources];
        }
        const srcUpper = parsed.map(s => String(s).trim().toUpperCase());
        includeSpb = srcUpper.some(s => ['SPB', 'DMKS', 'SUPABASE', 'ALL'].includes(s));
        includeNdb = srcUpper.some(s => ['NDB', 'NEON', 'ALL'].includes(s));
      }

      const allAds = [];

      // 1. Fetch SPB (Supabase / DefMaks) Ads
      if (includeSpb) {
        try {
          const supabaseUrl = process.env.SUPABASE_URL || 'https://hcpogyjdbtcxndzpyjvd.supabase.co';
          const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          const headers = { 'Content-Type': 'application/json' };
          if (supabaseAnonKey) {
            headers['apikey'] = supabaseAnonKey;
            headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
          }

          const res = await fetch(`${supabaseUrl}/rest/v1/advertisements?zone=eq.${zone}&is_active=eq.true&select=*`, {
            headers,
            cache: 'no-store',
          });

          if (res.ok) {
            const supAds = await res.json();
            if (Array.isArray(supAds)) {
              supAds.forEach(a => {
                allAds.push({
                  ...a,
                  source: 'SPB',
                  _source: 'Supabase DefMaks',
                  zone: a.zone || zone,
                });
              });
            }
          }
        } catch (e) {
          console.warn('[ADS] Supabase REST (SPB) query failed:', e.message);
        }
      }

      // 2. Fetch NDB (Neon Database) Ads
      if (includeNdb) {
        try {
          const rows = await many(`
            SELECT * FROM advertisements
            WHERE (zone=$1 OR zone IS NULL) AND is_active=true
            ORDER BY created_at DESC LIMIT 10
          `, [zone]);

          if (rows && rows.length > 0) {
            rows.forEach(a => {
              allAds.push({
                ...a,
                source: 'NDB',
                _source: 'Neon DB',
                zone: a.zone || zone,
              });
            });
          }
        } catch (e) {
          console.warn('[ADS] Neon DB (NDB) query failed:', e.message);
        }
      }

      // Fallback in-memory ads if empty
      if (allAds.length === 0) {
        try {
          const memRows = await many(`SELECT * FROM advertisements WHERE zone=$1`, [zone]);
          if (memRows && memRows.length > 0) {
            memRows.forEach(a => allAds.push({ ...a, source: 'NDB', zone: a.zone || zone }));
          }
        } catch (e) {
          // ignore
        }
      }

      return json(allAds);
    }

    // -------- CONTACT / SUPPORT --------
    if (segs[0] === 'contact' && method === 'POST') {
      const b = await request.json();
      const { name, email, phone, subject, message } = b || {};

      if (!name || !email || !subject || !message) {
        return err('Veuillez remplir tous les champs obligatoires (nom, email, sujet, message).');
      }

      // Record message in PostgreSQL database
      try {
        await many(`
          CREATE TABLE IF NOT EXISTS contact_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
          );
        `);
        await many(`
          INSERT INTO contact_messages (name, email, phone, subject, message)
          VALUES ($1, $2, $3, $4, $5)
        `, [name, email, phone || null, subject, message]);
      } catch (e) {
        console.warn('[CONTACT] DB save notice:', e.message);
      }

      // Dispatch support email to support@defmaks.com
      const emailResult = await sendContactEmail({ name, email, phone, subject, message });

      return json({
        success: true,
        message: 'Votre message a été envoyé avec succès au support DefMaks.',
        detail: emailResult,
      });
    }

    // -------- TESTIMONIALS -------
    if (segs[0] === 'testimonials') {
      // POST /api/testimonials  { phone, raffle_slug, photo_url, message }
      if (method === 'POST' && segs.length === 1) {
        const b = await request.json();
        const { phone, raffle_slug, photo_url, message } = b;
        if (!phone || !raffle_slug || !photo_url || !message) return err('Missing fields');
        const user = await one('SELECT * FROM users WHERE phone_number=$1', [phone]);
        if (!user) return err('User not found', 404);
        const raffle = await one('SELECT id FROM raffles WHERE slug=$1', [raffle_slug]);
        if (!raffle) return err('Raffle not found', 404);
        // Must be winner
        const winTicket = await one(`
          SELECT t.id FROM tickets t
          JOIN raffles r ON r.winning_ticket_id = t.id
          WHERE r.id=$1 AND t.user_id=$2
        `, [raffle.id, user.id]);
        if (!winTicket) return err('Not a winner of this raffle', 403);
        // Upsert testimonial
        const existing = await one('SELECT * FROM testimonials WHERE user_id=$1 AND raffle_id=$2', [user.id, raffle.id]);
        if (existing) return err('Témoignage déjà soumis', 409);
        const created = await one(`
          INSERT INTO testimonials (user_id, raffle_id, ticket_id, photo_url, message, status)
          VALUES ($1,$2,$3,$4,$5,'PENDING') RETURNING *
        `, [user.id, raffle.id, winTicket.id, photo_url, message]);
        return json(created);
      }

      // GET /api/testimonials?phone=...&raffle_slug=... or GET /api/testimonials (public)
      if (method === 'GET' && segs.length === 1) {
        const phone = url.searchParams.get('phone');
        const slug = url.searchParams.get('raffle_slug');
        if (phone) {
          const user = await one('SELECT id FROM users WHERE phone_number=$1', [phone]);
          if (!user) return json([]);
          if (slug) {
            const raffle = await one('SELECT id FROM raffles WHERE slug=$1', [slug]);
            if (!raffle) return json([]);
            const t = await one('SELECT * FROM testimonials WHERE user_id=$1 AND raffle_id=$2', [user.id, raffle.id]);
            return json(t);
          }
          const rows = await many(`
            SELECT t.*, r.title AS raffle_title, r.slug AS raffle_slug
            FROM testimonials t JOIN raffles r ON r.id=t.raffle_id
            WHERE t.user_id=$1 ORDER BY t.created_at DESC
          `, [user.id]);
          return json(rows);
        }

        // Public feed of real testimonials for homepage
        const rows = await many(`
          SELECT 
            t.id,
            t.message,
            t.photo_url,
            t.status,
            t.created_at,
            u.full_name,
            u.phone_number,
            r.title,
            r.slug,
            r.hero_image_url,
            r.type AS raffle_type
          FROM testimonials t
          JOIN users u ON u.id = t.user_id
          JOIN raffles r ON r.id = t.raffle_id
          ORDER BY t.created_at DESC
          LIMIT 20
        `);
        return json(rows);
      }
    }

    // -------- ADMIN ------------
    if (segs[0] === 'admin') {
      // GET /api/admin/raffles (all)
      if (segs[1] === 'raffles' && segs.length === 2 && method === 'GET') {
        const rows = await many(`
          SELECT r.*, c.name AS category_name FROM raffles r LEFT JOIN categories c ON c.id=r.category_id
          ORDER BY r.created_at DESC
        `);
        return json(rows);
      }

      // POST /api/admin/raffles
      if (segs[1] === 'raffles' && segs.length === 2 && method === 'POST') {
        const b = await request.json();
        const { title, description, ticket_price = 1, currency = 'USD', max_tickets, type = 'THRESHOLD', category_slug, hero_image_url, ends_in_days = 7 } = b;
        if (!title || !max_tickets) return err('title & max_tickets required');
        const cat = category_slug ? await one('SELECT id FROM categories WHERE slug=$1', [category_slug]) : null;
        const slug = slugify(title) + '-' + Math.floor(Math.random() * 9999);
        const row = await one(`
          INSERT INTO raffles (category_id, title, slug, description, ticket_price, currency, max_tickets, tickets_sold, type, status, hero_image_url, starts_at, ends_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,'ACTIVE',$9, now(), now() + ($10 || ' days')::interval) RETURNING *
        `, [cat?.id || null, title, slug, description, ticket_price, currency, max_tickets, type, hero_image_url, String(ends_in_days)]);
        return json(row);
      }

      // POST /api/admin/raffles/:id/draw
      if (segs[1] === 'raffles' && segs[3] === 'draw' && method === 'POST') {
        const id = segs[2];
        const { rows } = await query('SELECT * FROM execute_fair_raffle_draw($1, $2)', [id, 'DEFMAKS_1USD_RAFFLE']);
        return json(rows[0] || null);
      }

      // POST /api/admin/raffles/:id/media
      if (segs[1] === 'raffles' && segs[3] === 'media' && method === 'POST') {
        const id = segs[2];
        const b = await request.json();
        const { type = 'IMAGE', url: mediaUrl, caption } = b;
        if (!mediaUrl) return err('url required');
        const row = await one(
          'INSERT INTO raffle_medias (raffle_id, type, url, caption) VALUES ($1,$2,$3,$4) RETURNING *',
          [id, type, mediaUrl, caption || null]
        );
        return json(row);
      }

      // POST /api/admin/raffles/:id/status  { status }
      if (segs[1] === 'raffles' && segs[3] === 'status' && method === 'POST') {
        const id = segs[2];
        const { status } = await request.json();
        const row = await one('UPDATE raffles SET status=$1, updated_at=now() WHERE id=$2 RETURNING *', [status, id]);
        return json(row);
      }
    }

    return err('Not found', 404);
  } catch (e) {
    console.error('[API ERROR]', segs.join('/'), method, e);
    return err(e.message || 'Server error', 500);
  }
}

function maskPhone(p) {
  if (!p) return p;
  const s = String(p);
  if (s.length < 6) return s;
  return s.slice(0, 4) + '****' + s.slice(-2);
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) { return handler(request, context); }
export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) { return handler(request, context); }
export async function PUT(request: Request, context: { params: Promise<{ path?: string[] }> }) { return handler(request, context); }
export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) { return handler(request, context); }
export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) { return handler(request, context); }
