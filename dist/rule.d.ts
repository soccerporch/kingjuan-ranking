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
import { type FlightLevel } from "./tier.js";
/** The home side's expected score, 0–1, from two ratings: the Elo curve, for a reader that wants a probability. */
export declare function expected(home: number, away: number): number;
export declare const RULE_VERSION = "2026-11-04";
/** Where the rule lives, for a page that explains it to say so: anyone can read it, run it on the season's games, and propose a change. */
export declare const RULE_SOURCE = "https://github.com/soccerporch/kingjuan-ranking";
export declare const MIN_GAMES = 1;
/** A goal, in rating points: the scale the league ladder is written in. */
export declare const POINTS_PER_GOAL = 100;
/** A margin past this is no more telling than this. */
export declare const GOAL_CAP = 5;
/** The games a rating reads: each team's latest this many, within the window. */
export declare const LAST_GAMES = 20;
export declare const WINDOW_DAYS = 365;
/** A game's weight halves every this many days. */
export declare const HALF_LIFE_DAYS = 120;
/** Matchups this many goals apart weigh half as much as an even one. */
export declare const CLOSE_GOALS = 3;
/** What the league anchor is worth, in games. */
export declare const PRIOR_GAMES = 1;
/** What playing a side a year older earns, per game, whatever the result; and the most it adds up to. */
export declare const PLAY_UP_CREDIT = 9;
export declare const MAX_CREDIT = 30;
/** A gap wider than this is a mislabelled team, not a brave one. */
export declare const MAX_GAP = 2;
export type Level = {
    label: string;
    prior: number;
};
export declare const SELECT: Level;
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
export declare const TIER: {
    readonly one: 1800;
    readonly two: 1740;
    readonly three: 1660;
    readonly four: 1560;
    readonly five: 1490;
    readonly six: 1440;
};
/**
 * ECNL and Pre-ECNL start this far above the ladder's top rung (owner,
 * 2026-11-03): their sides play the strongest schedules, and a table that
 * read the league name for less than that put an ECNL side with a losing
 * record in the ECNL below a winning side of a lower league. Measured on
 * the 2026-27 season so far, the results called right did not move; the
 * forecast's confidence across leagues fell about 5%. RCL Division 1 at
 * U10 and younger, the top of that pyramid, stays on the top rung.
 */
export declare const ECNL_PREMIUM = 120;
export declare function levelOf(text: string, age?: number | null): Level | null;
/**
 * What a league game is worth, by the league: a game in ECNL counts a
 * tenth more than one in a rung-3 league, one in RCL 1 a tenth less, a
 * Copa or Dev game three tenths less (owner, 2026-09-17: the league's
 * tier weighs its games). Read off the prior, so a new league lands on
 * the ladder once and gets its weight with it.
 */
export declare function leagueWeightOf(level: Level | null | undefined): number;
/** The best of several readings — the league division wins over the name. */
export declare function bestLevel(candidates: (Level | null)[]): Level;
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
export declare function ageGapOf(homeYear: number | null, awayYear: number | null): number;
export type Rated = {
    rating: number;
    games: number;
};
/**
 * Every team's rating from these games, solved together. `games` must
 * carry `t`, the kickoff in ms; `at` is the day the rating is for. A game
 * is read when it is among either side's latest LAST_GAMES within the
 * window; a team's `games` counts its own. Returns, for each team that
 * played, its rating and the indexes of the games it counted.
 */
export declare function fit(games: (Game & {
    t: number;
})[], prior: (teamId: string) => number, at: number, yearOf?: (teamId: string) => number | null): Map<string, Rated & {
    counted: number[];
}>;
export declare function cohortOf(team: {
    gender: string | null;
    birthYears: number[] | null;
}): string | null;
/** "Boys 2013/14" — what the page calls a cohort. */
export declare function cohortLabel(cohort: string): string;
/**
 * The age group the cohort plays as, the way the leagues here label it: a
 * "B13/14" side plays BU13 in the season that starts in 2026, so U-N is the
 * season's starting year less the oldest birth year.
 */
export declare function ageGroupOf(cohort: string, seasonStart: number): string;
/**
 * The rule as the page says it — one text for the site and the app, so
 * the two never explain the same numbers differently.
 */
export declare const RULE_STEPS: {
    title: string;
    detail: string;
}[];
/**
 * The rule in a breath — what the site and the app show, with a link to
 * this repository for the rest. RULE_STEPS is the long form.
 */
export declare const RULE_SUMMARY = "A rating is the goal difference that best explains a team's last 20 games within a year, solved against everyone's results at once \u2014 a hundred points is a goal. Recent games, close matchups and stronger competitions count more. Where a team plays anchors it \u2014 ECNL at the top, then MLS Next, ECNL RL, EA and GA, RCL and WPL division by division \u2014 and trophies and playing up add a little. One decided game to be ranked; Washington clubs\u2019 teams are listed, whether the club lists them or a schedule did.";
export declare const RULE_NOTE = "A cohort is a gender and the oldest birth year on the team, so a \u201CB13/14\u201D side ranks with the 2013s \u2014 U13 this season, the way the leagues label it. Washington clubs\u2019 teams are listed \u2014 the club\u2019s own and the ones a schedule printed under its name (owner, 2026-09-18) \u2014 but not a side with no club, and not an out-of-state club\u2019s; games against all of them still count.";
