'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Trophy, LogOut, MessageSquarePlus, Camera, Loader2, CheckCircle2, Clock, ShieldCheck, Ticket, Receipt, Edit3, KeyRound, Sparkles, ArrowRight, Eye, EyeOff, Info, MapPin, Building2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PhoneAuthModal from '@/components/PhoneAuthModal';
import CommuneSelectModal from '@/components/CommuneSelectModal';
import CommuneNoticeBanner from '@/components/CommuneNoticeBanner';
import { KINSHASA_COMMUNES } from '@/lib/constants/communes';
import { formatDRCPhone, signInWithPassword, sendPhoneOtp, signInWithPhoneOtp } from '@/lib/auth/actions';

const UPLOADCARE_PUB_KEY = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || '46beee9be2df550b8604';

async function uploadToUploadcare(file) {
  const fd = new FormData();
  fd.append('UPLOADCARE_PUB_KEY', UPLOADCARE_PUB_KEY);
  fd.append('UPLOADCARE_STORE', '1');
  fd.append('file', file);
  const res = await fetch('https://upload.uploadcare.com/base/', { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.file) throw new Error('Upload failed');
  return `https://ucarecdn.com/${data.file}/`;
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isCommuneModalOpen, setIsCommuneModalOpen] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('user_phone') : null;
    if (saved) {
      setPhone(saved);
      setSavedPhone(saved);
    } else {
      setSavedPhone('');
    }
  }, []);

  // Fetch user profile from database
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile-data', savedPhone],
    queryFn: () => fetch(`/api/my/profile?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone,
  });

  useEffect(() => {
    if (userProfile?.full_name) {
      setFullNameInput(userProfile.full_name);
    }
  }, [userProfile]);

  const { data: winning = [] } = useQuery({
    queryKey: ['profile-winning', savedPhone],
    queryFn: () => fetch(`/api/my/winning?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone,
  });
  const { data: testimonials = [] } = useQuery({
    queryKey: ['profile-testimonials', savedPhone],
    queryFn: () => fetch(`/api/testimonials?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone,
  });
  const { data: allTickets = [] } = useQuery({
    queryKey: ['profile-tickets', savedPhone],
    queryFn: () => fetch(`/api/my/tickets?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone,
  });
  const { data: txs = [] } = useQuery({
    queryKey: ['profile-txs', savedPhone],
    queryFn: () => fetch(`/api/my/transactions?phone=${encodeURIComponent(savedPhone)}`).then(r => r.json()),
    enabled: !!savedPhone,
  });
  const { data: adsList = [] } = useQuery({
    queryKey: ['ads', 'home'],
    queryFn: () => fetch('/api/ads/home').then(r => r.json()),
  });

  const testimonialMap = new Map(testimonials.map(t => [t.raffle_slug, t]));

  // Send OTP handler via Neon Managed Better Auth webhook
  const handleSendOtp = async () => {
    const formatted = formatDRCPhone(phone);
    if (!formatted || formatted.length < 12) {
      toast.error('Veuillez entrer un numéro RDC valide (ex: 0820000000)');
      return;
    }
    setPhone(formatted);
    setIsSendingOtp(true);
    try {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'send.otp',
          event_data: { delivery_preference: 'sms', otp_code: generatedCode },
          user: { phone_number: formatted },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOtpSent(true);
        if (data.simulated && data.otpCode) {
          setOtpCode(data.otpCode);
          toast.info(`Code OTP : ${data.otpCode}`);
        } else {
          toast.success('Code OTP envoyé par SMS');
        }
      } else {
        toast.info('Connexion directe activée');
        setOtpSent(true);
      }
    } catch (e) {
      setOtpSent(true);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const formatted = formatDRCPhone(phone);
    localStorage.setItem('user_phone', formatted);
    setSavedPhone(formatted);
    toast.success('Connexion réussie !');
  };

  // Update Profile Name & Password Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (newPasswordInput) {
        if (newPasswordInput.length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }
        if (newPasswordInput !== confirmPasswordInput) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
      }
      const res = await fetch('/api/my/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: savedPhone,
          full_name: fullNameInput,
          new_password: newPasswordInput || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de mise à jour');
      return data;
    },
    onSuccess: () => {
      toast.success('Profil et mot de passe mis à jour !');
      refetchProfile();
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setIsEditingProfile(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const [authModalOpen, setAuthModalOpen] = useState(true);

  if (!savedPhone) {
    return (
      <main className="max-w-lg mx-auto min-h-screen pb-24 px-4 pt-16 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-xl">
            <User className="h-10 w-10" />
          </div>
          <h1 className="font-black text-2xl text-foreground">Mon Profil Punchy</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
            Connectez-vous avec votre numéro et mot de passe pour suivre vos tickets, consulter vos gains et participer aux tirages.
          </p>
        </div>

        <div className="bg-card border-2 border-amber-500/30 p-6 rounded-3xl shadow-2xl text-center space-y-4">
          <Button
            onClick={() => setAuthModalOpen(true)}
            size="lg"
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20"
          >
            <KeyRound className="h-5 w-5 mr-2" />
            Se Connecter / S&apos;Inscrire
          </Button>
          <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          </div>
        </div>

        <PhoneAuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          onSuccess={(p) => {
            setSavedPhone(p);
            setPhone(p);
            refetchProfile();
          }}
        />

        <BottomNav />
      </main>
    );
  }

  const totalSpent = txs.filter(t => t.status === 'SUCCESS').reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <main className="max-w-lg mx-auto min-h-screen pb-24">
      {/* Header profile card */}
      <div className="px-4 pt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white p-5 relative overflow-hidden border border-amber-500/30 shadow-2xl">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <User className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider border-amber-500/40 text-amber-300 bg-amber-500/10 px-2 py-0.5">
                  {userProfile?.role || 'MEMBRE VIP'}
                </Badge>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="text-amber-400 hover:text-amber-300 p-1"
                  title="Modifier le nom"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="font-black text-lg truncate text-white mt-0.5">
                {userProfile?.full_name || 'Participant Punchy'}
              </div>
              <div className="text-xs text-amber-200/80 font-mono">{savedPhone}</div>
            </div>
            <button
              onClick={() => { localStorage.removeItem('user_phone'); setSavedPhone(''); setPhone(''); setOtpSent(false); }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors" title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <Stat value={allTickets.length} label="Tickets" />
            <Stat value={winning.length} label="Gains" />
            <Stat value={`$${totalSpent.toFixed(0)}`} label="Dépensé" />
          </div>
        </motion.div>
      </div>

      {/* Commune Notice & Territorial Information */}
      <div className="px-4 pt-4">
        {userProfile?.commune ? (
          <div className="p-4 rounded-3xl bg-card border border-emerald-500/30 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Commune de Résidence
                  </div>
                  <div className="text-base font-black text-foreground flex items-center gap-1.5">
                    <span>{userProfile.commune}</span>
                    <span className="text-xs font-normal text-muted-foreground">(Kinshasa 🇨🇩)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsCommuneModalOpen(true)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                Gérer
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-secondary/40 border border-border text-xs flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Règle anti-opportunisme :</span>
              </span>
              {userProfile?.commune_locked_until && new Date(userProfile.commune_locked_until).getTime() > Date.now() ? (
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Verrouillé jusqu&apos;au {new Date(userProfile.commune_locked_until).toLocaleDateString('fr-FR')}
                </span>
              ) : (
                <span className="font-bold text-emerald-400">Modifiable</span>
              )}
            </div>
          </div>
        ) : (
          <CommuneNoticeBanner
            userPhone={savedPhone}
            commune={userProfile?.commune}
            lockedUntil={userProfile?.commune_locked_until}
            onCommuneUpdated={() => refetchProfile()}
          />
        )}
      </div>

      {/* Quick links & History */}
      <section className="px-4 pt-6 space-y-2">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Raccourcis & Securité</h3>
        <button
          onClick={() => setIsEditingProfile(true)}
          className="w-full flex items-center gap-3 p-3.5 bg-card border border-border rounded-2xl hover:border-amber-500/50 transition-colors shadow-sm text-left group"
        >
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-foreground">Modifier mon Profil & Mot de passe</div>
            <div className="text-xs text-muted-foreground">Mettre à jour votre nom ou changer de mot de passe</div>
          </div>
          <Edit3 className="h-4 w-4 text-amber-400/80 shrink-0" />
        </button>

        <QuickLink href="/my-tickets" icon={Ticket} label="Mes Tickets & Participations" />
        <QuickLink href="/info" icon={Info} label="Information, Termes & Support" />
     {/**   

        <QuickLink href="/transparence/1" icon={ShieldCheck} label="Vérifier la Transparence du Tirage" />
      */}
      </section>

      {/* Recent Transactions */}
      {txs.length > 0 && (
        <section className="px-4 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="h-5 w-5 text-amber-400" />
            <h2 className="font-bold text-lg text-foreground">Historique des Paiements</h2>
          </div>
          <div className="space-y-2 bg-card border border-border rounded-2xl p-3">
            {txs.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-xl bg-background/50 border border-border/50 text-xs">
                <div>
                  <div className="font-bold text-foreground line-clamp-1">{tx.raffle_title || 'Achat de ticket'}</div>
                  <div className="text-muted-foreground text-[10px]">{new Date(tx.created_at).toLocaleDateString('fr-FR')} · {tx.payment_method || 'Mobile Money'}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-amber-400 text-sm">${Number(tx.amount).toFixed(2)}</div>
                  <Badge variant="outline" className="text-[9px] uppercase border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Login Screen Switcher */}
      {/** 
      <section className="px-4 pt-6 pb-4">
        <button
          onClick={() => { localStorage.removeItem('user_phone'); setSavedPhone(''); setPhone(''); setOtpSent(false); }}
          className="w-full py-3 px-4 rounded-2xl border border-dashed border-border hover:border-amber-500/50 text-xs font-semibold text-muted-foreground hover:text-amber-400 transition-colors flex items-center justify-center gap-2 bg-card/40"
        >
          <KeyRound className="h-4 w-4" />
          Se connecter avec un autre numéro (Écran de connexion OTP)
        </button>
      </section>
      */}

      {/* Edit Profile Modal */}
      <Dialog open={isEditingProfile} onOpenChange={(v) => {
        setIsEditingProfile(v);
        if (!v) {
          setNewPasswordInput('');
          setConfirmPasswordInput('');
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-amber-400" /> Modifier mon profil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Nom complet</label>
              <Input
                placeholder="Ex: Jean Mukendi"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
            </div>

            <div className="pt-2 border-t border-border/60">
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Nouveau mot de passe <span className="text-[10px] font-normal lowercase text-muted-foreground/80">(optionnel)</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 caractères"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="h-12 rounded-xl pr-10 text-base font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {newPasswordInput ? (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Confirmer le nouveau mot de passe</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Répétez le mot de passe"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="h-12 rounded-xl text-base font-mono"
                />
                {confirmPasswordInput && confirmPasswordInput !== newPasswordInput && (
                  <p className="text-xs text-red-400 mt-1 font-semibold flex items-center gap-1">
                    ⚠ Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>
            ) : null}

            <Button
              onClick={() => updateProfileMutation.mutate()}
              disabled={
                updateProfileMutation.isPending ||
                !fullNameInput ||
                (!!newPasswordInput && (newPasswordInput.length < 6 || newPasswordInput !== confirmPasswordInput))
              }
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold text-slate-950 shadow-lg shadow-amber-500/20"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Enregistrer les modifications
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Commune Selection Modal */}
      <CommuneSelectModal
        open={isCommuneModalOpen}
        onOpenChange={setIsCommuneModalOpen}
        currentCommune={userProfile?.commune}
        lockedUntil={userProfile?.commune_locked_until}
        phone={savedPhone}
        onSuccess={() => refetchProfile()}
      />

      <BottomNav />
    </main>
  );
}

function Stat({ value, label }) {
  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/5">
      <div className="font-black text-lg text-amber-400">{value}</div>
      <div className="text-[10px] text-slate-300 font-bold uppercase">{label}</div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }) {
  return (
    <Link href={href} prefetch={true} className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-2xl hover:border-amber-500/50 transition-colors shadow-sm">
      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 font-bold text-sm text-foreground">{label}</div>
    </Link>
  );
}

function WinCard({ win, testimony, phone }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-card to-orange-600/10 border border-amber-500/40 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <img src={win.hero_image_url} alt={win.title} className="h-20 w-20 rounded-xl object-cover shrink-0 border border-amber-500/20" />
          <div className="flex-1 min-w-0">
            <Badge className="bg-amber-500 text-slate-950 font-black mb-1">GAGNANT</Badge>
            <div className="font-black text-base line-clamp-1">{win.title}</div>
            <div className="font-mono text-amber-400 text-sm font-bold">Ticket #{win.ticket_number}</div>
          </div>
        </div>

        {!testimony ? (
          <Button onClick={() => setOpen(true)} className="mt-3 w-full bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 hover:from-amber-600 font-bold rounded-xl">
            <MessageSquarePlus className="h-4 w-4 mr-2" /> Laisser un témoignage
          </Button>
        ) : (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-background/60 text-xs border border-border">
            {testimony.status === 'APPROVED' ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Témoignage approuvé</>
            ) : testimony.status === 'REJECTED' ? (
              <><span className="h-2 w-2 rounded-full bg-red-500" /> Témoignage refusé</>
            ) : (
              <><Clock className="h-4 w-4 text-amber-500" /> Témoignage en attente de modération</>
            )}
          </div>
        )}
      </div>

      <TestimonialModal open={open} setOpen={setOpen} raffle={win} phone={phone} />
    </>
  );
}

function TestimonialModal({ open, setOpen, raffle, phone }) {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const inputRef = useRef();

  useEffect(() => {
    if (!open) { setFile(null); setPreview(''); setMessage(''); setPhotoUrl(''); }
  }, [open]);

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploading(true);
    try {
      const url = await uploadToUploadcare(f);
      setPhotoUrl(url);
      toast.success('Photo téléchargée');
    } catch (e) {
      toast.error('Erreur upload: ' + e.message);
      setFile(null); setPreview('');
    } finally {
      setUploading(false);
    }
  };

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/testimonials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, raffle_slug: raffle.slug, photo_url: photoUrl, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      return data;
    },
    onSuccess: () => {
      toast.success('Témoignage envoyé en modération');
      qc.invalidateQueries({ queryKey: ['profile-testimonials'] });
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const canSubmit = photoUrl && message.length >= 10 && !uploading && !submit.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquarePlus className="h-5 w-5 text-amber-400" /> Témoignage — {raffle.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-xs text-muted-foreground">Partagez votre expérience avec une photo de vous et votre gain. Votre témoignage sera modéré avant publication.</div>

          {/* Photo capture */}
          <div>
            <label className="text-sm font-semibold mb-2 block flex items-center gap-1"><Camera className="h-4 w-4" /> Photo <span className="text-red-500">*</span></label>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
            {!preview ? (
              <button onClick={() => inputRef.current?.click()} className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border hover:border-amber-500/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-amber-400 transition-colors">
                <Camera className="h-8 w-8" />
                <span className="text-sm font-semibold">Prendre une photo</span>
                <span className="text-[10px]">Ou choisir depuis la galerie</span>
              </button>
            ) : (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                {photoUrl && !uploading && (
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Envoyé
                  </div>
                )}
                <button onClick={() => { setFile(null); setPreview(''); setPhotoUrl(''); }} className="absolute bottom-2 right-2 px-3 py-1 rounded-lg bg-black/60 text-white text-xs">Changer</button>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Votre témoignage <span className="text-red-500">*</span></label>
            <Textarea rows={4} placeholder="Merci DEFMAKS ! J&apos;ai gagné ce super lot..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
            <div className="text-[10px] text-muted-foreground mt-1 text-right">{message.length}/500 · minimum 10 caractères</div>
          </div>

          <Button onClick={() => submit.mutate()} disabled={!canSubmit} className="w-full h-12 font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950">
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Envoyer pour modération
          </Button>

          <div className="text-[10px] text-muted-foreground text-center">L&apos;administrateur vérifie chaque témoignage avant publication.</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SquareAdSpace({ ads = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || !ads || ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, ads]);

  if (!ads || ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  const Wrap = ({ children }) => {
    if (currentAd.external_link) {
      return (
        <a href={currentAd.external_link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
          {children}
        </a>
      );
    }
    if (currentAd.inner_link) {
      return (
        <Link href={currentAd.inner_link} className="block w-full h-full">
          {children}
        </Link>
      );
    }
    return <div className="w-full h-full">{children}</div>;
  };

  return (
    <div
      className="relative w-full aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl bg-card group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Wrap>
        <div className="relative w-full h-full">
          {/* Unsplash 1:1 Image */}
          <img
            src={currentAd.image_url}
            alt={currentAd.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />

          {/* Dark Overlay Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <Badge className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 backdrop-blur-md border border-amber-400/40 shadow-lg flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-slate-950 fill-slate-950" />
              {currentAd.badge || 'PUBLICITÉ 1:1'}
            </Badge>
            <div className="text-[10px] font-bold tracking-widest text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 uppercase">
              Sponsorisé
            </div>
          </div>

          {/* Bottom Content Area */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10 flex flex-col justify-end space-y-2">
            <h3 className="font-black text-xl sm:text-2xl text-white leading-tight drop-shadow-md">
              {currentAd.title}
            </h3>
            {currentAd.description && (
              <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed opacity-95">
                {currentAd.description}
              </p>
            )}
            <div className="pt-2">
              <Button className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 text-xs sm:text-sm flex items-center justify-center gap-2">
                {currentAd.cta_text || 'Découvrir (1$)'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Wrap>

      {/* Pagination indicators */}
      {ads.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 z-20 flex justify-center gap-1.5 pointer-events-auto">
          {ads.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                currentIndex === idx ? "w-6 bg-amber-400" : "w-1.5 bg-white/40 hover:bg-white/70"
              )}
              aria-label={`Annonce ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

