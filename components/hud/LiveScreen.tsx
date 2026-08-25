"use client";

import { useGameStore } from "@/store/useGameStore";
import { ScoreboardBar } from "./ScoreboardBar";
import { ModelBar } from "./ModelBar";
import { EntryContextBar } from "./EntryContextBar";
import { FieldStrip } from "./FieldStrip";
import { DraftChips } from "./DraftChips";
import { CommitBar } from "./CommitBar";
import { RecentPlays } from "./RecentPlays";
import { PadA } from "./PadA";
import { StepRailB, StepPanelB } from "./GuidedB";
import { LeftRailC, JerseyPadC } from "./TwoThumbC";

/**
 * Landscape iPad is the primary target (two-column). Below `md` the whole HUD
 * collapses to a single scrolling column with the commit bar pinned to the
 * bottom, so one-hand entry still works on a phone.
 */
export function LiveScreen() {
  const model = useGameStore((s) => s.model);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScoreboardBar />
      <ModelBar />
      <EntryContextBar />

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {model === "C" && <LeftRailC />}

        {/* Center column: field + chips scroll; commit bar pinned (desktop). */}
        <div className="flex flex-col md:flex-1 md:overflow-hidden min-w-0">
          {model === "B" && <StepRailB />}
          <div className="md:flex-1 md:overflow-auto">
            <FieldStrip />
            <DraftChips />
          </div>
          {/* Desktop commit bar lives in the center column, per the design. */}
          <div className="hidden md:block">
            <CommitBar />
          </div>
        </div>

        {/* Right panel: model-specific entry + recent plays. */}
        <div className="flex flex-col md:flex-none md:w-[430px] w-full bg-panel-2 border-t md:border-t-0 md:border-l border-edge md:overflow-hidden">
          {model === "A" && <PadA />}
          {model === "B" && <StepPanelB />}
          {model === "C" && <JerseyPadC />}
          <RecentPlays />
        </div>
      </div>

      {/* Mobile commit bar: pinned full-width so COMMIT is always reachable. */}
      <div className="md:hidden flex-none">
        <CommitBar />
      </div>
    </div>
  );
}
