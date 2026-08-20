import nodemailer from 'nodemailer';

export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export async function sendContactEmail(data: ContactMessageInput) {
  const recipient = 'support@defmaks.com';

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  console.log(`[CONTACT EMAIL] Message from ${data.name} <${data.email}> regarding "${data.subject}" -> ${recipient}`);

  if (user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: `"${data.name}" <${user}>`,
        replyTo: data.email,
        to: recipient,
        subject: `[Punchy Support] ${data.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px;">
            <h2 style="color: #d97706; margin-bottom: 10px;">Message de Support Punchy</h2>
            <p><strong>Nom :</strong> ${data.name}</p>
            <p><strong>Email :</strong> <a href="mailto:${data.email}">${data.email}</a></p>
            ${data.phone ? `<p><strong>Téléphone :</strong> ${data.phone}</p>` : ''}
            <p><strong>Sujet :</strong> ${data.subject}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p><strong>Message :</strong></p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; white-space: pre-wrap;">
${data.message}
            </div>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 24px;">
              Reçu via le formulaire de contact Punchy • ${new Date().toISOString()}
            </p>
          </div>
        `,
      });
      return { success: true, method: 'smtp' };
    } catch (err: any) {
      console.warn('[CONTACT EMAIL] SMTP transport warning:', err.message);
    }
  }

  return { success: true, method: 'recorded' };
}
