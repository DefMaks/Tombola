'use client';
import { useEffect } from 'react';
import Providers from './providers';
import WinnerNotificationBanner from '@/components/WinnerNotificationBanner';
import SmartAppBanner from '@/components/SmartAppBanner';
import AutoNotificationSubscriber from '@/components/AutoNotificationSubscriber';

export default function LayoutClient({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Service worker registered
        })
        .catch((err) => {
          // SW registration failed silently
        });
    }
  }, []);

  return (
    <Providers>
      <AutoNotificationSubscriber />
      <SmartAppBanner />
      {children}
      <WinnerNotificationBanner />
    </Providers>
  );
}

