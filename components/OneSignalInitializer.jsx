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
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
        });

        // Synchroniser automatiquement l'identifiant du joueur connecté
        const userPhone = safeStorage.getItem('user_phone');
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
    />
  );
}
