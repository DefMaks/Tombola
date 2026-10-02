'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Plus } from 'lucide-react';

export default function SmartAppBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    try {
      // Check standalone mode
      const isStandalone = typeof window !== 'undefined' && (
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone ||
        (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://'))
      );
      let dismissed = false;
      try {
        dismissed = Boolean(localStorage.getItem('smart_app_banner_dismissed_v4'));
      } catch (e) {}

      if (isStandalone || dismissed) return;

      // Capture Chrome/Android install prompt
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Show banner anyway after a short delay for iOS
      const timer = setTimeout(() => {
        setShow(true);
      }, 1500);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        clearTimeout(timer);
      };
    } catch (err) {
      // Prevent crash on restricted environments
    }
  }, []);

  const [showGuide, setShowGuide] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          dismiss();
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const handleOpenApp = () => {
    window.location.href = '/';
  };

  const dismiss = () => {
    localStorage.setItem('smart_app_banner_dismissed_v4', '1');
    setShow(false);
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="fixed top-0 left-0 right-0 z-[100] px-2.5 pt-2 pb-1.5 pointer-events-none"
          >
            <div className="max-w-lg mx-auto pointer-events-auto relative overflow-hidden rounded-2xl border border-white/[0.14] bg-slate-950/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.1)_inset] px-3 py-2 flex items-center justify-between gap-2.5 transition-all">
              {/* Reflet spéculaire supérieur (Glass Sheen) */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none" />

              {/* Bouton Fermer */}
              <button
                onClick={dismiss}
                className="p-1 rounded-full bg-white/[0.05] hover:bg-white/[0.15] border border-white/[0.08] text-slate-400 hover:text-white transition-colors shrink-0"
                aria-label="Fermer"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Logo & Texte */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 p-1 shadow-inner">
                  <img src="/P-punchy-emblem.png" alt="Punchy" className="w-full h-full object-contain drop-shadow" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="font-bold text-[12px] text-white leading-tight flex items-center gap-1.5">
                    <span>Installer Punchy</span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  </div>
                  <div className="text-[10px] text-amber-200/70 font-medium truncate">
                    Accès instantané &amp; alertes tirages
                  </div>
                </div>
              </div>

              {/* Bouton d'action Installer style Liquid Glass */}
              <div className="shrink-0">
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 text-slate-950 text-[11px] font-black flex items-center gap-1.5 transition-all shadow-[0_0_18px_rgba(245,158,11,0.45)] border border-amber-300/50 active:scale-95 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Installer</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guide d'installation si l'invite native est différée */}
      <AnimatePresence>
        {showGuide && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="w-full max-w-sm rounded-3xl bg-slate-950/80 backdrop-blur-2xl border border-white/[0.12] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-white relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 p-1 flex items-center justify-center">
                    <img src="/P-punchy-emblem.png" alt="Punchy" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">Installation Rapide</h3>
                    <p className="text-[10px] text-slate-400">100% gratuit &amp; sans magasin d&apos;applications</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
                  <p className="font-bold text-amber-400 mb-1 flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Sur Android (Google Chrome) :
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                    <li>Appuyez sur le menu <strong>(les 3 points ⋮)</strong> en haut à droite</li>
                    <li>Sélectionnez <strong>« Installer l&apos;application »</strong></li>
                    <li>Confirmez l&apos;ajout sur votre écran d&apos;accueil</li>
                  </ol>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
                  <p className="font-bold text-sky-400 mb-1 flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Sur iPhone / iPad (Safari) :
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                    <li>Appuyez sur le bouton <strong>Partager ⎋</strong> en bas</li>
                    <li>Faites défiler et choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong></li>
                    <li>Appuyez sur <strong>« Ajouter »</strong> en haut à droite</li>
                  </ol>
                </div>
              </div>

              <button
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
              >
                J&apos;ai compris
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
