import { NextRequest, NextResponse } from 'next/server';
import { query, one, many } from '@/lib/db';
import { sendOneSignalPushNotification } from '@/lib/notifications/onesignal';
import { sendWebPushNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secretHeader = req.headers.get('x-admin-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = new URL(req.url);
  const secretQuery = url.searchParams.get('secret');
  const provided = (secretHeader || secretQuery || '').trim();

  const expectedSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expectedSecret) {
    // If not configured in environment, allow with warning to prevent hard block
    return true;
  }
  return provided === expectedSecret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const results: any[] = [];
  const errors: any[] = [];

  try {
    // 1. Activer les tombolas SCHEDULED dont la date d'ouverture est arrivée
    try {
      await query(`
        UPDATE raffles
        SET status = 'ACTIVE', updated_at = now()
        WHERE status = 'SCHEDULED'
          AND (starts_at IS NULL OR starts_at <= now())
          AND (ends_at IS NULL OR ends_at > now())
          AND (max_tickets = 0 OR tickets_sold < max_tickets)
      `);
    } catch (e: any) {
      console.warn('[Auto-Draw Cron] Auto-activate warning:', e?.message);
    }

    // 2. Basculer en PENDING_DRAW les tombolas actives arrivées à échéance ou au max de tickets
    try {
      await query(`
        UPDATE raffles
        SET status = 'PENDING_DRAW', updated_at = now()
        WHERE status = 'ACTIVE'
          AND (
            (ends_at IS NOT NULL AND ends_at <= now())
            OR (max_tickets > 0 AND tickets_sold >= max_tickets)
          )
      `);
    } catch (e: any) {
      console.warn('[Auto-Draw Cron] Auto-pending warning:', e?.message);
    }

    // 3. Identifier toutes les tombolas prêtes pour le tirage (sans gagnant attribué)
    const pendingRaffles = await many(`
      SELECT id, title, slug, tickets_sold, max_tickets, ends_at, status
      FROM raffles
      WHERE winning_ticket_id IS NULL
        AND (
          status = 'PENDING_DRAW'
          OR (
            status = 'ACTIVE'
            AND (
              (ends_at IS NOT NULL AND ends_at <= now())
              OR (max_tickets > 0 AND tickets_sold >= max_tickets)
            )
          )
          OR (
            status = 'COMPLETED'
            AND winning_ticket_id IS NULL
            AND tickets_sold > 0
          )
        )
      ORDER BY created_at ASC
    `);

    // 4. Exécuter le tirage certifié pour chaque round éligible
    for (const raffle of pendingRaffles) {
      try {
        // Vérifier le nombre réel de tickets confirmés
        const countRes = await one(
          `SELECT COUNT(*)::int as count FROM tickets WHERE raffle_id = $1 AND status = 'CONFIRMED'`,
          [raffle.id]
        );
        const confirmedCount = countRes?.count || 0;

        // Si aucun ticket n'a été acheté et que la date est dépassée : annuler proprement
        if (confirmedCount === 0) {
          if (raffle.ends_at && new Date(raffle.ends_at) <= new Date()) {
            await query(
              `UPDATE raffles SET status = 'CANCELLED', updated_at = now() WHERE id = $1`,
              [raffle.id]
            );
            results.push({
              id: raffle.id,
              title: raffle.title,
              action: 'CANCELLED_NO_TICKETS',
              message: 'Round échu sans ticket confirmé'
            });
          }
          continue;
        }

        // Exécution de la procédure cryptographique SHA-256
        const { rows } = await query(
          'SELECT * FROM execute_fair_raffle_draw($1, $2)',
          [raffle.id, 'DEFMAKS_1USD_RAFFLE']
        );
        const drawResult = rows[0] || null;

        if (drawResult) {
          // Récupérer le ticket gagnant et le numéro de téléphone de l'utilisateur
          const winnerTicket = await one(`
            SELECT t.*, u.phone_number, u.name
            FROM tickets t
            LEFT JOIN users u ON u.id = t.user_id
            WHERE t.id = $1
          `, [drawResult.winning_ticket_id || drawResult.ticket_id]);

          const ticketNum = winnerTicket?.ticket_number || drawResult.winning_ticket_number || 'gagnant';
          const winnerPhone = winnerTicket?.phone_number || winnerTicket?.phone;

          // Notification OneSignal personnelle au gagnant
          if (winnerPhone) {
            sendOneSignalPushNotification({
              title: '🎉 CHAMPION ! TU AS GAGNÉ !',
              message: `Ton Punch #${ticketNum} remporte le Round ${raffle.title} ! Connecte-toi pour réclamer ton gain 🏆`,
              url: 'https://punchyplay.com/my-tickets',
              includeExternalUserIds: [winnerPhone],
            }).catch((notifErr: any) => console.warn('[OneSignal Winner Alert Error]', notifErr?.message));
          }

          // Notification OneSignal d'annonce publique à la communauté
          sendOneSignalPushNotification({
            title: `🏆 Le Vainqueur du Round ${raffle.title} est connu !`,
            message: `Le Punch #${ticketNum} est le grand gagnant certifié. Consultez les résultats en direct.`,
            url: `https://punchyplay.com/transparency/${raffle.id}`,
          }).catch((notifErr: any) => console.warn('[OneSignal Public Alert Error]', notifErr?.message));

          // Notification Web-Push navigateur
          sendWebPushNotification({
            title: `🏆 Le Vainqueur du Round ${raffle.title} est connu !`,
            body: `Le Punch #${ticketNum} est le grand gagnant certifié. Consultez les résultats en direct.`,
            url: `/transparency/${raffle.id}`,
          }).catch(() => {});

          results.push({
            id: raffle.id,
            title: raffle.title,
            action: 'DRAW_EXECUTED',
            winning_ticket_number: ticketNum,
            winning_ticket_id: drawResult.winning_ticket_id,
            draw_seed: drawResult.seed,
          });
        }
      } catch (raffleDrawErr: any) {
        console.error(`[Auto-Draw Error for Raffle ${raffle.id}]:`, raffleDrawErr?.message);
        errors.push({
          id: raffle.id,
          title: raffle.title,
          error: raffleDrawErr?.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      pending_scanned: pendingRaffles.length,
      drawn_count: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[Auto-Draw Cron Fatal Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur interne du cron de tirage' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
