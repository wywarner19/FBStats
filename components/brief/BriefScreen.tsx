"use client";

import { useGameStore } from "@/store/useGameStore";
import { CARD, LABEL } from "@/components/ui";

const PAIN_ROWS: [string, string][] = [
  [
    "Stuck on penalties",
    "The flag button is always in the header. Pick the foul, see the exact resulting down/distance/spot, then accept or decline. Anything weird — offsetting, double flags — logs as a no-play with a note so you are never trapped.",
  ],
  [
    "Frozen after halftime",
    "Halftime is a real state, not a clock that ran out. It asks one question — who receives — then hands you 3rd quarter, 1st & 10, clock reset, possession correct.",
  ],
  [
    "Roster changes mid-game",
    'Rosters stay editable during the game, and an unknown jersey can be committed as a placeholder from the "?" tile, then named later without losing the stat.',
  ],
  [
    "Roster entry is tedious",
    "Photograph the program or roster sheet; parsed rows come back for review with low-confidence lines flagged before anything is added.",
  ],
];

const MODELS: { key: string; name: string; desc: string; taps: string }[] = [
  {
    key: "A",
    name: "Field-first, everything visible",
    desc: "Tap where the play ended, then carrier and result from an always-on grid. Nothing hides; best once you know the roster cold.",
    taps: "3",
  },
  {
    key: "B",
    name: "Guided steps",
    desc: "A six-step rail walks type → ball → look → yards → result → defense, auto-advancing. Best for a parent volunteer or a new spotter.",
    taps: "4–6",
  },
  {
    key: "C",
    name: "Two-thumb landscape",
    desc: "Play type and result under the left thumb, jersey pad under the right, field in the middle. Fastest for a full-detail chart at speed.",
    taps: "3",
  },
];

export function BriefScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setModel = useGameStore((s) => s.setModel);

  const openModel = (key: string) => {
    setModel(key as "A" | "B" | "C");
    setScreen("live");
  };

  return (
    <div className="flex-1 overflow-auto px-10 pt-8 pb-16">
      <div className="max-w-[1080px] flex flex-col gap-[26px]">
        <div>
          <div className={`${LABEL} text-[11px] mb-2.5`}>DESIGN BRIEF</div>
          <h1 className="m-0 mb-2.5 font-cond font-bold text-[46px] leading-[1.02] tracking-[-.01em]">
            Press-box play entry for 11-man high school football
          </h1>
          <p className="m-0 max-w-[760px] text-[16px] leading-[1.55] text-slate">
            Full play-by-play depth (personnel, formation, hash, result,
            yardage, tacklers) with a field-first entry metaphor, sized for a
            single statistician on an iPad who cannot look down for long.
          </p>
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {[
            ["ASSUMPTION", "One person, one hand free", "Every commit path is reachable without a tap-target smaller than 48px. No modal blocks the field.", "text-turf"],
            ["ASSUMPTION", "The game never waits", "A play can be committed with type + carrier + yards alone. Everything else is optional enrichment you can backfill.", "text-turf"],
            ["CONSTRAINT", "Nothing is ever a dead end", "Penalties, halftime and roster gaps each have an explicit exit — the three places the old apps trap you.", "text-flag"],
          ].map(([tag, title, body, color], i) => (
            <div key={i} className={`${CARD} p-[18px]`}>
              <div className={`font-semi font-semibold text-[11px] leading-none tracking-[.16em] mb-2.5 ${color}`}>
                {tag}
              </div>
              <div className="font-semibold text-[17px] leading-[1.25] mb-1.5">{title}</div>
              <p className="m-0 text-[14px] leading-[1.5] text-slate-2">{body}</p>
            </div>
          ))}
        </div>

        <div>
          <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>
            YOUR PAIN POINTS → WHAT I DID
          </div>
          <div className="flex flex-col gap-px bg-edge border border-edge rounded-xl overflow-hidden">
            {PAIN_ROWS.map(([pain, fix]) => (
              <div key={pain} className="flex gap-5 bg-panel p-4 px-[18px]">
                <div className="flex-none w-[220px] font-semibold text-[15px] leading-[1.3] text-flag">
                  {pain}
                </div>
                <div className="flex-1 text-[14px] leading-[1.5] text-slate">{fix}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>
            THREE ENTRY MODELS — SWITCH LIVE ON THE ENTRY SCREEN
          </div>
          <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            {MODELS.map((m) => (
              <div key={m.key} className={`${CARD} p-[18px] flex flex-col gap-2.5`}>
                <div className="flex items-center gap-2">
                  <span className="w-[26px] h-[26px] rounded-[7px] bg-panel-4 border border-edge-2 grid place-items-center font-cond font-bold text-[14px] text-turf">
                    {m.key}
                  </span>
                  <span className="font-semibold text-[17px] leading-none">{m.name}</span>
                </div>
                <p className="m-0 text-[14px] leading-[1.5] text-slate-2 flex-1">{m.desc}</p>
                <div className="font-medium text-[12px] leading-[1.4] text-dim">
                  Taps per routine play:{" "}
                  <span className="text-turf font-bold">{m.taps}</span>
                </div>
                <button
                  onClick={() => openModel(m.key)}
                  className="mt-0.5 min-h-[44px] bg-panel-4 border border-edge-2 rounded-[9px] text-cloud font-semibold text-[13px] tracking-[.04em] cursor-pointer hover:border-turf"
                >
                  Open {m.key} on the entry screen
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
