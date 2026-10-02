'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, QrCode, MessageCircle, Sparkles, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';

export default function ShareAppModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Domaine officiel de production
      const officialDomain = 'https://punchyplay.com';
      // Si l'utilisateur est sur localhost en développement, utiliser le port local, sinon le domaine de production
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const targetUrl = process.env.NEXT_PUBLIC_APP_URL || (isLocalhost ? window.location.origin : officialDomain);

      setAppUrl(targetUrl);

      QRCode.toDataURL(targetUrl, {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Erreur génération QR Code:', err));
    }
  }, []);

  const shareTitle = 'Punchy - Le Jeu des Vrais Champions !';
  const shareText = '🥊 Rejoins-moi sur Punchy ! Choisis ton Round avec 1$ et repars avec la cagnotte. Installe l\'application directement ici :';

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: appUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Erreur native share:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const fullText = encodeURIComponent(`${shareText}\n${appUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${fullText}`, '_blank');
  };

  const handleCopyLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(appUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 text-white relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base leading-tight">Partager Punchy</h3>
                <p className="text-[11px] text-slate-400">Fais découvrir l&apos;application à un proche</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* QR Code Container */}
          <div className="mt-4 flex flex-col items-center">
            <div className="p-3 bg-white rounded-2xl shadow-inner border-2 border-amber-500/30 relative group">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Punchy"
                  className="w-44 h-44 object-contain rounded-lg"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                  Génération du QR Code...
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-slate-950 p-1 shadow-md border border-amber-500/50">
                  <img src="/P-punchy-emblem.png" alt="Punchy" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 text-center flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Fais scanner ce QR Code avec l&apos;appareil photo d&apos;un ami
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 space-y-2.5">
            {/* WhatsApp Direct */}
            <button
              onClick={handleWhatsAppShare}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              Envoyer par WhatsApp
            </button>

            {/* Native Share Sheet */}
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              Partager (AirDrop, Bluetooth, SMS...)
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700/60 transition active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Lien copié dans le presse-papier !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copier le lien d&apos;installation</span>
                </>
              )}
            </button>
          </div>

          {/* Astuce Système */}
          <div className="mt-4 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-[10px] text-slate-400 flex items-start gap-2">
            <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Astuce Android :</strong> Tu peux aussi faire un appui long sur l&apos;icône Punchy de ton écran d&apos;accueil et appuyer sur <em>« Partager »</em>.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
