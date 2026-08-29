import { describe, expect, it } from "vitest";
import { jersey, who } from "@/lib/format";
import type { GameSetup, Player } from "@/lib/types";

const p = (num: number, name: string): Player => ({ id: `p${num}`, num, name, pos: "K" });

const setup = {
  home: { id: "H", name: "Columbia City", abbr: "CC", roster: [p(0, "Jaxson Johnson"), p(12, "A. Back")] },
  away: { id: "A", name: "Northridge", abbr: "NR", roster: [] },
} as unknown as GameSetup;

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
