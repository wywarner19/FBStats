import { describe, expect, it } from "vitest";
import {
  applyPlay,
  deriveSituation,
  resolvePenalty,
  spotLabel,
} from "@/lib/engine/rules";
import { computeBoxScore } from "@/lib/engine/boxscore";
import { blankDraft, currentSituation, gameReducer } from "@/lib/engine/reducer";
import { demoGame, newGame } from "@/lib/engine/factory";
import { PENALTIES } from "@/lib/engine/constants";
import type { PlayEvent, Situation } from "@/lib/types";

function sit(over: Partial<Situation> = {}): Situation {
  return {
    qtr: 1,
    poss: "H",
    down: 1,
    dist: 10,
    spot: 25,
    scoreH: 0,
    scoreA: 0,
    goalToGo: false,
    ...over,
  };
}

function play(over: Partial<PlayEvent>): PlayEvent {
  return {
    id: "t",
    seq: 1,
    kind: "Run",
    qtr: 1,
    clock: "12:00",
    poss: "H",
    down: 1,
    dist: 10,
    start: 25,
    end: 25,
    yards: 0,
    result: "Tackle",
    playerId: 22,
    targetId: null,
    tacklers: [],
    hash: "M",
    ...over,
  };
}

describe("rule engine — down & distance", () => {
  it("first down resets to 1st & 10", () => {
    const next = applyPlay(sit({ down: 2, dist: 7, spot: 40 }), play({ yards: 8 }));
    expect(next.down).toBe(1);
    expect(next.dist).toBe(10);
    expect(next.spot).toBe(48);
  });

  it("short of the sticks advances the down and reduces distance", () => {
    const next = applyPlay(sit({ down: 1, dist: 10, spot: 40 }), play({ yards: 3 }));
    expect(next.down).toBe(2);
    expect(next.dist).toBe(7);
    expect(next.spot).toBe(43);
  });

  it("turnover on downs flips possession at the dead-ball spot", () => {
    const next = applyPlay(sit({ down: 4, dist: 5, spot: 50 }), play({ yards: 2 }));
    expect(next.poss).toBe("A");
    expect(next.down).toBe(1);
    expect(next.spot).toBe(52);
  });

  it("goal-to-go caps the distance to the goal line", () => {
    const next = applyPlay(sit({ down: 1, dist: 10, spot: 95 }), play({ yards: 2 }));
    expect(next.goalToGo).toBe(true);
    expect(next.dist).toBe(3); // 100 - 97
  });
});

describe("rule engine — scoring & turnovers", () => {
  it("crossing the goal is a touchdown worth 6 and awaits the try", () => {
    const next = applyPlay(sit({ spot: 96, scoreH: 0 }), play({ yards: 6 }));
    expect(next.scoreH).toBe(6);
    expect(next.tryPending).toBe("H"); // scoring team owes a PAT/2-pt
    expect(next.poss).toBe("H"); // possession stays until the try resolves
  });

  it("interception flips possession without scoring", () => {
    const next = applyPlay(
      sit({ spot: 55 }),
      play({ kind: "Pass", result: "Interception", yards: 0 }),
    );
    expect(next.poss).toBe("A");
    expect(next.scoreH).toBe(0);
  });

  it("made field goal scores 3 and changes possession", () => {
    const next = applyPlay(sit({ spot: 70 }), play({ kind: "FG", result: "Made", yards: 0 }));
    expect(next.scoreH).toBe(3);
    expect(next.poss).toBe("A");
  });

  it("punt touchback spots the receiving team at its own 20", () => {
    const next = applyPlay(sit({ spot: 60 }), play({ kind: "Punt", result: "Touchback", yards: 0 }));
    expect(next.poss).toBe("A");
    expect(next.spot).toBe(80);
  });

  it("away direction is symmetric — away TD toward 0", () => {
    const next = applyPlay(sit({ poss: "A", spot: 4, scoreA: 0 }), play({ poss: "A", yards: 6 }));
    expect(next.scoreA).toBe(6);
    expect(next.tryPending).toBe("A");
    expect(next.poss).toBe("A");
  });
});

describe("PAT / 2-point tries", () => {
  function tryPlay(over: Partial<PlayEvent>): PlayEvent {
    return play({ kind: "Try", yards: 0, playerId: null, ...over });
  }

  it("a made PAT kick adds 1 and kicks off to the other team", () => {
    let s = applyPlay(sit({ spot: 96, scoreH: 0 }), play({ yards: 6 })); // TD → 6
    s = applyPlay(
      s,
      tryPlay({ result: "Made", tryType: "kick", scoring: { team: "H", kind: "PAT", points: 1 } }),
    );
    expect(s.scoreH).toBe(7);
    expect(s.poss).toBe("A"); // other team receives
    expect(s.tryPending).toBeFalsy();
    expect(s.down).toBe(1);
  });

  it("a made 2-point conversion adds 2", () => {
    let s = applyPlay(sit({ spot: 96, scoreH: 14 }), play({ yards: 6 })); // → 20
    s = applyPlay(
      s,
      tryPlay({ result: "Made", tryType: "run", scoring: { team: "H", kind: "TwoPt", points: 2 } }),
    );
    expect(s.scoreH).toBe(22);
    expect(s.tryPending).toBeFalsy();
  });

  it("a failed try adds nothing but still changes possession", () => {
    let s = applyPlay(sit({ spot: 96, scoreH: 0 }), play({ yards: 6 })); // → 6
    s = applyPlay(
      s,
      tryPlay({ result: "Missed", tryType: "kick", scoring: { team: "H", kind: "PAT", points: 0 } }),
    );
    expect(s.scoreH).toBe(6);
    expect(s.poss).toBe("A");
  });

  it("a penalty flagged during a try keeps the try pending", () => {
    let s = applyPlay(sit({ spot: 96, scoreH: 0 }), play({ yards: 6 })); // TD, try pending
    expect(s.tryPending).toBe("H");
    const pen = play({ kind: "Penalty", penalty: "Offside", yards: 0, result: "—", playerId: null });
    s = applyPlay(s, pen);
    expect(s.tryPending).toBe("H"); // still owe the try
  });
});

describe("rule engine — penalties", () => {
  it("roughing the passer is a defensive auto-first that resets the down", () => {
    const pen = PENALTIES.find((p) => p.name === "Roughing the Passer")!;
    const r = resolvePenalty(sit({ down: 3, dist: 8, spot: 40 }), pen);
    expect(r.down).toBe(1);
    expect(r.spot).toBe(55); // +15 toward 100
  });

  it("a 15-yard face mask is NOT an automatic first down in NFHS", () => {
    const pen = PENALTIES.find((p) => p.name === "Face Mask (15)")!;
    // 3rd & 20: +15 does not reach the line to gain, so the down is NOT reset
    // (a roughing foul WOULD reset it regardless).
    const r = resolvePenalty(sit({ down: 3, dist: 20, spot: 40 }), pen);
    expect(r.down).toBe(3); // down unchanged — not an automatic first down
    expect(r.spot).toBe(55);
    expect(r.dist).toBe(5); // 60 (line to gain) − 55
  });

  it("enforces intentional grounding from the spot of the foul", () => {
    const pen = PENALTIES.find((p) => p.name === "Intentional Grounding")!;
    // Foul at the offense's own 32 (spot 32) while the LOS was the 40.
    const r = resolvePenalty(sit({ down: 2, dist: 10, spot: 40 }), pen, 32);
    expect(r.spot).toBe(32); // 0-yard grounding penalty, marked at the foul spot
    expect(r.down).toBe(3); // loss of down
  });

  it("offensive penalty marks back and adds distance", () => {
    const pen = PENALTIES.find((p) => p.name === "Holding — offense")!;
    const r = resolvePenalty(sit({ down: 1, dist: 10, spot: 40 }), pen);
    expect(r.spot).toBe(30);
    expect(r.dist).toBe(20);
  });
});

describe("determinism — undo/redo/edit re-derive", () => {
  it("undo then redo returns the identical situation", () => {
    let g = newGame();
    g = gameReducer(g, { type: "COMMIT_PLAY", draft: { ...blankDraft(), type: "Run", playerId: 22, yards: 12 }, clock: "12:00" });
    const after = currentSituation(g);
    g = gameReducer(g, { type: "UNDO" });
    expect(currentSituation(g).spot).toBe(25);
    g = gameReducer(g, { type: "REDO" });
    expect(currentSituation(g)).toEqual(after);
  });

  it("editing an early play re-derives all later situations", () => {
    let g = newGame();
    g = gameReducer(g, { type: "COMMIT_PLAY", draft: { ...blankDraft(), type: "Run", playerId: 22, yards: 3 }, clock: "12:00" });
    g = gameReducer(g, { type: "COMMIT_PLAY", draft: { ...blankDraft(), type: "Run", playerId: 28, yards: 3 }, clock: "11:30" });
    // Two 3-yard runs => 3rd & 4.
    expect(currentSituation(g).down).toBe(3);
    const firstId = g.plays[0].id;
    g = gameReducer(g, { type: "EDIT_PLAY", id: firstId, patch: { yards: 12 } });
    // First play now a first down => second play is 2nd & 7.
    expect(currentSituation(g).down).toBe(2);
  });
});

describe("NFHS penalty data", () => {
  const byName = (n: string) => PENALTIES.find((p) => p.name === n);

  it("only roughing fouls and defensive PI are automatic first downs", () => {
    const autoFirst = PENALTIES.filter((p) => p.autoFirst).map((p) => p.name);
    expect(autoFirst).toContain("Pass Interference — defense");
    expect(autoFirst).toContain("Roughing the Passer");
    // NOT auto first in NFHS (unlike NFL):
    expect(byName("Face Mask (15)")?.autoFirst).toBeFalsy();
    expect(byName("Unsportsmanlike Conduct")?.autoFirst).toBeFalsy();
    expect(byName("Holding — defense")?.autoFirst).toBeFalsy();
  });

  it("has the core yardages right", () => {
    expect(byName("False Start")?.yds).toBe(5);
    expect(byName("Holding — offense")?.yds).toBe(10);
    expect(byName("Pass Interference — defense")?.yds).toBe(15);
    expect(byName("Face Mask (incidental)")?.yds).toBe(5);
    expect(byName("Intentional Grounding")?.lossOfDown).toBe(true);
  });
});

describe("timeouts", () => {
  it("charges a team timeout and stops the clock", () => {
    let g = newGame();
    g = gameReducer(g, { type: "SET_RUNNING", running: true });
    g = gameReducer(g, { type: "TAKE_TIMEOUT", team: "H" });
    expect(g.timeouts.H).toBe(2);
    expect(g.running).toBe(false);
  });

  it("injury timeout does not charge either team", () => {
    let g = newGame();
    g = gameReducer(g, { type: "INJURY_TIMEOUT" });
    expect(g.timeouts.H).toBe(3);
    expect(g.timeouts.A).toBe(3);
  });

  it("resets timeouts to 3 each", () => {
    let g = newGame();
    g = gameReducer(g, { type: "TAKE_TIMEOUT", team: "H" });
    g = gameReducer(g, { type: "RESET_TIMEOUTS" });
    expect(g.timeouts.H).toBe(3);
  });
});

describe("penalty enforced on the kickoff after a try", () => {
  it("moves the ensuing kickoff spot when the kicking team is penalized", () => {
    // HOME scores (TD) and then commits an offensive foul enforced on the
    // kickoff => AWAY receives farther upfield than the standard own 25.
    let s = applyPlay(sit({ spot: 96, scoreH: 0 }), play({ yards: 6 })); // TD, try pending (H)
    const pen = play({ kind: "Penalty", penalty: "Delay of Game", yards: 0, enforceOnKickoff: true });
    s = applyPlay(s, pen);
    expect(s.tryPending).toBe("H");
    expect(s.kickoffPenalty).toBe(5); // kicking team fouled → receiver benefits
    // Resolve the PAT; AWAY receives — own 25 (spot 75) advanced 5 => spot 70.
    s = applyPlay(s, play({ kind: "Try", result: "Made", tryType: "kick", yards: 0, scoring: { team: "H", kind: "PAT", points: 1 } }));
    expect(s.poss).toBe("A");
    expect(s.spot).toBe(70);
  });
});

describe("kickoffs and quarter breaks", () => {
  it("a touchback kickoff spots the receiving team at its own 20", () => {
    let g = newGame();
    g = gameReducer(g, { type: "KICKOFF", receiving: "A", kicker: 9, result: "Touchback" });
    const s = currentSituation(g);
    expect(s.poss).toBe("A");
    expect(s.spot).toBe(80); // AWAY own 20 = spot 80
    expect(g.plays[g.plays.length - 1].kicker).toBe(9);
  });

  it("an onside recovery keeps the ball with the kicking team", () => {
    let g = newGame();
    g = gameReducer(g, { type: "KICKOFF", receiving: "A", kicker: 9, result: "Onside" });
    // AWAY was to receive, so HOME kicked and recovered → HOME ball.
    expect(currentSituation(g).poss).toBe("H");
  });

  it("ending a quarter advances the quarter, resets the clock, keeps possession", () => {
    let g = newGame();
    g = gameReducer(g, { type: "COMMIT_PLAY", draft: { ...blankDraft(), type: "Run", playerId: 22, yards: 4 }, clock: "3:00" });
    const before = currentSituation(g);
    g = gameReducer(g, { type: "SET_CLOCK", sec: 30 });
    g = gameReducer(g, { type: "END_QUARTER" });
    expect(g.qtr).toBe(2);
    expect(g.clockSec).toBe(g.setup.quarterLengthSec);
    expect(currentSituation(g).poss).toBe(before.poss); // ball carries over
  });
});

describe("box score aggregation", () => {
  it("computes rushing/passing/receiving from the demo game", () => {
    const g = demoGame();
    const box = computeBoxScore(g.plays);
    expect(box.rush[22].att).toBe(2);
    expect(box.rush[22].yds).toBe(13);
    expect(box.pass[7].att).toBe(2);
    expect(box.pass[7].cmp).toBe(1);
    expect(box.rec[84].yds).toBe(17);
  });

  it("credits an intended receiver with a target even on an incompletion", () => {
    const g = demoGame();
    const box = computeBoxScore(g.plays);
    // #11 Brennan was targeted on the incomplete pass (seed play 2).
    expect(box.rec[11].tgt).toBe(1);
    expect(box.rec[11].rec).toBe(0);
    // #84 Duarte caught his target.
    expect(box.rec[84].tgt).toBe(1);
    expect(box.rec[84].rec).toBe(1);
  });
});

describe("labels", () => {
  it("spot label picks the near team", () => {
    const g = newGame();
    expect(spotLabel(45, g.setup)).toBe("NGT 45");
    expect(spotLabel(70, g.setup)).toBe("RVT 30");
  });
});

describe("return touchdowns and kick out-of-bounds", () => {
  it("a punt return TD credits the receiving team with a PAT owed", () => {
    const s = applyPlay(
      sit({ poss: "H", spot: 45 }),
      play({ kind: "Punt", poss: "H", result: "Touchdown", end: 100, yards: 55 }),
    );
    expect(s.scoreA).toBe(6);
    expect(s.scoreH).toBe(0);
    expect(s.poss).toBe("A");
    expect(s.tryPending).toBe("A");
  });

  it("a normal punt just flips possession at the dead-ball spot", () => {
    const s = applyPlay(
      sit({ poss: "H", spot: 30 }),
      play({ kind: "Punt", poss: "H", result: "Downed", end: 75, yards: 45 }),
    );
    expect(s.scoreA).toBe(0);
    expect(s.poss).toBe("A");
    expect(s.spot).toBe(75);
  });

  it("a kickoff return TD credits the receiving team", () => {
    let g = newGame();
    g = gameReducer(g, { type: "KICKOFF", receiving: "A", kicker: 5, result: "TD" });
    const s = currentSituation(g);
    expect(s.scoreA).toBe(6);
    expect(s.poss).toBe("A");
    expect(s.tryPending).toBe("A");
  });

  it("a kickoff out of bounds gives the receiver its own 40", () => {
    let g = newGame();
    g = gameReducer(g, { type: "KICKOFF", receiving: "A", kicker: 5, result: "Out of bounds" });
    const s = currentSituation(g);
    expect(s.poss).toBe("A");
    expect(s.spot).toBe(60); // A's own 40 = absolute 60
  });
});

describe("defensive return touchdowns and turnover attribution", () => {
  it("a pick-six scores the DEFENSE with a PAT owed", () => {
    const s = applyPlay(sit({ poss: "H", spot: 40 }), play({ kind: "Pass", poss: "H", result: "Pick 6" }));
    expect(s.scoreA).toBe(6);
    expect(s.scoreH).toBe(0);
    expect(s.poss).toBe("A");
    expect(s.tryPending).toBe("A");
  });

  it("a scoop-and-score (Fumble TD) scores the DEFENSE", () => {
    const s = applyPlay(sit({ poss: "A", spot: 60 }), play({ kind: "Run", poss: "A", result: "Fumble TD" }));
    expect(s.scoreH).toBe(6);
    expect(s.poss).toBe("H");
    expect(s.tryPending).toBe("H");
  });

  it("credits the interceptor in the defending team's box", () => {
    const plays = [
      play({ kind: "Pass", poss: "H", result: "Interception", playerId: 7, returner: 22 }),
    ];
    const box = computeBoxScore(plays, "A"); // A is the defense here
    expect(box.def[22]?.int).toBe(1);
    expect(box.def[22]?.fr).toBe(0);
  });
});

describe("nullified (penalty-voided) plays", () => {
  it("contribute nothing to the situation/score", () => {
    const before = sit({ poss: "H", spot: 20, scoreH: 0 });
    const s = applyPlay(before, play({ kind: "Run", poss: "H", result: "Touchdown", end: 100, yards: 80, nullified: true }));
    expect(s).toEqual(before); // unchanged
  });
  it("are excluded from the box score", () => {
    const plays = [
      play({ kind: "Run", poss: "H", playerId: 22, yards: 80, result: "Touchdown", nullified: true }),
    ];
    const box = computeBoxScore(plays, "H");
    expect(box.rush[22]).toBeUndefined();
  });
});
