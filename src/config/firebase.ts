/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Safely access import.meta.env without TypeScript error
const env = (import.meta as any).env || {};

// Firebase Web SDK Configuration
// Uses Vite environment variables with resilient fallback config for local development
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoVanguardApiKeyForLocalTesting',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'vanguard-c2-cop.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'vanguard-c2-cop',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'vanguard-c2-cop.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '109283746501',
  appId: env.VITE_FIREBASE_APP_ID || '1:109283746501:web:a1b2c3d4e5f6g7h8'
};

// Initialize Firebase App singleton safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
