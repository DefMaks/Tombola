import './globals.css';
import LayoutClient from './layout-client';

export const metadata = {
  metadataBase: new URL('https://punchyplay.com'),
  title: 'Punchy | Le Jeu des Vrais Champions',
  description: 'Participez aux rounds avec vos punches à 1$ et tentez de décrocher la cagnotte.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Punchy | Le Jeu des Vrais Champions',
    description: 'Participez aux rounds avec vos punches à 1$ et repartez avec la cagnotte.',
    url: 'https://punchyplay.com',
    siteName: 'Punchy',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Punchy Logo',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Punchy | Le Jeu des Vrais Champions',
    description: 'Participez aux rounds avec vos punches à 1$.',
    images: ['/icon-512.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Punchy',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/P-punchy-emblem.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

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
      <body className="antialiased bg-background text-foreground min-h-screen" suppressHydrationWarning>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
