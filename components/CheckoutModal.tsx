'use client';

import React, { useState, useEffect, useRef } from 'react';
import { twigaPaieClient } from '@/lib/TwigaPaieClient';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffleId: string;
  userId: string;
  quantity: number;
  unitPrice: number;
  currency?: 'USD' | 'CDF';
  onSuccess?: (data: any) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  raffleId,
  userId,
  quantity,
  unitPrice,
  currency = 'USD',
  onSuccess,
}: CheckoutModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [operator, setOperator] = useState<'AIRTEL' | 'MPESA' | 'ORANGE'>('AIRTEL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalAmount = unitPrice * quantity;

  // Nettoyage de l'intervalle de polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  if (!isOpen) return null;

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    setStatusMessage('Initiation du paiement Mobile Money...');

    // Génération d'une référence orderId unique
    const merchantRef = `MERCH-PUNCHY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
      // 1. Appel du proxy pour déclencher le Push USSD
      await twigaPaieClient.initiatePayment({
        amount: totalAmount,
        currency,
        phoneNumber,
        orderId: merchantRef,
        channel: operator,
        description: `Achat ${quantity} ticket(s) Tombola Punchy`,
      });

      setIsSubmitting(false);
      setIsPolling(true);
      setStatusMessage('Invite USSD envoyée ! Veuillez valider le paiement sur votre téléphone.');

      // 2. Démarrage du Polling automatique toutes les 3 secondes (Max 2 minutes)
      let attempts = 0;
      const maxAttempts = 40;

      pollingIntervalRef.current = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          stopPolling();
          setErrorMessage('Délai d\'attente dépassé. Veuillez vérifier l\'historique de votre compte.');
          return;
        }

        try {
          const checkRes = await twigaPaieClient.checkPaymentStatus({
            orderId: merchantRef,
            triggerWebhookOnSuccess: true, // Demande au proxy de notifier notre Webhook si status === 2
          });

          const apiData = checkRes.data || checkRes;
          const status = Number(apiData?.status);

          if (status === 2) { // Payé avec succès
            stopPolling();
            setStatusMessage('Paiement confirmé ! Vos tickets ont été attribués.');
            if (onSuccess) onSuccess(apiData);
            setTimeout(() => onClose(), 2000);
          } else if (status === 3 || status === 4) { // Échec ou annulé
            stopPolling();
            setErrorMessage('Le paiement a été rejeté ou annulé.');
          }
        } catch (pollErr: any) {
          console.warn('Erreur lors du polling de statut :', pollErr.message);
        }
      }, 3000);

    } catch (err: any) {
      setIsSubmitting(false);
      stopPolling();
      setErrorMessage(err.message || 'Une erreur est survenue lors du paiement.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-6 text-white shadow-2xl border border-zinc-800">
        <h2 className="text-xl font-bold text-amber-400">Achat de Tickets Tombola</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {quantity} ticket(s) pour un total de <span className="font-semibold text-white">{totalAmount} {currency}</span>
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            {errorMessage}
          </div>
        )}

        {statusMessage && !errorMessage && (
          <div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300 border border-amber-500/20 flex items-center gap-2">
            {isPolling && <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />}
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleInitiatePayment} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Réseau Mobile Money</label>
            <div className="grid grid-cols-3 gap-2">
              {(['AIRTEL', 'MPESA', 'ORANGE'] as const).map((net) => (
                <button
                  key={net}
                  type="button"
                  onClick={() => setOperator(net)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    operator === net
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Numéro de Téléphone (+243...)</label>
            <input
              type="tel"
              required
              placeholder="0810000000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isSubmitting || isPolling}
              className="w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-white border border-zinc-700 focus:border-amber-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { stopPolling(); onClose(); }}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isPolling || !phoneNumber}
              className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
            >
              {isSubmitting ? 'Chargement...' : isPolling ? 'En attente...' : 'Payer maintenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
