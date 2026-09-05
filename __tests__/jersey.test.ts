import { describe, expect, it } from "vitest";
import { jersey, who, playText } from "@/lib/format";
import type { GameSetup, Player, PlayEvent } from "@/lib/types";

const p = (num: number, name: string): Player => ({ id: `p${num}`, num, name, pos: "K" });

const setup = {
  home: { id: "H", name: "Columbia City", abbr: "CC", roster: [p(0, "Jaxson Johnson"), p(12, "A. Back")] },
  away: { id: "A", name: "Northridge", abbr: "NR", roster: [] },
} as unknown as GameSetup;

// Both teams share #3 — the classic collision.
const shared = {
  home: { id: "H", name: "Columbia City", abbr: "CC", roster: [p(3, "Colton Schroeder")] },
  away: { id: "A", name: "Bellmont", abbr: "BELL", roster: [p(3, "Charlie Faurote")] },
} as unknown as GameSetup;

describe("who() is team-aware for shared numbers", () => {
  it("resolves within the given team", () => {
    expect(who(shared, 3, "H")).toBe("#3 Colton Schroeder");
    expect(who(shared, 3, "A")).toBe("#3 Charlie Faurote");
  });
  it("without a team, falls back to the first roster (home)", () => {
    expect(who(shared, 3)).toBe("#3 Colton Schroeder");
  });
});

describe("playText names the ball carrier from the possessing team", () => {
  const run = (poss: "H" | "A"): PlayEvent =>
    ({
      id: "x", seq: 1, kind: "Run", qtr: 1, clock: "", poss, down: 1, dist: 10,
      start: 25, end: 33, yards: 8, result: "Tackle", playerId: 3, targetId: null, tacklers: [], hash: "M",
    }) as unknown as PlayEvent;
  it("uses the away roster when the away team has the ball", () => {
    expect(playText(shared, run("A"))).toContain("Charlie Faurote");
    expect(playText(shared, run("A"))).not.toContain("Colton Schroeder");
  });
  it("uses the home roster when the home team has the ball", () => {
    expect(playText(shared, run("H"))).toContain("Colton Schroeder");
  });
});

describe("jersey display", () => {
  it("shows 0 as a real number, not a placeholder", () => {
    expect(jersey(0)).toBe("0");
    expect(jersey(12)).toBe("12");
  });

  it("shows the reserved negative sentinel (and null) as the '#' prompt", () => {
    expect(jersey(-1)).toBe("#");
    expect(jersey(null)).toBe("#");
    expect(jersey(undefined)).toBe("#");
  });
});

describe("who() name resolution", () => {
  it("resolves a real #0 player instead of calling him unnamed", () => {
    expect(who(setup, 0)).toBe("#0 Jaxson Johnson");
  });

  it("labels the unknown-jersey sentinel as unnamed", () => {
    expect(who(setup, -1)).toBe("#? unnamed");
  });

  it("returns empty for no player", () => {
    expect(who(setup, null)).toBe("");
  });
});
