'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h2 className="text-2xl font-black mb-2">Page non trouvée</h2>
      <p className="text-muted-foreground text-sm mb-6">La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
