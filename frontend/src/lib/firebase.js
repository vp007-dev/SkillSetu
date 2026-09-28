import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAyr7S26o8RIQr9ZHPxC1tVYawOaaEbvVM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'skillsetu-8dd74.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'skillsetu-8dd74',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'skillsetu-8dd74.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '768964711377',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:768964711377:web:d0d13824e56e1d8e5f86f0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-2LTRP164YH',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics (only in browser context)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
