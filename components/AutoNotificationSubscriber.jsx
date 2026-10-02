'use client';

import { useEffect } from 'react';
import { isPushNotificationSupported, subscribeUserToPush } from '@/lib/push-client';

export default function AutoNotificationSubscriber() {
  useEffect(() => {
    if (typeof window === 'undefined' || !isPushNotificationSupported()) return;

    const phone = localStorage.getItem('user_phone');
    // Uniquement pour les utilisateurs ayant une session ouverte
    if (!phone) return;

    if (Notification.permission === 'granted') {
      subscribeUserToPush({ userPhone: phone }).catch(() => {});
    }
  }, []);

  return null;
}
