/* Simple service worker for showing push notifications */
self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'Notification', body: event.data?.text() ?? '' }; }
  const title = data.title || 'AHG';
  const opts = { body: data.body || '', icon: '/logo.png', badge: '/logo.png', data: data };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then(function (c) {
    if (c.length > 0) return c[0].focus();
    return clients.openWindow('/');
  }));
});
