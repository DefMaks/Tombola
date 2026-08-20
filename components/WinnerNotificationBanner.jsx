'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, MessageSquarePlus, Camera, Loader2, Star, CheckCircle2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UPLOADCARE_PUB_KEY = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || '46beee9be2df550b8604';

// Upload helper with automatic fallback to compressed base64
async function uploadWinnerPhoto(file) {
  try {
    const fd = new FormData();
    fd.append('UPLOADCARE_PUB_KEY', UPLOADCARE_PUB_KEY);
    fd.append('UPLOADCARE_STORE', '1');
    fd.append('file', file);
    const res = await fetch('https://upload.uploadcare.com/base/', { method: 'POST', body: fd });
    const data = await res.json();
    if (data && data.file) {
      return `https://ucarecdn.com/${data.file}/`;
    }
  } catch (e) {
    console.warn('Uploadcare fallback activated:', e?.message);
  }

  // Fallback: Read file as Data URL (Base64)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function WinnerNotificationBanner() {
  const qc = useQueryClient();
  const [userPhone, setUserPhone] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeWin, setActiveWin] = useState(null);

  // Modal form states
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [isUploading, setIsUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const fileInputRef = useRef(null);

  // Sync user phone from localStorage
  useEffect(() => {
    const checkPhone = () => {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('user_phone') : null;
      if (saved) setUserPhone(saved);
    };

    checkPhone();
    window.addEventListener('storage', checkPhone);
    const interval = setInterval(checkPhone, 3000);
    return () => {
      window.removeEventListener('storage', checkPhone);
      clearInterval(interval);
    };
  }, []);

  // Fetch winning raffles for this user
  const { data: winnings = [] } = useQuery({
    queryKey: ['winner-notification-wins', userPhone],
    queryFn: () => fetch(`/api/my/winning?phone=${encodeURIComponent(userPhone)}`).then((r) => r.json()),
    enabled: !!userPhone,
    refetchInterval: 15_000,
  });

  // Fetch submitted testimonials for this user
  const { data: testimonials = [] } = useQuery({
    queryKey: ['winner-notification-testimonials', userPhone],
    queryFn: () => fetch(`/api/testimonials?phone=${encodeURIComponent(userPhone)}`).then((r) => r.json()),
    enabled: !!userPhone,
    refetchInterval: 15_000,
  });

  // Filter wins that do not have a testimonial submitted yet
  const pendingWins = Array.isArray(winnings)
    ? winnings.filter((win) => {
        if (!win) return false;
        const alreadySubmitted = Array.isArray(testimonials) && testimonials.some(
          (t) => (t.raffle_slug && t.raffle_slug === win.slug) || (t.raffle_id && t.raffle_id === win.raffle_id)
        );
        return !alreadySubmitted;
      })
    : [];

  const currentPendingWin = pendingWins[0] || null;

  // Open modal for a specific winning raffle
  const handleOpenTestimonial = (win) => {
    setActiveWin(win);
    setFile(null);
    setPreview('');
    setMessage('');
    setPhotoUrl('');
    setRating(5);
    setIsModalOpen(true);
  };

  // Photo select handler
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setIsUploading(true);

    try {
      const uploadedUrl = await uploadWinnerPhoto(selectedFile);
      setPhotoUrl(uploadedUrl);
      toast.success('Photo du lot attachée avec succès !');
    } catch (err) {
      toast.error('Erreur lors du chargement de la photo : ' + (err.message || 'Réessayez'));
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Testimonial Mutation
  const submitTestimonialMutation = useMutation({
    mutationFn: async () => {
      if (!userPhone) throw new Error('Numéro de téléphone requis');
      if (!activeWin?.slug) throw new Error('Tombola introuvable');
      if (!photoUrl) throw new Error('Veuillez joindre la photo de votre lot');
      if (!message || message.trim().length < 5) throw new Error('Veuillez écrire au moins quelques mots pour votre témoignage');

      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: userPhone,
          raffle_slug: activeWin.slug,
          photo_url: photoUrl,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du témoignage');
      }
      return data;
    },
    onSuccess: () => {
      toast.success('🎉 Félicitations ! Votre témoignage a été envoyé avec succès.');
      // Invalidate queries so banner disappears immediately
      qc.invalidateQueries({ queryKey: ['winner-notification-testimonials'] });
      qc.invalidateQueries({ queryKey: ['winner-notification-wins'] });
      qc.invalidateQueries({ queryKey: ['profile-testimonials'] });
      qc.invalidateQueries({ queryKey: ['profile-winning'] });
      qc.invalidateQueries({ queryKey: ['testimonials'] });
      setIsModalOpen(false);
      setActiveWin(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Impossible d\'envoyer le témoignage');
    },
  });

  const quickMessages = [
    'Super content de mon lot ! Reçu rapidement et conforme 🎉',
    'Incroyable ! J\'ai gagné avec seulement 1$ sur Punchy ⭐',
    'Merci à l\'équipe Punchy pour la transparence et la remise du prix 🏆',
  ];

  if (!userPhone || !currentPendingWin) {
    return null;
  }

  return (
    <>
      {/* Fixed floating winner notification bar */}
      <AnimatePresence>
        <motion.aside
          key="winner-bar"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          aria-label="Notification de gain"
          className="fixed bottom-16 sm:bottom-18 left-0 right-0 z-40 max-w-lg mx-auto px-3 pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 border-2 border-amber-400/80 p-3.5 shadow-2xl shadow-amber-500/20 backdrop-blur-xl">
            {/* Animated shimmer glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />

            <div className="flex items-center gap-3 relative z-10">
              {/* Winner Trophy Icon with glowing ring */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/40 border border-amber-300">
                  <Trophy className="h-6 w-6" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-slate-950 flex items-center justify-center animate-pulse">
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </div>
              </div>

              {/* Text Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                    🏆 VOUS AVEZ GAGNÉ !
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono font-bold">
                    Ticket #{currentPendingWin.ticket_number}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate">
                  {currentPendingWin.title}
                </p>
                <p className="text-[11px] text-amber-200/90 truncate">
                  Partagez une photo pour valider votre lot !
                </p>
              </div>

              {/* Action Button */}
              <Button
                id="btn-open-winner-testimonial"
                onClick={() => handleOpenTestimonial(currentPendingWin)}
                size="sm"
                className="shrink-0 h-10 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
              >
                <MessageSquarePlus className="h-4 w-4 mr-1.5" />
                Témoigner
              </Button>
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Testimonial Submission Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[94vw] rounded-3xl bg-card border-2 border-amber-500/40 p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="text-left pb-2 border-b border-border/80">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  Félicitations pour votre victoire !
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Partagez une photo de votre lot reçu et laissez un témoignage pour la communauté.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {activeWin && (
            <div className="space-y-4 pt-2">
              {/* Prize summary card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50 border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeWin.hero_image_url || '/icon.jpg'}
                  alt={activeWin.title}
                  className="w-14 h-14 rounded-xl object-cover border border-border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase text-amber-500">Lot Remporté</div>
                  <div className="font-bold text-sm text-foreground truncate">{activeWin.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">Ticket gagnant #{activeWin.ticket_number}</div>
                </div>
              </div>

              {/* Photo Upload Box */}
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-amber-400" />
                    Photo du prix / avec vous <span className="text-red-500">*</span>
                  </span>
                  {photoUrl && <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Prête</span>}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!preview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-border hover:border-amber-500/60 bg-secondary/30 hover:bg-secondary/50 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-amber-400 cursor-pointer p-4 group"
                  >
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                      <Camera className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Prendre une photo ou importer</span>
                    <span className="text-[10px] text-muted-foreground">Formats acceptés : JPG, PNG, WEBP</span>
                  </button>
                ) : (
                  <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Aperçu du prix" className="w-full h-full object-cover" />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white">
                        <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                        <span className="text-xs font-bold">Optimisation de l&apos;image...</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreview('');
                        setPhotoUrl('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-colors"
                      title="Changer de photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Star rating */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Votre satisfaction</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={cn(
                          'h-6 w-6',
                          star <= rating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-muted-foreground/40'
                        )}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-2">{rating}/5 Étoiles</span>
                </div>
              </div>

              {/* Message text area */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Votre message / retour d&apos;expérience <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Racontez votre expérience, la réception de votre lot, votre joie..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[90px] rounded-2xl resize-none text-sm"
                />

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickMessages.map((msg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMessage(msg)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-amber-500/10 hover:text-amber-400 text-muted-foreground border border-border transition-colors text-left"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 h-12 rounded-xl border-border text-xs font-bold"
                >
                  Plus tard
                </Button>

                <Button
                  type="button"
                  id="btn-submit-winner-testimonial"
                  onClick={() => submitTestimonialMutation.mutate()}
                  disabled={
                    !photoUrl ||
                    isUploading ||
                    !message ||
                    message.trim().length < 5 ||
                    submitTestimonialMutation.isPending
                  }
                  className="w-2/3 h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20"
                >
                  {submitTestimonialMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1.5" />
                  )}
                  Publier mon témoignage
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
