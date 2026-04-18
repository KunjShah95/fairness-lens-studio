import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBdhoCmv57zksBLo7vPBuJ6VhpHkPC4p_c',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gapevaluator.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gapevaluator',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gapevaluator.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '178042306679',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:178042306679:web:e0d8270a7d99aae8b70672',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-9XXZ32RN44',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (!analytics) {
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(getFirebaseApp());
    }
  }
  return analytics;
}

export { firebaseConfig };