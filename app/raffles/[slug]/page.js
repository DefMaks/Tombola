'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ticket, Clock, Users, Zap, ShieldCheck, ChevronRight, Loader2, Phone, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import BottomNav from '@/components/BottomNav';
import PhoneAuthModal from '@/components/PhoneAuthModal';
import PalierFireBadges from '@/components/PalierFireBadges';
import AdBlock from '@/components/AdBlock';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDRCPhone } from '@/lib/auth/actions';
import { initiatePayment, confirmPaymentDemo, checkPaymentStatus } from '@/lib/api/payment';

const OPERATORS = [
  { id: 'MPESA', label: 'M-Pesa', color: 'from-red-500 to-red-700', logo: '', prefixes: '' },
  { id: 'ORANGE', label: 'Orange Money', color: 'from-orange-500 to-orange-700', logo: '', prefixes: '' },
  { id: 'AIRTEL', label: 'Airtel Money', color: 'from-rose-500 to-rose-700', logo: '', prefixes: '' },
  { id: 'AFRICELL', label: 'Afrimoney', color: 'from-purple-500 to-purple-700', logo: '', prefixes: '' },
];

function detectDRCOperator(rawInput) {
  if (!rawInput) return null;
  let clean = String(rawInput).replace(/\D/g, '');
  if (clean.startsWith('243')) clean = clean.slice(3);
  if (clean.startsWith('0')) clean = clean.slice(1);

  if (clean.length >= 2) {
    const p2 = clean.slice(0, 2);
    if (['81', '82', '83'].includes(p2)) return 'MPESA';
    if (['88', '89', '84', '85'].includes(p2)) return 'ORANGE';
    if (['97', '98', '99'].includes(p2)) return 'AIRTEL';
    if (['90'].includes(p2)) return 'AFRICELL';
  }
  return null;
}

function Countdown({ endsAt }) {
  const [remaining, setRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Terminé');
        setIsUrgent(false);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setIsUrgent(d === 0 && h < 2);
      setRemaining(d > 0 ? `${d}j ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span className={cn("font-mono font-bold tracking-tight", isUrgent ? "text-rose-500 animate-pulse" : "text-amber-500 dark:text-amber-400")}>
      {remaining}
    </span>
  );
}

export default function RafflePage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const isReadOnly = searchParams.get('readonly') === 'true';

  const { data: raffle, isLoading } = useQuery({
    queryKey: ['raffle', slug],
    queryFn: () => fetch(`/api/raffles/${slug}`).then(r => r.json()),
    enabled: !!slug,
  });

  // Live polling for tickets_sold (reduced frequency to prevent server spam)
  const { data: live } = useQuery({
    queryKey: ['raffle-live', slug],
    queryFn: () => fetch(`/api/raffles/${slug}/live`).then(r => r.json()),
    enabled: !!slug,
    refetchInterval: 20_000,
  });

  const { data: recent } = useQuery({
    queryKey: ['raffle-recent', slug],
    queryFn: () => fetch(`/api/raffles/${slug}/recent-tickets`).then(r => r.json()),
    enabled: !!slug,
    refetchInterval: 30_000,
  });

  if (isLoading || !raffle) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  const isActive = raffle.status === 'ACTIVE' && !isReadOnly;
  const isCompleted = isReadOnly || raffle.status === 'COMPLETED';
  const sold = live?.tickets_sold ?? raffle.tickets_sold;
  const max = live?.max_tickets ?? raffle.max_tickets;
  const pct = max > 0 ? (sold / max) * 100 : 0;
  const available = max - sold;

  return (
    <main className="max-w-lg mx-auto pb-32 min-h-screen">
      {/* Header image */}
      <div className="relative">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {raffle.hero_image_url && <img src={raffle.hero_image_url} alt={raffle.title} className="w-full h-full object-cover"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40"/>
        </div>
        <button onClick={() => router.back()} className="absolute top-4 left-4 p-2 rounded-full bg-black/50 backdrop-blur-md text-white">
          <ArrowLeft className="h-5 w-5"/>
        </button>
      </div>

      {/* Info */}
      <div className="px-4 -mt-16 mb-24 relative">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <Badge variant="secondary">{raffle.category_name || 'Tombola'}</Badge>
                {isCompleted && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold">
                    🏆 Prix remporté (Tirage terminé)
                  </Badge>
                )}
              </div>
              <h1 className="font-black text-2xl leading-tight">{raffle.title}</h1>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-black text-primary">{Number(raffle.ticket_price).toFixed(0)}$</div>
              {isActive && Number(raffle.ticket_price) !== 1 && (
                <div className="mt-1 text-[10px] font-black uppercase tracking-tight text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-xl leading-tight inline-block text-center shadow-sm">
                  <div>Maximise tes</div>
                  <div>Chances !</div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <PalierFireBadges count={sold} variant="compact" />
            {isActive ? (
              <motion.div animate={{ opacity: [0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/> LIVE
              </motion.div>
            ) : (
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">TERMINÉ</span>
            )}
          </div>

          <Progress value={pct} className="h-2" />
          {isActive && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 py-1.5 px-3 rounded-xl border border-border/40">
              <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="font-medium">Temps restant :</span>
              <Countdown endsAt={raffle.ends_at} />
            </div>
          )}

          <p className="text-sm leading-relaxed pt-2 text-muted-foreground">{raffle.description}</p>
        </div>

        {/* Gallery */}
        {raffle.medias && raffle.medias.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
            {raffle.medias.map(m => (
              <img key={m.id} src={m.url} alt={m.caption} className="h-24 w-24 object-cover rounded-xl shrink-0 border border-border"/>
            ))}
          </div>
        )}

        {/* Publicité NEON zone Page */}
        <AdBlock zone="page" sources={["NDB"]} className="mt-6 !px-0" />
      </div>

      {/* Buy floating button OR Readonly banner */}
      <div className="fixed bottom-16 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4 pb-3 pointer-events-auto">
          {isActive ? (
            <BuyTicketSheet
              raffle={raffle}
              sold={sold}
              max={max}
              available={available}
              open={sheetOpen}
              setOpen={setSheetOpen}
              onRequireAuth={() => setAuthModalOpen(true)}
              onSuccess={() => qc.invalidateQueries({ queryKey: ['raffle-live', slug] })}
            />
          ) : (
            <div className="w-full bg-slate-950/95 backdrop-blur-md text-amber-400 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-center shadow-xl">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Trophy className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Ce prix a été remporté — Tirage terminé</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <PhoneAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        title="Connexion requise"
        description="Veuillez ouvrir une session pour participer à la tombola."
        onSuccess={() => {
          setSheetOpen(true);
        }}
      />

      <BottomNav />
    </main>
  );
}

function BuyTicketSheet({ raffle, sold, max, available, open, setOpen, onRequireAuth, onSuccess }) {
  const [step, setStep] = useState('form'); // form | ussd | success | failed
  const [quantity, setQuantity] = useState(1);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [operator, setOperator] = useState('');
  const [autoDetected, setAutoDetected] = useState(false);
  const [tx, setTx] = useState(null);
  const [isProdMode, setIsProdMode] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('user_phone') : null;
    if (saved) {
      let clean = saved.replace(/\D/g, '');
      if (clean.startsWith('243')) clean = clean.slice(3);
      if (clean.startsWith('0')) clean = clean.slice(1);
      clean = clean.slice(0, 9);
      setPhoneDigits(clean);
      const op = detectDRCOperator(clean);
      if (op) {
        setOperator(op);
        setAutoDetected(true);
      } else {
        setOperator('');
        setAutoDetected(false);
      }
    } else {
      setPhoneDigits('');
      setOperator('');
      setAutoDetected(false);
    }
  }, [open]);

  const handlePhoneChange = (val) => {
    let clean = val.replace(/\D/g, '');
    if (clean.startsWith('243')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);
    if (clean.length > 9) clean = clean.slice(0, 9);

    setPhoneDigits(clean);
    if (!clean) {
      setOperator('');
      setAutoDetected(false);
      return;
    }
    const detected = detectDRCOperator(clean);
    if (detected) {
      setOperator(detected);
      setAutoDetected(true);
    } else {
      setOperator('');
      setAutoDetected(false);
    }
  };

  const fullPhone = `+243${phoneDigits}`;

  // Auto-poll transaction status every 3s during USSD step
  useEffect(() => {
    let interval;
    const check = async () => {
      if (!tx?.id || step !== 'ussd') return;
      try {
        const res = await checkPaymentStatus(tx.id);
        if (res?.transaction?.status === 'SUCCESS') {
          setTickets(res.tickets || []);
          setStep('success');
          toast.success('Paiement confirmé avec succès ! Vos tickets sont réservés.');
          onSuccess?.();
        } else if (res?.transaction?.status === 'FAILED') {
          setStep('failed');
          toast.error('La transaction a échoué ou a été annulée par l’opérateur.');
        }
      } catch (e) {
        console.warn('Polling status error:', e);
      }
    };

    if (step === 'ussd' && tx?.id) {
      check();
      interval = setInterval(check, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, tx?.id, onSuccess]);

  const pollStatus = async (txId) => {
    if (!txId) return;
    try {
      setIsCheckingStatus(true);
      const res = await checkPaymentStatus(txId);
      if (res?.transaction?.status === 'SUCCESS') {
        setTickets(res.tickets || []);
        setStep('success');
        toast.success('Paiement confirmé avec succès !');
        onSuccess?.();
      } else if (res?.transaction?.status === 'FAILED') {
        setStep('failed');
        toast.error('La transaction a échoué ou a été refusée.');
      } else {
        toast.info('En attente de la validation du code PIN sur votre téléphone...');
      }
    } catch (e) {
      console.warn('Polling status error:', e);
      toast.error('Impossible de vérifier le statut pour le moment.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const initiate = useMutation({
    mutationFn: async () => {
      const data = await initiatePayment({
        raffle_slug: raffle.slug,
        quantity,
        phone_number: fullPhone,
        operator,
      });
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('user_phone', data.formattedPhone || fullPhone);
      setTx(data.transaction);
      setIsProdMode(data.is_prod ?? true);
      setStep('ussd');
    },
    onError: (e) => toast.error(e.message),
  });

  const confirm = useMutation({
    mutationFn: async (success) => {
      const data = await confirmPaymentDemo(tx.id, success);
      return { data, success };
    },
    onSuccess: ({ data, success }) => {
      if (success) {
        setTickets(data.tickets || []);
        setStep('success');
        onSuccess?.();
      } else {
        setStep('failed');
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const total = quantity * Number(raffle.ticket_price);
  const reset = () => { setStep('form'); setTx(null); setTickets([]); };

  const handleTriggerClick = () => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('user_phone') : null;
    if (!saved) {
      onRequireAuth?.();
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleTriggerClick}
        size="lg"
        disabled={available <= 0}
        className="w-full h-14 text-base font-bold rounded-2xl shadow-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-900"
      >
      {/**
        <Ticket className="h-5 w-5 mr-2"/> {available > 0 ? `Participer · ${Number(raffle.ticket_price).toFixed(0)}$` : 'Sold out'}
        */}
                <Ticket className="h-5 w-5 mr-2"/> {available > 0 ? `Participer` : 'Sold out'}

        
      </Button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        {step === 'form' && (
          <>
            <SheetHeader><SheetTitle>Participer à la Tombola</SheetTitle></SheetHeader>
            <div className="space-y-5 pt-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Quantité de tickets</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 25].map(q => (
                    <button key={q} onClick={() => setQuantity(q)} className={cn('py-3 rounded-xl font-bold border-2 transition-colors', quantity === q ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-border text-muted-foreground')}>{q}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold">Numéro Mobile Money RDC</label>
                  {autoDetected && (
                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Opérateur détecté
                    </span>
                  )}
                </div>
                <div className="flex items-center rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-amber-500/50 overflow-hidden h-12 shadow-sm">
                  <div className="px-3.5 h-full bg-slate-800/80 border-r border-border flex items-center gap-1.5 text-sm font-black text-amber-400 shrink-0 select-none">
                    <span>🇨🇩</span>
                    <span>+243</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={9}
                    placeholder="820000000"
                    value={phoneDigits}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full h-full bg-transparent px-3 text-base font-bold font-mono tracking-wider focus:outline-none placeholder:text-muted-foreground/40 placeholder:font-normal"
                  />
                </div>
                {/** 
                <p className="text-[10px] text-muted-foreground mt-1">
                  Prefixes: M-Pesa (81,82,83), Orange (88,89,84,85), Airtel (97,98,99), Afrimoney (90)
                </p>
                */}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold">Opérateur Mobile Money</label>
                  {!phoneDigits ? (
                    <span className="text-[11px] text-amber-400/80 font-semibold italic">Entrez votre numéro pour activer</span>
                  ) : operator ? (
                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      {autoDetected ? 'Détecté' : 'Sélectionné'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-semibold">Sélectionnez un réseau</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OPERATORS.map(op => {
                    const isSelected = operator === op.id;
                    const isDisabled = !phoneDigits;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => { setOperator(op.id); setAutoDetected(false); }}
                        className={cn(
                          'py-2.5 px-2 rounded-xl font-bold text-xs border-2 transition-all flex flex-col items-center justify-center gap-1',
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed border-border/40 text-muted-foreground/40 bg-card/30'
                            : isSelected
                            ? 'border-amber-500 bg-gradient-to-br ' + op.color + ' text-white shadow-lg ring-2 ring-amber-500/30'
                            : 'border-border text-muted-foreground bg-card hover:bg-muted/30 hover:border-amber-500/50'
                        )}
                      >
                        <span>{op.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/30">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Total à régler</div>
                    <div className="text-3xl font-black text-amber-500">${total.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                    {quantity > 1 ? "Maximise tes":""}
                    </div>
                    <div className="font-bold text-amber-400">
                    {quantity > 1 ? "Chances X"+quantity+" !":""}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => initiate.mutate()}
                disabled={phoneDigits.length < 9 || !operator || initiate.isPending}
                size="lg"
                className="w-full h-14 font-bold text-base bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-900 shadow-xl disabled:opacity-50"
              >
                {initiate.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin"/> Traitement en cours...
                  </>
                ) : phoneDigits.length < 9 ? (
                  'Saisissez votre numéro (9 chiffres)'
                ) : !operator ? (
                  'Sélectionnez un opérateur Mobile Money'
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2"/> Payer ${total.toFixed(2)} par {OPERATORS.find(o => o.id === operator)?.label || operator}
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'ussd' && (
          <div className="py-6 text-center space-y-6">
            <div className="relative mx-auto h-24 w-24 rounded-full bg-amber-500/10 border-2 border-amber-500/50 flex items-center justify-center shadow-inner">
              <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1.8 }} className="absolute inset-0 rounded-full border-4 border-amber-500/30 animate-ping" />
              <Phone className="h-10 w-10 text-amber-500 relative z-10"/>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Transaction en cours via TwigaPaie</span>
              </div>
              <h3 className="font-black text-xl">Validez sur votre téléphone 📱</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Un message USSD Push a été envoyé au <b className="text-foreground">{fullPhone}</b>.
                Entrez votre code PIN Mobile Money pour confirmer le paiement de{' '}
                <b className="text-amber-500">{tx?.amount ? `${tx.amount} ${tx.currency}` : `$${total.toFixed(2)}`}</b>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border space-y-3 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Opérateur :</span>
                <span className="font-bold uppercase text-amber-500">{operator}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Référence :</span>
                <span className="font-mono text-[11px] font-semibold">{tx?.merchant_reference}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Statut :</span>
                <span className="font-bold flex items-center gap-1.5 text-amber-500">
                  <Loader2 className="h-3 w-3 animate-spin"/>
                  En attente du PIN Mobile Money...
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button onClick={() => pollStatus(tx?.id)} disabled={isCheckingStatus} variant="outline" className="w-full h-12 font-bold border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
                {isCheckingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Zap className="h-4 w-4 mr-2"/>}
                Vérifier le statut du paiement
              </Button>

              <button onClick={reset} className="text-xs text-muted-foreground hover:underline pt-2 block mx-auto">
                Annuler ou modifier les informations
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500"/>
            </div>
            <div>
              <div className="font-black text-2xl text-emerald-500">Paiement Réussi ! 🎉</div>
              <div className="text-sm text-muted-foreground mt-2">Vos tickets pour la tombola ont été réservés avec succès :</div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {tickets.map(t => (
                <motion.div key={t.ticket_id || t.ticket_number} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-900 font-mono font-black text-lg shadow-lg">
                  #{t.ticket_number}
                </motion.div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" className="flex-1 h-12 font-bold"><Link href="/my-tickets" prefetch={true}>Voir mes tickets</Link></Button>
              <Button onClick={() => { reset(); setOpen(false); }} className="flex-1 h-12 font-bold bg-amber-500 hover:bg-amber-600 text-slate-900">Fermer</Button>
            </div>
          </motion.div>
        )}

        {step === 'failed' && (
          <div className="py-6 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-500"/>
            </div>
            <div>
              <div className="font-black text-xl text-red-500">Paiement non complété</div>
              <div className="text-sm text-muted-foreground mt-2">La transaction a été annulée ou le délai a expiré. Veuillez réessayez.</div>
            </div>
            <Button onClick={reset} className="w-full h-12 font-bold bg-amber-500 text-slate-900 hover:bg-amber-600">Réessayer</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
