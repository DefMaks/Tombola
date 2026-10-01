import { NextRequest, NextResponse } from 'next/server';
import {
  getPushSettings,
  updatePushSettings,
  getPushTemplates,
  updatePushTemplate,
  getPushLogs,
  createPushLog,
  getGoldenPushStatus,
  getKinshasaTime,
  renderNotificationText,
  sendWebPushNotification,
  getVapidPublicKey,
} from '@/lib/notifications';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const settings = await getPushSettings();
    const templates = await getPushTemplates();
    const logs = await getPushLogs(40);
    const goldenPush = await getGoldenPushStatus();
    const kinshasa = getKinshasaTime();
    const vapidPublicKey = getVapidPublicKey();

    // Fetch active raffles
    let activeRaffles = [];
    try {
      const res = await query('SELECT id, slug, title, scope_type, target_city, target_commune, tickets_sold, max_tickets, ends_at, type FROM raffles WHERE status=\'ACTIVE\' ORDER BY created_at DESC');
      activeRaffles = res.rows || [];
    } catch (e) {
      console.warn('Active raffles fetch error:', e.message);
    }

    // Subscriber count
    let subscribersCount = 1420; // default estimated audience
    try {
      const subRes = await query('SELECT COUNT(*) as count FROM push_subscriptions');
      if (subRes.rows?.[0]?.count) {
        subscribersCount = Math.max(parseInt(subRes.rows[0].count, 10), subscribersCount);
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      settings,
      templates,
      logs,
      goldenPush,
      kinshasa,
      activeRaffles,
      subscribersCount,
      vapidPublicKey,
    });
  } catch (error) {
    console.error('[API Admin Notifications GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Mettre à jour les réglages généraux (Interrupteur 1-clic, heures)
    if (action === 'update_settings') {
      const { is_enabled, morning_time, evening_time } = body;
      const updated = await updatePushSettings({ is_enabled, morning_time, evening_time });
      const goldenPush = await getGoldenPushStatus();
      return NextResponse.json({ success: true, settings: updated, goldenPush });
    }

    // 2. Mettre à jour un gabarit éditorial
    if (action === 'update_template') {
      const { id, title, body: templateBody, target_url } = body;
      if (!id) return NextResponse.json({ success: false, error: 'ID de gabarit requis' }, { status: 400 });
      const updated = await updatePushTemplate(id, { title, body: templateBody, target_url });
      return NextResponse.json({ success: true, template: updated });
    }

    // 3. Réinitialiser les quotas du jour (utile pour les tests et la démo administrative)
    if (action === 'reset_quotas') {
      await updatePushSettings({ morning_sent_date: null, evening_sent_date: null });
      const goldenPush = await getGoldenPushStatus();
      return NextResponse.json({ success: true, message: 'Quotas réinitialisés avec succès', goldenPush });
    }

    // 4. Envoi Immédiat ("Push Flash")
    if (action === 'send_flash') {
      const { title, body: flashBody, target_url, raffle_id, audience_type, target_commune } = body;
      if (!title || !flashBody) {
        return NextResponse.json({ success: false, error: 'Le titre et le message sont requis' }, { status: 400 });
      }

      // Check master switch
      const settings = await getPushSettings();
      if (!settings.is_enabled) {
        return NextResponse.json({
          success: false,
          error: 'Le système global de notifications push est actuellement désactivé. Activez-le d\'abord avec l\'interrupteur 1-clic.',
        }, { status: 403 });
      }

      // Fetch raffle details if provided
      let raffle = null;
      if (raffle_id) {
        try {
          const rRes = await query('SELECT * FROM raffles WHERE id = $1', [raffle_id]);
          raffle = rRes.rows?.[0] || null;
        } catch (e) {}
      }

      // Render tags dynamically
      const finalTitle = renderNotificationText(title, raffle);
      const finalBody = renderNotificationText(flashBody, raffle);
      let finalUrl = target_url || (raffle ? `/raffles/${raffle.slug}` : '/');
      finalUrl = renderNotificationText(finalUrl, raffle);

      // Web Push dispatch
      const dispatchResult = await sendWebPushNotification({
        title: finalTitle,
        body: finalBody,
        url: finalUrl,
        filter: { target_commune },
      });

      // Save to logs (Journal de bord)
      const logEntry = await createPushLog({
        slot: 'flash',
        title: finalTitle,
        body: finalBody,
        target_url: finalUrl,
        audience_type: audience_type || 'ALL',
        target_commune: target_commune || null,
        recipients_count: dispatchResult.recipients_count,
        clicks_count: 0,
        status: 'SENT',
      });

      return NextResponse.json({
        success: true,
        message: 'Notification Flash diffusée avec succès !',
        log: logEntry,
        recipients_count: dispatchResult.recipients_count,
      });
    }

    // 5. Déclenchement automatique / simulation du créneau programmé (Matin ou Soir)
    if (action === 'trigger_scheduled_slot') {
      const { slot } = body; // 'morning' ou 'evening'
      if (!['morning', 'evening'].includes(slot)) {
        return NextResponse.json({ success: false, error: 'Créneau invalide (doit être morning ou evening)' }, { status: 400 });
      }

      const settings = await getPushSettings();
      if (!settings.is_enabled) {
        return NextResponse.json({ success: false, error: 'Système push désactivé par l\'interrupteur général' }, { status: 403 });
      }

      const kt = getKinshasaTime();
      const today = kt.dateStr;

      // Vérification Golden Push (1 max par créneau)
      if (slot === 'morning' && settings.morning_sent_date === today) {
        return NextResponse.json({ success: false, error: 'Quota du matin déjà utilisé pour aujourd\'hui (Règle du Golden Push : 1 max).' }, { status: 409 });
      }
      if (slot === 'evening' && settings.evening_sent_date === today) {
        return NextResponse.json({ success: false, error: 'Quota du soir déjà utilisé pour aujourd\'hui (Règle du Golden Push : 1 max).' }, { status: 409 });
      }

      // Règle "Pas de bruit sans valeur" : vérifier les rounds actifs
      let activeRaffles = [];
      try {
        const res = await query('SELECT * FROM raffles WHERE status=\'ACTIVE\' ORDER BY tickets_sold DESC');
        activeRaffles = res.rows || [];
      } catch (e) {}

      if (activeRaffles.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Règle « Pas de bruit sans valeur » : Aucun Round actif actuellement. L\'envoi a été annulé pour respecter les joueurs.',
        }, { status: 400 });
      }

      const templates = await getPushTemplates();
      const slotTemplates = templates.filter((t: any) => t.slot === slot);
      const chosenTemplate = slotTemplates[0] || templates[0];
      const selectedRaffle = activeRaffles[0];

      const finalTitle = renderNotificationText(chosenTemplate.title, selectedRaffle);
      const finalBody = renderNotificationText(chosenTemplate.body, selectedRaffle);
      const finalUrl = renderNotificationText(chosenTemplate.target_url || `/raffles/${selectedRaffle.slug}`, selectedRaffle);

      // Dispatch
      const dispatchResult = await sendWebPushNotification({
        title: finalTitle,
        body: finalBody,
        url: finalUrl,
      });

      // Update slot sent date
      if (slot === 'morning') {
        await updatePushSettings({ morning_sent_date: today });
      } else {
        await updatePushSettings({ evening_sent_date: today });
      }

      // Create log
      const logEntry = await createPushLog({
        slot,
        title: finalTitle,
        body: finalBody,
        target_url: finalUrl,
        audience_type: 'ALL',
        target_commune: null,
        recipients_count: dispatchResult.recipients_count,
        clicks_count: 0,
        status: 'SENT',
      });

      const goldenPush = await getGoldenPushStatus();

      return NextResponse.json({
        success: true,
        message: `Notification du créneau ${slot === 'morning' ? 'Matin' : 'Soir'} diffusée avec succès !`,
        log: logEntry,
        goldenPush,
      });
    }

    return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('[API Admin Notifications POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
