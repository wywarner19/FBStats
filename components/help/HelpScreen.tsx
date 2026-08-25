"use client";

import { CARD, LABEL } from "@/components/ui";

const MODELS: { key: string; name: string; desc: string; taps: string }[] = [
  { key: "A", name: "Field-first, everything visible", desc: "Tap where the play ended, then carrier and result from an always-on grid. Best once you know the roster cold.", taps: "3" },
  { key: "B", name: "Guided steps", desc: "A six-step rail walks type → ball → look → yards → result → defense, auto-advancing. Best for a new spotter.", taps: "4–6" },
  { key: "C", name: "Two-thumb landscape", desc: "Play type & result under the left thumb, jersey pad under the right, field in the middle. Fastest at speed.", taps: "3" },
];

const TIPS: [string, string][] = [
  ["Start from Games", "Add your schedule under Games, tap a game to open it, then score on the Play entry screen."],
  ["Your teams save once", "Enter each of your teams under Teams — their rosters copy into every game you schedule."],
  ["Never a dead end", "The FLAG button handles penalties (accept/decline, spot-of-foul), and halftime/kickoffs/timeouts each have an explicit control."],
  ["Missing info is flagged", "A play with no tackler or intended receiver is auto-flagged for review — catch them from the play log during a break."],
  ["Share live", "Open the Broadcast view and tap Share live to give a radio broadcaster or your phone a read-only live link."],
];

export function HelpScreen() {
  return (
    <div className="flex-1 overflow-auto px-10 pt-8 pb-16">
      <div className="max-w-[1000px] flex flex-col gap-[26px]">
        <div>
          <div className={`${LABEL} text-[11px] tracking-[.2em] mb-2.5`}>HELP</div>
          <h1 className="m-0 mb-2.5 font-cond font-bold text-[40px] leading-[1.05] tracking-[-.01em]">
            Press-box play entry for 11-man high school football
          </h1>
          <p className="m-0 max-w-[760px] text-[16px] leading-[1.55] text-slate">
            Full play-by-play depth (personnel, formation, hash, result, yardage, tacklers) with a
            field-first entry metaphor, sized for a single statistician on an iPad who cannot look
            down for long. Offline-first — it works with no signal and autosaves as you go.
          </p>
        </div>

        <div>
          <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>THREE ENTRY MODELS — SWITCH LIVE ON THE ENTRY SCREEN</div>
          <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            {MODELS.map((m) => (
              <div key={m.key} className={`${CARD} p-[18px] flex flex-col gap-2.5`}>
                <div className="flex items-center gap-2">
                  <span className="w-[26px] h-[26px] rounded-[7px] bg-panel-4 border border-edge-2 grid place-items-center font-cond font-bold text-[14px] text-turf">{m.key}</span>
                  <span className="font-semibold text-[17px] leading-none">{m.name}</span>
                </div>
                <p className="m-0 text-[14px] leading-[1.5] text-slate-2 flex-1">{m.desc}</p>
                <div className="font-medium text-[12px] leading-[1.4] text-dim">Taps per routine play: <span className="text-turf font-bold">{m.taps}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>QUICK TIPS</div>
          <div className="flex flex-col gap-px bg-edge border border-edge rounded-xl overflow-hidden">
            {TIPS.map(([t, d]) => (
              <div key={t} className="flex gap-5 bg-panel p-4 px-[18px]">
                <div className="flex-none w-[200px] font-semibold text-[15px] leading-[1.3] text-turf">{t}</div>
                <div className="flex-1 text-[14px] leading-[1.5] text-slate">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
