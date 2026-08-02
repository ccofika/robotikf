import api from '../services/api';

// Web push pretplata za admine — registruje service worker, traži dozvolu
// i šalje pretplatu backendu. Poziva se posle logina i pri svakom učitavanju.

const ADMIN_ROLES = ['admin', 'superadmin', 'supervisor'];

// VAPID javni ključ (base64url) → Uint8Array za pushManager.subscribe
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function enableWebPushForAdmin(user) {
  try {
    if (!user || !ADMIN_ROLES.includes(user.role)) return;

    // Podrška browsera (bez ovoga tiho odustani — panel notifikacija i dalje radi)
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.log('[WebPush] Browser ne podržava push notifikacije');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');

    // Dozvola — pitaj samo ako korisnik još nije odlučio
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      console.log('[WebPush] Dozvola za notifikacije nije data');
      return;
    }

    // Javni ključ sa servera
    const { data } = await api.get('/api/push/vapid-public-key');
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    let subscription = await registration.pushManager.getSubscription();

    // Ako postojeća pretplata koristi drugi ključ, obnovi je
    if (subscription) {
      const existingKey = subscription.options?.applicationServerKey;
      if (existingKey && existingKey.byteLength !== applicationServerKey.byteLength) {
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (subscribeError) {
        // Postojeća pretplata sa starim ključem može da blokira novu — obriši pa probaj ponovo
        const stale = await registration.pushManager.getSubscription();
        if (stale) {
          await stale.unsubscribe();
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        } else {
          throw subscribeError;
        }
      }
    }

    // Registruj/osveži pretplatu na backendu (upsert po endpoint-u —
    // bezbedno zvati pri svakom učitavanju)
    await api.post('/api/push/subscribe', { subscription: subscription.toJSON() });
    console.log('[WebPush] Push notifikacije aktivne');
  } catch (error) {
    // Push je "nice to have" — greška nikada ne sme da poremeti aplikaciju
    console.warn('[WebPush] Podešavanje nije uspelo:', error?.message || error);
  }
}
