import { describe, expect, it } from "vitest";

import { ageGapOf, ageGroupOf, bestLevel, cohortLabel, cohortOf, levelOf, MAX_CREDIT, PLAY_UP_CREDIT, fit, SELECT } from "./rule.js";

describe("levelOf", () => {
  it("reads the ladder from a league division", () => {
    expect(levelOf("ECNL League - Northwest Conference BU13 - ECNL")?.label).toBe("ECNL");
    expect(levelOf("ECNL RL League - Northwest Conference BU13 - ECNL Regional League")?.label).toBe("ECNL RL");
    expect(levelOf("Pre-ECNL League - Northwest Conference BU12 - Flight I")?.prior).toBe(1920);
    expect(levelOf("Elite Academy 2026 - PacNW U13 EA PACNW")?.label).toBe("EA");
    expect(levelOf("Girls Academy 2026 - PacNW GU14 Pacific-Northwest")?.label).toBe("GA");
    expect(levelOf("GA ASPIRE 2026 - PacNW GU14 Pacific Northwest")?.prior).toBe(1560);
    expect(levelOf("MLS NEXT Academy Division 2026-27 — Pacific Northwest U13 MLS Next AD")?.prior).toBe(1740);
  });
  it("puts EA and GA a rung higher at U11 and U12, where nothing fields that age above them", () => {
    expect(levelOf("Elite Academy 2026 - PacNW U12 EA PACNW", 12)?.prior).toBe(1740);
    expect(levelOf("Elite Academy 2026 - PacNW U13 EA PACNW", 13)?.prior).toBe(1660);
    expect(levelOf("Girls Academy 2026 - PacNW GU11 Pacific-Northwest", 11)?.prior).toBe(1740);
    expect(levelOf("Girls Academy 2026 - PacNW GU14 Pacific-Northwest", 14)?.prior).toBe(1660);
    // Without an age they read as U13 and up; and the age changes nothing else.
    expect(levelOf("Elite Academy 2026 - PacNW U12 EA PACNW")?.prior).toBe(1660);
    expect(levelOf("ECNL RL League BU12 - ECNL Regional League", 12)?.prior).toBe(1660);
    expect(levelOf("MLS NEXT Academy Division U13 MLS Next AD", 12)?.prior).toBe(1740);
  });
  it("only the top division carries the league's level", () => {
    expect(levelOf("RCL BU13 Div 1")?.prior).toBe(1560);
    // U10 and younger: nothing sits above RCL, so Division 1 is the top rung there.
    expect(levelOf("RCL BU10 Div 1", 10)?.prior).toBe(1800);
    expect(levelOf("RCL BU09 Div 2 North", 9)?.prior).toBe(1660);
    expect(levelOf("RCL BU08 Div 3 South", 8)?.prior).toBe(1560);
    expect(levelOf("RCL BU11 Div 1", 11)?.prior).toBe(1560);
    expect(levelOf("RCL BU13 Div 2 North")?.prior).toBe(1490);
    expect(levelOf("RCL BU13 Div 3 South")?.prior).toBe(1440);
    // WPL Premier is its division 1 and sits with RCL 1; Classic with RCL 2; Dev 1 with RCL 3.
    expect(levelOf("WPL 2026 Fall U11–U14 BU12 Premier 1")?.prior).toBe(1560);
    expect(levelOf("WPL 2026 Fall U11–U14 BU12 Classic 1 West")?.prior).toBe(1490);
    expect(levelOf("WPL 2026 Fall U11–U14 BU12 Copa 2 East")?.prior).toBe(1400);
    // WW Dev is the U8–U10 league: Div. 1 seeds the academies and sits with Pre-MLS / EA; the rest step down.
    expect(levelOf("WPL 2026 Fall WW Dev WPL Dev B Div. 1 Blue")?.prior).toBe(1740);
    expect(levelOf("WPL 2026 Fall WW Dev WPL Dev BU10 Div. 2")?.prior).toBe(1560);
    expect(levelOf("WPL 2026 Fall WW Dev WPL Dev BU10 Div. 3")?.prior).toBe(1490);
    expect(levelOf("WPL 2026 Fall WW Dev WPL Dev BU9 Div. 5")?.prior).toBe(1400);
  });
  it("reads a name too, and says nothing for a plain one", () => {
    expect(levelOf("XF B13/14 ECNL 1")?.label).toBe("ECNL");
    expect(levelOf("XF B16/17 RCL 3")?.label).toBe("RCL 3");
    expect(levelOf("Arctic Wolves")).toBeNull();
    expect(bestLevel([null, levelOf("XF B14/15 RCL 1"), levelOf("Pre-ECNL League BU13 - Flight I")]).label).toBe("Pre-ECNL");
    expect(bestLevel([null])).toBe(SELECT);
  });
});

const AT = Date.parse("2026-11-01T00:00:00Z");
const g = (home: string, away: string, hs: number, as: number, over: Record<string, unknown> = {}) =>
  ({ homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, kind: "league", t: AT - 86_400_000, ...over });
const flat = () => 1500;

describe("fit", () => {
  it("rates a side by the margin its results show, a hundred points a goal, pulled toward its anchor", () => {
    // Four 2–0 wins over a side anchored at 1500, itself held there by its other games.
    const games = [...Array.from({ length: 4 }, () => g("a", "b", 2, 0)), ...Array.from({ length: 20 }, (_, i) => g("b", `c${i}`, 0, 0))];
    const r = fit(games, flat, AT);
    expect(r.get("a")!.rating - r.get("b")!.rating).toBeGreaterThan(140);
    expect(r.get("a")!.rating - r.get("b")!.rating).toBeLessThan(200);
    expect(r.get("a")!.games).toBe(4);
  });
  it("caps a rout at five goals", () => {
    const five = fit([g("a", "b", 5, 0)], flat, AT), eleven = fit([g("a", "b", 11, 0)], flat, AT);
    expect(eleven.get("a")!.rating).toBeCloseTo(five.get("a")!.rating, 6);
  });
  it("weighs a game by what it was played in, and an old game less", () => {
    const league = fit([g("a", "b", 3, 0)], flat, AT), cup = fit([g("a", "b", 3, 0, { kind: "tournament" })], flat, AT);
    expect(league.get("a")!.rating).toBeGreaterThan(cup.get("a")!.rating);
    const old = fit([g("a", "b", 3, 0, { t: AT - 200 * 86_400_000 })], flat, AT);
    expect(league.get("a")!.rating).toBeGreaterThan(old.get("a")!.rating);
  });
  it("reads a team's latest 20 games within a year, and nothing after the day it rates", () => {
    const many = Array.from({ length: 30 }, (_, i) => g("a", `o${i}`, 1, 0, { t: AT - (30 - i) * 86_400_000 }));
    expect(fit(many, flat, AT).get("a")!.games).toBe(20);
    expect(fit([g("a", "b", 1, 0, { t: AT - 400 * 86_400_000 })], flat, AT).has("a")).toBe(false);
    expect(fit([g("a", "b", 1, 0, { t: AT + 86_400_000 })], flat, AT).has("a")).toBe(false);
  });
  it("is worth more against a side that beats others", () => {
    const strong = fit([g("a", "b", 1, 0), g("b", "c", 3, 0), g("b", "d", 3, 0)], flat, AT);
    const weak = fit([g("a", "b", 1, 0), g("c", "b", 3, 0), g("d", "b", 3, 0)], flat, AT);
    expect(strong.get("a")!.rating).toBeGreaterThan(weak.get("a")!.rating);
  });
});

describe("playing up", () => {
  const years = (id: string) => (id === "young" ? 2014 : 2013);
  it("assumes no age in the result, and credits the younger side for the game", () => {
    const even = fit([g("young", "old", 1, 1)], flat, AT);
    const up = fit([g("young", "old", 1, 1)], flat, AT, years);
    expect(up.get("young")!.rating - even.get("young")!.rating).toBeCloseTo(PLAY_UP_CREDIT, 6);
    expect(up.get("old")!.rating).toBeCloseTo(even.get("old")!.rating, 6);
  });
  it("stops the credit adding up past a few games, and reads a wide gap as a label error", () => {
    const many = Array.from({ length: 10 }, () => g("young", "old", 1, 1));
    expect(fit(many, flat, AT, years).get("young")!.rating - fit(many, flat, AT).get("young")!.rating).toBeCloseTo(MAX_CREDIT, 6);
    const wide = fit([g("young", "old", 1, 1)], flat, AT, (id) => (id === "young" ? 2016 : 2010));
    const two = fit([g("young", "old", 1, 1)], flat, AT, (id) => (id === "young" ? 2015 : 2013));
    expect(wide.get("young")!.rating).toBeCloseTo(two.get("young")!.rating, 6);
  });
  it("reads the gap from birth years, either way round", () => {
    expect(ageGapOf(2013, 2014)).toBe(1);
    expect(ageGapOf(2014, 2013)).toBe(-1);
    expect(ageGapOf(null, 2013)).toBe(0);
  });
});

describe("cohorts", () => {
  it("is the gender and the oldest birth year", () => {
    expect(cohortOf({ gender: "boys", birthYears: [2014, 2013] })).toBe("boys-2013");
    expect(cohortOf({ gender: "coed", birthYears: [2013] })).toBeNull();
    expect(cohortOf({ gender: "girls", birthYears: [] })).toBeNull();
    expect(cohortLabel("boys-2013")).toBe("Boys 2013/14");
    expect(ageGroupOf("boys-2013", 2026)).toBe("U13");
    expect(ageGroupOf("girls-2016", 2026)).toBe("U10");
  });
});

describe("the league's weight", () => {
  it("weighs a league game by its league", async () => {
    const { leagueWeightOf, levelOf } = await import("./rule.js");
    expect(leagueWeightOf(levelOf("ECNL League BU13 - ECNL"))).toBe(1.1);
    expect(leagueWeightOf(levelOf("RCL BU13 Div 1"))).toBe(0.9);
    expect(leagueWeightOf(levelOf("WPL 2026 Fall U11–U14 BU12 Copa 2 East"))).toBe(0.7);
    expect(leagueWeightOf(null)).toBe(0.7);
  });
});
