# kingjuan-ranking

The rule behind the rankings on [kingjuansoccer.com](https://kingjuansoccer.com/rankings):
how youth soccer teams around Seattle are rated from the league they play in,
their results, and the trophies they win — and how leagues and tournament
flights are tiered so that a Surf Cup final and a rec-league Tuesday do not
count the same.

It is a pure TypeScript library with no database: the site reads its games and
hands them in; this decides what they are worth. The whole point of keeping it
here, in the open, is that a parent, a coach or a club who thinks the rule is
wrong about something can show it — on the same games the site ranks — and
change it.

## The rule in one paragraph

A rating is the goal difference that best explains a team's results, solved
over everyone's games at once (`fit`): each team's latest 20 decided games
within a year, across seasons, margins capped at five goals, a hundred points
a goal. Recent games weigh more (half every 120 days), so do close matchups,
and a game counts by what it was played in — league games by their league,
tournament games by the tier and flight (`weightOf`). Where a team plays
anchors it (`levelOf`: ECNL and Pre-ECNL at the top, then MLS Next, ECNL RL,
EA and GA, RCL and WPL by division), worth one game. No age is assumed in a
result; playing a side a year older earns a small credit on top. A flight's
champion and runner-up earn a bonus by the flight's tier (`honourBonus`): a
national cup's top flight 60 points, a rec cup's 5. One decided game to be
ranked at all, fewer than five provisional. `RULE_STEPS` says the same thing
at length, as the site does.

Before 2.0 (2026-11-04) the rule was an Elo replay of the season with half of
last season carried over. The goal-difference fit replaced it after a
walk-forward test on the 2026-27 season: 79.4% of decided games called right
against 77.7%, and better calibrated.

Two things are read from the games rather than declared: which flight of a
tournament is its top one (`orderFlights` — by the league level of the teams
entered, since one cup's Gold is another's second flight), and who won it
(the site's business; it arrives in the season file as `honours`).

## Run it

```
pnpm install
pnpm test                 # the rule's unit tests
pnpm evaluate             # rate the season on file, print the top 10 of every cohort
pnpm evaluate --top=50 --cohort=boys-2013
pnpm evaluate --diff      # what moved against the recorded tables
```

`fixtures/2026-27.json` is this season as the site read it on the date in the
file: every team with its league level, every decided game with what it was
played in, every trophy with its flight's tier. It is public schedule data —
team names, scores, event titles — and nothing about any person.
`fixtures/2026-27.expected.json` is the tables the current rule produces from
it; CI fails if they move. See [CONTRIBUTING](CONTRIBUTING.md) for how a
change to the rule is made and judged.

## Use it

```ts
import { rateSeason, rankCohorts, type SeasonInput } from "kingjuan-ranking";

const input: SeasonInput = JSON.parse(readFileSync("fixtures/2026-27.json", "utf8"));
const out = rateSeason(input);          // prior, rated, honours — per team id
const tables = rankCohorts(input, out); // cohort → the top 50, best first
```

The site pins a tagged version and stamps every ranking run with
`RULE_VERSION`, so a run always says which rule produced it.

## Layout

| file | what |
|---|---|
| `src/rule.ts` | the league ladder and priors, the goal-difference fit, cohorts, the rule's own description |
| `src/tier.ts` | tournament tiers 1–5, flight order and steps, game weights, trophy bonuses |
| `src/season.ts` | `rateSeason` / `rankCohorts`: a season file in, ratings and tables out |
| `src/reason.ts` | the sentence and the points that explain a team's place |
| `scripts/evaluate.ts` | the evaluation the tables are judged by |

MIT.

`dist/` is committed so the site can depend on a tag straight from GitHub
without a build step; run `pnpm build` before committing a change to `src/`.
