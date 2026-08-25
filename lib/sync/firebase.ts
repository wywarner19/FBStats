import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

/**
 * Firebase web config. These keys are PUBLIC by design — they identify the
 * project, they do not grant access. Access is controlled by Firebase Auth and
 * Firestore security rules (see lib/sync/firestore.rules). Safe to commit.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDmr4jdkhRBVHRPTKrWFufYzf2VBiE3ZVU",
  authDomain: "fbstats-24a7d.firebaseapp.com",
  projectId: "fbstats-24a7d",
  storageBucket: "fbstats-24a7d.firebasestorage.app",
  messagingSenderId: "478821936021",
  appId: "1:478821936021:web:e690601c02b63a0d2c649c",
};

let cached: { app: FirebaseApp; db: Firestore; auth: Auth } | null = null;

/** Lazily initialize Firebase on the client. Returns null during SSR. */
export function firebase() {
  if (typeof window === "undefined") return null;
  if (cached) return cached;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Already initialized (e.g. hot reload) — reuse it.
    db = getFirestore(app);
  }
  cached = { app, db, auth: getAuth(app) };
  return cached;
}
