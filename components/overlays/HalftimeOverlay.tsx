"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { broadcastBoxText } from "@/lib/export/text";
import { OverlayShell } from "./OverlayShell";
import { LABEL, cx } from "@/components/ui";

export function HalftimeOverlay() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const resumeHalf = useGameStore((s) => s.resumeHalf);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const shareCurrentGame = useGameStore((s) => s.shareCurrentGame);
  const flash = useGameStore((s) => s.flash);

  const { home, away } = game.setup;
  const boxText = broadcastBoxText(game, "Halftime");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const copyBox = async () => {
    try {
      await navigator.clipboard.writeText(boxText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      flash("Copy blocked — select the text below and copy it");
    }
  };
  const shareLink = async () => {
    setSharing(true);
    const url = await shareCurrentGame();
    setSharing(false);
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        flash("Live link copied — send it to the broadcaster");
      } catch {
        /* flash already handled in store */
      }
    }
  };

  return (
    <OverlayShell width={680}>
      <h3 className="m-0 mb-2 font-cond font-bold text-[32px] leading-none">Halftime</h3>
      <p className="m-0 mb-4 text-[15px] leading-[1.55] text-dim">
        Through two quarters: {home.abbr} {sit.scoreH}, {away.abbr} {sit.scoreA}. Send the box score to
        your broadcaster, then pick who receives to resume on 3rd quarter, 1st &amp; 10.
      </p>

      {/* Box score for the radio broadcast */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span className={`${LABEL} text-[10px]`}>HALFTIME BOX SCORE</span>
          <div className="flex-1" />
          <button onClick={copyBox} className="min-h-[36px] px-3 bg-panel-4 border border-turf rounded-[8px] text-turf font-semibold text-[12px] leading-none cursor-pointer">
            {copied ? "Copied!" : "Copy for radio"}
          </button>
          <button onClick={shareLink} disabled={sharing} className="min-h-[36px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-cloud font-semibold text-[12px] leading-none cursor-pointer disabled:opacity-60">
            {sharing ? "…" : "Share live link"}
          </button>
        </div>
        <textarea
          readOnly
          value={boxText}
          onFocus={(e) => e.currentTarget.select()}
          rows={7}
          className="w-full bg-panel-3 border border-edge-3 rounded-[9px] p-3 font-barlow text-[13px] leading-[1.5] text-mist outline-none resize-none"
        />
      </div>

      <div className={`${LABEL} text-[10px] mb-2`}>WHO RECEIVES THE 2ND-HALF KICKOFF?</div>
      <div className="flex gap-2.5">
        {(["H", "A"] as const).map((team) => (
          <button
            key={team}
            onClick={() => resumeHalf(team)}
            className="flex-1 min-h-[64px] bg-panel-4 border border-turf rounded-xl text-cloud font-cond font-bold text-[20px] leading-none tracking-[.06em] cursor-pointer"
          >
            {team === "H" ? home.abbr : away.abbr} RECEIVES
          </button>
        ))}
      </div>
      <button
        onClick={() => setOverlay(null)}
        className={cx("w-full min-h-[48px] mt-3 bg-transparent border border-edge rounded-[10px] text-dim font-semibold text-[13px] cursor-pointer")}
      >
        Not yet — back to entry
      </button>
    </OverlayShell>
  );
}
