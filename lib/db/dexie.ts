import Dexie, { type Table } from "dexie";
import type { GameState } from "@/lib/types";

/**
 * Offline-first storage. The entire game document (setup + immutable play log
 * + clock) is persisted as one row keyed by game id. Because the situation is
 * a pure fold of the play log, saving the log is enough to fully restore state
 * with no signal — MaxPreps/Hudl/PDF exports all run from this local copy.
 */
export class FBStatsDB extends Dexie {
  games!: Table<GameState, string>;

  constructor() {
    super("fbstats-live");
    this.version(1).stores({
      // Primary key `id`, plus an index on updatedAt for "resume last game".
      games: "id, updatedAt",
    });
  }
}

let _db: FBStatsDB | null = null;

/** Lazily construct the DB so it never runs during SSR. */
export function db(): FBStatsDB {
  if (typeof window === "undefined") {
    throw new Error("FBStatsDB is client-only");
  }
  if (!_db) _db = new FBStatsDB();
  return _db;
}

export async function saveGame(game: GameState): Promise<void> {
  await db().games.put(game);
}

export async function loadGame(id: string): Promise<GameState | undefined> {
  return db().games.get(id);
}

export async function loadLatestGame(): Promise<GameState | undefined> {
  return db().games.orderBy("updatedAt").last();
}

/** All stored games, newest first — used for the season aggregation. */
export async function loadAllGames(): Promise<GameState[]> {
  const all = await db().games.orderBy("updatedAt").toArray();
  return all.reverse();
}

export async function deleteGame(id: string): Promise<void> {
  await db().games.delete(id);
}
