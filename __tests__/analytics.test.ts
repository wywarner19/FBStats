import { describe, expect, it } from "vitest";
import {
  aggregateSeason,
  scoringSummary,
  situationalSplits,
  tendencies,
  timeOfPossession,
} from "@/lib/engine/analytics";
import { demoGame } from "@/lib/engine/factory";
import { blankDraft, gameReducer } from "@/lib/engine/reducer";

describe("time of possession", () => {
  it("attributes drive time to the possessing team", () => {
    const g = demoGame(); // all HOME plays, Q3 11:04 → 9:05
    const top = timeOfPossession(g);
    expect(top.A).toBe(0);
    expect(top.H).toBe(119); // 9:05 elapsed − 11:04 elapsed within Q3
  });
});

describe("situational splits", () => {
  it("counts a 3rd-down conversion from the demo game", () => {
    const g = demoGame();
    const s = situationalSplits(g);
    // Seed play 3: 3rd & 4, pass complete +17 → converted.
    expect(s.H.thirdDown.att).toBe(1);
    expect(s.H.thirdDown.conv).toBe(1);
    // Three runs and two passes were logged for HOME.
    expect(s.H.runs).toBe(3);
    expect(s.H.passes).toBe(2);
  });

  it("flags an explosive run", () => {
    let g = demoGame();
    g = gameReducer(g, { type: "COMMIT_PLAY", draft: { ...blankDraft(), type: "Run", playerId: 22, yards: 25 }, clock: "8:00" });
    expect(situationalSplits(g).H.explosive).toBeGreaterThanOrEqual(1);
  });
});

describe("tendencies", () => {
  it("splits run/pass and conversion by down and hash for a team", () => {
    const t = tendencies(demoGame(), "H");
    // Demo HOME: 3rd-down play was a completed pass that converted.
    expect(t.byDown[3].plays).toBe(1);
    expect(t.byDown[3].pass).toBe(1);
    expect(t.byDown[3].conv).toBe(1);
    // Left-hash plays: the two Trips passes were on the L hash.
    expect(t.byHash.L.plays).toBe(2);
    expect(t.byHash.L.pass).toBe(2);
    // The opponent ran no plays in the demo.
    expect(tendencies(demoGame(), "A").byDown[1].plays).toBe(0);
  });

  it("buckets 3rd down by distance", () => {
    const t = tendencies(demoGame(), "H");
    // The 3rd-down snap was 3rd & 4 → medium band.
    expect(t.thirdByDistance.medium.plays).toBe(1);
    expect(t.thirdByDistance.medium.conv).toBe(1);
  });
});

describe("scoring summary", () => {
  it("is empty when nothing has scored", () => {
    expect(scoringSummary(demoGame())).toHaveLength(0);
  });

  it("records a touchdown with the running score", () => {
    let g = demoGame();
    // Field a scoring run that crosses the goal line (auto-detected as a TD).
    g = gameReducer(g, { type: "COMMIT_PLAY", draft: { ...blankDraft(), type: "Run", playerId: 22, yards: 60 }, clock: "8:00" });
    const sum = scoringSummary(g);
    expect(sum.length).toBe(1);
    expect(sum[0].kind).toBe("TD");
    expect(sum[0].points).toBe(6);
    expect(sum[0].scoreH).toBe(27); // 21 + 6
  });
});

describe("season aggregation", () => {
  it("sums a program's stats across games and tracks the record", () => {
    const a = demoGame();
    const b = demoGame();
    const agg = aggregateSeason([a, b], "Northgate Wolves");
    expect(agg.gamesPlayed).toBe(2);
    // #22 rushed 2/13 in each demo game → 4/26 on the season.
    expect(agg.box.rush[22].att).toBe(4);
    expect(agg.box.rush[22].yds).toBe(26);
    // Northgate leads 21–17 in the demo → two wins.
    expect(agg.record.w).toBe(2);
  });

  it("ignores games the team did not play in", () => {
    const agg = aggregateSeason([demoGame()], "Nonexistent HS");
    expect(agg.gamesPlayed).toBe(0);
  });
});
