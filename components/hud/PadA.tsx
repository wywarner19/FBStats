"use client";

import { useGameStore } from "@/store/useGameStore";
import { PLAY_TYPES, RESULTS, PERSONNEL, FORMATIONS } from "@/lib/engine/constants";
import { offenseRoster, defenseRoster, jersey } from "@/lib/format";
import { PASS_DETAILS, type Formation, type Personnel } from "@/lib/types";
import { LABEL, cx } from "@/components/ui";
import { RolePicker } from "./RolePicker";
import { NumberEntry } from "./NumberEntry";

export function PadA() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const draft = useGameStore((s) => s.draft);
  const chooseType = useGameStore((s) => s.chooseType);
  const chooseResult = useGameStore((s) => s.chooseResult);
  const choosePlayer = useGameStore((s) => s.choosePlayer);
  const toggleTackler = useGameStore((s) => s.toggleTackler);
  const enterBallNumber = useGameStore((s) => s.enterBallNumber);
  const enterTacklerNumber = useGameStore((s) => s.enterTacklerNumber);
  const setForm = useGameStore((s) => s.setForm);
  const setPers = useGameStore((s) => s.setPers);
  const setPassDetail = useGameStore((s) => s.setPassDetail);
  const setKicker = useGameStore((s) => s.setKicker);
  const setHolder = useGameStore((s) => s.setHolder);
  const setSnapper = useGameStore((s) => s.setSnapper);
  const patchDraft = useGameStore((s) => s.patchDraft);
  const flash = useGameStore((s) => s.flash);

  const off = offenseRoster(game.setup, sit.poss);
  const def = defenseRoster(game.setup, sit.poss);
  const results = RESULTS[draft.type ?? "Run"];
  const ballLabel =
    draft.type === "Pass"
      ? draft.playerId == null
        ? "PASSER"
        : "TARGET"
      : draft.type === "Punt"
        ? "PUNTER"
        : draft.type === "FG"
          ? "KICKER"
          : "BALL CARRIER";
  const offLabel = `${sit.poss === "H" ? game.setup.home.abbr : game.setup.away.abbr} offense`;

  const unknownPlayer = () => {
    patchDraft({ playerId: -1 }, true);
    flash("Unknown jersey — commit now, name him later in Rosters");
  };

  return (
    <div className="flex-1 overflow-auto p-3.5">
      <div className={`${LABEL} text-[10px] mb-2`}>PLAY TYPE</div>
      <div className="grid grid-cols-3 gap-[7px] mb-3.5">
        {PLAY_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => chooseType(t)}
            className="relative min-h-[56px] bg-panel-4 border border-edge-3 rounded-[10px] text-cloud font-cond font-bold text-[18px] leading-none tracking-[.06em] cursor-pointer"
          >
            {t.toUpperCase()}
            {draft.type === t && <span className="absolute -inset-0.5 border-2 border-turf rounded-xl" />}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2 gap-2">
        <span className={`${LABEL} text-[10px]`}>{ballLabel}</span>
        <NumberEntry onEnter={enterBallNumber} label="type #" />
        <span className="font-medium text-[11px] leading-none text-dim-2 ml-auto">{offLabel}</span>
      </div>
      <div className="grid grid-cols-4 gap-[7px] mb-3.5">
        {off.map((p) => (
          <button
            key={p.id}
            onClick={() => choosePlayer(p.num)}
            className="relative min-h-[58px] bg-panel-4 border border-edge-3 rounded-[10px] cursor-pointer flex flex-col items-center justify-center gap-0.5"
          >
            <span className="font-cond font-bold text-[21px] leading-none text-cloud">{jersey(p.num)}</span>
            <span className="font-semi font-semibold text-[10px] leading-none tracking-[.08em] text-dim">{p.pos}</span>
            {(draft.playerId === p.num || draft.targetId === p.num) && (
              <span className="absolute -inset-0.5 border-2 border-turf rounded-xl" />
            )}
          </button>
        ))}
        <button
          onClick={unknownPlayer}
          className="min-h-[58px] bg-flag-ink border border-dashed border-flag-edge rounded-[10px] text-flag font-cond font-bold text-[20px] leading-none cursor-pointer"
        >
          ?
        </button>
      </div>

      <div className={`${LABEL} text-[10px] mb-2`}>RESULT</div>
      <div className="flex flex-wrap gap-[7px] mb-3.5">
        {results.map((r) => (
          <button
            key={r}
            onClick={() => chooseResult(r)}
            className="relative min-h-[46px] px-[15px] bg-panel-3 border border-edge-3 rounded-[9px] text-slate font-semibold text-[14px] leading-none cursor-pointer"
          >
            {r}
            {draft.result === r && <span className="absolute -inset-0.5 border-2 border-flag rounded-[11px]" />}
          </button>
        ))}
      </div>

      {draft.type === "Pass" && (
        <>
          <div className={`${LABEL} text-[10px] mb-2`}>PASS DETAIL — OPTIONAL</div>
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {PASS_DETAILS.map((d) => (
              <DetailChip key={d} label={d} sel={draft.passDetail === d} onClick={() => setPassDetail(d)} />
            ))}
          </div>
        </>
      )}

      {draft.type === "FG" && (
        <div className="mb-1">
          <RolePicker label="KICKER — REQUIRED" roster={off} selected={draft.kicker} onPick={setKicker} />
          <RolePicker label="HOLDER — OPTIONAL" roster={off} selected={draft.holder} onPick={setHolder} accent="flag" />
          <RolePicker label="SNAPPER — OPTIONAL" roster={off} selected={draft.snapper} onPick={setSnapper} accent="flag" />
        </div>
      )}

      <div className="flex items-center justify-between mb-2 gap-2">
        <span className={`${LABEL} text-[10px]`}>TACKLED BY — TAP TWO FOR AN ASSIST</span>
        <NumberEntry onEnter={enterTacklerNumber} label="type #" />
      </div>
      <div className="grid grid-cols-5 gap-1.5 mb-3.5">
        {def.map((p) => (
          <button
            key={p.id}
            onClick={() => toggleTackler(p.num)}
            className="relative min-h-[48px] bg-panel-3 border border-edge-3 rounded-[9px] text-slate font-cond font-bold text-[18px] leading-none cursor-pointer"
          >
            {jersey(p.num)}
            {draft.tacklers.includes(p.num) && <span className="absolute -inset-0.5 border-2 border-flag rounded-[11px]" />}
          </button>
        ))}
      </div>

      <div className={`${LABEL} text-[10px] mb-2`}>PERSONNEL · FORMATION</div>
      <div className="flex flex-wrap gap-1.5">
        {PERSONNEL.map((p) => (
          <DetailChip key={p} label={`${p} pers`} sel={draft.pers === p} onClick={() => setPers(p as Personnel)} />
        ))}
        {FORMATIONS.map((f) => (
          <DetailChip key={f} label={f} sel={draft.form === f} onClick={() => setForm(f as Formation)} />
        ))}
      </div>
    </div>
  );
}

function DetailChip({ label, sel, onClick }: { label: string; sel: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "relative min-h-[42px] px-3.5 bg-panel-5 border border-edge rounded-lg font-semibold text-[13px] leading-none cursor-pointer",
        sel ? "text-cloud" : "text-dim",
      )}
    >
      {label}
      {sel && <span className="absolute -inset-0.5 border-2 border-turf rounded-[10px]" />}
    </button>
  );
}
