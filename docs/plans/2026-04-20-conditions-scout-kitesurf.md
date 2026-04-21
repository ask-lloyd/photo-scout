# ConditionsScout (Multi-Activity Expansion) — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Expand PhotoScout into a multi-activity conditions app ("ConditionsScout") where each user picks an activity (photography, kitesurfing — more later) and gets gear profiles, location-based spots, opportunity scoring, and in-the-moment advice tailored to that activity. Prototyped on the `conditions-scout` branch with its own Vercel preview URL so `main` / PhotoScout stays 100% untouched.

**Architecture:** Keep the existing weather + sun + scoring engine (it's already activity-agnostic). Introduce an `Activity` concept that parameterizes: gear schema, opportunity rules, spot queries, and "shoot/ride/play right now" advice. Photography becomes activity #1 (with today's exact behavior). Kitesurfing becomes activity #2, seeded with kites/boards scraped from Gong, Duotone, and Core.

**Tech Stack:** Next.js 16 / React 19 / Tailwind 4 / MapLibre / Open-Meteo / SunCalc (unchanged). Adds: wind-direction scoring, optional tide API (Stormglass or NOAA CO-OPS for US coasts), activity selector in localStorage.

**Scope for first prototype:**
- Activities: **photography** (existing) + **kitesurfing** (new). Golf deferred.
- Spots: dynamic — use user's current geolocation; also allow a "planning location" override (text search → geocode). No curated spot list required for kitesurfing v1.
- Gear: kitesurfing kites + twin-tip / directional / foil boards from **Gong**, **Duotone**, and **Core Kiteboarding** (scraped).
- Deployment: Vercel auto-preview of the `conditions-scout` branch at a dedicated URL.

---

## Non-Goals (explicit)
- No golf, cycling, running, hiking in v1.
- No native app. PWA install behavior inherited from main app.
- No social / sharing / trip reports.
- No cross-activity gear inference (a surf harness doesn't help photography, etc.).

---

## Data Model Changes

### New: `Activity`
```ts
type ActivityId = "photography" | "kitesurf";
interface Activity {
  id: ActivityId;
  label: string;
  icon: string;
  gearCategories: string[];    // e.g. ["camera","lens","filter"] or ["kite","board","harness"]
  opportunityRules: string[];  // rule ids
  scorer: (conds: WeatherData & Sun) => number;
}
```

### New: `KitesurfGear`
```ts
interface Kite {
  id: string; brand: string; model: string;
  sizes_m2: number[];           // e.g. [7,9,11,13]
  discipline: ("freeride"|"wave"|"freestyle"|"foil"|"big-air")[];
  wind_range_knots: [number,number] | null;
  year?: number; url?: string; summary?: string;
}
interface Board {
  id: string; brand: string; model: string;
  type: "twintip"|"directional"|"foilboard";
  sizes_cm?: string[];          // variable: length/width vs single
  discipline: string[];
  url?: string; summary?: string;
}
```

### Extended: `GearProfile` (localStorage per activity)
Key becomes `conditionsscout-gear:${activityId}` so each activity has its own profile.

---

## Opportunity Rules — Kitesurfing (first pass)

| Rule | Conditions |
|------|------------|
| "Epic Session" | wind 18–28 kt steady, onshore/side-on, dry, 3h+ daylight remaining |
| "Light Wind Foil" | wind 8–14 kt, any direction that isn't offshore, dry |
| "Big Air Day" | wind 25–40 kt, gust factor <1.4, onshore/side-on |
| "Skip It" | wind <6 kt OR >40 kt OR offshore OR thunderstorm within 2h |

Wind direction scoring needs a `preferredBearing` per spot (coast orientation). For v1 we'll ask the user once when they set a planning location.

---

## Task Breakdown (high-level — detailed tasks expanded before execution)

### Phase 0: Safety & Preview (this session)
1. Branch `conditions-scout` created from `main`. ✅
2. Write this plan doc at `docs/plans/2026-04-20-conditions-scout-kitesurf.md`.
3. Scrape Gong / Duotone / Core into `content/kitesurf-gear/*-raw.json` (parallel subagents).
4. Commit + push. Vercel auto-creates preview at `photo-scout-git-conditions-scout-ask-lloyd.vercel.app` (exact URL confirmed after push).

### Phase 1: Foundation
5. Add `ActivityId` + `useActivity()` hook (localStorage, default `photography`).
6. Add activity-switcher to `NavHeader` (two icons, no routing change).
7. Normalize scraped JSON → `content/kitesurf-gear/kites/*.md` and `boards/*.md` via markdown-as-DB pattern.
8. Extend `scripts/md-to-json.ts` to compile `kites` and `boards` categories.

### Phase 2: Kitesurf Gear Profile
9. Build `/gear/kitesurf` page mirroring `/gear` structure: kite quiver (multi-size rows), board list, harness free-text.
10. Kite-size filter by wind range (hint: "12m good for your local 15–20kt forecast").

### Phase 3: Kitesurf Conditions
11. Add wind-direction field to forecast API (already in Open-Meteo — just surface it).
12. Write `lib/activity-scorers/kitesurf.ts` — scorer returns 0–100 by wind speed, gust factor, direction vs `preferredBearing`, precipitation.
13. Dashboard variant for kitesurf: "Wind Now" card (kt + direction compass), "Recommended Kite Size" card (derived from user's quiver + current wind), "Next Good Window" card.

### Phase 4: Spots (dynamic, location-driven)
14. Planning-location picker: text input → Open-Meteo geocoding API → stored in `useGeolocation()` as override.
15. No static kite-spot list. If user wants to save a spot, they save a pin with `{lat, lng, name, preferredBearing}` to localStorage.

### Phase 5: Opportunity Rules
16. Create `content/opportunity-rules/kitesurf-*.md` for the 4 rules above.
17. Teach `opportunity-scanner.ts` to filter rules by activity.

### Phase 6: Polish & QA
18. Landing page gets activity-picker splash on first visit.
19. Preview URL smoke test with real forecast data.
20. Share URL with Melissa for feedback; iterate.

---

## Risk Register
- **Tide data** — deferred; inland kitesurfers don't need it, and coastal testers can eyeball for v1.
- **Scraping brittleness** — cache scraped JSON in repo so we don't depend on brand sites at runtime.
- **Wind direction vs spot orientation** — simplify by letting the user tag a planning spot with "shore faces →" once.
- **Activity bleed into PhotoScout** — keep branch isolated until we explicitly merge.

---

## Open Questions for Melissa / Ryan
1. Default home when someone visits the preview URL: activity picker modal, or auto-detect last-used activity?
2. For kitesurfing gear: do users enter *their* kite sizes per model (e.g. "I have the Evo in 9m and 12m"), or just which models they own?
3. Tide data priority — nice-to-have in v1, or defer to v2?

---

## Execution Handoff
Once scraped data lands and this plan is reviewed, execute via `subagent-driven-development` with fresh subagents per Phase 1–6 task, two-stage review (spec compliance + code quality) per task, and commits at the end of each.
