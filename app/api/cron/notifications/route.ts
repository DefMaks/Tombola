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

    if (!targetSlot) {
      return NextResponse.json({
        status: 'IDLE',
        kinshasaTime: kt.formatted,
        message: 'Hors des créneaux de notification ou quota du jour déjà atteint',
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
