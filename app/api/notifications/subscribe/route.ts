import { NextRequest, NextResponse } from 'next/server';
import { registerPushSubscription, getVapidPublicKey } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: getVapidPublicKey(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, city, commune, user_id } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ success: false, error: 'Informations d\'abonnement push incomplètes' }, { status: 400 });
    }

    const sub = await registerPushSubscription({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_id: user_id || null,
      city: city || 'Kinshasa',
      commune: commune || null,
      user_agent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({ success: true, message: 'Abonnement aux notifications enregistré', subscription: sub });
  } catch (error) {
    console.error('[API Subscribe Notifications] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
