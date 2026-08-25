import { describe, expect, it } from "vitest";
import { toMaxPrepsCsv } from "@/lib/export/csv-maxpreps";
import { toHudlCsv } from "@/lib/export/hudl";
import { demoGame } from "@/lib/engine/factory";

describe("MaxPreps CSV export", () => {
  const csv = toMaxPrepsCsv(demoGame(), "H");
  const lines = csv.split("\n");

  it("has the MaxPreps header row", () => {
    expect(lines[0]).toContain("Jersey");
    expect(lines[0]).toContain("Rush Att");
    expect(lines[0]).toContain("Tackles");
  });

  it("only includes players with a recorded stat", () => {
    // Demo: Whitfield(22), Osei(28) rush; Alvarez(7) pass; Duarte(84) rec.
    expect(csv).toContain("Whitfield");
    expect(csv).toContain("Alvarez");
    // A pure lineman with no stat should not appear.
    expect(csv).not.toContain("Boone");
  });

  it("computes Whitfield's rushing line", () => {
    const row = lines.find((l) => l.includes("Whitfield"))!;
    const cols = row.split(",");
    // Jersey, Player, Pos, RushAtt, RushYds ...
    expect(cols[0]).toBe("22");
    expect(cols[3]).toBe("2"); // 2 carries
    expect(cols[4]).toBe("13"); // 6 + 7 yards
  });
});

describe("Hudl play-by-play CSV export", () => {
  const csv = toHudlCsv(demoGame());
  const lines = csv.split("\n");

  it("has a header and one row per non-control play", () => {
    expect(lines[0]).toContain("ODK");
    expect(lines[0]).toContain("PBP");
    // 6 seeded plays => 6 data rows.
    expect(lines.length).toBe(7);
  });

  it("marks the penalty row with ODK P", () => {
    const pen = lines.find((l) => l.includes("False Start"))!;
    expect(pen.split(",")[1]).toBe("P");
  });

  it("includes play-by-play prose in the last column", () => {
    expect(csv).toContain("PASS #7 J. Alvarez");
  });
});
