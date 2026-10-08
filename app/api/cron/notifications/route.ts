import { NextRequest, NextResponse } from 'next/server';
import {
  getPushSettings,
  updatePushSettings,
  getPushTemplates,
  createPushLog,
  getKinshasaTime,
  renderNotificationText,
  sendWebPushNotification,
} from '@/lib/notifications';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const settings = await getPushSettings();
    if (!settings.is_enabled) {
      return NextResponse.json({ status: 'SKIPPED', reason: 'Master switch disabled' });
    }

    const kt = getKinshasaTime();
    const today = kt.dateStr;
    const hours = kt.hours;
    const minutes = kt.minutes;

    let targetSlot = null;

    // Morning window: 08:00 - 09:30
    if (hours === 8 || (hours === 9 && minutes <= 30)) {
      if (settings.morning_sent_date !== today) {
        targetSlot = 'morning';
      }
    }

    // Evening window: 18:00 - 19:30
    if (hours === 18 || (hours === 19 && minutes <= 30)) {
      if (settings.evening_sent_date !== today) {
        targetSlot = 'evening';
      }
    }

    // Check for newly launched raffles (starts_at reached within the last hour or so)
    // We check if we already sent a 'launch' notification for them.
    const launchedRes = await query(`
      SELECT * FROM raffles 
      WHERE (status = 'ACTIVE' OR status = 'SCHEDULED')
        AND starts_at IS NOT NULL 
        AND starts_at <= NOW()
        AND starts_at > NOW() - interval '1 hour'
    `);
    const newlyLaunched = launchedRes.rows || [];
    let launchNotificationsSent = 0;

    for (const raffle of newlyLaunched) {
      const targetUrl = `/raffles/${raffle.slug}`;
      const logCheck = await query(`SELECT id FROM push_notifications_logs WHERE slot='launch' AND target_url = $1`, [targetUrl]);
      
      if (logCheck.rows.length === 0) {
        const dispatchResult = await sendWebPushNotification({
          title: `🚀 Le Round ${raffle.title} est ouvert !`,
          body: "Le compte à rebours est terminé. Réserve ton punch maintenant avant qu'il ne soit trop tard !",
          url: targetUrl,
          icon: '/P-punchy-emblem.png',
          badge: '/P-punchy-emblem.png',
          filter: { raffle_slug: raffle.slug }
        });
        
        await createPushLog({
          slot: 'launch',
          title: `🚀 Le Round ${raffle.title} est ouvert !`,
          body: 'Le compte à rebours est terminé...',
          target_url: targetUrl,
          audience_type: 'ALERTS_ONLY',
          target_commune: null,
          recipients_count: dispatchResult.recipients_count || 0,
          clicks_count: 0,
          status: 'SENT',
        });
        launchNotificationsSent++;
      }
    }

    if (!targetSlot && launchNotificationsSent === 0) {
      return NextResponse.json({
        status: 'IDLE',
        kinshasaTime: kt.formatted,
        message: 'Hors des créneaux de notification, quota du jour atteint, et aucun nouveau round à lancer.',
      });
    }

    if (!targetSlot) {
       return NextResponse.json({
        status: 'SUCCESS',
        kinshasaTime: kt.formatted,
        message: `${launchNotificationsSent} alertes de lancement envoyées.`,
      });
    }

    // Check active rounds
    const rafflesRes = await query('SELECT * FROM raffles WHERE status=\'ACTIVE\' ORDER BY tickets_sold DESC');
    const activeRaffles = rafflesRes.rows || [];

    if (activeRaffles.length === 0) {
      return NextResponse.json({
        status: 'ABORTED',
        reason: 'Règle Pas de bruit sans valeur : Aucun round actif',
      });
    }

    const templates = await getPushTemplates();
    const slotTemplates = templates.filter((t: any) => t.slot === targetSlot);
    const chosenTemplate = slotTemplates[0] || templates[0];
    const selectedRaffle = activeRaffles[0];

    const finalTitle = renderNotificationText(chosenTemplate.title, selectedRaffle);
    const finalBody = renderNotificationText(chosenTemplate.body, selectedRaffle);
    const finalUrl = renderNotificationText(chosenTemplate.target_url || `/raffles/${selectedRaffle.slug}`, selectedRaffle);

    const dispatchResult = await sendWebPushNotification({
      title: finalTitle,
      body: finalBody,
      url: finalUrl,
      icon: '/P-punchy-emblem.png',
      badge: '/P-punchy-emblem.png',
    });

    if (targetSlot === 'morning') {
      await updatePushSettings({ morning_sent_date: today });
    } else {
      await updatePushSettings({ evening_sent_date: today });
    }

    const logEntry = await createPushLog({
      slot: targetSlot,
      title: finalTitle,
      body: finalBody,
      target_url: finalUrl,
      audience_type: 'ALL',
      target_commune: null,
      recipients_count: dispatchResult.recipients_count,
      clicks_count: 0,
      status: 'SENT',
    });

    return NextResponse.json({
      status: 'SUCCESS',
      slot: targetSlot,
      kinshasaTime: kt.formatted,
      log: logEntry,
    });
  } catch (err) {
    console.error('[Cron Notifications Error]:', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}
