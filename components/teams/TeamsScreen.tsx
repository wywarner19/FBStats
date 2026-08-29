"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import type { Player, TeamProfile } from "@/lib/types";
import { blankTeamProfile, makeRosterPlayer } from "@/lib/engine/factory";
import { LABEL, cx } from "@/components/ui";

const POSITIONS = ["QB", "RB", "FB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "—"];

export function TeamsScreen() {
  const teamProfiles = useGameStore((s) => s.teamProfiles);
  const saveTeam = useGameStore((s) => s.saveTeam);
  const removeTeam = useGameStore((s) => s.removeTeam);
  const [openId, setOpenId] = useState<string | null>(null);

  const addTeam = async (mine: boolean) => {
    const t = blankTeamProfile(mine ? "New team" : "New opponent", "NEW", mine);
    await saveTeam(t);
    setOpenId(t.id);
  };

  const myTeams = teamProfiles.filter((t) => t.mine !== false);
  const opponents = teamProfiles.filter((t) => t.mine === false);

  const card = (t: TeamProfile) => (
    <TeamCard
      key={t.id}
      team={t}
      open={openId === t.id}
      onToggle={() => setOpenId(openId === t.id ? null : t.id)}
      onSave={saveTeam}
      onRemove={() => removeTeam(t.id)}
    />
  );

  return (
    <div className="flex-1 overflow-auto px-7 pt-6 pb-16">
      <div className="max-w-[820px]">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h2 className="m-0 font-cond font-bold text-[32px] leading-none">Your teams</h2>
          <span className="font-medium text-[14px] leading-none text-dim">saved to this device</span>
          <div className="flex-1" />
          <button onClick={() => addTeam(true)} className="min-h-[44px] px-4 bg-turf border-0 rounded-[10px] text-onaccent font-cond font-bold text-[14px] tracking-[.06em] cursor-pointer">
            + Add team
          </button>
        </div>
        <p className="m-0 mb-5 max-w-[640px] text-[14px] leading-[1.5] text-dim-2">
          Enter each of your teams once (varsity, JV, a second program…). Their rosters copy into every game you schedule, so you never re-type them.
        </p>

        <div className="flex flex-col gap-3">
          {myTeams.length === 0 && (
            <div className="bg-panel border border-edge rounded-xl px-5 py-8 text-[14px] text-dim-2">
              No teams yet. Tap <span className="text-turf font-semibold">+ Add team</span> to create one.
            </div>
          )}
          {myTeams.map(card)}
        </div>

        <div className="flex items-center gap-3 mt-9 mb-2 flex-wrap">
          <h2 className="m-0 font-cond font-bold text-[26px] leading-none">Opponents</h2>
          <span className="font-medium text-[14px] leading-none text-dim">rosters roll over to rematches</span>
          <div className="flex-1" />
          <button onClick={() => addTeam(false)} className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[10px] text-cloud font-cond font-bold text-[13px] tracking-[.06em] cursor-pointer hover:border-turf">
            + Add opponent
          </button>
        </div>
        <p className="m-0 mb-5 max-w-[640px] text-[13px] leading-[1.5] text-dim-2">
          Teams you play. Each is saved automatically the first time you schedule them; the roster you build here (or during the game) carries over the next time you meet.
        </p>

        <div className="flex flex-col gap-3">
          {opponents.length === 0 && (
            <div className="bg-panel border border-edge rounded-xl px-5 py-6 text-[13px] text-dim-2">
              No opponents yet — they appear here once you add a game.
            </div>
          )}
          {opponents.map(card)}
        </div>
      </div>
    </div>
  );
}

function TeamCard({
  team,
  open,
  onToggle,
  onSave,
  onRemove,
}: {
  team: TeamProfile;
  open: boolean;
  onToggle: () => void;
  onSave: (t: TeamProfile) => Promise<void>;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState<TeamProfile>(team);

  const commit = (next: TeamProfile) => {
    setDraft(next);
    onSave(next);
  };
  const setField = (patch: Partial<TeamProfile>) => setDraft((d) => ({ ...d, ...patch }));
  const setPlayer = (id: string, patch: Partial<Player>) =>
    setDraft((d) => ({ ...d, roster: d.roster.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const savePlayers = (roster: Player[]) => commit({ ...draft, roster });

  const addPlayer = () => savePlayers([...draft.roster, makeRosterPlayer(-1, "", "—")]);
  const removePlayer = (id: string) => savePlayers(draft.roster.filter((p) => p.id !== id));

  return (
    <div className="bg-panel border border-edge rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5">
        <span className="w-14 h-14 flex-none rounded-[12px] bg-panel-4 border border-edge-2 grid place-items-center font-cond font-bold text-[20px] text-turf">
          {draft.abbr || "—"}
        </span>
        <button onClick={onToggle} className="flex-1 text-left bg-transparent border-0 cursor-pointer min-w-0">
          <div className="font-cond font-bold text-[22px] leading-tight text-cloud truncate">{draft.name || "Unnamed team"}</div>
          <div className="font-medium text-[13px] leading-none text-dim mt-1">{draft.roster.length} players · tap to {open ? "close" : "edit"}</div>
        </button>
        <button onClick={onRemove} className="min-h-[36px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-dim-2 font-semibold text-[12px] cursor-pointer hover:text-danger">
          Delete
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-edge pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3 mb-4">
            <label className="flex flex-col gap-1.5">
              <span className={`${LABEL} text-[10px]`}>TEAM NAME</span>
              <input
                value={draft.name}
                onChange={(e) => setField({ name: e.target.value })}
                onBlur={() => onSave(draft)}
                className="h-11 bg-panel-3 border border-edge-3 rounded-[9px] px-3 font-semibold text-[16px] text-cloud outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={`${LABEL} text-[10px]`}>ABBR</span>
              <input
                value={draft.abbr}
                onChange={(e) => setField({ abbr: e.target.value.toUpperCase().slice(0, 4) })}
                onBlur={() => onSave(draft)}
                className="h-11 bg-panel-3 border border-edge-3 rounded-[9px] px-3 text-center font-cond font-bold text-[18px] text-turf outline-none"
              />
            </label>
          </div>

          <div className={`${LABEL} text-[10px] mb-2`}>ROSTER</div>
          <div className="flex flex-col gap-1.5">
            {draft.roster.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <input
                  type="number"
                  value={p.num < 0 ? "" : p.num}
                  onChange={(e) => setPlayer(p.id, { num: e.target.value === "" ? -1 : parseInt(e.target.value, 10) || 0 })}
                  onBlur={() => onSave(draft)}
                  placeholder="#"
                  className="w-14 h-10 bg-panel-3 border border-edge-3 rounded-[8px] text-center font-cond font-bold text-[16px] text-turf outline-none"
                />
                <input
                  value={p.name}
                  onChange={(e) => setPlayer(p.id, { name: e.target.value })}
                  onBlur={() => onSave(draft)}
                  placeholder="Player name"
                  className="flex-1 h-10 bg-panel-3 border border-edge-3 rounded-[8px] px-3 font-medium text-[14px] text-cloud outline-none placeholder:text-dim-2"
                />
                <select
                  value={p.pos}
                  onChange={(e) => { const roster = draft.roster.map((x) => (x.id === p.id ? { ...x, pos: e.target.value } : x)); savePlayers(roster); }}
                  className="w-[74px] h-10 bg-panel-3 border border-edge-3 rounded-[8px] px-2 font-semibold text-[13px] text-slate outline-none"
                >
                  {POSITIONS.map((pos) => (<option key={pos} value={pos}>{pos}</option>))}
                </select>
                <button onClick={() => removePlayer(p.id)} className="w-9 h-10 bg-panel-4 border border-edge-2 rounded-[8px] text-dim-2 font-semibold text-[13px] cursor-pointer hover:text-danger">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addPlayer} className={cx("min-h-[42px] px-4 mt-3 bg-panel-4 border border-edge-2 rounded-[9px] text-cloud font-semibold text-[13px] cursor-pointer hover:border-turf")}>
            + Add player
          </button>
        </div>
      )}
    </div>
  );
}
