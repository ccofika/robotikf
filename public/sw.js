/* eslint-disable no-restricted-globals */
// Service worker za web push notifikacije (Robotik administracija)

// Prikaži push notifikaciju kada stigne sa servera
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Robotik', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Robotik';
  const options = {
    body: data.body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Klik na notifikaciju — fokusiraj postojeći tab ili otvori novi na ciljnoj stranici
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Aktiviraj novi SW odmah (bez čekanja da se zatvore svi tabovi)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
