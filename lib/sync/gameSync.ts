import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import type { GameState } from "@/lib/types";
import { deriveSituation } from "@/lib/engine/rules";
import { firebase } from "./firebase";

const COLLECTION = "games";

/** Sign in anonymously (idempotent); resolves to the uid or null if offline. */
export function ensureAuth(): Promise<string | null> {
  const fb = firebase();
  if (!fb) return Promise.resolve(null);
  const { auth } = fb;
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user.uid);
      }
    });
    signInAnonymously(auth).catch((e) => {
      console.warn("anon sign-in failed", e);
      resolve(null);
    });
  });
}

/** Unguessable id used as the Firestore doc id / share code. */
export function newCloudId(): string {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("");
}

/**
 * Mirror a game to Firestore. The full game is stored as an opaque JSON blob
 * (robust against Firestore's field constraints) plus a few denormalized
 * fields for listing and the live scoreboard. `shared: true` lets a viewer read
 * it with the share link.
 */
export async function pushGame(game: GameState): Promise<void> {
  const fb = firebase();
  if (!fb || !game.cloudId) return;
  const uid = await ensureAuth();
  if (!uid) return;
  const sit = deriveSituation(game.setup, game.plays, game.anchor);
  await setDoc(
    doc(fb.db, COLLECTION, game.cloudId),
    {
      data: JSON.stringify(game),
      ownerId: uid,
      shared: true,
      title: `${game.setup.home.name} vs ${game.setup.away.name}`,
      homeAbbr: game.setup.home.abbr,
      awayAbbr: game.setup.away.abbr,
      scoreH: sit.scoreH,
      scoreA: sit.scoreA,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Subscribe to a shared game by its cloud id. Returns an unsubscribe fn. */
export function watchGame(
  cloudId: string,
  cb: (game: GameState | null, err?: string) => void,
): () => void {
  const fb = firebase();
  if (!fb) return () => {};
  return onSnapshot(
    doc(fb.db, COLLECTION, cloudId),
    (snap) => {
      const raw = snap.data();
      if (!raw || typeof raw.data !== "string") {
        cb(null, snap.exists() ? "This game has no data yet." : "Game not found.");
        return;
      }
      try {
        cb(JSON.parse(raw.data) as GameState);
      } catch {
        cb(null, "Could not read the live game.");
      }
    },
    (err) => cb(null, err.message),
  );
}
