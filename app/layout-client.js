'use client';

import { useEffect } from 'react';
import Providers from './providers';
import WinnerNotificationBanner from '@/components/WinnerNotificationBanner';
import SmartAppBanner from '@/components/SmartAppBanner';

export default function LayoutClient({ children }) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .catch(() => {});
      }
    } catch (e) {
      // Insecure operation in Safari Private Browsing or restricted environments
    }
  }, []);

  return (
    <Providers>
      <SmartAppBanner />
      {children}
      <WinnerNotificationBanner />
    </Providers>
  );
}
