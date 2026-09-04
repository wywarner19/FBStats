"use client";

import { useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import type { Player, TeamId } from "@/lib/types";
import { jersey } from "@/lib/format";
import { BUILTIN_ROSTERS } from "@/lib/engine/gameSeeds";
import { LABEL, cx } from "@/components/ui";

/** Read an image file and re-encode it downscaled to keep IndexedDB small. */
async function downscale(file: File, maxDim = 1400, quality = 0.7): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("decode failed"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function RosterColumn({ team }: { team: TeamId }) {
  const game = useGameStore((s) => s.game);
  const openCard = useGameStore((s) => s.openCard);
  const openEdit = useGameStore((s) => s.openEdit);
  const openAddPlayer = useGameStore((s) => s.openAddPlayer);
  const importRoster = useGameStore((s) => s.importRoster);
  const t = team === "H" ? game.setup.home : game.setup.away;
  const numColor = team === "H" ? "text-turf" : "text-flag";
  const heading = team === "H" ? `${t.name} — HOME` : `${t.name} — OPPONENT`;
  const headColor = team === "H" ? "text-turf" : "text-dim";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <div className={`font-semi font-semibold text-[11px] leading-none tracking-[.18em] uppercase ${headColor}`}>
          {heading}
        </div>
        <div className="flex-1" />
        <select
          value=""
          onChange={(e) => {
            const b = BUILTIN_ROSTERS.find((x) => x.key === e.target.value);
            if (b) importRoster(team, b.roster);
            e.target.value = "";
          }}
          title="Load a full team roster into this side"
          className="min-h-[34px] px-2 bg-panel-4 border border-edge-2 rounded-[8px] text-cloud font-semibold text-[12px] cursor-pointer hover:border-turf outline-none"
        >
          <option value="">⤓ Import roster…</option>
          {BUILTIN_ROSTERS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label} ({b.roster.length})
            </option>
          ))}
        </select>
        <button
          onClick={() => openAddPlayer(team)}
          className="min-h-[34px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-cloud font-semibold text-[12px] cursor-pointer hover:border-turf"
        >
          + Add player
        </button>
      </div>
      <div className="flex flex-col gap-px bg-edge border border-edge rounded-[11px] overflow-hidden">
        {t.roster.map((p: Player) => (
          <div key={p.id} className="flex items-center gap-3.5 bg-panel px-3.5 py-2.5">
            <span className={`w-11 text-center font-cond font-bold text-[20px] leading-none ${numColor}`}>
              {jersey(p.num)}
            </span>
            {/* Tap the name to edit number/name/position/two-way. */}
            <button
              onClick={() => openEdit(team, p.id)}
              className="flex-1 flex items-center gap-2 min-h-[40px] bg-transparent border-0 text-left cursor-pointer group"
            >
              <span className="font-medium text-[15px] leading-none text-cloud group-hover:text-turf">{p.name}</span>
              {p.twoWay && (
                <span className="px-1.5 py-0.5 bg-turf-wash border border-turf-wash-edge rounded font-semibold text-[9px] leading-none tracking-[.08em] text-turf">
                  2-WAY
                </span>
              )}
            </button>
            <span className="font-semi font-semibold text-[12px] leading-none tracking-[.1em] text-dim">
              {p.pos}
            </span>
            <button
              onClick={() => openCard(p.num)}
              className="min-h-[40px] px-3 bg-panel-4 border border-edge-2 rounded-[7px] text-dim font-semibold text-[11px] cursor-pointer hover:text-cloud"
            >
              CARD
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RosterScreen() {
  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      <div className="flex-1 md:overflow-auto px-7 py-6">
        <div className="flex items-center gap-3.5 mb-4">
          <h2 className="m-0 font-cond font-bold text-[30px] leading-none">Rosters</h2>
          <span className="px-2.5 py-[5px] bg-flag-ink border border-flag-edge rounded-[20px] font-semibold text-[11px] leading-none tracking-[.08em] text-flag">
            EDITABLE MID-GAME
          </span>
        </div>
        <p className="m-0 mb-[18px] max-w-[720px] text-[14px] leading-[1.5] text-dim">
          Tap <span className="text-cloud font-semibold">+ Add player</span> on
          either team to enter number, name and position — use{" "}
          <span className="text-turf font-semibold">Save &amp; add another</span>{" "}
          to rattle off a roster. Tap any player&apos;s name to edit. Or during
          entry, tap the <span className="text-flag font-semibold">?</span> tile
          to commit against an unknown jersey and back-fill later.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RosterColumn team="H" />
          <RosterColumn team="A" />
        </div>
      </div>

      <div className="w-full md:w-[380px] md:flex-none bg-panel-2 border-t md:border-t-0 md:border-l border-edge p-6 md:overflow-auto">
        <PhotoPanel />
      </div>
    </div>
  );
}

/** Take or choose a photo of the roster sheet and keep it on-screen while you
 *  type the players in. (No OCR — the app is offline-first with no backend.) */
function PhotoPanel() {
  const photo = useGameStore((s) => s.game.rosterPhoto);
  const setRosterPhoto = useGameStore((s) => s.setRosterPhoto);
  const flash = useGameStore((s) => s.flash);
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(false);
  const [busy, setBusy] = useState(false);

  const onPick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      setRosterPhoto(await downscale(file));
      flash("Roster photo saved");
    } catch {
      flash("Couldn't read that image");
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "flex-1 min-h-[48px] px-3 rounded-[10px] font-cond font-bold text-[14px] leading-none tracking-[.06em] cursor-pointer";

  return (
    <div>
      <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3.5`}>ROSTER SHEET PHOTO</div>

      {/* On iOS these open the camera (capture) / photo library respectively. */}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {photo ? (
        <>
          <button
            onClick={() => setZoom(true)}
            className="block w-full bg-transparent border-0 p-0 cursor-zoom-in"
            title="Tap to enlarge"
          >
            <img src={photo} alt="Roster sheet" className="w-full rounded-[11px] border border-edge" />
          </button>
          <div className="flex gap-2 mt-3">
            <button onClick={() => camRef.current?.click()} className={`${btn} bg-panel-4 border border-edge-2 text-cloud hover:border-turf`}>
              Retake
            </button>
            <button onClick={() => libRef.current?.click()} className={`${btn} bg-panel-4 border border-edge-2 text-cloud hover:border-turf`}>
              Replace
            </button>
            <button
              onClick={() => {
                setRosterPhoto(null);
                flash("Photo removed");
              }}
              className={`${btn} bg-panel-4 border border-edge-2 text-dim-2 hover:text-danger`}
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="relative w-full h-[180px] rounded-[11px] overflow-hidden border border-dashed border-edge-2 bg-panel grid place-items-center text-dim-2 text-[13px] text-center px-6">
            {busy ? "Processing photo…" : "No photo yet — snap the roster sheet"}
          </div>
          <div className="flex gap-2 mt-3.5">
            <button onClick={() => camRef.current?.click()} className={`${btn} bg-turf border-0 text-onaccent`}>
              📷 Take photo
            </button>
            <button onClick={() => libRef.current?.click()} className={`${btn} bg-panel-4 border border-edge-2 text-cloud hover:border-turf`}>
              🖼 Choose
            </button>
          </div>
        </>
      )}

      <p className="mt-[18px] pt-[18px] border-t border-edge text-[13px] leading-[1.55] text-dim-2">
        Keep the sheet on screen and tap <span className="text-cloud font-semibold">+ Add player</span> →
        <span className="text-turf font-semibold"> Save &amp; add another</span> to enter players fast, or
        use <span className="text-cloud font-semibold">⤓ Import roster</span> for a built-in team. The photo
        stays with this game and isn&apos;t shared to the broadcast.
      </p>

      {zoom && photo && (
        <div
          onClick={() => setZoom(false)}
          className={cx(
            "fixed inset-0 z-[200] bg-black/90 grid place-items-center p-4 cursor-zoom-out",
          )}
        >
          <img src={photo} alt="Roster sheet" className="max-w-full max-h-full object-contain rounded-[8px]" />
        </div>
      )}
    </div>
  );
}
