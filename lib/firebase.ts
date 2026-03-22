import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  vapidKey?: string
}

let app: FirebaseApp | null = null

export function initFirebase(config: FirebaseConfig) {
  if (!getApps().length) {
    app = initializeApp(config)
  } else {
    app = getApps()[0]
  }
  return app
}

export function getFirebaseApp() { return app }

export function getFirebaseAuth() {
  if (!app) throw new Error('Firebase not initialized')
  return getAuth(app)
}

export function getFirebaseDB() {
  if (!app) throw new Error('Firebase not initialized')
  return getDatabase(app)
}

export function getFirebaseStorage() {
  if (!app) throw new Error('Firebase not initialized')
  return getStorage(app)
}

export function resolveCfg(): FirebaseConfig | null {
  // Check env vars first (for production)
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.startsWith('REPLACE_')) {
    return {
      apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
      databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? '',
      projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
      storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
      vapidKey:          process.env.NEXT_PUBLIC_VAPID_KEY,
    }
  }
  // Fallback to localStorage (setup screen flow)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('cipher_cfg')
      if (stored) {
        const c = JSON.parse(stored)
        if (c?.apiKey) return c
      }
    } catch {}
  }
  return null
}
