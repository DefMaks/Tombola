'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function DeleteAccountModal({ isOpen, onClose, phone, onSuccess }) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'SUPPRIMER') {
      toast.error('Veuillez taper "SUPPRIMER" pour confirmer.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/my/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      toast.success('Votre compte et vos données personnelles ont été supprimés avec succès.');
      
      // Nettoyage complet du stockage local
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_phone');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('punchy_push_enabled');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message || 'Impossible de supprimer le compte');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl p-5 text-white relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-rose-400">Supprimer mon Compte</h3>
                <p className="text-[10px] text-slate-400">Action irréversible</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description & Impact */}
          <div className="mt-4 space-y-2.5 text-xs text-slate-300">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Attention :
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-100/90">
                <li>Vos identifiants, mot de passe et sessions seront effacés.</li>
                <li>Vos abonnements aux notifications push seront désactivés.</li>
                <li>Votre nom sera définitivement anonymisé.</li>
              </ul>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pour confirmer la suppression définitive de votre compte Punchy (associé au numéro <strong>{phone}</strong>), tapez <strong>SUPPRIMER</strong> ci-dessous :
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Tapez SUPPRIMER"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-white placeholder-slate-500 text-xs font-mono outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="mt-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || confirmText.trim().toUpperCase() !== 'SUPPRIMER'}
              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmer</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
