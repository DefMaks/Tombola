import { Suspense } from 'react';
import RaffleDetailClient from './RaffleDetailClient';
import { one } from '@/lib/db';
import { Loader2 } from 'lucide-react';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let raffle = null;
  try {
    raffle = await one(
      `SELECT r.*, c.name AS category_name FROM raffles r LEFT JOIN categories c ON c.id=r.category_id WHERE r.slug=$1`,
      [slug]
    );
  } catch (e) {
    console.error('Error generating raffle metadata:', e);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://punchy.cd';

  if (!raffle) {
    return {
      title: 'Round Tombola | Punchy',
      description: 'Choisis ton Round, lâche ton Punch pour seulement 1$ et repars avec le gros lot !',
    };
  }

  const title = `${raffle.title} - Round Punchy (1$)`;
  const description = raffle.description 
    ? `${raffle.description.slice(0, 150)}... Tente ta chance pour seulement 1$ ! Tirage équitable certifié SHA-256 à Kinshasa.`
    : `Tente ta chance pour remporter ${raffle.title} pour seulement 1$ sur Punchy ! Tirage équitable certifié SHA-256 à Kinshasa.`;
  const heroImage = raffle.hero_image_url || `${baseUrl}/Punchy-logo-b.png`;
  const pageUrl = `${baseUrl}/raffles/${raffle.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'Punchy',
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 630,
          alt: raffle.title,
        },
      ],
      locale: 'fr_CD',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [heroImage],
    },
  };
}

export default async function RafflePage({ params }) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <RaffleDetailClient slug={slug} />
    </Suspense>
  );
}
