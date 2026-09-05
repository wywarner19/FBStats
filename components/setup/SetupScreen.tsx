"use client";

import { useGameStore } from "@/store/useGameStore";
import { CARD, LABEL, PRIMARY, cx } from "@/components/ui";
import { clockLabel } from "@/lib/format";

const STEPS = ["Teams & date", "Rosters", "Rules & clock", "Coin toss"];

const INFO_FIELDS: { key: keyof import("@/lib/types").GameInfo; label: string; placeholder: string }[] = [
  { key: "date", label: "DATE", placeholder: "Fri, Sep 12" },
  { key: "location", label: "LOCATION", placeholder: "Home stadium" },
  { key: "weather", label: "WEATHER", placeholder: "Clear, 62°F" },
  { key: "surface", label: "SURFACE", placeholder: "Turf / grass" },
  { key: "officials", label: "OFFICIALS / CREW", placeholder: "Crew name" },
  { key: "attendance", label: "ATTENDANCE", placeholder: "Est. crowd" },
];

function GameInfoFields() {
  const info = useGameStore((s) => s.game.setup.info ?? {});
  const updateInfo = useGameStore((s) => s.updateInfo);
  return (
    <div>
      <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>GAME INFO</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INFO_FIELDS.map((f) => (
          <label key={f.key} className={`${CARD} px-4 py-3`}>
            <div className={`${LABEL} text-[10px] mb-2`}>{f.label}</div>
            <input
              value={(info[f.key] as string) ?? ""}
              onChange={(e) => updateInfo({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full bg-transparent border-0 font-semibold text-[16px] leading-none text-cloud outline-none placeholder:text-dim-2"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function SetupScreen() {
  const game = useGameStore((s) => s.game);
  const setupStep = useGameStore((s) => s.setupStep);
  const setSetupStep = useGameStore((s) => s.setSetupStep);
  const setScreen = useGameStore((s) => s.setScreen);

  const { home, away } = game.setup;
  const fields: { label: string; value: string; hint: string }[] = [
    { label: "HOME", value: home.name, hint: `Abbreviation ${home.abbr} used in the field labels` },
    { label: "OPPONENT", value: away.name, hint: "Tap to change — abbreviation auto-fills" },
    { label: "KICKOFF", value: game.setup.kickoff, hint: game.setup.meta },
    { label: "QUARTER LENGTH", value: clockLabel(game.setup.quarterLengthSec), hint: "NFHS default" },
    { label: "ROSTERS", value: `${home.roster.length} home · ${away.roster.length} opponent`, hint: "Import from a photo, last game, or type them in" },
    { label: "TRACKING DEPTH", value: "Full play-by-play", hint: "Personnel, formation, hash, tacklers" },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      <div className="w-full md:w-[300px] md:flex-none bg-panel-2 border-b md:border-b-0 md:border-r border-edge px-[22px] py-[26px] flex flex-col gap-2">
        <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>GAME SETUP</div>
        {STEPS.map((label, i) => {
          const n = i + 1;
          const sel = setupStep === n;
          return (
            <button
              key={n}
              onClick={() => setSetupStep(n)}
              className="relative flex items-center gap-3 p-3.5 min-h-[48px] bg-transparent border-0 rounded-[10px] text-left cursor-pointer"
            >
              <span className="w-7 h-7 flex-none rounded-lg bg-panel-4 grid place-items-center font-cond font-bold text-[14px] text-dim">
                {n}
              </span>
              <span className="flex-1 font-semibold text-[15px] leading-[1.2] text-cloud">
                {label}
              </span>
              {sel && (
                <span className="pointer-events-none absolute inset-0 bg-panel-3 border-l-[3px] border-turf rounded-[10px] -z-0" />
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => setScreen("live")}
          className={cx(PRIMARY, "h-14 text-[17px]")}
        >
          START GAME →
        </button>
      </div>

      <div className="flex-1 md:overflow-auto px-10 py-[34px]">
        <div className="max-w-[820px] flex flex-col gap-6">
          <h2 className="m-0 font-cond font-bold text-[34px] leading-[1.05]">
            {STEPS[Math.min(setupStep, 4) - 1]}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label} className={`${CARD} px-4 py-3.5`}>
                <div className={`${LABEL} text-[10px] mb-2`}>{f.label}</div>
                <div className="font-semibold text-[20px] leading-[1.2] text-cloud">{f.value}</div>
                <div className="mt-1.5 text-[12px] leading-[1.4] text-dim-2">{f.hint}</div>
              </div>
            ))}
          </div>
          <div className="bg-turf-wash border border-turf-wash-edge rounded-xl p-[18px] flex items-center gap-[18px]">
            <div className="flex-1">
              <div className="font-semibold text-[17px] leading-[1.2] mb-1.5">Roster from a photo</div>
              <p className="m-0 text-[14px] leading-[1.5] text-slate-2">
                Shoot the printed program or the locker-room roster sheet.
                Numbers, names and positions come back as an editable table —
                nothing is committed until you approve it.
              </p>
            </div>
            <button
              onClick={() => setScreen("roster")}
              className="flex-none min-h-[48px] px-[22px] bg-panel-4 border border-turf rounded-[10px] text-turf font-bold text-[14px] tracking-[.06em] cursor-pointer"
            >
              SCAN A ROSTER
            </button>
          </div>

          <GameInfoFields />
          <Preferences />
        </div>
      </div>
    </div>
  );
}

function Preferences() {
  const askClock = useGameStore((s) => s.askClock);
  const setAskClock = useGameStore((s) => s.setAskClock);
  return (
    <div>
      <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>PREFERENCES</div>
      <button
        onClick={() => setAskClock(!askClock)}
        className={`${CARD} w-full flex items-center justify-between px-4 py-3.5 cursor-pointer text-left`}
      >
        <div>
          <div className="font-semibold text-[16px] leading-none text-cloud">Ask for game clock each play</div>
          <div className="mt-1.5 text-[12px] leading-[1.4] text-dim-2">
            After you commit a play, a quick prompt captures the exact time. You can also skip or turn it off from that prompt.
          </div>
        </div>
        <span className={cx("relative w-[46px] h-[26px] rounded-full flex-none", askClock ? "bg-turf" : "bg-edge-2")}>
          <span className={cx("absolute top-0.5 w-[22px] h-[22px] rounded-full bg-ink transition-all", askClock ? "left-[22px]" : "left-0.5")} />
        </span>
      </button>
    </div>
  );
}
