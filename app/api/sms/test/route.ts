import { NextRequest, NextResponse } from 'next/server';
import { sendAfricasTalkingSms } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = body.phone || body.phone_number || '+243822032855';
    const message = body.message || 'Test officiel Punchy : votre code est 123456.';
    const keyword = body.keyword || undefined;
    const linkId = body.linkId || undefined;
    const bulkSMSMode = body.bulkSMSMode !== undefined ? Number(body.bulkSMSMode) : undefined;
    const retryDurationInHours = body.retryDurationInHours !== undefined ? Number(body.retryDurationInHours) : undefined;

    const result = await sendAfricasTalkingSms({
      to: phone,
      message,
      keyword,
      linkId,
      bulkSMSMode,
      retryDurationInHours,
    });

    return NextResponse.json({
      success: result.success,
      phone,
      message,
      result,
      provider: "Africa's Talking",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone') || '+243822032855';
  const message = url.searchParams.get('message') || 'Punchy SMS test vérification Africa\'s Talking';

  const result = await sendAfricasTalkingSms({
    to: phone,
    message,
  });

  return NextResponse.json({
    success: result.success,
    phone,
    result,
  });
}
