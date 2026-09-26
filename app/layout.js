import './globals.css';
import LayoutClient from './layout-client';

export const metadata = {
  title: 'Punchy',
  description: 'Participez aux rounds avec vos punches à 1$.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Punchy',
  },
  icons: {
    icon: [
      { url: '/P-punchy-emblem.png', type: 'image/png' },
      { url: '/icon.jpg', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/P-punchy-emblem.png', type: 'image/png' },
    ],
  },
};


// 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s

export const viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0F172A" />
        <link rel="icon" href="/P-punchy-emblem.png" type="image/png" />
        <link rel="apple-touch-icon" href="/P-punchy-emblem.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Punchy" />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen" suppressHydrationWarning>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
