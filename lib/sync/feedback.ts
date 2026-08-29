import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firebase } from "./firebase";
import { ensureAuth } from "./gameSync";

/** Auto-captured context so feedback says where/what the user was doing. */
export interface FeedbackContext {
  screen?: string;
  /** The step just completed — the most recent in-app confirmation message. */
  step?: string | null;
  matchup?: string;
  situation?: string;
  lastPlay?: string;
  model?: string;
  path?: string;
  ua?: string;
}

export interface FeedbackPayload {
  text: string;
  kind: "bug" | "idea" | "other";
  context: FeedbackContext;
}

const QUEUE_KEY = "fb-feedback-queue";

function queueLocally(payload: FeedbackPayload) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    q.push({ ...payload, queuedAt: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* nothing else we can do if storage is unavailable */
  }
}

/** Firestore rejects `undefined` field values — drop those keys. */
function pruneUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

async function writeOne(payload: FeedbackPayload) {
  const fb = firebase();
  if (!fb) throw new Error("no-firebase");
  const uid = await ensureAuth();
  if (!uid) throw new Error("no-auth");
  await addDoc(collection(fb.db, "feedback"), {
    text: payload.text,
    kind: payload.kind,
    context: pruneUndefined(payload.context as Record<string, unknown>),
    uid,
    createdAt: serverTimestamp(),
  });
}

/**
 * Send feedback to Firestore. Returns true if it went through now, false if it
 * was queued locally to retry later (offline, or rules not yet published).
 */
export async function sendFeedback(payload: FeedbackPayload): Promise<boolean> {
  try {
    await writeOne(payload);
    return true;
  } catch (e) {
    console.warn("feedback send failed — queued locally", e);
    queueLocally(payload);
    return false;
  }
}

/** Retry any queued feedback. Safe to call on every app load. */
export async function flushFeedbackQueue(): Promise<void> {
  let q: (FeedbackPayload & { queuedAt?: number })[];
  try {
    q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return;
  }
  if (!q.length) return;
  const remaining: typeof q = [];
  for (const item of q) {
    try {
      await writeOne(item);
    } catch {
      remaining.push(item);
    }
  }
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    /* ignore */
  }
}
