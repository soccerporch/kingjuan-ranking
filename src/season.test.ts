import { describe, expect, it } from "vitest";

import { SELECT, TIER } from "./rule.js";
import { rankCohorts, rateSeason, type SeasonInput } from "./season.js";

const team = (id: string, over: Partial<SeasonInput["teams"][number]> = {}): SeasonInput["teams"][number] => ({
  id, name: id, cohort: "boys-2013", year: 2013, level: SELECT, league: null, last: null, listed: true, ...over,
});
const game = (home: string, away: string, hs: number, as: number, over: Partial<SeasonInput["games"][number]> = {}): SeasonInput["games"][number] => ({
  homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, kind: "league", kickoffAt: "2026-09-01T00:00:00Z", event: "League", ...over,
});

describe("rateSeason", () => {
  it("anchors each team at its league prior, and no longer reads last season's carry", () => {
    const out = rateSeason({ from: "2026-05-01", teams: [team("a", { level: { label: "ECNL", prior: TIER.one }, last: { rating: TIER.one + 100, games: 8 } }), team("b")], games: [], honours: [] });
    expect(out.prior.get("a")).toBe(TIER.one);
    expect(out.prior.get("b")).toBe(SELECT.prior);
  });

  it("names the games each rating counted", () => {
    const out = rateSeason({ from: "2026-05-01", teams: [team("a"), team("b")], games: [game("a", "b", 1, 0), game("b", "a", 2, 2)], honours: [] });
    expect(out.counted.get("a")).toEqual([0, 1]);
    expect(out.rated.get("a")!.games).toBe(2);
  });

  it("pays one trophy per team per event, the first handed over", () => {
    const out = rateSeason({
      from: "2026-05-01",
      teams: [team("a"), team("b")],
      games: [game("a", "b", 2, 0, { kind: "tournament", level: { tier: 1, step: 0 }, event: "Surf Cup" })],
      honours: [
        { teamId: "a", place: "champion", event: "Surf Cup", division: "Best of the Best", level: { tier: 1, step: 0 } },
        { teamId: "a", place: "champion", event: "Surf Cup", division: "BU13 Gold", level: { tier: 1, step: 0 } },
        { teamId: "b", place: "runner-up", event: "Surf Cup", division: "Best of the Best", level: { tier: 1, step: 0 } },
      ],
    });
    expect(out.honours.get("a")).toHaveLength(1);
    expect(out.honours.get("a")![0].bonus).toBe(60);
    expect(out.honours.get("b")![0].bonus).toBe(30);
    const played = rateSeason({ from: "2026-05-01", teams: [team("a"), team("b")], games: [game("a", "b", 2, 0, { kind: "tournament", level: { tier: 1, step: 0 }, event: "Surf Cup" })], honours: [] });
    expect(out.rated.get("a")!.rating - played.rated.get("a")!.rating).toBe(60);
  });
});

describe("rankCohorts", () => {
  it("lists the listed teams with enough games, best first, by cohort", () => {
    const input: SeasonInput = {
      from: "2026-05-01",
      teams: [team("a"), team("b"), team("c", { listed: false }), team("d", { cohort: "girls-2013" })],
      games: [game("a", "b", 3, 0), game("a", "c", 1, 0), game("b", "c", 0, 0), game("a", "d", 1, 1), game("b", "d", 0, 2), game("c", "d", 0, 1)],
      honours: [],
    };
    const ranked = rankCohorts(input, rateSeason(input));
    expect([...ranked.keys()]).toEqual(["boys-2013", "girls-2013"]);
    expect(ranked.get("boys-2013")!.map((r) => r.id)).toEqual(["a", "b"]);
    expect(ranked.get("girls-2013")!.map((r) => r.id)).toEqual(["d"]);
  });
});
