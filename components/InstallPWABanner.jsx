'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus, Download, Smartphone } from 'lucide-react';

export default function InstallPWABanner() {
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
    const dismissed = localStorage.getItem('pwa_banner_dismissed_v2');

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
    }, 2500);

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
    localStorage.setItem('pwa_banner_dismissed_v2', '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-3 right-3 z-50 max-w-lg mx-auto"
        >
          <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-4 text-white shadow-2xl border border-amber-500/40 relative">
            <button
              onClick={dismiss}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-2">
              <img
                src="/P-punchy-emblem.png"
                alt="Punchy"
                className="h-10 w-10 object-contain rounded-xl p-0.5 bg-amber-500/10 border border-amber-500/30 shrink-0"
              />
              <div>
                <div className="font-bold text-sm text-white">📲 Installer l&apos;application Punchy</div>
                <div className="text-[11px] text-amber-300 font-medium">Accès rapide, notifications & tirages en direct</div>
              </div>
            </div>

            {deferredPrompt ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300 font-medium">Ajoutez l&apos;application sur votre écran d&apos;accueil.</span>
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shrink-0"
                >
                  <Download className="h-3.5 w-3.5" /> Installer
                </button>
              </div>
            ) : isIosDevice ? (
              <div className="text-xs text-slate-300 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5 mt-2">
                1. Appuyez sur <Share className="inline h-3.5 w-3.5 text-amber-400 mx-0.5" /> dans Safari<br />
                2. Choisissez <b>&quot;Sur l&apos;écran d&apos;accueil&quot;</b> <Plus className="inline h-3.5 w-3.5 text-amber-400 mx-0.5" /><br />
                3. Profitez de l&apos;application en plein écran ! 🚀
              </div>
            ) : (
              <div className="text-xs text-slate-300 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5 mt-2">
                Appuyez sur le menu de votre navigateur (<b>⋮</b>) puis sur <b>&quot;Ajouter à l&apos;écran d&apos;accueil&quot;</b> ou <b>&quot;Installer l&apos;application&quot;</b>.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

