import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let firebaseApp = null;
let firebaseMessaging = null;

export async function getFirebaseMessaging() {
  const supported = await isSupported();

  if (!supported) {
    throw new Error('Browser ini belum mendukung push notification.');
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  if (!firebaseMessaging) {
    firebaseMessaging = getMessaging(firebaseApp);
  }

  return firebaseMessaging;
}

export async function requestNotificationToken() {
  if (!('Notification' in window)) {
    throw new Error('Browser ini tidak mendukung Notification API.');
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('Browser ini tidak mendukung Service Worker.');
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Izin notifikasi belum diberikan.');
  }

  const registration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    {
      scope: '/'
    }
  );

  await navigator.serviceWorker.ready;

  const messaging = await getFirebaseMessaging();

  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    throw new Error('Token notifikasi gagal dibuat.');
  }

  return token;
}

export async function listenForegroundMessage(callback) {
  const messaging = await getFirebaseMessaging();

  return onMessage(messaging, callback);
}
