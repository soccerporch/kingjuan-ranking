/**
 * A season, rated: the league anchors given, every team's latest games
 * solved together (rule.ts fit), then the trophies. This is the whole arithmetic between "here are the
 * games" and "here are the ratings" — the site does the reading (which
 * league each team is in, which flight is a tournament's top one, who won
 * which final) and hands this the answers, so a change to the rule can be
 * judged on a fixture file with no database in sight.
 */
import { fit, MIN_GAMES, SELECT } from "./rule.js";
import { honourBonus } from "./tier.js";
export function rateSeason(input) {
    const team = new Map(input.teams.map((t) => [t.id, t]));
    const prior = new Map(input.teams.map((t) => [t.id, t.level.prior]));
    const yearOf = (id) => team.get(id)?.year ?? null;
    const games = input.games.map((g) => ({ ...g, t: Date.parse(g.kickoffAt) }));
    const at = input.at ? Date.parse(input.at) : Math.max(0, ...games.map((g) => g.t));
    const fitted = fit(games, (id) => prior.get(id) ?? SELECT.prior, at, yearOf);
    const rated = new Map([...fitted].map(([id, r]) => [id, { rating: r.rating, games: r.games }]));
    const counted = new Map([...fitted].map(([id, r]) => [id, r.counted]));
    // One trophy per team per event: the site hands over one, and the first stands.
    const honours = new Map();
    const placedAt = new Set();
    for (const h of input.honours) {
        const at = `${h.teamId}::${h.eventId ?? h.event}`;
        if (placedAt.has(at))
            continue;
        placedAt.add(at);
        const bonus = honourBonus(h.place, h.level, h.division);
        const r = rated.get(h.teamId);
        if (r)
            rated.set(h.teamId, { ...r, rating: r.rating + bonus });
        (honours.get(h.teamId) ?? honours.set(h.teamId, []).get(h.teamId)).push({ event: h.event, division: h.division, place: h.place, tier: h.level?.tier ?? null, bonus });
    }
    return { prior, rated, counted, honours };
}
/**
 * The cohorts' tables: the listed teams with enough games, best first,
 * cut to `top`. What the site's rankings page shows, and what a change
 * to the rule is judged by.
 */
export function rankCohorts(input, out, { top = 50, minGames = MIN_GAMES } = {}) {
    const cohorts = new Map();
    for (const t of input.teams) {
        const r = out.rated.get(t.id);
        if (!t.listed || !t.cohort || !r || r.games < minGames)
            continue;
        (cohorts.get(t.cohort) ?? cohorts.set(t.cohort, []).get(t.cohort)).push({ id: t.id, rating: r.rating, games: r.games });
    }
    for (const [c, rows] of cohorts)
        cohorts.set(c, rows.sort((a, b) => b.rating - a.rating).slice(0, top));
    return new Map([...cohorts].sort(([a], [b]) => a.localeCompare(b)));
}
