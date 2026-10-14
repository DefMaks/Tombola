'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { safeStorage } from '@/lib/storage';

export default function OneSignalInitializer() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  useEffect(() => {
    if (!appId || typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({
          appId,
          safari_web_id: 'web.onesignal.auto.62a04992-e924-4258-8064-560c4d6dc347',
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: 'push',
                  autoPrompt: true,
                  delay: {
                    pageViews: 1,
                    timeDelay: 3,
                  },
                  text: {
                    actionMessage: "🥊 Activez les notifications pour ne manquer aucun coup d'envoi de Round, gain de cagnotte ou tirage au sort !",
                    acceptButton: '🔥 Activer les alertes',
                    cancelButton: 'Plus tard',
                  },
                },
              ],
            },
          },
        });

        // Synchroniser automatiquement l'identifiant du joueur connecté
        const userPhone = safeStorage.getItem('user_phone') || safeStorage.getItem('punchy_user_phone');
        if (userPhone) {
          OneSignal.login(userPhone);
        }
      } catch (err) {
        console.warn('[OneSignal Init Warning]', err?.message);
      }
    });
  }, [appId]);

  if (!appId) return null;

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
      onError={(e) => {
        console.warn('[OneSignal SDK load failed or offline]');
      }}
    />
  );
}
