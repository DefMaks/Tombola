'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus, Download, Smartphone } from 'lucide-react';

export default function SmartAppBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    // Check standalone mode
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://')
    );
    const dismissed = localStorage.getItem('smart_app_banner_dismissed');

    if (isStandalone || dismissed) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIosDevice(isIos);

    // Capture Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback timer to show banner even if beforeinstallprompt doesn't fire immediately or on iOS
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
    }
  };

  const dismiss = () => {
    localStorage.setItem('smart_app_banner_dismissed', '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 shadow-md border-b border-amber-500/20 bg-slate-950/95 backdrop-blur-md px-3 py-2"
        >
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3 relative">
            <button
              onClick={dismiss}
              className="p-1.5 -ml-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <img
                src="/P-punchy-emblem.png"
                alt="Punchy"
                className="h-8 w-8 object-contain rounded-lg p-0.5 bg-amber-500/10 border border-amber-500/30 shrink-0"
              />
              <div className="truncate">
                <div className="font-semibold text-[13px] text-white truncate">Ouvrir dans l&apos;application</div>
                <div className="text-[10px] text-amber-300 font-medium truncate">Plus rapide & notifications</div>
              </div>
            </div>

            <div className="shrink-0 flex items-center">
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Download className="h-3 w-3" /> Installer
                </button>
              ) : isIosDevice ? (
                <button
                  onClick={() => alert("Pour installer sur iPhone :\n1. Appuyez sur Partager (icône avec flèche vers le haut)\n2. Choisissez 'Sur l'écran d'accueil'")}
                  className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-[11px] font-medium flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Share className="h-3 w-3" /> Installer
                </button>
              ) : (
                <button
                  onClick={() => alert("Pour installer l'application :\nAppuyez sur le menu de votre navigateur (⋮) puis sur 'Ajouter à l'écran d'accueil'")}
                  className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-[11px] font-medium flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Smartphone className="h-3 w-3" /> Installer
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
