/**
 * OneSignal REST API Client
 * Envoi de notifications Push Web ciblées ou broadcast pour Punchy
 */

export interface SendPushNotificationOptions {
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
  segments?: string[];
  filters?: any[];
  includeExternalUserIds?: string[];
}

export async function sendOneSignalPushNotification(options: SendPushNotificationOptions) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.warn('[OneSignal] Clés manquantes (NEXT_PUBLIC_ONESIGNAL_APP_ID ou ONESIGNAL_REST_API_KEY)');
    return { success: false, error: 'OneSignal non configuré' };
  }

  try {
    const payload: any = {
      app_id: appId,
      headings: { en: options.title, fr: options.title },
      contents: { en: options.message, fr: options.message },
      url: options.url || 'https://www.punchyplay.com',
      data: options.data || {},
    };

    if (options.includeExternalUserIds && options.includeExternalUserIds.length > 0) {
      payload.include_aliases = { external_id: options.includeExternalUserIds };
      payload.target_channel = 'push';
    } else if (options.filters && options.filters.length > 0) {
      payload.filters = options.filters;
    } else {
      payload.included_segments = options.segments || ['Total Subscriptions'];
    }

    const authHeader = apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`;

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('[OneSignal Response Error]', response.status, data);
    }
    return { success: response.ok, data };
  } catch (err: any) {
    console.error('[OneSignal Send Push Error]', err.message);
    return { success: false, error: err.message };
  }
}
