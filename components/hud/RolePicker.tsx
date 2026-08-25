"use client";

import type { Player } from "@/lib/types";
import { LABEL, cx } from "@/components/ui";

/** A compact single-select jersey picker used for kicker / holder / snapper. */
export function RolePicker({
  label,
  roster,
  selected,
  onPick,
  accent = "turf",
}: {
  label: string;
  roster: Player[];
  selected: number | null;
  onPick: (num: number) => void;
  accent?: "turf" | "flag";
}) {
  const ring = accent === "turf" ? "border-turf" : "border-flag";
  return (
    <div className="mb-2.5">
      <div className={`${LABEL} text-[10px] mb-1.5`}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {roster.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.num)}
            className={cx(
              "min-h-[42px] min-w-[44px] px-2 rounded-[8px] border font-cond font-bold text-[16px] leading-none cursor-pointer",
              selected === p.num ? `bg-panel-4 ${ring} text-cloud` : "bg-panel-5 border-edge text-dim",
            )}
          >
            {p.num || "?"}
          </button>
        ))}
      </div>
    </div>
  );
}
