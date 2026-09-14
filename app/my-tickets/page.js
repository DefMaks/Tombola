'use client';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Trophy, Receipt, Phone, ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import { formatDRCPhone } from '@/lib/auth/actions';

export default function MyTicketsPage() {
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('user_phone');
    const token = localStorage.getItem('auth_token');
    if (!token) {
      localStorage.removeItem('user_phone');
      setSavedPhone('');
      setPhone('');
      return;
    }
    if (saved) { setPhone(saved); setSavedPhone(saved); }
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets', savedPhone],
    queryFn: () => fetch(`/api/my/tickets?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone, refetchInterval: 8_000,
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

  if (!savedPhone) {
    return (
      <main className="max-w-lg mx-auto min-h-screen pb-24 px-4 pt-16">
        <div className="text-center mb-8">
          <Ticket className="h-16 w-16 mx-auto text-primary mb-4"/>
          <h1 className="font-black text-2xl">Mes tickets</h1>
          <p className="text-muted-foreground text-sm mt-2">Entrez votre numéro pour voir vos tickets, gains et transactions.</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <Input type="tel" placeholder="+243 XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-12"/>
          </div>
          <Button onClick={save} disabled={!phone} size="lg" className="w-full h-12">Continuer <ArrowRight className="h-4 w-4 ml-2"/></Button>
        </div>
        <BottomNav/>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl">Mes tickets</h1>
            <div className="text-xs text-muted-foreground">{savedPhone}</div>
          </div>
          {/** 
          <button onClick={() => { localStorage.removeItem('user_phone'); setSavedPhone(''); setPhone(''); }} className="text-xs text-muted-foreground underline">Changer</button>
        */}
        </div>
      </header>

      <div className="px-4 pt-4">
        <Tabs defaultValue="active">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="active"><Ticket className="h-4 w-4 mr-1"/>Actifs ({tickets.length})</TabsTrigger>
            <TabsTrigger value="winning"><Trophy className="h-4 w-4 mr-1"/>Gains ({winning.length})</TabsTrigger>
            <TabsTrigger value="txs"><Receipt className="h-4 w-4 mr-1"/>Transac</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 pt-4">
            {tickets.length === 0 && <EmptyState msg="Aucun ticket actif. Achetez-en un !"/>}
            {tickets.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Link href={`/raffles/${t.slug}`} prefetch={true} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl hover:border-primary/50">
                  <img src={t.hero_image_url} alt={t.title} className="h-16 w-16 rounded-xl object-cover shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm line-clamp-1">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.raffle_status === 'ACTIVE' ? 'En cours' : t.raffle_status}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold">#{t.ticket_number}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="winning" className="space-y-3 pt-4">
            {winning.length === 0 && <EmptyState msg="Aucun gain pour le moment. Bonne chance ! 🍀"/>}
            {winning.map(w => (
              <div key={w.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/50 p-4">
                <Trophy className="absolute top-3 right-3 h-6 w-6 text-amber-400"/>
                <div className="flex items-center gap-3">
                  <img src={w.hero_image_url} alt={w.title} className="h-20 w-20 rounded-xl object-cover shrink-0"/>
                  <div>
                    <Badge className="bg-amber-500 text-slate-900 mb-1">GAGNANT</Badge>
                    <div className="font-black text-base">{w.title}</div>
                    <div className="font-mono text-primary text-sm">Ticket #{w.ticket_number}</div>
                  </div>
                </div>
                <Link href={`/raffles/${w.slug}?readonly=true`} prefetch={true} className="mt-3 block text-xs text-center font-semibold text-primary hover:underline">Voir la tombola</Link>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="txs" className="space-y-2 pt-4">
            {txs.length === 0 && <EmptyState msg="Aucune transaction."/>}
            {txs.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                <TxIcon status={tx.status}/>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm line-clamp-1">{tx.raffle_title || 'Tombola'}</div>
                  <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString('fr-FR')} · {tx.quantity} ticket(s)</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${Number(tx.amount).toFixed(2)}</div>
                  <Badge variant="outline" className={cn('text-[10px]', statusClass(tx.status))}>{tx.status}</Badge>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav/>
    </main>
  );
}

function EmptyState({ msg }) {
  return <div className="py-16 text-center text-sm text-muted-foreground">{msg}</div>;
}
function TxIcon({ status }) {
  if (status === 'SUCCESS') return <CheckCircle2 className="h-5 w-5 text-emerald-500"/>;
  if (status === 'PENDING') return <Clock className="h-5 w-5 text-amber-500"/>;
  return <XCircle className="h-5 w-5 text-red-500"/>;
}
function statusClass(s) {
  return { SUCCESS: 'border-emerald-500/40 text-emerald-500', PENDING: 'border-amber-500/40 text-amber-500', FAILED: 'border-red-500/40 text-red-500' }[s] || '';
}
