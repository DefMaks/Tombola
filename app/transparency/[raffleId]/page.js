'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Copy, CheckCircle2, XCircle, Hash, Trophy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

// Compute SHA-256 in browser
async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function TransparencyPage() {
  const { raffleId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['transparency', raffleId],
    queryFn: () => fetch(`/api/transparency/${raffleId}`).then(r => r.json()),
    enabled: !!raffleId,
  });
  const [userSeed, setUserSeed] = useState('');
  const [computed, setComputed] = useState('');

  useEffect(() => { if (data?.raffle?.draw_seed) setUserSeed(data.raffle.draw_seed); }, [data]);

  const compute = async () => {
    const h = await sha256(userSeed);
    setComputed(h);
  };

  if (isLoading || !data) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (data.error) return <div className="min-h-screen flex items-center justify-center">{data.error}</div>;

  const { raffle, winning_ticket, winner_user, verified_hash } = data;
  const matches = computed && verified_hash && computed === verified_hash;

  return (
    <main className="max-w-lg mx-auto min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href={`/raffles/${raffle.slug}`} prefetch={true} className="p-2 rounded-full bg-secondary"><ArrowLeft className="h-4 w-4"/></Link>
        <div>
          <h1 className="font-black text-lg">Transparence</h1>
          <div className="text-xs text-muted-foreground">Tirage équitable SHA-256</div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500"/>
            <div className="font-bold">Vérification cryptographique</div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">Chaque tirage utilise un <b>seed unique</b> combinant l&apos;ID de la tombola, le nombre de tickets vendus et un timestamp. Le hash SHA-256 de ce seed détermine le numéro gagnant (mod nombre de tickets vendus).</p>
        </div>

        {/* Raffle info */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            {raffle.hero_image_url && <img src={raffle.hero_image_url} alt={raffle.title} className="h-14 w-14 rounded-xl object-cover"/>}
            <div>
              <div className="font-black text-base">{raffle.title}</div>
              <Badge variant="outline" className="text-[10px]">{raffle.status}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Row label="Tickets vendus" value={raffle.tickets_sold}/>
            <Row label="Max tickets" value={raffle.max_tickets}/>
            <Row label="Type" value={raffle.type}/>
            <Row label="Date tirage" value={raffle.drawn_at ? new Date(raffle.drawn_at).toLocaleString('fr-FR') : '—'}/>
          </div>
        </div>

        {winning_ticket ? (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-2 border-amber-500/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-amber-400"/>
                <div className="font-bold">Ticket gagnant</div>
              </div>
              <div className="font-mono text-4xl font-black text-primary">#{winning_ticket.ticket_number}</div>
              {winner_user && <div className="text-xs text-muted-foreground mt-1">Gagnant: {winner_user.phone_number}</div>}
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary"/>
                <div className="font-bold text-sm">Seed cryptographique</div>
              </div>
              <CodeBlock text={raffle.draw_seed}/>

              <div className="flex items-center gap-2 pt-2">
                <Hash className="h-4 w-4 text-primary"/>
                <div className="font-bold text-sm">Hash SHA-256 (serveur)</div>
              </div>
              <CodeBlock text={verified_hash}/>

              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4"/>
                  <div className="font-bold text-sm">Vérifiez vous-même</div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Le seed ci-dessus doit produire ce hash. Cliquez pour vérifier via votre navigateur.</p>
                <Button onClick={compute} size="sm" className="w-full">
                  Calculer SHA-256 dans mon navigateur
                </Button>
                {computed && (
                  <div className={`mt-3 p-3 rounded-xl border ${matches ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500' : 'bg-red-500/10 border-red-500/40 text-red-500'}`}>
                    {matches ? <><CheckCircle2 className="inline h-4 w-4 mr-1"/> <b>VÉRIFIÉ</b> : Le hash correspond parfaitement au tirage du serveur.</> : <><XCircle className="inline h-4 w-4 mr-1"/> Mismatch détecté.</>}
                    <CodeBlock text={computed} className="mt-2"/>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center rounded-2xl bg-card border border-border">
            <div className="text-muted-foreground text-sm">Tirage non encore effectué.</div>
            <div className="text-xs text-muted-foreground mt-1">Statut: {raffle.status}</div>
          </div>
        )}
      </div>

      <BottomNav/>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
function CodeBlock({ text, className = '' }) {
  return (
    <div className={`relative bg-muted rounded-lg p-2 ${className}`}>
      <button onClick={() => { navigator.clipboard.writeText(text || ''); toast.success('Copié'); }} className="absolute top-2 right-2 p-1 rounded hover:bg-background">
        <Copy className="h-3 w-3"/>
      </button>
      <div className="font-mono text-[10px] break-all pr-6">{text || '—'}</div>
    </div>
  );
}
