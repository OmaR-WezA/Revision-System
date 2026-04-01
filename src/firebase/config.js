// =============================================
// 🔥 Firebase Configuration
// =============================================
// WHY: We initialize Firebase once and export `db` (Firestore instance).
// All other files import `db` from here — single source of truth.
//
// HOW TO USE:
// 1. Fill in your values in .env.local (copy from .env)
// 2. That's it — everything else is automatic.
// =============================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App (runs once)
const app = initializeApp(firebaseConfig);

// Export the Firestore database instance
export const db = getFirestore(app);
