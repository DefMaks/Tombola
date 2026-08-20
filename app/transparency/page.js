'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import BottomNav from '@/components/BottomNav';
import { ShieldCheck, ChevronRight } from 'lucide-react';

export default function TransparencyIndex() {
  const { data: raffles = [] } = useQuery({
    queryKey: ['transparency-list'],
    queryFn: () => fetch('/api/raffles?status=ALL').then(r => r.json()),
  });

  return (
    <main className="max-w-lg mx-auto min-h-screen pb-24">
      <header className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-500"/>
          <div>
            <h1 className="font-black text-xl">Transparence & Équité</h1>
            <div className="text-xs text-muted-foreground">Vérifiez chaque tirage SHA-256</div>
          </div>
        </div>
      </header>
      <div className="px-4 pt-4 space-y-2">
        {raffles.map(r => (
          <Link key={r.id} href={`/transparency/${r.slug}`} prefetch={true} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/50">
            {r.hero_image_url && <img src={r.hero_image_url} alt={r.title} className="h-12 w-12 rounded-lg object-cover"/>}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm line-clamp-1">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.status} · {r.tickets_sold}/{r.max_tickets}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground"/>
          </Link>
        ))}
      </div>
      <BottomNav/>
    </main>
  );
}
