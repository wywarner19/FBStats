import { create } from "zustand";
import type {
  ControlOp,
  EntryModel,
  Formation,
  GameState,
  Hash,
  PassDetail,
  Penalty,
  Personnel,
  PlayDraft,
  PlayResult,
  PlayType,
  Situation,
  TeamId,
} from "@/lib/types";
import {
  blankDraft,
  currentSituation,
  gameReducer,
  type GameAction,
} from "@/lib/engine/reducer";
import type { GameInfo, TeamProfile } from "@/lib/types";
import {
  bellmontProfile,
  blankTeamProfile,
  columbiaCityProfile,
  defaultTeamProfile,
  demoGame,
  exampleGame,
  gameFromProfile,
  newGame as createNewGame,
  normalizeGame,
  tonightSeed,
} from "@/lib/engine/factory";
import {
  deleteGame,
  getMeta,
  loadAllGames,
  loadGame,
  loadLatestGame,
  loadTeamProfiles,
  saveGame,
  saveTeamProfile,
  setMeta,
  deleteTeamProfile as dbDeleteTeamProfile,
} from "@/lib/db/dexie";
import { ensureAuth, newCloudId, pushGame } from "@/lib/sync/gameSync";

export type Screen =
  | "games"
  | "teams"
  | "setup"
  | "roster"
  | "live"
  | "box"
  | "chart"
  | "analytics"
  | "season"
  | "report"
  | "help";

export type Theme = "dark" | "light";

export type Overlay =
  | "pen"
  | "half"
  | "fix"
  | "card"
  | "edit"
  | "addPlayer"
  | "feedback"
  | "situation"
  | "qb"
  | "timeout"
  | "kickoff"
  | null;

export interface KickoffCtx {
  receiving: TeamId | null;
  qtr?: number;
  resetClock?: boolean;
  resetTimeouts?: boolean;
}

interface UIState {
  hydrated: boolean;
  theme: Theme;
  /** Mirror the field display so its orientation matches the user's vantage. */
  fieldFlipped: boolean;
  screen: Screen;
  model: EntryModel;
  padMode: "off" | "def";
  draft: PlayDraft;
  step: number;
  overlay: Overlay;
  pen: Penalty | null;
  fixId: string | null;
  cardNum: number | null;
  editTeam: TeamId;
  editId: string | null;
  addTeam: TeamId;
  kickoffCtx: KickoffCtx | null;
  editingTime: boolean;
  timeInput: string;
  toast: string | null;
  /** Last narrated action (the most recent flash), captured for feedback context. */
  lastStep: string | null;
  setupStep: number;
  broadcast: boolean;
  shareUrl: string | null;
  sharing: boolean;
  teamProfiles: TeamProfile[];
  currentGameId: string | null;
  /** Bumped whenever the games list changes, so list screens re-fetch. */
  gamesRefresh: number;
  /** True while a game is open — controls whether in-game tabs show in the nav. */
  inGame: boolean;
}

/** Screens available only while a game is open. */
export const GAME_SCREENS: Screen[] = ["live", "setup", "roster", "box", "chart", "analytics", "report"];

interface StoreState extends UIState {
  game: GameState;
  situation: Situation;

  // lifecycle
  hydrate: () => Promise<void>;

  // pure-reducer dispatch (autosaves)
  dispatch: (action: GameAction) => void;

  // UI setters
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleFieldFlip: () => void;
  openFeedback: () => void;
  setScreen: (s: Screen) => void;
  setModel: (m: EntryModel) => void;
  setOverlay: (o: Overlay) => void;
  setSetupStep: (n: number) => void;
  togglePad: () => void;
  setBroadcast: (b: boolean) => void;
  shareCurrentGame: () => Promise<string | null>;
  /** Show a toast. `ephemeral` toasts (e.g. the feedback confirmation itself)
   *  don't overwrite `lastStep`, which should track real game actions. */
  flash: (msg: string, ephemeral?: boolean) => void;

  // draft editing
  patchDraft: (patch: Partial<PlayDraft>, advance?: boolean) => void;
  clearDraft: () => void;
  setStep: (n: number) => void;
  chooseType: (t: PlayType) => void;
  chooseResult: (r: PlayResult) => void;
  choosePlayer: (num: number) => void;
  chooseTarget: (num: number) => void;
  toggleTackler: (num: number) => void;
  /** Type a jersey #: use the existing player, or create a placeholder + flag. */
  enterBallNumber: (num: number) => void;
  enterTacklerNumber: (num: number) => void;
  setForm: (f: Formation) => void;
  setPers: (p: Personnel) => void;
  setHash: (h: Hash) => void;
  setPassDetail: (d: PassDetail) => void;
  setKicker: (num: number) => void;
  setHolder: (num: number) => void;
  setSnapper: (num: number) => void;
  setYards: (y: number) => void;
  setEndFromField: (endSpot: number) => void;
  nudgeDraftYards: (delta: number) => void;

  // high-level game verbs
  commit: () => void;
  undo: () => void;
  redo: () => void;
  flipPossession: () => void;
  openPenalty: () => void;
  choosePenalty: (p: Penalty) => void;
  applyPenalty: (accept: boolean, enforceOnKickoff?: boolean, foulSpot?: number) => void;
  takeTimeout: (team: TeamId) => void;
  injuryTimeout: () => void;
  applyTry: (opts: {
    tryType: "kick" | "run" | "pass";
    made: boolean;
    playerId?: number | null;
    targetId?: number | null;
    kicker?: number | null;
    holder?: number | null;
    snapper?: number | null;
  }) => void;
  resumeHalf: (team: "H" | "A") => void;
  openKickoff: (ctx?: KickoffCtx) => void;
  doKickoff: (opts: {
    kicker: number | null;
    returner?: number | null;
    result: "Touchback" | "Returned" | "Onside";
    toSpot?: number | null;
  }) => void;
  endQuarter: () => void;
  openFix: (id: string) => void;
  openCard: (num: number) => void;
  openEdit: (team: TeamId, id: string) => void;
  openAddPlayer: (team: TeamId) => void;
  /** Bulk-add a built-in roster into a team of the CURRENT game (skips numbers already present). */
  importRoster: (team: TeamId, roster: { n: number; name: string; pos: string }[]) => void;
  /** Save (or clear) a downscaled roster-sheet photo on the current game. */
  setRosterPhoto: (photo: string | null) => void;
  openQbPicker: () => void;

  // game info / season
  updateInfo: (patch: Partial<GameInfo>) => void;
  startNewGame: () => void;

  // schedule / games list
  openGame: (id: string) => Promise<void>;
  createScheduledGame: (opts: {
    profileId: string;
    /** An existing opponent profile to reuse (its roster rolls over). */
    opponentProfileId?: string;
    /** Or a brand-new opponent, saved as a profile for future rematches. */
    opponentName?: string;
    opponentAbbr?: string;
    date?: string;
    venue?: "home" | "away" | "neutral";
  }) => Promise<void>;
  removeGame: (id: string) => Promise<void>;

  // team profiles
  saveTeam: (team: TeamProfile) => Promise<void>;
  removeTeam: (id: string) => Promise<void>;

  // QB / spot / review
  setQb: (team: TeamId, num: number) => void;
  nudgeSpot: (delta: number) => void;
  /** Manually override the live situation (down / distance / ball spot). */
  setSituation: (patch: { spot?: number; down?: number; dist?: number }) => void;
  adjustPlayYards: (id: string, delta: number) => void;
  toggleReviewFlag: (id: string) => void;

  // clock
  startClock: () => void;
  stopClock: () => void;
  tick: () => void;
  setClock: (sec: number) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(game: GameState) {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveGame(game).catch((e) => console.error("autosave failed", e));
  }, 300);
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

const THEME_KEY = "fb-theme";
const FIELD_FLIP_KEY = "fb-field-flip";

/** Read the persisted field-flip preference (client only); default off. */
function readFieldFlip(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FIELD_FLIP_KEY) === "1";
  } catch {
    return false;
  }
}

/** Read the persisted theme (client only); default dark. */
function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Persist the theme and flip the document attribute the CSS variables key off. */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode — the in-memory theme still works for this session */
  }
}

// Debounced mirror to Firestore — only games that have been shared (have a
// cloudId) are pushed, and only from the device doing the scoring.
let cloudTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCloudPush(game: GameState) {
  if (typeof window === "undefined" || !game.cloudId) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    pushGame(game).catch((e) => console.warn("cloud push failed", e));
  }, 800);
}

export const useGameStore = create<StoreState>((set, get) => {
  const applyGame = (next: GameState) => {
    const situation = currentSituation(next);
    scheduleSave(next);
    scheduleCloudPush(next);
    set({ game: next, situation });
  };

  const initial = demoGame();

  return {
    ...({
      hydrated: false,
      theme: readInitialTheme(),
      fieldFlipped: readFieldFlip(),
      screen: "games",
      model: "A",
      padMode: "off",
      draft: blankDraft(),
      step: 0,
      overlay: null,
      pen: null,
      fixId: null,
      cardNum: null,
      editTeam: "H",
      editId: null,
      addTeam: "H",
      kickoffCtx: null,
      editingTime: false,
      timeInput: "",
      toast: null,
      lastStep: null,
      setupStep: 1,
      broadcast: false,
      shareUrl: null,
      sharing: false,
      teamProfiles: [],
      currentGameId: null,
      gamesRefresh: 0,
      inGame: false,
    } as UIState),

    game: initial,
    situation: currentSituation(initial),

    hydrate: async () => {
      if (get().hydrated) return;
      applyTheme(get().theme); // sync the document attribute with the stored theme
      try {
        // First run: seed the example game + a starter team profile.
        const seeded = await getMeta<boolean>("seeded");
        if (!seeded) {
          await saveGame(exampleGame());
          await saveTeamProfile(defaultTeamProfile());
          await setMeta("seeded", true);
        }
        // Tonight's real game (Columbia City @ Northridge) with both rosters.
        // v2: the user coaches Columbia City, so CC is the "your team" (HOME in
        // the data model) and Northridge is the opponent profile. If an earlier
        // build seeded this the other way round, replace that game (unless it's
        // already been scored) and fix the two profiles.
        if (!(await getMeta<boolean>("seed-ccnr-v2"))) {
          const { mine, opponent, game } = tonightSeed();
          const isCcNr = (g: GameState) => {
            const names = new Set([g.setup.home.name, g.setup.away.name]);
            return names.has(mine.name) && names.has(opponent.name);
          };
          const scored = (g: GameState) => g.plays.some((p) => p.kind !== "Control");
          const allGames = await loadAllGames();
          for (const g of allGames) if (isCcNr(g) && !scored(g)) await deleteGame(g.id);

          const existing = await loadTeamProfiles();
          const upsert = async (name: string, next: TeamProfile) => {
            const prior = existing.find((t) => t.name === name);
            await saveTeamProfile(prior ? { ...next, id: prior.id } : next);
            return prior ? prior.id : next.id;
          };
          const mineId = await upsert(mine.name, mine);
          const oppId = await upsert(opponent.name, opponent);
          await saveGame({ ...game, teamProfileId: mineId, opponentProfileId: oppId });
          await setMeta("seed-ccnr-v2", true);
        }
        // Columbia City vs Bellmont — Fri Sep 4, CC hosts. Adds Bellmont as an
        // opponent profile (roster rolls over on a rematch) and the game.
        // Unlike the block above, this NEVER overwrites the Columbia City
        // profile — it reuses whatever the user already has so their roster
        // edits (numbers/names/added players) are preserved.
        if (!(await getMeta<boolean>("seed-cc-bellmont-v1"))) {
          const opp = bellmontProfile();
          const existing = await loadTeamProfiles();
          const mine =
            existing.find((t) => t.name === "Columbia City Eagles" && t.mine !== false) ??
            (await (async () => {
              const cc = columbiaCityProfile();
              await saveTeamProfile(cc);
              return cc;
            })());
          const priorOpp = existing.find((t) => t.name === opp.name);
          const oppId = priorOpp ? priorOpp.id : opp.id;
          await saveTeamProfile(priorOpp ? { ...opp, id: oppId } : opp);

          const allGames = await loadAllGames();
          // Lenient match so we never duplicate a CC-vs-Bellmont game the user
          // may have already created and named differently ("Bellmont", "BEL"…).
          const isCcBell = (g: GameState) => {
            const sides = [g.setup.home, g.setup.away];
            const hasCC = sides.some((t) => t.name === mine.name || t.abbr.toUpperCase() === "CC");
            const hasBell = sides.some((t) => /bellmont/i.test(t.name) || t.abbr.toUpperCase().startsWith("BEL"));
            return hasCC && hasBell;
          };
          if (!allGames.some(isCcBell)) {
            const g = gameFromProfile(
              mine,
              { name: opp.name, abbr: opp.abbr, roster: opp.roster, id: oppId },
              { date: "Fri · Sep 4", venue: "home" },
            );
            await saveGame({ ...g, teamProfileId: mine.id, opponentProfileId: oppId });
          }
          await setMeta("seed-cc-bellmont-v1", true);
        }
        const teams = await loadTeamProfiles();
        const currentId = await getMeta<string>("currentGameId");
        let active = currentId ? await loadGame(currentId) : undefined;
        if (!active) active = await loadLatestGame();
        if (active) {
          applyGame(normalizeGame(active));
          set({ currentGameId: active.id });
        }
        set({ teamProfiles: teams });
      } catch (e) {
        console.error("hydrate failed; using in-memory game", e);
      }
      set({ hydrated: true });
      // Warm up cloud auth in the background so sharing is instant later.
      ensureAuth().catch(() => undefined);
    },

    dispatch: (action) => {
      const next = gameReducer(get().game, action);
      applyGame(next);
    },

    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },
    toggleTheme: () => {
      const theme: Theme = get().theme === "dark" ? "light" : "dark";
      applyTheme(theme);
      set({ theme });
    },
    toggleFieldFlip: () => {
      const fieldFlipped = !get().fieldFlipped;
      try {
        localStorage.setItem(FIELD_FLIP_KEY, fieldFlipped ? "1" : "0");
      } catch {
        /* private mode — still flips for this session */
      }
      set({ fieldFlipped });
      get().flash(fieldFlipped ? "Field flipped" : "Field back to default", true);
    },
    openFeedback: () => set({ overlay: "feedback" }),
    setScreen: (screen) => set({ screen, overlay: null, inGame: GAME_SCREENS.includes(screen) }),
    setModel: (model) => set({ model }),
    setOverlay: (overlay) => set({ overlay, pen: overlay === "pen" ? null : get().pen }),
    setSetupStep: (setupStep) => set({ setupStep }),
    togglePad: () => set((s) => ({ padMode: s.padMode === "off" ? "def" : "off" })),
    setBroadcast: (broadcast) => set({ broadcast }),
    shareCurrentGame: async () => {
      const s = get();
      // If already shared, just return the existing link.
      let cloudId = s.game.cloudId;
      if (cloudId && s.shareUrl) return s.shareUrl;
      set({ sharing: true });
      try {
        const uid = await ensureAuth();
        if (!uid) {
          s.flash("Can't reach the cloud — check your connection");
          return null;
        }
        if (!cloudId) {
          cloudId = newCloudId();
          s.dispatch({ type: "SET_CLOUD_ID", cloudId });
        }
        await pushGame(get().game);
        const url = `${window.location.origin}${window.location.pathname}?watch=${cloudId}`;
        set({ shareUrl: url });
        s.flash("Live link ready — share it with the broadcaster");
        return url;
      } catch (e) {
        console.error("share failed", e);
        s.flash("Sharing failed — see console");
        return null;
      } finally {
        set({ sharing: false });
      }
    },

    flash: (msg, ephemeral) => {
      // The flash text narrates the step just completed — keep the latest as a
      // durable breadcrumb (toast clears after a few seconds; lastStep persists).
      set(ephemeral ? { toast: msg } : { toast: msg, lastStep: msg });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => set({ toast: null }), 3200);
    },

    patchDraft: (patch, advance) =>
      set((s) => ({
        draft: { ...s.draft, ...patch },
        step: advance ? Math.min(s.step + 1, 5) : s.step,
      })),
    clearDraft: () => set((s) => ({ draft: blankDraft(s.draft.hash), step: 0 })),
    setStep: (step) => set({ step: Math.min(Math.max(step, 0), 5) }),

    chooseType: (t) => {
      const s = get();
      // On a pass, pre-fill the passer with the current QB so the first roster
      // tap sets the intended receiver. Kicks pre-fill nothing.
      const patch: Partial<PlayDraft> = { type: t, result: null };
      if (t === "Pass" && s.draft.playerId == null) {
        patch.playerId = s.game.qb[s.situation.poss] ?? null;
      }
      s.patchDraft(patch, true);
    },
    chooseResult: (r) => get().patchDraft({ result: r }),
    choosePlayer: (num) => {
      const d = get().draft;
      // On a pass, a second distinct tap sets the target; otherwise the carrier.
      if (d.type === "Pass" && d.playerId != null && d.playerId !== num) {
        get().patchDraft({ targetId: num }, true);
      } else {
        get().patchDraft({ playerId: num }, true);
      }
    },
    chooseTarget: (num) => get().patchDraft({ targetId: num }, true),
    toggleTackler: (num) => {
      const t = get().draft.tacklers ?? [];
      get().patchDraft({
        tacklers: t.includes(num) ? t.filter((x) => x !== num) : [...t, num].slice(-2),
      });
    },
    enterBallNumber: (num) => {
      const s = get();
      const team = s.situation.poss;
      const roster = team === "H" ? s.game.setup.home.roster : s.game.setup.away.roster;
      if (!roster.some((p) => p.num === num)) {
        s.dispatch({ type: "ADD_PLAYER", team, player: { num, name: `#${num} — add name`, pos: "—" } });
        s.patchDraft({ flag: true });
        s.flash(`New #${num} added — flagged; name him at a break`);
      }
      s.choosePlayer(num);
    },
    enterTacklerNumber: (num) => {
      const s = get();
      const team = s.situation.poss === "H" ? "A" : "H"; // defense
      const roster = team === "H" ? s.game.setup.home.roster : s.game.setup.away.roster;
      if (!roster.some((p) => p.num === num)) {
        s.dispatch({ type: "ADD_PLAYER", team, player: { num, name: `#${num} — add name`, pos: "—" } });
        s.patchDraft({ flag: true });
        s.flash(`New defender #${num} added — flagged; name him at a break`);
      }
      s.toggleTackler(num);
    },
    setForm: (f) => get().patchDraft({ form: f }),
    setPers: (p) => get().patchDraft({ pers: p }),
    setHash: (h) => get().patchDraft({ hash: h }),
    setPassDetail: (d) =>
      get().patchDraft({ passDetail: get().draft.passDetail === d ? null : d }),
    setKicker: (num) => get().patchDraft({ kicker: num }),
    setHolder: (num) =>
      get().patchDraft({ holder: get().draft.holder === num ? null : num }),
    setSnapper: (num) =>
      get().patchDraft({ snapper: get().draft.snapper === num ? null : num }),
    setYards: (y) => {
      // Set yards AND the derived end spot so the field/box stay consistent
      // whether yards came from a field tap or a direct entry.
      const s = get();
      const dir = s.situation.poss === "H" ? 1 : -1;
      const end = Math.max(0, Math.min(100, s.situation.spot + dir * y));
      s.patchDraft({ yards: y, end }, true);
    },
    setEndFromField: (endSpot) => {
      const s = get();
      const dir = s.situation.poss === "H" ? 1 : -1;
      const yards = Math.round((endSpot - s.situation.spot) * dir);
      s.patchDraft({ end: endSpot, yards });
    },
    nudgeDraftYards: (delta) => {
      const s = get();
      const cur = s.draft.yards ?? 0;
      const yards = cur + delta;
      const dir = s.situation.poss === "H" ? 1 : -1;
      const end = Math.max(0, Math.min(100, s.situation.spot + dir * yards));
      s.patchDraft({ yards, end });
    },

    commit: () => {
      const s = get();
      if (!s.draft.type) return s.flash("Pick a play type first");
      if (s.draft.type === "FG" && s.draft.kicker == null) {
        return s.flash("Pick a kicker for the field goal");
      }
      const clock = clockStr(s.game.clockSec);
      s.dispatch({ type: "COMMIT_PLAY", draft: s.draft, clock });
      // Keep the current hash for the next play (the ball stays on a hash).
      set({ draft: blankDraft(s.draft.hash), step: 0 });
      s.flash("Play logged");
    },
    undo: () => {
      const s = get();
      if (!s.game.plays.length) return s.flash("Nothing to undo");
      s.dispatch({ type: "UNDO" });
      s.flash("Undone");
    },
    redo: () => {
      const s = get();
      if (!s.game.redo.length) return s.flash("Nothing to redo");
      s.dispatch({ type: "REDO" });
      s.flash("Redone");
    },
    flipPossession: () => {
      const s = get();
      const control: ControlOp = { op: "flip", label: "Possession changed" };
      s.dispatch({ type: "CONTROL", control });
      set({ draft: blankDraft(), step: 0 });
      s.flash("Possession changed");
    },
    openPenalty: () => set({ overlay: "pen", pen: null }),
    choosePenalty: (p) => set({ pen: p }),
    applyPenalty: (accept, enforceOnKickoff, foulSpot) => {
      const s = get();
      if (!accept || !s.pen) {
        set({ overlay: null, pen: null });
        return s.flash("Penalty declined — play stands");
      }
      s.dispatch({
        type: "APPLY_PENALTY",
        penalty: s.pen,
        clock: clockStr(s.game.clockSec),
        enforceOnKickoff,
        foulSpot,
      });
      set({ overlay: null, pen: null });
      s.flash(
        enforceOnKickoff ? `${s.pen.name} — enforced on kickoff` : `${s.pen.name} accepted`,
      );
    },
    takeTimeout: (team) => {
      const s = get();
      if ((s.game.timeouts[team] ?? 0) <= 0) {
        return s.flash(`${team === "H" ? s.game.setup.home.abbr : s.game.setup.away.abbr} has no timeouts left`);
      }
      s.dispatch({ type: "TAKE_TIMEOUT", team });
      set({ overlay: null });
      const left = Math.max(0, (s.game.timeouts[team] ?? 3) - 1);
      s.flash(`Timeout ${team === "H" ? s.game.setup.home.abbr : s.game.setup.away.abbr} — ${left} left`);
    },
    injuryTimeout: () => {
      const s = get();
      s.dispatch({ type: "INJURY_TIMEOUT" });
      set({ overlay: null });
      s.flash("Injury timeout — clock stopped, no charge");
    },
    applyTry: (opts) => {
      const s = get();
      if (opts.tryType === "kick" && opts.kicker == null) {
        return s.flash("Pick a kicker for the PAT");
      }
      s.dispatch({ type: "APPLY_TRY", ...opts, clock: clockStr(s.game.clockSec) });
      const pts = opts.made ? (opts.tryType === "kick" ? 1 : 2) : 0;
      const kind = opts.tryType === "kick" ? "PAT" : "2-point";
      s.flash(opts.made ? `${kind} good — +${pts}` : `${kind} no good`);
    },
    resumeHalf: (team) => {
      // Pick who receives → the second-half kickoff (with kicker) is captured
      // in the kickoff overlay, which also resets the quarter/clock/timeouts.
      set({ draft: blankDraft(), step: 0 });
      get().openKickoff({ receiving: team, qtr: 3, resetClock: true, resetTimeouts: true });
    },
    openKickoff: (ctx) =>
      set({ overlay: "kickoff", kickoffCtx: ctx ?? { receiving: null } }),
    doKickoff: (opts) => {
      const s = get();
      const ctx = s.kickoffCtx;
      const receiving = ctx?.receiving;
      if (!receiving) return s.flash("Pick the receiving team first");
      s.dispatch({
        type: "KICKOFF",
        receiving,
        kicker: opts.kicker,
        returner: opts.returner,
        result: opts.result,
        toSpot: opts.toSpot,
        qtr: ctx?.qtr,
        resetClock: ctx?.resetClock,
      });
      if (ctx?.resetTimeouts) s.dispatch({ type: "RESET_TIMEOUTS" });
      set({ overlay: null, kickoffCtx: null });
      s.flash(ctx?.qtr === 3 ? "Second half is live" : "Kickoff logged");
    },
    endQuarter: () => {
      const s = get();
      if (s.game.qtr === 2) {
        set({ overlay: "half" });
        return;
      }
      if (s.game.qtr >= 4) {
        s.dispatch({ type: "SET_RUNNING", running: false });
        return s.flash("End of regulation");
      }
      s.dispatch({ type: "END_QUARTER" });
      s.flash(`End of Q${s.game.qtr} — teams change ends`);
    },
    openFix: (id) => set({ overlay: "fix", fixId: id }),
    openCard: (num) => set({ overlay: "card", cardNum: num }),
    openEdit: (team, id) => set({ overlay: "edit", editTeam: team, editId: id }),
    openAddPlayer: (team) => set({ overlay: "addPlayer", addTeam: team }),
    importRoster: (team, roster) => {
      const s = get();
      const key = team === "H" ? "home" : "away";
      const existing = new Set(s.game.setup[key].roster.map((p) => p.num));
      let added = 0;
      for (const r of roster) {
        if (existing.has(r.n)) continue;
        s.dispatch({ type: "ADD_PLAYER", team, player: { num: r.n, name: r.name, pos: r.pos } });
        existing.add(r.n);
        added += 1;
      }
      s.flash(added ? `Imported ${added} player${added === 1 ? "" : "s"}` : "Those players are already on the roster");
    },
    setRosterPhoto: (photo) => get().dispatch({ type: "SET_ROSTER_PHOTO", photo }),
    openQbPicker: () => set({ overlay: "qb" }),

    updateInfo: (patch) => get().dispatch({ type: "UPDATE_INFO", patch }),
    startNewGame: () => {
      const fresh = createNewGame();
      applyGame(fresh);
      saveGame(fresh).catch(() => undefined);
      setMeta("currentGameId", fresh.id).catch(() => undefined);
      set({ screen: "setup", inGame: true, draft: blankDraft(), step: 0, overlay: null, currentGameId: fresh.id, shareUrl: null, gamesRefresh: get().gamesRefresh + 1 });
      get().flash("New game started — set up teams & rosters");
    },

    openGame: async (id) => {
      const s = get();
      const g = await loadGame(id);
      if (!g) return s.flash("That game could not be loaded");
      applyGame(normalizeGame(g));
      await setMeta("currentGameId", id);
      set({ currentGameId: id, screen: "live", inGame: true, draft: blankDraft(), step: 0, overlay: null, shareUrl: null });
    },
    createScheduledGame: async (opts) => {
      const s = get();
      const profile = s.teamProfiles.find((t) => t.id === opts.profileId);
      if (!profile) return s.flash("Pick your team first");

      // Resolve the opponent: an existing profile (roster rolls over) or a new
      // one we save so it's reusable next time these teams meet.
      let opp = opts.opponentProfileId
        ? s.teamProfiles.find((t) => t.id === opts.opponentProfileId)
        : undefined;
      if (!opp) {
        const name = opts.opponentName?.trim();
        if (!name && !opts.opponentAbbr) return s.flash("Name the opponent");
        opp = {
          ...blankTeamProfile(name || "Opponent", opts.opponentAbbr || (name || "OPP").slice(0, 3).toUpperCase(), false),
        };
        await saveTeamProfile(opp);
        set({ teamProfiles: [opp, ...get().teamProfiles] });
      }

      // Roll over the freshest roster we have for this opponent: the away roster
      // of the most recent prior meeting (captures players added mid-game),
      // else the opponent profile's own roster.
      const games = await loadAllGames();
      const prior = games
        .filter((g) => g.opponentProfileId === opp!.id)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      const roster = prior && prior.setup.away.roster.length ? prior.setup.away.roster : opp.roster;

      const g = gameFromProfile(
        profile,
        { name: opp.name, abbr: opp.abbr, roster, id: opp.id },
        { date: opts.date, venue: opts.venue },
      );
      await saveGame(g);
      set({ gamesRefresh: get().gamesRefresh + 1 });
      s.flash(`Added ${opts.date ? opts.date + " · " : ""}vs ${opp.abbr}${roster.length ? ` · ${roster.length} on roster` : ""}`);
    },
    removeGame: async (id) => {
      const s = get();
      await deleteGame(id);
      // If we deleted the active game, fall back to the most recent one.
      if (s.currentGameId === id) {
        const latest = await loadLatestGame();
        if (latest) {
          applyGame(normalizeGame(latest));
          await setMeta("currentGameId", latest.id);
          set({ currentGameId: latest.id });
        }
      }
      set({ gamesRefresh: s.gamesRefresh + 1 });
      s.flash("Game removed");
    },

    saveTeam: async (team) => {
      const s = get();
      const next = { ...team, updatedAt: Date.now() };
      await saveTeamProfile(next);
      const exists = s.teamProfiles.some((t) => t.id === next.id);
      set({
        teamProfiles: exists
          ? s.teamProfiles.map((t) => (t.id === next.id ? next : t))
          : [next, ...s.teamProfiles],
      });
    },
    removeTeam: async (id) => {
      const s = get();
      await dbDeleteTeamProfile(id);
      set({ teamProfiles: s.teamProfiles.filter((t) => t.id !== id) });
    },
    setQb: (team, num) => {
      const s = get();
      s.dispatch({ type: "SET_QB", team, num });
      // If we're mid-draft on a pass with the old QB as passer, update it too.
      if (s.draft.type === "Pass" && s.draft.playerId === s.game.qb[team]) {
        s.patchDraft({ playerId: num });
      }
      set({ overlay: null });
      s.flash(`QB set to #${num}`);
    },
    nudgeSpot: (delta) => {
      const s = get();
      s.dispatch({ type: "NUDGE_SPOT", delta });
    },
    setSituation: (patch) => {
      const s = get();
      s.dispatch({
        type: "CONTROL",
        control: { op: "setSituation", spot: patch.spot, down: patch.down, dist: patch.dist, label: "Situation corrected" },
      });
      s.flash("Situation updated");
    },
    adjustPlayYards: (id, delta) => {
      const s = get();
      s.dispatch({ type: "ADJUST_YARDS", id, delta });
      s.flash("Yardage corrected — flagged as edited");
    },
    toggleReviewFlag: (id) => {
      const s = get();
      s.dispatch({ type: "TOGGLE_FLAG", id });
    },

    startClock: () => {
      get().dispatch({ type: "SET_RUNNING", running: true });
      set({ editingTime: false });
    },
    stopClock: () => get().dispatch({ type: "SET_RUNNING", running: false }),
    tick: () => {
      const s = get();
      if (!s.game.running || s.game.clockSec <= 0) return;
      if (s.game.clockSec === 1 && s.game.qtr === 2) {
        s.dispatch({ type: "SET_CLOCK", sec: 0 });
        s.dispatch({ type: "SET_RUNNING", running: false });
        set({ overlay: "half" });
        return;
      }
      s.dispatch({ type: "TICK" });
    },
    setClock: (sec) => get().dispatch({ type: "SET_CLOCK", sec }),
  };
});

function clockStr(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}
