# FBStats Live

Offline-first, high-speed **high school football stat tracker**, built from the
Claude Design prototype (`FBStats Live.dc.html`). Optimized for a single
statistician on a landscape iPad who cannot look down for long.

## Stack

- **Next.js 14** (App Router, TypeScript) — static client app
- **Tailwind CSS** — design tokens lifted directly from the prototype
- **Zustand** — thin store over a pure game reducer
- **Dexie (IndexedDB)** — offline-first persistence, autosaves every change
- **jsPDF** — printable box-score PDF
- **Vitest** — engine + export unit tests
- **lucide-react** — icons (available for future UI)

## Run

```bash
npm install
npm run dev      # http://localhost:3100
npm test         # engine + export tests
npm run build    # production build
```

> This machine keeps Node at `~/.local/node` (off PATH). Prefix commands with
> `export PATH="$HOME/.local/node/bin:$PATH"` or use the absolute `npm` path.

## Architecture

```
lib/
  types.ts              Strict domain interfaces (Player, PlayEvent, GameState…)
  engine/
    rules.ts            PURE rule engine: applyPlay / deriveSituation / penalties
    reducer.ts          Immutable GameState reducer + actions (undo/redo/edit)
    boxscore.ts         Per-player aggregates + drive grouping
    factory.ts          newGame() / demoGame() seed
    constants.ts        Play types, results, penalties, seed rosters
  export/               MaxPreps CSV · Hudl play-by-play CSV · PDF box score
  db/dexie.ts           Offline-first storage
  format.ts             Play-by-play + situation label helpers
store/useGameStore.ts   Zustand: reducer dispatch + UI state + Dexie autosave
components/
  hud/                  Scoreboard, field strip, entry models A/B/C, commit bar
  analytics/            Box score, drive chart, play log, report + exports
  roster/               Editable rosters, photo-import review
  overlays/             Penalty, halftime, fix-play, player card
  shell/ setup/ brief/  Header nav + setup + design brief
```

### The engine is the heart

The **live situation is a pure fold of the immutable play log**:

```
situation = plays.reduce(applyPlay, anchor)
```

Nothing about down/distance/score/possession is ever stored mutably — it is
recomputed from the event list. This makes the required behaviours fall out for
free and stay deterministic:

- **Undo / redo** — pop/push the play stack; the situation re-derives.
- **Edit a logged play** — replace it in the array; every later play, the box
  score, and the drive chart recompute instantly.
- **Penalties** re-resolve from the foul definition against the folded spot, so
  correcting an earlier play still re-enforces later penalties correctly.

Manual corrections that aren't plays (halftime resume, possession flip) are
recorded as `Control` events in the same timeline, so they undo/redo too.

Automatic rules covered: down & distance, first downs, **goal-to-go**,
touchdowns (6 pts) + **PAT / 2-point tries**, safeties, punt **touchbacks**,
field goals, turnovers (INT / fumble) and **turnover on downs**, symmetric for
both directions of possession. See `__tests__/engine.test.ts`.

A touchdown scores 6 and sets `situation.tryPending`; the try prompt appears
automatically (PAT kick +1 / 2-point +2 / failed 0), the points post as a
separate `Try` play, then the other team receives the kickoff. Because it is all
in the folded play log, undoing the PAT re-opens the try prompt deterministically.

### Field model

One absolute axis `spot ∈ [0, 100]`: `0` = HOME's goal line, `100` = AWAY's.
HOME attacks 100 (`direction +1`), AWAY attacks 0 (`-1`), so every rule branch is
symmetric.

### Responsive

Landscape iPad is the primary target (two-column HUD). Below the `md`
breakpoint every screen collapses to a **single scrolling column** with the
`COMMIT PLAY` bar pinned to the bottom, so one-hand entry still works on a
phone. Verified at 375px with no horizontal overflow.

### Rosters

Fully editable mid-game: tap a player's name to open the editor (number, name,
position, **two-way athlete toggle**, remove). Unknown jerseys commit against a
`?` placeholder and back-fill when named. All roster edits flow through the
reducer and autosave to IndexedDB. Photo-import is a review-before-add stub.

### Three entry models (switch live)

- **A — Field-first**: everything visible; tap the field, pick carrier + result.
- **B — Guided steps**: a six-step rail auto-advances type → ball → look →
  yards → result → defense.
- **C — Two-thumb**: play type/result under the left thumb, jersey pad under the
  right, field in the middle.

### Exports

`lib/export/` serializes a completed game to:

- **MaxPreps** per-player stat CSV (`toMaxPrepsCsv`)
- **Hudl** play-by-play CSV (`toHudlCsv`)
- **PDF** box score for the coaches' meeting (`buildBoxScorePdf`)

All run from the local IndexedDB copy — no signal required.

## Testing on a real iPad

The dev server binds to the LAN, so any device on the **same Wi-Fi** can open it
— no build or deploy needed:

1. Start the server on the Mac: `npm run dev` (serves on port 3100).
2. On the iPad's Safari, go to **`http://<mac-lan-ip>:3100`**
   (e.g. `http://192.168.1.108:3100` — find yours with `ipconfig getifaddr en0`).
3. If it doesn't load, allow incoming connections: macOS *System Settings →
   Network → Firewall* (turn off, or allow `node`), and make sure both devices
   are on the same network (not a "guest" SSID).
4. For a full-screen, chrome-free experience: Safari *Share → Add to Home
   Screen*. The app is flagged `apple-mobile-web-app-capable`, so it launches
   like a native app in landscape. Once loaded it runs offline (state lives in
   IndexedDB); it only needs the Mac reachable to load the page itself.

To try the **PAT / 2-point** flow: on the entry screen tap a play into the
opponent's end zone (or set enough yards to cross the goal) and *Commit* — the
try prompt appears; pick PAT good / 2-pt good / no good.

## Play-entry detail

Every play carries an always-visible context bar: **current QB** (tap to change;
pre-fills the passer, follows possession), the **hash** the play is on (L/M/R),
and a **yard-by-yard ball-spot nudge** (±1) for correcting the live LOS.

- **Passing:** the intended receiver is recorded whether or not the pass is
  caught (it earns a *target* in the box score even on incompletions), plus an
  optional detail tag — Dropped / Overthrown / Underthrown / Thrown away /
  Deflected.
- **Kicks (PAT & FG):** kicker is **required**; holder and snapper optional. A
  PAT/2-pt try can have a **penalty flagged mid-try** without losing the try.
- **Review queue:** a play missing critical info (a tackle with no tackler, a
  pass with no intended receiver) or edited after commit is auto-flagged; you
  can also flag any play manually. A header counter ("⚑ N to review") and a
  "Needs review" filter on the play log surface them so you can finish them
  during a timeout or between quarters. Correcting a committed play's yardage
  yard-by-yard marks it **edited** so the change is visible on review.

## Game management

- **Penalties:** the full NFHS penalty set (adopted by the IHSAA). Enforcement
  follows NFHS — only roughing fouls and defensive PI are automatic first downs
  (not face mask / personal foul / unsportsmanlike, unlike NFL). Accept or
  decline every foul. A foul during a try can be **enforced on the try or the
  ensuing kickoff**. Fouls are enforced from the previous spot by default;
  **spot-of-foul** enforcement is required for the fouls NFHS marks that way
  (intentional grounding, illegal forward pass, illegal touching) and optional
  for any other foul — set the foul spot with the ±1/±5 yard nudges. Distance
  recomputes from the line to gain, so penalty yardage that reaches the sticks
  awards a first down.
- **Timeouts:** 3 per team per half (dots on the scoreboard), reset at halftime,
  plus an uncharged **injury / official's timeout**.
- **Kickoffs:** captured with the **kicker (required)**, receiving team, and
  result (touchback → own 20 / returned to a yard line + returner / onside). The
  second-half kickoff is prompted from the halftime flow; a `KICK` button covers
  the opening kickoff and post-score kicks.
- **Quarters:** `END QTR` advances the period, resets the clock, and logs the
  change of ends (possession / down / distance / yard line carry over);
  halftime at the end of Q2.
- **2-point / PAT:** a try scores separately; per NFHS its yardage is **not**
  counted in rushing/receiving totals — it's tracked as a conversion.

## Analytics & season

- **Analytics screen:** time of possession (per-drive, from logged clock times),
  a scoring summary (every score with the running score), and situational splits
  — 3rd/4th-down conversion %, red-zone TD %, explosive plays, run/pass balance.
- **Tendencies:** run/pass split, average yards, and conversion % broken down
  **by down, distance band (short/medium/long), and hash**, plus a 3rd-down-by-
  distance cut — with an NGT/RVT toggle to scout either team. (Formation is
  intentionally omitted.)
- **Game info:** date, location, weather, surface, officials, attendance —
  edited on Setup, shown on the report header.
- **Season:** the Season screen aggregates one program's stats across every
  stored game (`+ New game` starts another), with a W–L record and per-player
  season totals. Stats are **team-attributed** — a jersey number that exists on
  both teams is credited correctly (offense to the team on possession, tackles
  to the team on defense), which the single-game box score does not disambiguate.

## Notes / extension points

- Stats are tracked for the possessing offense + tacklers; full two-side
  offensive stats and special-teams play types are noted as next steps.
- Two-way athletes are supported via a per-player `twoWay` flag (edit a player
  from the Rosters screen) without duplicate roster rows.
- 2-point conversions don't yet credit the scorer as a rushing/receiving stat;
  the try records the outcome and points only.
