"use client";

import { useGameStore } from "@/store/useGameStore";
import { PLAY_TYPES, RESULTS, FORMATIONS, QUICK_YARDS } from "@/lib/engine/constants";
import { offenseRoster, defenseRoster } from "@/lib/format";
import type { Formation, PlayType, PlayResult } from "@/lib/types";
import { LABEL } from "@/components/ui";

interface Opt {
  label: string;
  sub: string;
  sel: boolean;
  onClick: () => void;
}
interface StepDef {
  label: string;
  value: string;
  prompt: string;
  opts: Opt[];
}

/** Build the six guided-entry steps from the current draft + situation. */
function useStepDefs(): StepDef[] {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const d = useGameStore((s) => s.draft);
  const chooseType = useGameStore((s) => s.chooseType);
  const patchDraft = useGameStore((s) => s.patchDraft);
  const setYards = useGameStore((s) => s.setYards);
  const setForm = useGameStore((s) => s.setForm);
  const toggleTackler = useGameStore((s) => s.toggleTackler);

  const off = offenseRoster(game.setup, sit.poss);
  const def = defenseRoster(game.setup, sit.poss);
  const results = RESULTS[d.type ?? "Run"];
  const isPass = d.type === "Pass";

  return [
    {
      label: "Type",
      value: d.type ?? "",
      prompt: "WHAT KIND OF PLAY?",
      opts: PLAY_TYPES.map((t) => ({
        label: t,
        sub: "",
        sel: d.type === t,
        onClick: () => chooseType(t as PlayType),
      })),
    },
    {
      label: "Ball",
      value: d.playerId ? `#${d.playerId}` : "",
      prompt: isPass ? "WHO THREW IT?" : "WHO CARRIED IT?",
      opts: off.map((p) => ({
        label: `#${p.num}`,
        sub: p.name,
        sel: d.playerId === p.num,
        onClick: () => patchDraft({ playerId: p.num }, true),
      })),
    },
    {
      label: isPass ? "Target" : "Look",
      value: isPass ? (d.targetId ? `#${d.targetId}` : "") : (d.form ?? ""),
      prompt: isPass ? "WHO WAS TARGETED?" : "FORMATION",
      opts: isPass
        ? off.map((p) => ({
            label: `#${p.num}`,
            sub: p.pos,
            sel: d.targetId === p.num,
            onClick: () => patchDraft({ targetId: p.num }, true),
          }))
        : FORMATIONS.map((f) => ({
            label: f,
            sub: "formation",
            sel: d.form === f,
            onClick: () => {
              setForm(f as Formation);
              patchDraft({}, true);
            },
          })),
    },
    {
      label: "Yards",
      value: d.yards == null ? "" : `${d.yards > 0 ? "+" : ""}${d.yards}`,
      prompt: "YARDS GAINED — OR TAP THE FIELD",
      opts: QUICK_YARDS.map((y) => ({
        label: `${y > 0 ? "+" : ""}${y}`,
        sub: "yds",
        sel: d.yards === y,
        onClick: () => setYards(y),
      })),
    },
    {
      label: "Result",
      value: d.result ?? "",
      prompt: "HOW DID IT END?",
      opts: results.map((r) => ({
        label: r,
        sub: "",
        sel: d.result === r,
        onClick: () => patchDraft({ result: r as PlayResult }, true),
      })),
    },
    {
      label: "Defense",
      value: d.tacklers.length ? d.tacklers.join("+") : "",
      prompt: "WHO MADE THE STOP?",
      opts: def.map((p) => ({
        label: `#${p.num}`,
        sub: p.pos,
        sel: d.tacklers.includes(p.num),
        onClick: () => toggleTackler(p.num),
      })),
    },
  ];
}

export function StepRailB() {
  const steps = useStepDefs();
  const step = useGameStore((s) => Math.min(s.step, 5));
  const setStep = useGameStore((s) => s.setStep);

  return (
    <div className="flex gap-1.5 py-3 px-4 bg-panel-2 border-b border-edge flex-none overflow-x-auto">
      {steps.map((x, i) => (
        <button
          key={x.label}
          onClick={() => setStep(i)}
          className="relative flex-1 min-w-[120px] py-2.5 px-1.5 bg-panel-5 border border-edge rounded-[9px] cursor-pointer text-left"
        >
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim-2 mb-[5px]">
            STEP {i + 1}
          </div>
          <div className="font-semibold text-[14px] leading-none text-cloud">{x.label}</div>
          <div className="font-medium text-[12px] leading-[1.2] text-turf mt-1 min-h-[14px]">{x.value}</div>
          {step === i && <span className="absolute -inset-px border-2 border-turf rounded-[10px]" />}
        </button>
      ))}
    </div>
  );
}

export function StepPanelB() {
  const steps = useStepDefs();
  const step = useGameStore((s) => Math.min(s.step, 5));
  const setStep = useGameStore((s) => s.setStep);
  const def = steps[step];

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className={`${LABEL} text-[11px] text-turf mb-3`}>{def.prompt}</div>
      <div className="grid grid-cols-2 gap-2">
        {def.opts.map((o, i) => (
          <button
            key={`${o.label}-${i}`}
            onClick={o.onClick}
            className="relative min-h-[82px] bg-panel-4 border border-edge-3 rounded-[11px] text-cloud cursor-pointer flex flex-col items-center justify-center gap-0.5"
          >
            <span className="font-cond font-bold text-[24px] leading-none tracking-[.04em]">{o.label}</span>
            {o.sub && <span className="font-medium text-[12px] leading-none text-dim">{o.sub}</span>}
            {o.sel && <span className="absolute -inset-0.5 border-2 border-turf rounded-[13px]" />}
          </button>
        ))}
      </div>
      <button
        onClick={() => setStep(Math.min(step + 1, 5))}
        className="w-full min-h-[52px] mt-3 bg-panel-3 border border-edge-2 rounded-[10px] text-dim font-semibold text-[13px] leading-none tracking-[.06em] cursor-pointer hover:text-cloud"
      >
        SKIP THIS STEP →
      </button>
    </div>
  );
}
