export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (e) {
      console.error('SW register failed', e);
    }
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  const perm = await Notification.requestPermission();
  return perm;
}

export async function subscribeToPush(registration: ServiceWorkerRegistration, vapidPublicKey: string) {
  if (!('PushManager' in window)) throw new Error('Push not supported');
  const sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
  return sub;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
