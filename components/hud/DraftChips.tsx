"use client";

import { useGameStore } from "@/store/useGameStore";

/** The 5 quick-clear draft chips shown under the field. */
export function DraftChips() {
  const draft = useGameStore((s) => s.draft);
  const patchDraft = useGameStore((s) => s.patchDraft);

  const chips: { label: string; value: string; onClick: () => void }[] = [
    { label: "TYPE", value: draft.type ?? "—", onClick: () => patchDraft({ type: null }) },
    {
      label: draft.type === "Pass" ? "QB" : "CARRIER",
      value: draft.playerId ? `#${draft.playerId}` : "—",
      onClick: () => patchDraft({ playerId: null }),
    },
    {
      label: "YARDS",
      value: draft.yards == null ? "—" : `${draft.yards > 0 ? "+" : ""}${draft.yards}`,
      onClick: () => patchDraft({ yards: null, end: null }),
    },
    { label: "RESULT", value: draft.result ?? "—", onClick: () => patchDraft({ result: null }) },
    {
      label: "DEF",
      value: draft.tacklers.length ? draft.tacklers.join("+") : "—",
      onClick: () => patchDraft({ tacklers: [] }),
    },
  ];

  return (
    <div className="flex gap-2 px-[18px] pb-3 flex-wrap">
      {chips.map((c) => (
        <button
          key={c.label}
          onClick={c.onClick}
          className="min-h-[42px] px-3.5 bg-panel-3 border border-edge-3 rounded-[9px] text-cloud font-medium text-[14px] leading-none cursor-pointer flex items-center gap-2.5 hover:border-edge-2"
          title="Tap to clear"
        >
          <span className="font-semi font-semibold text-[10px] leading-none tracking-[.14em] text-dim-2">{c.label}</span>
          <span className="font-semibold">{c.value}</span>
        </button>
      ))}
    </div>
  );
}
