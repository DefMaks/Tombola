/**
 * Service d'envoi de SMS via Africa's Talking
 * Supporte le SMS Standard, Premium/Shortcode et le fallback intelligent en RDC.
 */

export interface SendSmsOptions {
  to: string;
  message: string;
  senderId?: string;
  keyword?: string;
  linkId?: string;
  bulkSMSMode?: number;
  retryDurationInHours?: number;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  status: string;
  statusCode?: number;
  cost?: string;
  error?: string;
  provider: string;
  rawResponse?: any;
}

export async function sendAfricasTalkingSms(options: SendSmsOptions): Promise<SendSmsResult> {
  const apiKey = process.env.AFRICASTALKING_API_KEY || 'atsk_06aa917ec68241927c325268afda901f66c3480778fcbdcacb59b72f33a44a4edb62cce6';
  const username = process.env.AFRICASTALKING_USERNAME || 'DefMaks';
  const senderId = options.senderId || process.env.AFRICASTALKING_SENDER_ID;
  const keyword = options.keyword || process.env.AFRICASTALKING_KEYWORD;
  const linkId = options.linkId || process.env.AFRICASTALKING_LINK_ID;

  // Format clean E.164 phone
  let to = String(options.to).replace(/[\s\-\(\)\.]/g, '').trim();
  if (to.startsWith('0')) to = '+243' + to.slice(1);
  if (!to.startsWith('+')) {
    if (to.startsWith('243')) to = '+' + to;
    else to = '+243' + to;
  }

  async function postToAfricasTalking(includeSender: boolean) {
    const bodyParams = new URLSearchParams();
    bodyParams.append('username', username);
    bodyParams.append('to', to);
    bodyParams.append('message', options.message);

    // Sender ID
    if (includeSender && senderId) {
      bodyParams.append('from', senderId);
    }

    // Paramètres Premium SMS (conformes à https://developers.africastalking.com/docs/sms/sending/premium)
    if (keyword) {
      bodyParams.append('keyword', keyword);
    }
    if (linkId) {
      bodyParams.append('linkId', linkId);
    }
    if (options.bulkSMSMode !== undefined) {
      bodyParams.append('bulkSMSMode', String(options.bulkSMSMode));
    }
    if (options.retryDurationInHours !== undefined) {
      bodyParams.append('retryDurationInHours', String(options.retryDurationInHours));
    }

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey,
      },
      body: bodyParams.toString(),
    });

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }

  try {
    // 1ère tentative : avec le senderId si configuré
    let result = await postToAfricasTalking(!!senderId);
    let recipient = result.data?.SMSMessageData?.Recipients?.[0];
    const rawMsg = result.data?.SMSMessageData?.Message || '';
    const isInvalidSender = rawMsg.includes('InvalidSenderId') || result.data?.errorMessage?.includes('InvalidSenderId');

    // 2ème tentative (Fallback automatique) : si le Sender ID n'est pas encore approuvé par les opérateurs en RDC,
    // on renvoie immédiatement sans le paramètre 'from' (canal partagé Africa's Talking garanti en RDC)
    if ((!recipient || recipient.status !== 'Success' || isInvalidSender) && senderId) {
      console.warn(`[SMS RDC] Sender ID "${senderId}" non reconnu (${rawMsg}), bascule automatique sur le canal par défaut...`);
      result = await postToAfricasTalking(false);
      recipient = result.data?.SMSMessageData?.Recipients?.[0];
    }

    if (recipient && (recipient.status === 'Success' || recipient.statusCode === 100)) {
      return {
        success: true,
        messageId: recipient.messageId,
        status: recipient.status || 'Success',
        statusCode: recipient.statusCode || 100,
        cost: recipient.cost,
        provider: "Africa's Talking",
        rawResponse: result.data,
      };
    }

    const errorMsg = recipient?.status || result.data?.SMSMessageData?.Message || result.data?.errorMessage || 'Échec de transmission SMS';
    return {
      success: false,
      status: recipient?.status || 'Failed',
      statusCode: recipient?.statusCode,
      error: errorMsg,
      provider: "Africa's Talking",
      rawResponse: result.data,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'Error',
      error: err.message || 'Erreur réseau Africa\'s Talking',
      provider: "Africa's Talking",
    };
  }
}
