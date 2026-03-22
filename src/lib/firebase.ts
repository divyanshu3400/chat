import { FirebaseConfig } from '@/lib/firebase';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;
let storage: FirebaseStorage | null = null;

export function initFirebase(config: FirebaseConfig) {
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    app = initializeApp(config);
  }
  auth = getAuth(app);
  db = getDatabase(app);
  storage = getStorage(app);
  return { app, auth, db, storage };
}

export function getFirebaseInstances() {
  return { app, auth, db, storage };
}

export function isFirebaseReady() {
  return app !== null && auth !== null && db !== null;
}

export const REPLACE_PREFIX = 'REPLACE_';

export function isConfigured(config: Record<string, string>): boolean {
  return !Object.values(config).some(v => v.startsWith(REPLACE_PREFIX));
}

export function resolveConfig(): FirebaseConfig | null {
  const defaults = {
    apiKey:            'REPLACE_apiKey',
    authDomain:        'REPLACE_authDomain',
    databaseURL:       'REPLACE_databaseURL',
    projectId:         'REPLACE_projectId',
    storageBucket:     'REPLACE_storageBucket',
    messagingSenderId: 'REPLACE_messagingSenderId',
    appId:             'REPLACE_appId',
  };

  if (isConfigured(defaults)) return defaults as unknown as FirebaseConfig;

  try {
    const stored = localStorage.getItem('cipher_cfg');
    if (stored) {
      const c = JSON.parse(stored) as FirebaseConfig;
      if (c?.apiKey) return c;
    }
  } catch { /* ignore */ }

  return null;
}
