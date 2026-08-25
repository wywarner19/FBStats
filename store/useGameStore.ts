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
import type { GameInfo } from "@/lib/types";
import { demoGame, newGame as createNewGame, normalizeGame } from "@/lib/engine/factory";
import { loadLatestGame, saveGame } from "@/lib/db/dexie";
import { ensureAuth, newCloudId, pushGame } from "@/lib/sync/gameSync";

export type Screen =
  | "brief"
  | "setup"
  | "roster"
  | "live"
  | "box"
  | "chart"
  | "analytics"
  | "season"
  | "report";

export type Overlay =
  | "pen"
  | "half"
  | "fix"
  | "card"
  | "edit"
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
  kickoffCtx: KickoffCtx | null;
  editingTime: boolean;
  timeInput: string;
  toast: string | null;
  setupStep: number;
  scanned: boolean;
  broadcast: boolean;
  shareUrl: string | null;
  sharing: boolean;
}

interface StoreState extends UIState {
  game: GameState;
  situation: Situation;

  // lifecycle
  hydrate: () => Promise<void>;

  // pure-reducer dispatch (autosaves)
  dispatch: (action: GameAction) => void;

  // UI setters
  setScreen: (s: Screen) => void;
  setModel: (m: EntryModel) => void;
  setOverlay: (o: Overlay) => void;
  setSetupStep: (n: number) => void;
  setScanned: (b: boolean) => void;
  togglePad: () => void;
  setBroadcast: (b: boolean) => void;
  shareCurrentGame: () => Promise<string | null>;
  flash: (msg: string) => void;

  // draft editing
  patchDraft: (patch: Partial<PlayDraft>, advance?: boolean) => void;
  clearDraft: () => void;
  setStep: (n: number) => void;
  chooseType: (t: PlayType) => void;
  chooseResult: (r: PlayResult) => void;
  choosePlayer: (num: number) => void;
  chooseTarget: (num: number) => void;
  toggleTackler: (num: number) => void;
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
  openQbPicker: () => void;

  // game info / season
  updateInfo: (patch: Partial<GameInfo>) => void;
  startNewGame: () => void;

  // QB / spot / review
  setQb: (team: TeamId, num: number) => void;
  nudgeSpot: (delta: number) => void;
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
      screen: "brief",
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
      kickoffCtx: null,
      editingTime: false,
      timeInput: "",
      toast: null,
      setupStep: 1,
      scanned: false,
      broadcast: false,
      shareUrl: null,
      sharing: false,
    } as UIState),

    game: initial,
    situation: currentSituation(initial),

    hydrate: async () => {
      if (get().hydrated) return;
      try {
        const saved = await loadLatestGame();
        if (saved) {
          applyGame(normalizeGame(saved));
        } else {
          await saveGame(initial);
        }
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

    setScreen: (screen) => set({ screen, overlay: null }),
    setModel: (model) => set({ model }),
    setOverlay: (overlay) => set({ overlay, pen: overlay === "pen" ? null : get().pen }),
    setSetupStep: (setupStep) => set({ setupStep }),
    setScanned: (scanned) => set({ scanned }),
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

    flash: (msg) => {
      set({ toast: msg });
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
    setYards: (y) => get().patchDraft({ yards: y }, true),
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
    openQbPicker: () => set({ overlay: "qb" }),

    updateInfo: (patch) => get().dispatch({ type: "UPDATE_INFO", patch }),
    startNewGame: () => {
      const fresh = createNewGame();
      applyGame(fresh);
      set({ screen: "setup", draft: blankDraft(), step: 0, overlay: null });
      get().flash("New game started — set up teams & rosters");
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
