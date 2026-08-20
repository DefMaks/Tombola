'use client';
import Providers from './providers';
import WinnerNotificationBanner from '@/components/WinnerNotificationBanner';

export default function LayoutClient({ children }) {
  return (
    <Providers>
      {children}
      <WinnerNotificationBanner />
    </Providers>
  );
}
