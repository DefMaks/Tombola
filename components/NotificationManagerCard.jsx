'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from '@/lib/push-client';

export default function NotificationManagerCard({ userPhone = null, commune = null }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userPhone) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = Notification.permission;
      if (perm === 'granted') {
        setIsEnabled(true);
        // Synchronisation automatique en arrière-plan pour la session active
        subscribeUserToPush({ userPhone, commune }).catch(() => {});
      } else if (perm === 'default') {
        // Active par défaut dès que la session est ouverte
        Notification.requestPermission()
          .then((newPerm) => {
            if (newPerm === 'granted') {
              setIsEnabled(true);
              subscribeUserToPush({ userPhone, commune }).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }, [userPhone, commune]);

  const handleToggle = async () => {
    if (!isPushNotificationSupported()) {
      toast.error('Notifications non supportées sur ce terminal.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEnabled) {
        await unsubscribeUserFromPush();
        setIsEnabled(false);
        toast.info('Notifications désactivées');
      } else {
        await subscribeUserToPush({ userPhone, commune });
        setIsEnabled(true);
        toast.success('Notifications des tirages activées');
      }
    } catch (err) {
      toast.error(err.message || 'Impossible de modifier les notifications');
      setIsEnabled(getNotificationPermissionState() === 'granted');
    } finally {
      setIsLoading(false);
    }
  };

  // N'afficher que pour les utilisateurs ayant une session ouverte
  if (!userPhone) return null;

  return (
    <div className="flex items-center justify-between p-3.5 bg-card border border-border rounded-2xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-colors ${isEnabled ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'}`}>
          {isEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-bold text-sm text-foreground">Notifications des Tirages</div>
          <div className="text-[11px] text-muted-foreground">
            {isEnabled ? 'Actives (alertes quotidiennes & gains)' : 'Désactivées'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        aria-label="Basculer les notifications"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isEnabled ? 'bg-amber-500' : 'bg-slate-700'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-slate-800" />}
        </span>
      </button>
    </div>
  );
}
