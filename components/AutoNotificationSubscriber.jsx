'use client';

import { useEffect } from 'react';

export default function AutoNotificationSubscriber() {
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      // Vérifier support de Notification en toute sécurité
      if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
        return;
      }

      const phone = localStorage.getItem('user_phone');
      if (!phone) return;

      if (window.Notification && Notification.permission === 'granted') {
        import('@/lib/push-client')
          .then(({ subscribeUserToPush }) => {
            subscribeUserToPush({ userPhone: phone }).catch(() => {});
          })
          .catch(() => {});
      }
    } catch (e) {
      // Ignorer silencieusement pour éviter tout crash client
    }
  }, []);

  return null;
}
