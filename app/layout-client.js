'use client';
import Providers from './providers';
import WinnerNotificationBanner from '@/components/WinnerNotificationBanner';
import SmartAppBanner from '@/components/SmartAppBanner';

export default function LayoutClient({ children }) {
  return (
    <Providers>
      <SmartAppBanner />
      {children}
      <WinnerNotificationBanner />
    </Providers>
  );
}
