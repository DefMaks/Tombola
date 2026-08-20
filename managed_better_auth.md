### CONTEXT & REQUIREMENT: PHONE AUTHENTICATION VIA NEON MANAGED BETTER AUTH

Implement user authentication via Phone Number OTP in Next.js (App Router) using Neon Managed Better Auth and Twilio (or generic SMS webhook).
(https://neon.com/docs/auth/quick-start/tanstack-router)

#### 1. ENVIRONMENT VARIABLES REQUIRED
Ensure `.env.local` contains:
- `NEXT_PUBLIC_NEON_AUTH_URL`: Your Neon Auth project endpoint.
- `TWILIO_ACCOUNT_SID`: Twilio account ID for SMS.
- `TWILIO_AUTH_TOKEN`: Twilio secret token.
- `TWILIO_FROM_NUMBER`: Twilio phone number sending the SMS.
- `NEON_WEBHOOK_SECRET`: Secret to verify signatures coming from Neon Auth.

---

#### 2. SERVER-SIDE WEBHOOK HANDLER (`app/api/auth/send-otp/route.ts`)
Create a Next.js API Route listening for Neon's `send.otp` webhook events to trigger the SMS dispatch:

```ts
import { NextResponse } from 'next/server';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Verify event type
    if (payload.event_type === 'send.otp' && payload.event_data?.delivery_preference === 'sms') {
      const toNumber = payload.user?.phone_number || payload.event_data?.phone_number;
      const otpCode = payload.event_data?.otp_code;

      if (!toNumber || !otpCode) {
        return NextResponse.json({ error: 'Missing phone number or OTP code' }, { status: 400 });
      }

      // Format strictly to E.164 standard (e.g. +243XXXXXXXXX)
      const formattedPhone = toNumber.startsWith('+') ? toNumber : `+${toNumber}`;

      // Send SMS via Twilio
      await twilioClient.messages.create({
        from: process.env.TWILIO_FROM_NUMBER!,
        to: formattedPhone,
        body: `Votre code de vérification DefMaks Tombola est : ${otpCode}. Expire dans 5 minutes.`,
      });

      return NextResponse.json({ success: true, message: 'OTP sent successfully' });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error sending OTP webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}