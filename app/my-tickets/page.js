'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Ticket, 
  Trophy, 
  Receipt, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowLeft,
  Smartphone,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import { formatDRCPhone } from '@/lib/auth/actions';

export default function MyTicketsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'txs' ? 'txs' : 'active';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');

  useEffect(() => {
    const requested = searchParams.get('tab');
    if (requested === 'txs') setActiveTab('txs');
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem('user_phone');
    const token = localStorage.getItem('auth_token');
    if (!token) {
      localStorage.removeItem('user_phone');
      setSavedPhone('');
      setPhone('');
      return;
    }
    if (saved) { 
      setPhone(saved); 
      setSavedPhone(saved); 
    }
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets', savedPhone],
    queryFn: () => fetch(`/api/my/tickets?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone, 
    refetchInterval: 10_000,
  });

  const { data: winning = [] } = useQuery({
    queryKey: ['my-winning', savedPhone],
    queryFn: () => fetch(`/api/my/winning?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone,
  });

  const { data: txs = [] } = useQuery({
    queryKey: ['my-txs', savedPhone],
    queryFn: () => fetch(`/api/my/transactions?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone,
  });

  const save = () => {
    const formatted = formatDRCPhone(phone);
    if (formatted) {
      localStorage.setItem('user_phone', formatted);
      setPhone(formatted);
      setSavedPhone(formatted);
    }
  };

  // Stats for transactions
  const successfulTxs = txs.filter(t => t.status === 'SUCCESS');
  const totalSpentUsd = successfulTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalPunchesPurchased = successfulTxs.reduce((sum, t) => sum + (parseInt(t.quantity, 10) || 1), 0);

  if (!savedPhone) {
    return (
      <main className="max-w-lg mx-auto min-h-screen pb-24 px-4 pt-16">
        <div className="text-center mb-8">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
            <Ticket className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="font-black text-2xl">Mes Punches & Participations</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Entrez votre numéro pour consulter vos tickets, vos gains et votre historique de paiements.
          </p>
        </div>
        <div className="space-y-3 bg-card border border-border rounded-2xl p-4 shadow-lg">
          <div className="relative">
            <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="tel" 
              placeholder="+243 82 000 0000" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className="pl-10 h-12 rounded-xl text-base"
            />
          </div>
          <Button 
            onClick={save} 
            disabled={!phone} 
            size="lg" 
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            Continuer <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link 
              href="/profile" 
              className="p-1.5 -ml-1 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Retour au profil"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-black text-lg leading-tight">Mes Punches & Participations</h1>
              <div className="text-[11px] text-muted-foreground">{savedPhone}</div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-400 bg-amber-500/10">
            {tickets.length} {tickets.length > 1 ? 'Punches' : 'Punch'}
          </Badge>
        </div>
      </header>

      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-11 rounded-2xl bg-card border border-border p-1">
            <TabsTrigger value="active" className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
              <Ticket className="h-3.5 w-3.5 mr-1" />
              Actifs ({tickets.length})
            </TabsTrigger>
            <TabsTrigger value="winning" className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
              <Trophy className="h-3.5 w-3.5 mr-1" />
              Gains ({winning.length})
            </TabsTrigger>
            <TabsTrigger value="txs" className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
              <Receipt className="h-3.5 w-3.5 mr-1" />
              Paiements ({txs.length})
            </TabsTrigger>
          </TabsList>

          {/* ACTIVE TICKETS */}
          <TabsContent value="active" className="space-y-3 pt-4">
            {tickets.length === 0 && (
              <EmptyState 
                icon={Ticket}
                title="Aucun Punch actif"
                msg="Vous n'avez pas encore de ticket en cours. Choisissez un Round et tentez votre chance !"
                actionHref="/"
                actionLabel="Découvrir les Rounds"
              />
            )}
            {tickets.map((t, i) => (
              <motion.div 
                key={t.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.03 }}
              >
                <Link 
                  href={`/raffles/${t.slug}`} 
                  prefetch={true} 
                  className="flex items-center gap-3.5 p-3.5 bg-card border border-border rounded-2xl hover:border-amber-500/50 transition-all shadow-sm group"
                >
                  <img 
                    src={t.hero_image_url} 
                    alt={t.title} 
                    className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border/60"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{t.raffle_status === 'ACTIVE' ? 'Round en cours' : t.raffle_status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-black">
                        Punch #{t.ticket_number}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </motion.div>
            ))}
          </TabsContent>

          {/* WINNING TICKETS */}
          <TabsContent value="winning" className="space-y-3 pt-4">
            {winning.length === 0 && (
              <EmptyState 
                icon={Trophy}
                title="Pas encore de gain"
                msg="Chaque Round est une opportunité avec tirage certifié SHA-256. Bonne chance !"
                actionHref="/"
                actionLabel="Participer à un Round"
              />
            )}
            {winning.map(w => (
              <div 
                key={w.id} 
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-card to-orange-600/20 border-2 border-amber-500/60 p-4 shadow-xl"
              >
                <Trophy className="absolute top-3 right-3 h-7 w-7 text-amber-400" />
                <div className="flex items-center gap-3.5">
                  <img 
                    src={w.hero_image_url} 
                    alt={w.title} 
                    className="h-20 w-20 rounded-xl object-cover shrink-0 border border-amber-500/40"
                  />
                  <div className="flex-1 min-w-0">
                    <Badge className="bg-amber-500 text-slate-950 font-black mb-1">GAGNANT OFFICIEL</Badge>
                    <div className="font-black text-base line-clamp-1">{w.title}</div>
                    <div className="font-mono text-amber-400 text-sm font-bold mt-0.5">Punch gagnant #{w.ticket_number}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-500/30 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tirage certifié SHA-256</span>
                  <Link 
                    href={`/raffles/${w.slug}?readonly=true`} 
                    prefetch={true} 
                    className="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    Voir les détails du Round <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* PAYMENTS & TRANSACTIONS HISTORY (FUSED) */}
          <TabsContent value="txs" className="space-y-3 pt-4">
            {/* Quick summary stats */}
            {txs.length > 0 && (
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-card border border-border shadow-sm mb-4">
                <div className="text-center p-1.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Réglé</div>
                  <div className="text-base font-black text-amber-400">${totalSpentUsd.toFixed(2)}</div>
                </div>
                <div className="text-center p-1.5 border-x border-border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Punches Payés</div>
                  <div className="text-base font-black text-foreground">{totalPunchesPurchased}</div>
                </div>
                <div className="text-center p-1.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Validés</div>
                  <div className="text-base font-black text-emerald-400">{successfulTxs.length}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-amber-400" />
                Historique des Paiements & Transactions
              </h3>
              <span className="text-[11px] text-muted-foreground">{txs.length} {txs.length > 1 ? 'entrées' : 'entrée'}</span>
            </div>

            {txs.length === 0 && (
              <EmptyState 
                icon={Receipt}
                title="Aucun paiement pour le moment"
                msg="Vos reçus de paiement Mobile Money apparaîtront ici après chaque participation."
                actionHref="/"
                actionLabel="Lancer un Punch (1$)"
              />
            )}

            {txs.map(tx => (
              <div 
                key={tx.id} 
                className="p-3.5 bg-card border border-border rounded-2xl shadow-sm space-y-2.5 hover:border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <TxIcon status={tx.status} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground line-clamp-1">
                        {tx.raffle_title || 'Achat de Punch'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-sm text-amber-400">${Number(tx.amount).toFixed(2)}</div>
                    <Badge variant="outline" className={cn('text-[9px] uppercase font-bold mt-0.5', statusClass(tx.status))}>
                      {tx.status === 'SUCCESS' ? 'PAYÉ' : tx.status === 'PENDING' ? 'EN COURS' : 'ÉCHOUÉ'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-semibold flex items-center gap-1">
                      <Smartphone className="h-3 w-3 text-muted-foreground" />
                      {tx.operator || 'Mobile Money'}
                    </span>
                    <span>{tx.quantity || 1} {tx.quantity > 1 ? 'Punches' : 'Punch'}</span>
                  </div>

                  {tx.merchant_reference && (
                    <span className="font-mono text-[10px] text-muted-foreground/80 truncate max-w-[150px]">
                      Ref: {tx.merchant_reference}
                    </span>
                  )}
                </div>

                {tx.raffle_slug && (
                  <div className="pt-1 text-right">
                    <Link 
                      href={`/raffles/${tx.raffle_slug}`} 
                      className="text-[11px] text-amber-400 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      Voir le Round associé <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </main>
  );
}

function EmptyState({ icon: Icon, title, msg, actionHref, actionLabel }) {
  return (
    <div className="py-12 px-4 text-center rounded-2xl bg-card/50 border border-dashed border-border/80 my-4 space-y-3">
      {Icon && (
        <div className="h-12 w-12 mx-auto rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="font-bold text-base text-foreground">{title}</div>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">{msg}</p>
      {actionHref && (
        <div className="pt-2">
          <Button asChild size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function TxIcon({ status }) {
  if (status === 'SUCCESS') {
    return (
      <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  }
  if (status === 'PENDING') {
    return (
      <div className="p-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <Clock className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="p-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
      <XCircle className="h-4 w-4" />
    </div>
  );
}

function statusClass(s) {
  return { 
    SUCCESS: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10', 
    PENDING: 'border-amber-500/40 text-amber-400 bg-amber-500/10', 
    FAILED: 'border-rose-500/40 text-rose-400 bg-rose-500/10' 
  }[s] || 'border-border text-muted-foreground';
}
