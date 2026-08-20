'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ShieldCheck, KeyRound, Loader2, ArrowRight, RefreshCw, CheckCircle2, User, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDRCPhone, sendPhoneOtp, signInWithPhoneOtp, signInWithPassword } from '@/lib/auth/actions';

interface PhoneAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (phone: string) => void;
  title?: string;
  description?: string;
  defaultMode?: 'signin' | 'signup';
}

export default function PhoneAuthModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Authentification Punchy",
  description = "Connectez-vous avec votre téléphone et mot de passe ou inscrivez-vous.",
  defaultMode = 'signin',
}: PhoneAuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(defaultMode);
  const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');
  const [resetStep, setResetStep] = useState<'request' | 'otp'>('request');

  const [phoneDigits, setPhoneDigits] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setSignupStep('details');
      setResetStep('request');
      setOtpCode('');
      setPassword('');
      setNewPassword('');
    }
  }, [open, defaultMode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if ((signupStep === 'otp' || resetStep === 'otp') && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [signupStep, resetStep, countdown]);

  const fullPhone = `+243${phoneDigits}`;

  const handlePhoneInputChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.startsWith('243')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);
    if (clean.length > 9) clean = clean.slice(0, 9);
    setPhoneDigits(clean);
  };

  // 1. SIGN IN WITH PASSWORD
  const handleSignInPassword = async () => {
    if (!phoneDigits || phoneDigits.length < 8) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }
    if (!password) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }
    setLoading(true);
    try {
      const res = await signInWithPassword(fullPhone, password);
      toast.success('Connexion réussie !');
      onSuccess?.(res.phone);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Échec de connexion');
    } finally {
      setLoading(false);
    }
  };

  // 2. SIGN UP: REQUEST OTP
  const handleSignUpRequestOtp = async () => {
    if (!fullName || fullName.trim().length < 2) {
      toast.error('Veuillez renseigner votre Nom complet');
      return;
    }
    if (!phoneDigits || phoneDigits.length < 8) {
      toast.error('Veuillez entrer un numéro RDC valide (ex: 0820000000)');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(fullPhone);
      if (res.simulated && res.otpCode) {
        setSimulatedCode(res.otpCode);
        toast.info(`Mode Simulation — Code OTP: ${res.otpCode}`);
      } else {
        toast.success('Code de vérification OTP envoyé par SMS');
      }
      setSignupStep('otp');
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Échec d\'envoi de l\'OTP');
    } finally {
      setLoading(false);
    }
  };

  // 3. SIGN UP: VERIFY OTP
  const handleSignUpVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      toast.error('Veuillez entrer le code OTP à 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      const res = await signInWithPhoneOtp(fullPhone, otpCode, fullName, password);
      toast.success('Inscription et vérification réussies !');
      onSuccess?.(res.phone);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Code OTP invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  // 4. RESET PASSWORD / SMS LOGIN: REQUEST OTP
  const handleResetRequestOtp = async () => {
    if (!phoneDigits || phoneDigits.length < 8) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }
    setLoading(true);
    try {
      const res = await sendPhoneOtp(fullPhone);
      if (res.simulated && res.otpCode) {
        setSimulatedCode(res.otpCode);
        toast.info(`Code OTP: ${res.otpCode}`);
      } else {
        toast.success('Code OTP envoyé par SMS');
      }
      setResetStep('otp');
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Échec de réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  // 5. RESET PASSWORD: VERIFY OTP & SAVE NEW PASSWORD
  const handleResetVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      toast.error('Veuillez entrer le code OTP à 6 chiffres');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      const res = await signInWithPhoneOtp(fullPhone, otpCode, undefined, newPassword || undefined);
      toast.success('Mot de passe mis à jour et connexion réussie !');
      onSuccess?.(res.phone);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Code OTP invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[92vw] rounded-3xl bg-card border-2 border-amber-500/40 p-6 shadow-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
            <img
              src="/P-punchy-emblem.png"
              alt="Punchy"
              className="h-8 w-8 object-contain rounded-lg p-0.5 bg-amber-500/10 border border-amber-500/30 shrink-0"
            />
            {mode === 'signin' ? 'Connexion à votre compte' : mode === 'signup' ? 'Création de compte Punchy' : 'Connexion / Réinitialisation SMS'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'signin'
              ? 'Connectez-vous instantanément avec votre numéro et mot de passe.'
              : mode === 'signup'
              ? 'Renseignez vos informations. Un SMS de vérification sera envoyé.'
              : 'Entrez votre numéro pour recevoir un code OTP et réinitialiser votre accès.'}
          </p>
        </DialogHeader>

        {/* MODE SWITCH TABS */}
        <div className="grid grid-cols-2 p-1 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs font-bold my-2">
          <button
            onClick={() => setMode('signin')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'signin' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Se Connecter
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'signup' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            S&apos;Inscrire
          </button>
        </div>

        {/* 1. SIGN IN FORM */}
        {mode === 'signin' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block mb-1.5">
                Numéro de téléphone RDC (+243)
              </label>
              <div className="flex items-center rounded-2xl border border-amber-500/30 bg-background/50 focus-within:ring-2 focus-within:ring-amber-500/50 overflow-hidden h-12">
                <div className="px-3.5 h-full bg-amber-500/10 border-r border-amber-500/20 flex items-center gap-1 text-xs font-black text-amber-400 shrink-0 select-none">
                  <span>🇨🇩</span>
                  <span>+243</span>
                </div>
                <input
                  type="tel"
                  maxLength={9}
                  placeholder="820000000"
                  value={phoneDigits}
                  onChange={(e) => handlePhoneInputChange(e.target.value)}
                  className="w-full h-full bg-transparent px-3 text-base font-mono font-bold tracking-wider focus:outline-none placeholder:text-muted-foreground/40 placeholder:font-normal"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-[11px] text-amber-400 hover:underline font-semibold"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-2xl bg-background/50 border-amber-500/30 pr-10 text-base font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleSignInPassword}
              disabled={loading || !phoneDigits || !password}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Lock className="h-5 w-5 mr-2" />}
              Connexion instantanée
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-xs text-amber-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Ou se connecter via un code OTP SMS
              </button>
            </div>
          </motion.div>
        )}

        {/* 2. SIGN UP FORM */}
        {mode === 'signup' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-1">
            {signupStep === 'details' ? (
              <>
                <div>
                  <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block mb-1.5">
                    Nom Complet
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Ex: Jean Mukendi"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-12 rounded-2xl bg-background/50 border-amber-500/30 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block mb-1.5">
                    Numéro de téléphone RDC (+243)
                  </label>
                  <div className="flex items-center rounded-2xl border border-amber-500/30 bg-background/50 focus-within:ring-2 focus-within:ring-amber-500/50 overflow-hidden h-12">
                    <div className="px-3.5 h-full bg-amber-500/10 border-r border-amber-500/20 flex items-center gap-1 text-xs font-black text-amber-400 shrink-0 select-none">
                      <span>🇨🇩</span>
                      <span>+243</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={9}
                      placeholder="820000000"
                      value={phoneDigits}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      className="w-full h-full bg-transparent px-3 text-base font-mono font-bold tracking-wider focus:outline-none placeholder:text-muted-foreground/40 placeholder:font-normal"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block mb-1.5">
                    Créer un Mot de passe (min. 6 caractères)
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-2xl bg-background/50 border-amber-500/30 pr-10 text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleSignUpRequestOtp}
                  disabled={loading || !fullName || !phoneDigits || password.length < 6}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <KeyRound className="h-5 w-5 mr-2" />}
                  Recevoir le Code SMS (OTP)
                </Button>
              </>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <div>
                    <div className="text-muted-foreground">Code SMS envoyé au :</div>
                    <div className="font-mono font-bold text-amber-400">{formatDRCPhone(fullPhone)}</div>
                  </div>
                  <button
                    onClick={() => setSignupStep('details')}
                    className="text-[11px] text-amber-400 underline font-semibold hover:text-amber-300"
                  >
                    Changer
                  </button>
                </div>

                {simulatedCode && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-mono">
                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                    Code SMS de test : <b>{simulatedCode}</b>
                  </div>
                )}

                <div>
                  <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block mb-1.5">
                    Entrez le code à 6 chiffres
                  </label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="h-14 rounded-2xl text-center text-2xl font-mono tracking-[0.5em] font-black bg-background/50 border-2 border-amber-500/40"
                  />
                </div>

                <Button
                  onClick={handleSignUpVerifyOtp}
                  disabled={loading || otpCode.length < 4}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                  Valider & Finaliser l&apos;Inscription
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* 3. RESET PASSWORD / SMS LOGIN FORM */}
        {mode === 'reset' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-1">
            {resetStep === 'request' ? (
              <>
                <div>
                  <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block mb-1.5">
                    Numéro de téléphone RDC (+243)
                  </label>
                  <div className="flex items-center rounded-2xl border border-amber-500/30 bg-background/50 focus-within:ring-2 focus-within:ring-amber-500/50 overflow-hidden h-12">
                    <div className="px-3.5 h-full bg-amber-500/10 border-r border-amber-500/20 flex items-center gap-1 text-xs font-black text-amber-400 shrink-0 select-none">
                      <span>🇨🇩</span>
                      <span>+243</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={9}
                      placeholder="820000000"
                      value={phoneDigits}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      className="w-full h-full bg-transparent px-3 text-base font-mono font-bold tracking-wider focus:outline-none placeholder:text-muted-foreground/40 placeholder:font-normal"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleResetRequestOtp}
                  disabled={loading || !phoneDigits}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <KeyRound className="h-5 w-5 mr-2" />}
                  Envoyer le Code OTP (SMS)
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block mb-1.5">
                    Code OTP (SMS)
                  </label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="h-12 rounded-2xl text-center text-xl font-mono tracking-widest bg-background/50 border-amber-500/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider block mb-1.5">
                    Nouveau Mot de passe (optionnel)
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 rounded-2xl bg-background/50 border-amber-500/30 text-base"
                  />
                </div>

                <Button
                  onClick={handleResetVerifyOtp}
                  disabled={loading || otpCode.length < 4}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                  Valider & Se connecter
                </Button>
              </div>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-xs text-muted-foreground hover:text-amber-400 underline font-semibold"
              >
                Retour à la connexion par mot de passe
              </button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
