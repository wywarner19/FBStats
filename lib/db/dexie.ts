import Dexie, { type Table } from "dexie";
import type { GameState, TeamProfile } from "@/lib/types";

interface MetaRow {
  key: string;
  value: unknown;
}

/**
 * Offline-first storage. The entire game document (setup + immutable play log
 * + clock) is persisted as one row keyed by game id. Team profiles and small
 * app meta (current game, seed flag) live alongside.
 */
export class FBStatsDB extends Dexie {
  games!: Table<GameState, string>;
  teams!: Table<TeamProfile, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("fbstats-live");
    this.version(1).stores({
      games: "id, updatedAt",
    });
    this.version(2).stores({
      games: "id, updatedAt",
      teams: "id, updatedAt",
      meta: "key",
    });
  }
}

let _db: FBStatsDB | null = null;

export function db(): FBStatsDB {
  if (typeof window === "undefined") {
    throw new Error("FBStatsDB is client-only");
  }
  if (!_db) _db = new FBStatsDB();
  return _db;
}

// ---- Games ----
export async function saveGame(game: GameState): Promise<void> {
  await db().games.put(game);
}
export async function loadGame(id: string): Promise<GameState | undefined> {
  return db().games.get(id);
}
export async function loadLatestGame(): Promise<GameState | undefined> {
  return db().games.orderBy("updatedAt").last();
}
export async function loadAllGames(): Promise<GameState[]> {
  const all = await db().games.orderBy("updatedAt").toArray();
  return all.reverse();
}
export async function deleteGame(id: string): Promise<void> {
  await db().games.delete(id);
}

// ---- Team profiles ----
export async function saveTeamProfile(team: TeamProfile): Promise<void> {
  await db().teams.put(team);
}
export async function loadTeamProfiles(): Promise<TeamProfile[]> {
  const all = await db().teams.orderBy("updatedAt").toArray();
  return all.reverse();
}
export async function deleteTeamProfile(id: string): Promise<void> {
  await db().teams.delete(id);
}

// ---- Meta (key/value) ----
export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const row = await db().meta.get(key);
  return row?.value as T | undefined;
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db().meta.put({ key, value });
}
