/**
 * The ranking rule, in one place and pure.
 *
 * Since 2.0 (owner, 2026-11-03) a rating is the goal difference that best
 * explains a team's results, solved over everyone's games at once, the
 * way USA Sport Statistics describes theirs — with our league ladder kept
 * as an anchor. Tested walk-forward on the 2026-27 season, it called
 * 79.4% of decided games right where the Elo replay before it called
 * 77.7%, and was better calibrated.
 *
 * 1. Prior — where the team plays. The best league DIVISION it is entered
 *    in this season sets its anchor (levelOf); a team in no league is
 *    "select". The anchor counts as one game the team drew against a
 *    side exactly at its league's level, so a team with few games sits
 *    near its league and one with twenty sits where its results put it.
 * 2. Results — a team's last 20 decided games within a year, across
 *    seasons. Each is a goal difference, capped at five, and the rating
 *    gap between the two sides should explain it: a hundred points is a
 *    goal. Recent games weigh more (half every 120 days), so do close
 *    matchups, and a game counts by what it was played in — a league by
 *    the league (leagueWeightOf), a tournament by its flight (tier.ts).
 * 3. Opponent — solved together, so beating a side that beats others is
 *    worth more; no age is assumed in the result. Playing up earns a
 *    credit on top: nine points a game against a side a year older,
 *    eighteen two years, thirty at most.
 * 4. Trophies — a flight's champion earns a bonus by its tier (tier.ts),
 *    the runner-up half, once per event this season.
 * 5. Confidence — one decided game to be ranked at all; fewer than five is
 *    provisional.
 *
 * This ranks a cohort; the site's fixture forecast is a different model
 * and is not part of this package.
 */

import { weightOf, type FlightLevel } from "./tier.js";

/** The home side's expected score, 0–1, from two ratings: the Elo curve, for a reader that wants a probability. */
export function expected(home: number, away: number): number {
  return 1 / (1 + 10 ** ((away - home) / 400));
}

export const RULE_VERSION = "2026-11-04";
/** Where the rule lives, for a page that explains it to say so: anyone can read it, run it on the season's games, and propose a change. */
export const RULE_SOURCE = "https://github.com/soccerporch/kingjuan-ranking";
export const MIN_GAMES = 1;

/** A goal, in rating points: the scale the league ladder is written in. */
export const POINTS_PER_GOAL = 100;
/** A margin past this is no more telling than this. */
export const GOAL_CAP = 5;
/** The games a rating reads: each team's latest this many, within the window. */
export const LAST_GAMES = 20;
export const WINDOW_DAYS = 365;
/** A game's weight halves every this many days. */
export const HALF_LIFE_DAYS = 120;
/** Matchups this many goals apart weigh half as much as an even one. */
export const CLOSE_GOALS = 3;
/** What the league anchor is worth, in games. */
export const PRIOR_GAMES = 1;
/** What playing a side a year older earns, per game, whatever the result; and the most it adds up to. */
export const PLAY_UP_CREDIT = 9;
export const MAX_CREDIT = 30;
/** A gap wider than this is a mislabelled team, not a brave one. */
export const MAX_GAP = 2;

export type Level = { label: string; prior: number };

export const SELECT: Level = { label: "select", prior: 1400 };

/**
 * The ladder, as the owner ranks it (2026-09-15):
 *
 *   1. ECNL, Pre-ECNL
 *   2. MLS Next; Elite Academy and Girls Academy at U11 and U12, where they
 *      are the top of the boys' and girls' pyramids because nothing above
 *      them fields that age
 *   3. ECNL RL; EA and GA from U13 up
 *   4. RCL Division 1, GA Aspire, WPL Premier — and WW Dev Div. 1, the
 *      top flight of the WPL's U8–U10 league, which has no Premier
 *   5. and on down, division by division: RCL 2 with WPL Classic and Dev
 *      2, RCL 3 with Dev 3, then Copa and Dev 4, then the rest
 *
 * At U10 and younger (2026-09-17) there is no ECNL, EA or GA, and RCL
 * Division 1 is the top of that pyramid — its sides seed the older
 * academy teams — so there RCL 1 takes rung 1, WPL Dev Div. 1 rung 2
 * (with Pre-MLS / EA, seeding players the same way), RCL 2 rung 3, RCL 3
 * and Dev 2 rung 4, Dev 3 rung 5, Dev 4 rung 6.
 *
 * `age` is the U-number the team plays as this season, where it is known;
 * it decides which rung EA and GA sit on. Without it they read as U13+.
 */
/**
 * Widened 2026-09-17: a rung was 40–50 points, one good weekend, and the
 * league order did not hold. Now a rung at the top is 60–100 points —
 * Pre-ECNL sits 240 above RCL 1 — so a season in a lower league has to
 * be dominant, not merely good, to reach the league above.
 */
export const TIER = { one: 1800, two: 1740, three: 1660, four: 1560, five: 1490, six: 1440 } as const;

/**
 * ECNL and Pre-ECNL start this far above the ladder's top rung (owner,
 * 2026-11-03): their sides play the strongest schedules, and a table that
 * read the league name for less than that put an ECNL side with a losing
 * record in the ECNL below a winning side of a lower league. Measured on
 * the 2026-27 season so far, the results called right did not move; the
 * forecast's confidence across leagues fell about 5%. RCL Division 1 at
 * U10 and younger, the top of that pyramid, stays on the top rung.
 */
export const ECNL_PREMIUM = 120;

export function levelOf(text: string, age: number | null = null): Level | null {
  const t = text.toLowerCase();
  const n = (re: RegExp) => { const m = t.match(re); return m ? Number(m[1]) : null; };
  const young = age !== null && age <= 12;
  if (/pre-?ecnl/.test(t)) return /flight\s*ii/.test(t) ? { label: "Pre-ECNL Flight II", prior: 1770 + ECNL_PREMIUM } : { label: "Pre-ECNL", prior: TIER.one + ECNL_PREMIUM };
  if (/ecnl\s*(rl|regional)/.test(t)) return { label: "ECNL RL", prior: TIER.three };
  if (/\becnl\b/.test(t)) return { label: "ECNL", prior: TIER.one + ECNL_PREMIUM };
  if (/aspire/.test(t)) return { label: "GA Aspire", prior: TIER.four };
  if (/girls academy|\bga\b|pre-?ga/.test(t)) return { label: "GA", prior: young ? TIER.two : TIER.three };
  if (/elite academy|\bea\b|pre-?ea/.test(t)) return { label: "EA", prior: young ? TIER.two : TIER.three };
  if (/mls\s*next/.test(t)) return { label: "MLS Next", prior: TIER.two };
  if (/\bwpl\b|washington premier league/.test(t)) {
    // The WW Dev league is U8–U10, where RCL 1 is the top of the pyramid and
    // Dev Div. 1 sits with Pre-MLS / EA at that age — its sides seed the
    // academies too (owner, 2026-09-17); the divisions step down from there.
    if (/\bdev\b/.test(t)) { const d = n(/div\.?\s*(\d)/) ?? 3; return { label: `WPL Dev ${d}`, prior: d === 1 ? TIER.two : d === 2 ? TIER.four : d === 3 ? TIER.five : d === 4 ? TIER.six : 1400 }; }
    if (/premier/.test(t)) return { label: "WPL Premier", prior: TIER.four };
    if (/classic/.test(t)) return { label: "WPL Classic", prior: TIER.five };
    if (/copa/.test(t)) return { label: "WPL Copa", prior: 1400 };
    return { label: "WPL", prior: TIER.five };
  }
  if (/\brcl\b|regional club league/.test(t)) {
    const d = n(/(?:div|rcl)\s*(\d)/) ?? 2;
    // At U10 and younger nothing sits above RCL: Division 1 is the top of
    // the pyramid there — the sides that seed the ECNL and EA teams a year
    // or two later — so it takes the top rung, and the divisions below it
    // step down from there.
    if (age !== null && age <= 10) return { label: `RCL ${d}`, prior: d === 1 ? TIER.one : d === 2 ? TIER.three : TIER.four };
    return { label: `RCL ${d}`, prior: d === 1 ? TIER.four : d === 2 ? TIER.five : TIER.six };
  }
  return null;
}

/**
 * What a league game is worth, by the league: a game in ECNL counts a
 * tenth more than one in a rung-3 league, one in RCL 1 a tenth less, a
 * Copa or Dev game three tenths less (owner, 2026-09-17: the league's
 * tier weighs its games). Read off the prior, so a new league lands on
 * the ladder once and gets its weight with it.
 */
export function leagueWeightOf(level: Level | null | undefined): number {
  const p = level?.prior ?? SELECT.prior;
  return p >= TIER.one ? 1.1 : p >= TIER.two ? 1.05 : p >= TIER.three ? 1 : p >= TIER.four ? 0.9 : p >= TIER.five ? 0.8 : 0.7;
}

/** The best of several readings — the league division wins over the name. */
export function bestLevel(candidates: (Level | null)[]): Level {
  const real = candidates.filter((l): l is Level => !!l).sort((a, b) => b.prior - a.prior);
  return real[0] ?? SELECT;
}

export type Game = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  /** "league", "tournament", … — with the flight's level (tournaments) or the league's weight, sets the weight. */
  kind: string;
  level?: FlightLevel | null;
  /** A league game's weight, by the league (leagueWeightOf); 1 when not given. */
  leagueWeight?: number | null;
};

/** How much older the home side is than the away side, in years; 0 when either has no birth year. */
export function ageGapOf(homeYear: number | null, awayYear: number | null): number {
  if (homeYear === null || awayYear === null) return 0;
  return awayYear - homeYear;
}

export type Rated = { rating: number; games: number };

/**
 * Every team's rating from these games, solved together. `games` must
 * carry `t`, the kickoff in ms; `at` is the day the rating is for. A game
 * is read when it is among either side's latest LAST_GAMES within the
 * window; a team's `games` counts its own. Returns, for each team that
 * played, its rating and the indexes of the games it counted.
 */
export function fit(
  games: (Game & { t: number })[],
  prior: (teamId: string) => number,
  at: number,
  yearOf: (teamId: string) => number | null = () => null,
): Map<string, Rated & { counted: number[] }> {
  const DAY = 86_400_000;
  const inWindow: number[] = [];
  games.forEach((g, i) => { if (g.t <= at && g.t > at - WINDOW_DAYS * DAY) inWindow.push(i); });
  inWindow.sort((a, b) => games[a].t - games[b].t);
  const own = new Map<string, number[]>();
  for (const i of inWindow) for (const id of [games[i].homeTeamId, games[i].awayTeamId]) (own.get(id) ?? own.set(id, []).get(id)!).push(i);
  for (const [id, list] of own) own.set(id, list.slice(-LAST_GAMES));
  const read = new Set([...own.values()].flat());

  type Edge = { o: string; gd: number; w: number };
  const edges = new Map<string, Edge[]>();
  for (const i of read) {
    const g = games[i];
    const gd = Math.max(-GOAL_CAP, Math.min(GOAL_CAP, g.homeScore - g.awayScore)) * POINTS_PER_GOAL;
    const w = 0.5 ** ((at - g.t) / (HALF_LIFE_DAYS * DAY)) * (g.kind === "league" ? (g.leagueWeight ?? 1) : weightOf(g.kind, g.level ?? null));
    (edges.get(g.homeTeamId) ?? edges.set(g.homeTeamId, []).get(g.homeTeamId)!).push({ o: g.awayTeamId, gd, w });
    (edges.get(g.awayTeamId) ?? edges.set(g.awayTeamId, []).get(g.awayTeamId)!).push({ o: g.homeTeamId, gd: -gd, w });
  }

  // Each team's rating is the weighted average of what its games say it is
  // (the opponent's rating plus the margin) and its anchor; repeated until
  // everyone's settles.
  const r = new Map<string, number>();
  for (const id of edges.keys()) r.set(id, prior(id));
  const close = CLOSE_GOALS * POINTS_PER_GOAL;
  for (let pass = 0; pass < 60; pass++) {
    for (const [id, list] of edges) {
      const me = r.get(id)!;
      let num = PRIOR_GAMES * prior(id), den = PRIOR_GAMES;
      for (const { o, gd, w } of list) {
        const ro = r.get(o)!;
        const ww = w / (1 + ((me - ro) / close) ** 2);
        num += ww * (gd + ro);
        den += ww;
      }
      r.set(id, num / den);
    }
  }

  // The credit for playing up: the younger side, per counted game, whatever the result.
  const out = new Map<string, Rated & { counted: number[] }>();
  for (const [id, counted] of own) {
    let credit = 0;
    for (const i of counted) {
      const g = games[i];
      const opp = g.homeTeamId === id ? g.awayTeamId : g.homeTeamId;
      const gap = Math.min(MAX_GAP, Math.max(0, ageGapOf(yearOf(opp), yearOf(id))));
      credit += gap * PLAY_UP_CREDIT * (g.kind === "league" ? (g.leagueWeight ?? 1) : weightOf(g.kind, g.level ?? null));
    }
    out.set(id, { rating: (r.get(id) ?? prior(id)) + Math.min(MAX_CREDIT, credit), games: counted.length, counted });
  }
  return out;
}

export function cohortOf(team: { gender: string | null; birthYears: number[] | null }): string | null {
  const years = (team.birthYears ?? []).filter((y) => y > 2000 && y < 2030);
  if (!years.length) return null;
  if (team.gender !== "boys" && team.gender !== "girls") return null;
  return `${team.gender}-${Math.min(...years)}`;
}

/** "Boys 2013/14" — what the page calls a cohort. */
export function cohortLabel(cohort: string): string {
  const [gender, year] = cohort.split("-");
  const y = Number(year);
  return `${gender === "boys" ? "Boys" : "Girls"} ${y}/${String(y + 1).slice(2)}`;
}

/**
 * The age group the cohort plays as, the way the leagues here label it: a
 * "B13/14" side plays BU13 in the season that starts in 2026, so U-N is the
 * season's starting year less the oldest birth year.
 */
export function ageGroupOf(cohort: string, seasonStart: number): string {
  return `U${seasonStart - Number(cohort.split("-")[1])}`;
}

/**
 * The rule as the page says it — one text for the site and the app, so
 * the two never explain the same numbers differently.
 */
/* Trophies — a flight's champion and runner-up earn a bonus by its tier on top of the games; see tier.ts and compute.ts. */
export const RULE_STEPS: { title: string; detail: string }[] = [
  {
    title: "Where the team plays.",
    detail:
      "The best league division it is entered in this season sets its anchor — only a league's top division carries the league's level: ECNL and Pre-ECNL; then MLS Next, and Elite Academy and Girls Academy at U11–U12; then ECNL RL, and EA and GA from U13 up; then RCL Division 1, GA Aspire and WPL Premier (and, for U8–U10, WPL Dev Div. 1); then on down division by division — RCL 2 with WPL Classic and Dev 2, RCL 3 with Dev 3. ECNL and Pre-ECNL sit a further 120 points above the next rung, because their sides play the strongest schedules. At U10 and younger, where no academy league exists, RCL Division 1 is the top of the pyramid and sits on the ladder's top rung, and WPL Dev Div. 1 where Pre-MLS and EA do. A team in no league is select. The anchor counts as one game: a team with few results sits near its league, one with twenty where its results put it.",
  },
  {
    title: "Results.",
    detail:
      "A team's last 20 decided games within a year — across seasons, so last spring counts until newer games replace it. Each is a goal difference, capped at five, and a rating is the number that best explains them all against everyone else's at once: a hundred points is a goal, so a side rated 200 above another is expected to beat it by two. Recent games weigh more — a game's weight halves every 120 days — and so do close matchups, since a rout of a far weaker side says little. A game also counts by what it was played in. League games by the league: ECNL and Pre-ECNL a tenth more than a game at the ECNL RL / EA / GA level, RCL 1 and WPL Premier a tenth less, RCL 2 and Classic a fifth less, RCL 3, Copa and the Dev divisions three tenths less. Tournaments by the strength of the flight: the top flights of Surf Cup San Diego, Premier SuperCopa and Club América Cup a third more than a league game; the top flights of the strong regional cups a sixth more; premier cups as much as a league game; select cups ×0.7; rec cups half; a cup nobody has tiered ×0.6 — and each flight below a tournament's top one a tenth less than the top. Which flight is a tournament's top one is read from the teams entered — within an age, the flight whose teams' league levels are strongest — not from its colour, since one cup's Gold is another's second flight.",
  },
  {
    title: "Who it was against.",
    detail:
      "Solved together, so a win over a side that beats everyone else is worth more than a win over one that does not. No age is assumed in a result — across this season's games between ages the older side won 49% — but playing up earns a credit on top, whatever the result: 9 points a game against a side a year older, 18 two years older, 30 at most, because it is the strongest teams that choose to play up.",
  },
  {
    title: "Trophies.",
    detail:
      "A flight's champion this season earns a bonus on top of the games: 60 points for the top flight of a national cup, 38 for a regional cup's, 20 for a premier cup's, 10 for a select cup's, 5 for a rec cup's, and 5 for a cup nobody has tiered (3 for its bottom flights); each flight below the top earns a fifth less of that, down to a fifth — Surf Cup's Super Black 48, its Super White 36, its Black 24 — and the runner-up half. One trophy per event: the final where there is one, the table where there is not.",
  },
  {
    title: "Enough games.",
    detail: "One decided game to be ranked at all; a team with fewer than five is marked provisional.",
  },
];

/**
 * The rule in a breath — what the site and the app show, with a link to
 * this repository for the rest. RULE_STEPS is the long form.
 */
export const RULE_SUMMARY =
  "A rating is the goal difference that best explains a team's last 20 games within a year, solved against everyone's results at once — a hundred points is a goal. Recent games, close matchups and stronger competitions count more. Where a team plays anchors it — ECNL at the top, then MLS Next, ECNL RL, EA and GA, RCL and WPL division by division — and trophies and playing up add a little. One decided game to be ranked; Washington clubs’ teams are listed, whether the club lists them or a schedule did.";

export const RULE_NOTE =
  "A cohort is a gender and the oldest birth year on the team, so a \u201cB13/14\u201d side ranks with the 2013s \u2014 U13 this season, the way the leagues label it. Washington clubs\u2019 teams are listed \u2014 the club\u2019s own and the ones a schedule printed under its name (owner, 2026-09-18) \u2014 but not a side with no club, and not an out-of-state club\u2019s; games against all of them still count.";
