// lib/push-client.js
import { safeStorage } from '@/lib/storage';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermissionState() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted', 'denied', or 'default'
}

export async function subscribeUserToPush({ userPhone = null, commune = null, city = 'Kinshasa' } = {}) {
  if (!isPushNotificationSupported()) {
    throw new Error('Les notifications push ne sont pas supportées sur ce navigateur.');
  }

  // 1. Demander la permission du navigateur
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications refusées. Vous pouvez les réactiver dans les paramètres du navigateur.'
        : 'Permission non accordée.'
    );
  }

  // 2. Récupérer la clé publique VAPID depuis le serveur
  const res = await fetch('/api/notifications/subscribe');
  const keyData = await res.json();
  if (!keyData.success || !keyData.publicKey) {
    throw new Error('Impossible de récupérer la clé VAPID du serveur.');
  }

  // 3. Obtenir l'enregistrement du Service Worker
  const registration = await navigator.serviceWorker.ready;

  // 4. Vérifier s'il y a déjà une souscription
  let subscription = await registration.pushManager.getSubscription();

  // Si pas de souscription ou souscription expirée, créer une nouvelle
  if (!subscription) {
    const convertedVapidKey = urlBase64ToUint8Array(keyData.publicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  // 5. Envoyer l'abonnement au serveur
  const subJSON = subscription.toJSON();
  const saveRes = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subJSON.keys,
      user_id: userPhone || null,
      city: city || 'Kinshasa',
      commune: commune || null,
    }),
  });

  const saveResult = await saveRes.json();
  if (!saveResult.success) {
    throw new Error(saveResult.error || 'Erreur lors de l\'enregistrement sur le serveur.');
  }

  // Stocker l'état localement
  safeStorage.setItem('punchy_push_enabled', 'true');
  return { success: true, subscription };
}

export async function unsubscribeUserFromPush() {
  if (!isPushNotificationSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    safeStorage.removeItem('punchy_push_enabled');
    return true;
  } catch (err) {
    console.error('Erreur désabonnement push:', err);
    return false;
  }
}
