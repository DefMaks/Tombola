'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Plus } from 'lucide-react';

export default function SmartAppBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check standalone mode
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://')
    );
    const dismissed = localStorage.getItem('smart_app_banner_dismissed_v4');

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
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        dismiss();
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for iOS Safari
      alert("Pour ajouter à l'écran d'accueil :\n1. Appuyez sur le bouton Partager\n2. Choisissez 'Sur l'écran d'accueil'");
    }
  };

  const handleOpenApp = () => {
    // Attempt to navigate to the current path within the PWA
    // Note: Due to iOS limitations, this might still just reload the page in Safari
    // but the manifest changes will help Android.
    window.location.href = window.location.href;
  };

  const dismiss = () => {
    localStorage.setItem('smart_app_banner_dismissed_v4', '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] shadow-md border-b border-amber-500/20 bg-slate-950/95 backdrop-blur-md px-3 py-2"
        >
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3 relative">
            <button
              onClick={dismiss}
              className="p-1.5 -ml-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="font-medium text-[12px] text-white leading-tight">
                Tu as déjà l&apos;application Punchy ?
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              <button
                onClick={handleOpenApp}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> Ouvrir l&apos;application
              </button>
              <button
                onClick={handleInstallClick}
                className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3 w-3" /> Ajouter à l&apos;écran d&apos;accueil
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
