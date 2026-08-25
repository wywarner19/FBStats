"use client";

import { useGameStore } from "@/store/useGameStore";
import type { EntryModel } from "@/lib/types";
import { cx } from "@/components/ui";

const MODELS: [EntryModel, string][] = [
  ["A", "A · Field-first"],
  ["B", "B · Guided steps"],
  ["C", "C · Two-thumb"],
];

export function ModelBar() {
  const model = useGameStore((s) => s.model);
  const setModel = useGameStore((s) => s.setModel);
  const toast = useGameStore((s) => s.toast);

  return (
    <div className="flex items-center gap-2.5 py-2.5 px-5 bg-panel border-b border-edge flex-none">
      <span className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim">
        ENTRY MODEL
      </span>
      {MODELS.map(([key, label]) => {
        const sel = model === key;
        return (
          <button
            key={key}
            onClick={() => setModel(key)}
            className={cx(
              "relative min-h-[36px] px-3.5 bg-transparent border-0 rounded-[7px] font-semibold text-[12px] leading-none tracking-[.03em] cursor-pointer",
              sel ? "text-cloud" : "text-dim hover:text-slate",
            )}
          >
            {sel && <span className="pointer-events-none absolute inset-0 bg-panel-4 border border-turf rounded-[7px]" />}
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
      <div className="flex-1" />
      {toast && (
        <div className="px-3.5 py-1.5 bg-turf-wash border border-turf-wash-edge rounded-[20px] font-medium text-[13px] leading-none text-[#a8d8bd] animate-fade">
          {toast}
        </div>
      )}
    </div>
  );
}
