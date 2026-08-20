'use client';

import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Ticket, Flame, Clock, ChevronRight, ChevronLeft, Sparkles, Trophy, Star, ArrowRight, Quote, ExternalLink } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import BottomNav from '@/components/BottomNav';
import InstallPWABanner from '@/components/InstallPWABanner';
import AdBlock from '@/components/AdBlock';
import PalierFireBadges from '@/components/PalierFireBadges';
import AppLoadingScreen from '@/components/AppLoadingScreen';
import { cn } from '@/lib/utils';

const TYPE_STYLE = {
  DAILY: { label: 'Journalier', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  WEEKLY: { label: 'Hebdo', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  MONTHLY: { label: 'Mensuel', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  THRESHOLD: { label: 'Seuil', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function maskWinnerName(name) {
  if (!name) return 'An**';
  return name
    .trim()
    .split(/\s+/)
    .map(p => (p.length <= 2 ? p + '**' : p.slice(0, 2) + '**'))
    .join(' ');
}

const WINNERS_TESTIMONIALS = [];
function timeProgress(startsAt, endsAt) {
  if (!startsAt || !endsAt) return 0;
  const s = new Date(startsAt).getTime();
  const e = new Date(endsAt).getTime();
  const now = Date.now();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return ((now - s) / (e - s)) * 100;
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
    <span className={cn("font-mono font-bold text-xs tracking-tight", isUrgent ? "text-rose-500 animate-pulse" : "text-amber-500 dark:text-amber-400")}>
      {remaining}
    </span>
  );
}

function RaffleCard({ raffle, index }) {
  const isCompleted = raffle.status === 'COMPLETED';
  const pct = timeProgress(raffle.starts_at, raffle.ends_at);
  const soldPct = raffle.max_tickets > 0 ? (raffle.tickets_sold / raffle.max_tickets) * 100 : 0;
  const t = TYPE_STYLE[raffle.type] || TYPE_STYLE.THRESHOLD;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link href={`/raffles/${raffle.slug}`} prefetch={true}>
        <div className="group relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-primary/10">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {raffle.hero_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={raffle.hero_image_url} alt={raffle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-2 left-2 flex gap-1.5">
              <Badge variant="outline" className={cn('backdrop-blur-md text-[10px] font-semibold', t.className)}>{t.label}</Badge>
              {soldPct >= 70 && !isCompleted && <Badge variant="outline" className="bg-rose-500/20 text-rose-300 border-rose-500/40 backdrop-blur-md text-[10px]"><Flame className="h-3 w-3 mr-0.5" />HOT</Badge>}
              {isCompleted && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 backdrop-blur-md text-[10px]">🏆 Terminé</Badge>}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2.5">
              <div className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2">{raffle.title}</div>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] gap-1">
              <PalierFireBadges count={raffle.tickets_sold} variant="compact" />
              {!isCompleted && (
                <span className="flex items-center gap-1 text-[11px] shrink-0">
                  <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                  <Countdown endsAt={raffle.ends_at} />
                </span>
              )}
            </div>
            <Progress value={pct} className="h-1.5" />
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5">
                <div className="text-base sm:text-lg font-black text-primary">{Number(raffle.ticket_price).toFixed(0)}$</div>
                {!isCompleted && Number(raffle.ticket_price) !== 1 && (
                  <div className="text-[9px] font-black uppercase text-amber-400 leading-tight bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                    <div>Maximise tes</div>
                    <div>Chances !</div>
                  </div>
                )}
              </div>
              {!isCompleted ? (
                <div className="flex items-center gap-0.5 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                  Participer <ChevronRight className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="text-xs font-semibold text-muted-foreground">
                  Terminé
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function getTypeBadgeLabel(type) {
  if (type === 'DAILY') return 'Du Jour';
  if (type === 'WEEKLY') return 'Cette Semaine';
  if (type === 'MONTHLY') return 'Ce Mois';
  return 'Ultima 🤩!';
}

function PerspectiveRaffleCarousel({ raffles }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || !raffles || raffles.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % raffles.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused, raffles]);

  if (!raffles || raffles.length === 0) return null;

  const minSwipeDistance = 50;

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % raffles.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + raffles.length) % raffles.length);
  };

  const onTouchStart = (e) => {
    setIsPaused(true);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsPaused(false);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  return (
    <div
      className="relative w-full py-1"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-2">
        {/*<div className="flex items-center gap-1.5 font-bold text-sm">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          <span>
          Sélection DEFMAKS
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            aria-label="Suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>*/}
      </div>

      {/* Perspective 3D Container (Glider.js Perspective style with slidesToShow: 3) */}
      <div
        className="relative w-full h-[370px] sm:h-[390px] flex items-center justify-center overflow-hidden [perspective:1000px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {raffles.map((raffle, index) => {
          let offset = index - activeIndex;

          if (raffles.length > 2) {
            const half = Math.floor(raffles.length / 2);
            if (offset > half) offset -= raffles.length;
            if (offset < -half) offset += raffles.length;
          }

          const isActive = offset === 0;
          const isPrev = offset === -1;
          const isNext = offset === 1;

          let transformStyle = '';
          let zIndex = 10;
          let opacity = 0;
          let pointerEvents = 'none';

          if (isActive) {
            transformStyle = 'translate3d(0%, 0, 0) scale(1) rotateY(0deg)';
            zIndex = 30;
            opacity = 1;
            pointerEvents = 'auto';
          } else if (isPrev) {
            transformStyle = 'translate3d(-50%, 0, -80px) scale(0.82) rotateY(18deg)';
            zIndex = 20;
            opacity = 0.75;
            pointerEvents = 'auto';
          } else if (isNext) {
            transformStyle = 'translate3d(50%, 0, -80px) scale(0.82) rotateY(-18deg)';
            zIndex = 20;
            opacity = 0.75;
            pointerEvents = 'auto';
          } else if (offset < -1) {
            transformStyle = 'translate3d(-90%, 0, -160px) scale(0.65) rotateY(28deg)';
            zIndex = 10;
            opacity = 0;
            pointerEvents = 'none';
          } else if (offset > 1) {
            transformStyle = 'translate3d(90%, 0, -160px) scale(0.65) rotateY(-28deg)';
            zIndex = 10;
            opacity = 0;
            pointerEvents = 'none';
          }

          const isCompleted = raffle.status === 'COMPLETED';
          const pct = timeProgress(raffle.starts_at, raffle.ends_at);

          return (
            <div
              key={raffle.id || index}
              onClick={() => {
                if (!isActive) {
                  setActiveIndex(index);
                }
              }}
              style={{
                transform: transformStyle,
                zIndex: zIndex,
                opacity: opacity,
                pointerEvents: pointerEvents,
              }}
              className="absolute w-[82%] sm:w-[76%] max-w-[340px] transition-all duration-500 ease-out select-none"
            >
              <Link
                href={`/raffles/${raffle.slug}`}
                prefetch={true}
                onClick={(e) => {
                  if (!isActive) e.preventDefault();
                }}
              >
                <div className={cn(
                  "relative overflow-hidden rounded-3xl border-2 bg-card transition-all duration-300",
                  isActive
                    ? "border-amber-400/80 shadow-2xl shadow-amber-500/25 ring-2 ring-amber-400/20"
                    : "border-border shadow-md opacity-90 hover:opacity-100"
                )}>
                  {/* Badge Gauche: Mis en avant */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 text-[10px] font-black uppercase shadow-sm">
                    <Star className="h-3 w-3 fill-current" /> Mis en avant
                  </div>

                  {/* Badge Droite: Nature de la Tombola */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-amber-400 border border-amber-500/30 text-[10px] font-extrabold shadow-sm">
                    {getTypeBadgeLabel(raffle.type)}
                  </div>

                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {raffle.hero_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={raffle.hero_image_url}
                        alt={raffle.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3.5">
                      <div className="text-white font-black text-lg sm:text-xl leading-tight line-clamp-1">{raffle.title}</div>
                      <div className="text-white/80 text-xs mt-0.5 line-clamp-1">{raffle.description}</div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <PalierFireBadges count={raffle.tickets_sold} variant="compact" />
                      {!isCompleted && (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                          <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <Countdown endsAt={raffle.ends_at} />
                        </span>
                      )}
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-black text-primary">{Number(raffle.ticket_price).toFixed(0)}$</div>
                        {!isCompleted && Number(raffle.ticket_price) !== 1 && (
                          <div className="text-[10px] font-black uppercase text-amber-400 leading-tight bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                            <div>Maximise tes</div>
                            <div>Chances !</div>
                          </div>
                        )}
                      </div>
                      {!isCompleted ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                          Participer <ArrowRight className="h-3 w-3" />
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-muted-foreground">
                          Terminé
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Pagination Dots */}
      {raffles.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-2">
          {raffles.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === activeIndex ? "w-6 bg-amber-400" : "w-2 bg-muted hover:bg-muted-foreground/40"
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [category, setCategory] = useState(null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);

  // Categories API Fetch & Parsing
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
  });
  const categoriesList = Array.isArray(categoriesData)
    ? categoriesData
    : (categoriesData?.categories || categoriesData?.data || []);

  // Raffles API Fetch & Parsing (Strictly ACTIVE status)
  const { data: rafflesData, isLoading } = useQuery({
    queryKey: ['raffles', category],
    queryFn: () => fetch(`/api/raffles?status=ACTIVE${category ? '&category=' + category : ''}`).then(r => r.json()),
    refetchInterval: 15_000,
  });
  const raffleList = Array.isArray(rafflesData)
    ? rafflesData
    : (rafflesData?.raffles || rafflesData?.data || []);

  // Ads API Fetch & Parsing
  const { data: adsData } = useQuery({
    queryKey: ['ads', 'home'],
    queryFn: () => fetch('/api/ads/home').then(r => r.json()),
    refetchInterval: 60_000,
  });
  const adsList = Array.isArray(adsData)
    ? adsData
    : (adsData?.ads || adsData?.data || []);

  // Real Testimonials API Fetch & Parsing
  const { data: testimonialsData, isLoading: isTestimonialsLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => fetch('/api/testimonials').then(r => r.json()),
    refetchInterval: 30_000,
  });
  const rawTestimonials = Array.isArray(testimonialsData)
    ? testimonialsData
    : (testimonialsData?.testimonials || testimonialsData?.data || []);

  const testimonialsList = rawTestimonials.map(t => {
    const name = t.full_name || t.name || t.phone_number || 'Gagnant Punchy';
    const title = t.title || t.raffle_title || 'Tombola Punchy';
    const slug = t.slug || t.raffle_slug || '';
    const hero_image_url = t.photo_url || t.hero_image_url || 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=800&q=80';
    const type = t.badgeType || t.raffle_type || 'DAILY';
    
    let badgeLabel = t.badgeLabel;
    let badgeType = type;
    if (!badgeLabel) {
      if (type === 'ULTIMATE') badgeLabel = 'Gagnant Ultime';
      else if (type === 'MONTHLY') badgeLabel = 'Gagnant du Mois';
      else if (type === 'WEEKLY') badgeLabel = 'Gagnant Semaine';
      else {
        const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';
        badgeLabel = dateStr ? `Gagnant(e) ${dateStr}` : 'Gagnant Certifié';
      }
    }

    const date = t.date || (t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : 'Punchy');

    return {
      ...t,
      name,
      title,
      slug,
      hero_image_url,
      badgeLabel,
      badgeType,
      date,
      message: t.message || 'Super expérience sur Punchy !'
    };
  });

  // Compute items - ONLY active & non-expired raffles
  const now = new Date();
  const activeRaffles = raffleList.filter(r => {
    if (r.status !== 'ACTIVE') return false;
    if (r.ends_at && new Date(r.ends_at) <= now) return false;
    if (r.max_tickets > 0 && r.tickets_sold >= r.max_tickets) return false;
    return true;
  });
  const featuredActiveRaffles = activeRaffles.filter(r => r.is_featured);
  const wonRaffles = raffleList.filter(r => r.status === 'COMPLETED').slice(0, 6);
  const ad = adsList.length > 0 ? adsList[0] : null;

  const filteredActiveRaffles = activeRaffles.filter(r => {
    if (typeFilter === 'ALL') return true;
    return r.type === typeFilter;
  });

  const frequencyTabs = [
    { id: 'ALL', label: 'Toutes', count: activeRaffles.length },
    { id: 'DAILY', label: 'Journalières', count: activeRaffles.filter(r => r.type === 'DAILY').length },
    { id: 'WEEKLY', label: 'Hebdomadaires', count: activeRaffles.filter(r => r.type === 'WEEKLY').length },
    { id: 'MONTHLY', label: 'Mensuelles', count: activeRaffles.filter(r => r.type === 'MONTHLY').length },
  ];

  return (
    <main className="max-w-lg mx-auto pb-24 min-h-screen">
      {/* Fullscreen Centered Loading State */}
      <AppLoadingScreen isVisible={isLoading} message="Chargement des tombolas..." />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" prefetch={true} className="flex items-center gap-2.5 group">
            <img
              src="/P-punchy-emblem.png"
              alt="Punchy Emblem"
              className="h-9 w-9 object-contain drop-shadow transition-transform group-hover:scale-105"
            />
            {/**
            <img
              src="/Punchy-logo-b.png"
              alt="PUNCHY"
              className="h-6 object-contain max-w-[120px]"
            />
             */}
          </Link>
          {/** 
          <Link href="/my-tickets" prefetch={true} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
            <Ticket className="h-5 w-5 text-amber-500" />
          </Link>
          */}
        </div>
      </header>

      {/* Ad block (dynamic multi-source carousel from Supabase & Neon) */}
      <AdBlock zone="home" sources={["SPB", "NDB"]} />

      {/* Featured raffles 3D Perspective Carousel */}
      {activeRaffles.length > 0 && (
        <section className="px-4 pt-4">
          <PerspectiveRaffleCarousel
            raffles={
              featuredActiveRaffles.length > 0
                ? featuredActiveRaffles
                : activeRaffles
            }
          />
        </section>
      )}

      {/* Active raffles grid */}
      <section className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">🔥 Tombolas en cours</h2>
          <span className="text-xs text-muted-foreground">{filteredActiveRaffles.length} en cours</span>
        </div>

        {/* Frequency Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3 -mx-4 px-4">
          {frequencyTabs.map(tab => {
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full whitespace-nowrap font-semibold border transition-all flex items-center gap-1.5 shrink-0',
                  active
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm shadow-amber-500/20'
                    : 'bg-secondary/60 border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                  active ? "bg-slate-950/20 text-slate-950" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[4/5]" />)}
          </div>
        ) : filteredActiveRaffles.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-card border border-border">
            <Ticket className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">Aucune tombola disponible dans cette catégorie pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredActiveRaffles.map((r, i) => <RaffleCard key={r.id} raffle={r} index={i} />)}
          </div>
        )}
      </section>

      {/* Bloc Publicitaire Avant Témoignages */}
      <section className="px-4 pt-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-slate-950 shadow-xl border border-amber-400/30">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-amber-300/20 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="space-y-1">
              <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950 text-amber-400">
                📢 ESPACE PUBLICITAIRE
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-950 leading-tight">
                Rejoignez le Club VIP & Multipliez vos Tickets !
              </h3>
              <p className="text-xs text-slate-900 font-medium opacity-90 leading-snug">
                Profitez de nos offres partenaires exclusives et recevez des bonus quotidiens.
              </p>
            </div>
            <div className="shrink-0">
              <span className="px-3 py-2 rounded-xl bg-slate-950 text-amber-400 text-xs font-black shadow-md block text-center">
                Offre VIP ⚡
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials & Winners List */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="font-bold text-lg">Témoignages & Gagnants</h2>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            5 Derniers Gagnants
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {isTestimonialsLoading && testimonialsList.length === 0 ? (
            <div className="p-4 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground animate-pulse">
              Chargement des témoignages...
            </div>
          ) : testimonialsList.length === 0 ? (
            <div className="p-6 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
              Aucun témoignage pour le moment. Soyez le premier gagnant à témoigner !
            </div>
          ) : (
            testimonialsList.map((item, index) => (
              <div
                key={item.id || index}
                onClick={() => setSelectedTestimonial(item)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm transition-all cursor-pointer hover:border-amber-500/50 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                  item.badgeType === 'ULTIMATE' && "border-amber-500/50 bg-amber-500/5 shadow-amber-500/10 shadow-md",
                  item.badgeType === 'MONTHLY' && "border-purple-500/40 bg-purple-500/5"
                )}
              >
                {/* Col 1: Première(s) lettre(s) du vainqueur */}
                <div className={cn(
                  "w-11 h-11 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-sm border ring-2 ring-background",
                  item.badgeType === 'ULTIMATE' ? "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-slate-950 border-amber-300" :
                    item.badgeType === 'MONTHLY' ? "bg-gradient-to-br from-purple-400 to-indigo-600 text-white border-purple-300" :
                      item.badgeType === 'WEEKLY' ? "bg-gradient-to-br from-blue-400 to-cyan-600 text-white border-blue-300" :
                        "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 border-amber-300"
                )}>
                  {getInitials(item.name)}
                </div>

                {/* Col 2: Témoignage + Nom + Tag */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="font-bold text-xs text-foreground truncate">{maskWinnerName(item.name)}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none",
                      item.badgeType === 'ULTIMATE' ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                        item.badgeType === 'MONTHLY' ? "bg-purple-500/20 text-purple-400 border-purple-500/40" :
                          item.badgeType === 'WEEKLY' ? "bg-blue-500/20 text-blue-400 border-blue-500/40" :
                            "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    )}>
                      {item.badgeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 italic leading-relaxed">
                    &ldquo;{item.message}&rdquo;
                  </p>
                </div>

                {/* Col 3: Image du prix */}
                <div className="shrink-0 group">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-amber-500/40 bg-card shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.hero_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <div className="absolute bottom-1 left-1 right-1 text-white">
                      <div className="text-[9px] font-extrabold uppercase text-amber-400 truncate leading-none">
                        {item.title}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Bloc Publicitaire Après Témoignages */}
      <section className="px-4 pt-6 pb-4">
        <div className="relative overflow-hidden rounded-2xl bg-card border border-amber-500/30 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Sparkles className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  PUBLICITÉ / PARTENARIAT
                </span>
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">
                Annoncez vos produits sur Punchy
              </h4>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Touchez des milliers de personnes quotidiennement. Devenez sponsor officiel de nos tombolas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Testimonial Modal */}
      <Dialog open={!!selectedTestimonial} onOpenChange={(open) => { if (!open) setSelectedTestimonial(null); }}>
        <DialogContent className="sm:max-w-md max-w-[92vw] rounded-3xl border-2 border-amber-500/40 bg-card p-0 overflow-hidden shadow-2xl">
          {selectedTestimonial && (
            <div className="relative">
              {/* Top Banner */}
              <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white border-b border-border">
                <div className="flex items-center justify-between gap-2 mb-3 pr-6">
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider",
                    selectedTestimonial.badgeType === 'ULTIMATE' ? "bg-amber-500/30 text-amber-300 border-amber-400/50" :
                      selectedTestimonial.badgeType === 'MONTHLY' ? "bg-purple-500/30 text-purple-300 border-purple-400/50" :
                        selectedTestimonial.badgeType === 'WEEKLY' ? "bg-blue-500/30 text-blue-300 border-blue-400/50" :
                          "bg-rose-500/30 text-rose-300 border-rose-400/50"
                  )}>
                    {selectedTestimonial.badgeLabel}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full font-black text-sm flex items-center justify-center shrink-0 shadow-lg border ring-2 ring-white/20",
                    selectedTestimonial.badgeType === 'ULTIMATE' ? "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-slate-950 border-amber-300" :
                      selectedTestimonial.badgeType === 'MONTHLY' ? "bg-gradient-to-br from-purple-400 to-indigo-600 text-white border-purple-300" :
                        selectedTestimonial.badgeType === 'WEEKLY' ? "bg-gradient-to-br from-blue-400 to-cyan-600 text-white border-blue-300" :
                          "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 border-amber-300"
                  )}>
                    {getInitials(selectedTestimonial.name)}
                  </div>
                  <div>
                    <div className="font-bold text-base text-white">{maskWinnerName(selectedTestimonial.name)}</div>
                    <div className="text-xs text-amber-400/90 font-medium">Gagnant certifié · {selectedTestimonial.date || 'Punchy'}</div>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 space-y-4">
                {/* Prize Preview */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/60 border border-border">
                  <img src={selectedTestimonial.hero_image_url} alt={selectedTestimonial.title} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">Lot Remporté</div>
                    <div className="font-black text-sm text-foreground line-clamp-1">{selectedTestimonial.title}</div>
                  </div>
                </div>

                {/* Quote block */}
                <div className="relative p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground">
                  <Quote className="h-6 w-6 text-amber-500/30 absolute top-2 right-3" />
                  <p className="text-xs sm:text-sm italic leading-relaxed font-medium text-foreground pr-3">
                    &ldquo;{selectedTestimonial.message}&rdquo;
                  </p>
                </div>

                {/* Action */}
                <div className="pt-1">
                  <Link
                    href={`/raffles/${selectedTestimonial.slug}?readonly=true`}
                    prefetch={true}
                    onClick={() => setSelectedTestimonial(null)}
                    className="block w-full"
                  >
                    <Button className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 hover:from-amber-600 font-bold rounded-xl text-xs">
                      Voir le prix <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
      <InstallPWABanner />
    </main>
  );
}
