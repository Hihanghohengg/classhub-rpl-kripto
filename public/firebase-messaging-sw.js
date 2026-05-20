/* public/firebase-messaging-sw.js */
/* eslint-disable no-undef */

/*
  Service Worker Firebase Cloud Messaging.
  File ini berada di folder public, jadi tidak bisa membaca import.meta.env.
  Firebase web config ditulis langsung di sini.
*/

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients
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

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return null;
      })
  );
});

importScripts('/vendor/firebase-app-compat.js');
importScripts('/vendor/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDLTwAN8nCEfpLJsmQ2T-BoU4RF1rwmxY',
  authDomain: 'classhub-rpl-kripto.firebaseapp.com',
  projectId: 'classhub-rpl-kripto',
  storageBucket: 'classhub-rpl-kripto.appspot.com',
  messagingSenderId: '377214037577',
  appId: '1:377214037577:web:863714967645fc8d739998'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    'ClassHub RPL Kripto';

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    'Ada informasi baru di ClassHub.';

  const icon =
    payload?.notification?.icon ||
    payload?.data?.icon ||
    '/assets/logo.png';

  const url = payload?.data?.url || '/';

  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/assets/logo.png',
    data: {
      url
    }
  });
});