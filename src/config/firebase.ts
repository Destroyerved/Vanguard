/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Safely access import.meta.env without TypeScript error
const env = (import.meta as any).env || {};

// Firebase Web SDK Configuration
// Uses Vite environment variables with resilient fallback config for local development
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAzoXSBz4bHLrleXSP2bE-5X-P858ifdQE',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'vanguard-7fece.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'vanguard-7fece',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'vanguard-7fece.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '316058828672',
  appId: env.VITE_FIREBASE_APP_ID || '1:316058828672:web:403293aa40383c0350cb65'
};

// Initialize Firebase App singleton safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
