import type { MetadataRoute } from 'next';
import { many } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://punchy.cd';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/info`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/transparency`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  try {
    const raffles = await many(
      "SELECT slug, updated_at, created_at FROM raffles WHERE status IN ('ACTIVE', 'COMPLETED', 'PENDING_DRAW')"
    );

    const raffleUrls: MetadataRoute.Sitemap = (raffles || []).map((raffle: any) => ({
      url: `${baseUrl}/raffles/${raffle.slug}`,
      lastModified: raffle.updated_at ? new Date(raffle.updated_at) : new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    }));

    return [...staticRoutes, ...raffleUrls];
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error);
    return staticRoutes;
  }
}
