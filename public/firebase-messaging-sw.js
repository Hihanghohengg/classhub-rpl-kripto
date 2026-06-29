/* public/firebase-messaging-sw.js */
/* eslint-disable no-restricted-globals */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function getPayloadData(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch {
    return safeJsonParse(event.data.text());
  }
}

self.addEventListener('push', (event) => {
  const payload = getPayloadData(event);

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title =
    notification.title ||
    data.title ||
    'ClassHub RPL Kripto';

  const body =
    notification.body ||
    data.body ||
    'Ada informasi baru di ClassHub.';

  const icon =
    notification.icon ||
    data.icon ||
    '/assets/logo.png';

  const badge =
    data.badge ||
    '/assets/logo.png';

  const url =
    data.url ||
    payload.fcm_options?.link ||
    '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: {
        url
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return null;
      })
  );
});