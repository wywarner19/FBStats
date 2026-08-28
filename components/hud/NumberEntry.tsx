"use client";

import { useState } from "react";

/** Type a jersey number and Enter → select that player (create + flag if new). */
export function NumberEntry({
  onEnter,
  label = "Go",
}: {
  onEnter: (num: number) => void;
  label?: string;
}) {
  const [v, setV] = useState("");
  const submit = () => {
    const n = parseInt(v, 10);
    if (!isNaN(n)) {
      onEnter(n);
      setV("");
    }
  };
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={v}
        inputMode="numeric"
        placeholder="#"
        onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="w-12 h-9 bg-panel-3 border border-edge-3 rounded-[8px] text-center font-cond font-bold text-[16px] text-cloud outline-none placeholder:text-dim-2"
      />
      <button
        onClick={submit}
        className="h-9 px-2.5 bg-panel-4 border border-edge-2 rounded-[8px] text-cloud font-semibold text-[11px] leading-none cursor-pointer hover:border-turf"
      >
        {label}
      </button>
    </div>
  );
}
