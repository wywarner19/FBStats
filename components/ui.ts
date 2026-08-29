/**
 * Shared class fragments so components stay consistent with the Claude Design
 * tokens without repeating long Tailwind strings. Every interactive control
 * here clears the 48px ergonomic floor for sideline thumb entry.
 */

export const LABEL =
  "font-semi font-semibold tracking-[.18em] text-dim uppercase";

export const CARD = "bg-panel border border-edge rounded-xl";

/** A selectable tile (play type, player, result) — >=48px tap target. */
export const TILE =
  "relative min-h-[48px] bg-panel-4 border border-edge-3 rounded-[10px] text-cloud cursor-pointer transition-colors hover:border-edge-2 active:scale-[.98]";

/** Selection ring overlay for a chosen tile. */
export const RING_TURF =
  "pointer-events-none absolute -inset-0.5 border-2 border-turf rounded-xl";
export const RING_FLAG =
  "pointer-events-none absolute -inset-0.5 border-2 border-flag rounded-xl";

export const PRIMARY =
  "min-h-[48px] bg-turf border-0 rounded-[11px] text-onaccent font-cond font-bold tracking-[.1em] cursor-pointer transition-transform active:scale-[.98] hover:brightness-105";

export const GHOST =
  "min-h-[48px] bg-panel-4 border border-edge-2 rounded-[10px] text-cloud font-cond font-bold tracking-[.08em] cursor-pointer hover:border-dim";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
