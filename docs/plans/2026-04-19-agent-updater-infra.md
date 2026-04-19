# Agent Updater Infrastructure — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build the batch profile sweep cron, opportunity scanner, and supporting infrastructure so PhotoScout can proactively update user profiles and detect photogenic opportunities.

**Architecture:** Two Vercel Cron jobs: (1) profile sweep — iterates all user profiles in R2/local storage, checks staleness via activity tier, runs the existing light+weather pipeline for stale ones. (2) opportunity scanner — evaluates opportunity rule markdowns against 7-day weather forecasts for each user's location, generates opportunity objects. Both are API routes protected by a CRON_SECRET header.

**Tech Stack:** Next.js 16 API routes, Vercel Cron, Open-Meteo API, suncalc, existing lib/light-engine.ts + lib/settings-advisor.ts + lib/profile.ts + lib/storage.ts

---

## Task 1: Extract refresh pipeline into reusable lib function

**Objective:** Move the core refresh logic from `/api/profile/refresh/route.ts` into `lib/agent-pipeline.ts` so both the on-demand refresh endpoint AND the batch sweep can call it.

**Files:**
- Create: `lib/agent-pipeline.ts`
- Modify: `app/api/profile/refresh/route.ts` (simplify to call the shared function)

**Implementation:**

`lib/agent-pipeline.ts` should export:
```typescript
export interface AgentUpdateResult {
  status: "refreshed" | "skipped" | "error";
  light?: { score: number; phase: string; character: string[]; colorTemperature: any; directionToFace: any; components: any };
  weather?: WeatherData;
  windows?: { name: string; start: string; end: string; score: number; phase: string }[];
  nextBestWindow?: { name: string; score: number; start: string } | null;
  sessionEntry?: SessionLogEntry;
  error?: string;
}

export async function runAgentUpdate(profile: UserProfile): Promise<AgentUpdateResult>
```

Logic (extracted from existing refresh route):
1. Fetch weather for profile's primary location
2. Get sun position via SunCalc
3. Compute light score
4. Get light windows
5. Find next best window
6. Build session log entry
7. Append to session log (cap at 50)
8. Update activity timestamps (last_agent_update, next_scheduled_update, tier)
9. Save profile
10. Return structured result

Then simplify `app/api/profile/refresh/route.ts` to:
- Parse userId, get profile, check pro gate, check debounce
- Call `runAgentUpdate(profile)`
- Return result

---

## Task 2: Build profile sweep cron endpoint

**Objective:** Create a Vercel Cron-compatible API route that iterates all profiles, checks staleness, and batch-updates stale ones.

**Files:**
- Create: `app/api/cron/sweep-profiles/route.ts`

**Implementation:**

```typescript
// GET /api/cron/sweep-profiles
// Protected by CRON_SECRET header (Vercel sends Authorization: Bearer <CRON_SECRET>)
// Also callable manually for testing

export async function GET(req: NextRequest)
```

Logic:
1. Verify `Authorization: Bearer ${CRON_SECRET}` header (skip in dev mode / when no CRON_SECRET set)
2. Call `storageListProfiles()` to get all profile keys
3. For each profile key:
   a. Read profile with `getProfile()`
   b. Check `isProfileStale(profile)` — if not stale, skip
   c. Call `runAgentUpdate(profile)` from lib/agent-pipeline
   d. Track results (updated count, skipped count, errors)
4. Return summary JSON: `{ updated: N, skipped: N, errors: N, details: [...] }`

**Rate limiting considerations:**
- Open-Meteo is free but has rate limits — add a small delay between profile updates (100ms)
- Cap at 50 profiles per sweep run (paginate if needed later)
- Group profiles by location (same lat/lng rounded to 2 decimals) to reuse weather data

**Weather cache optimization:**
- Build a location→weather cache at the start of the sweep
- Multiple users in the same area share one weather fetch
- Cache key: `${lat.toFixed(2)},${lng.toFixed(2)}`

---

## Task 3: Build opportunity scanner library

**Objective:** Create `lib/opportunity-scanner.ts` that evaluates weather forecasts against opportunity rules to detect photogenic conditions.

**Files:**
- Create: `lib/opportunity-scanner.ts`
- Modify: `lib/types.ts` (add Opportunity types)

**Types to add to `lib/types.ts`:**

```typescript
// ─── Opportunity ───
export interface Opportunity {
  id: string;                    // e.g. "epic-sunset-2026-04-19-georgetown"
  ruleId: string;                // links to opportunity-rules/{ruleId}.md
  type: string;                  // "epic-sunset", "fog-event", "storm-break", etc.
  title: string;                 // "Epic Sunset"
  description: string;           // Natural language description
  score: number;                 // 0-100 confidence score
  confidence: "high" | "moderate" | "low";
  timing: {
    start: string;               // ISO 8601
    end: string;
    label: string;               // "In 27 min", "Tomorrow 6:34 PM", etc.
    daysOut: number;             // 0 = today, 1 = tomorrow, etc.
  };
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  suggestedSpot?: {
    id: string;
    name: string;
    distance_mi: number;
  };
  conditions: {
    cloudCover: number;
    windSpeed: number;
    humidity: number;
    visibility: number;
    temperature: number;
  };
  settings?: {
    faceDirection: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
  };
}

export interface OpportunityRule {
  id: string;
  name: string;
  type: string;
  description: string;
  conditions: OpportunityCondition[];
  score_weight: number;          // 0-1, how much this rule contributes
  time_windows: string[];        // e.g. ["golden_hour_pm", "sunset"]
  min_score: number;             // minimum score to trigger (default 60)
}

export interface OpportunityCondition {
  field: string;                 // "cloudCover", "humidity", "visibility", etc.
  operator: "gt" | "lt" | "between" | "eq";
  value: number | [number, number];
  weight: number;                // contribution to this rule's score
}
```

**`lib/opportunity-scanner.ts` exports:**

```typescript
export function evaluateOpportunityRules(
  weather7Day: HourlyWeatherForecast,
  location: UserLocation,
  rules: OpportunityRule[]
): Opportunity[]

export function loadOpportunityRules(): OpportunityRule[]
// Reads from compiled public/data/opportunity-rules.json

export async function scanOpportunities(
  location: UserLocation,
  days?: number  // default 7
): Promise<Opportunity[]>
// Full pipeline: fetch 7-day forecast, load rules, evaluate, sort by score
```

The scanner should:
1. Fetch 7-day hourly weather from Open-Meteo (extend existing fetchWeather to support forecast_days param)
2. For each hour in the forecast, compute sun position via SunCalc
3. Check if the hour falls in a rule's time_windows (golden hour, blue hour, etc.)
4. If yes, evaluate the rule's conditions against weather for that hour
5. Score each match (weighted sum of condition scores × rule weight)
6. Merge nearby hours into single opportunities (e.g., 3 consecutive golden hour hours = 1 opportunity)
7. Sort by score descending, return top opportunities

---

## Task 4: Create opportunity rule markdown files

**Objective:** Seed `content/opportunity-rules/` with initial rule definitions that the opportunity scanner can evaluate.

**Files:**
- Create: `content/opportunity-rules/_schema.md`
- Create: `content/opportunity-rules/epic-sunset.md`
- Create: `content/opportunity-rules/fog-event.md`
- Create: `content/opportunity-rules/storm-break.md`
- Create: `content/opportunity-rules/golden-hour-clear.md`
- Create: `content/opportunity-rules/blue-hour-calm.md`
- Create: `content/opportunity-rules/dramatic-clouds.md`
- Create: `content/opportunity-rules/milky-way-window.md`

**Each rule file format:**

```markdown
---
id: epic-sunset
name: Epic Sunset
type: sunset
description: High cloud drama during golden hour creates spectacular colors
score_weight: 1.0
time_windows: [golden_hour_pm, sunset]
min_score: 65
conditions:
  - field: cloudCover
    operator: between
    value: [30, 75]
    weight: 0.4
  - field: cloudCoverHigh
    operator: gt
    value: 20
    weight: 0.3
  - field: humidity
    operator: between
    value: [30, 80]
    weight: 0.15
  - field: visibility
    operator: gt
    value: 10
    weight: 0.15
---

# Epic Sunset

Broken clouds (30-75% coverage) with high cirrus create the canvas for dramatic
sunset colors. The best sunsets happen when...
```

---

## Task 5: Extend md-to-json build pipeline for opportunity rules

**Objective:** Update `scripts/md-to-json.ts` to also compile `content/opportunity-rules/*.md` → `public/data/opportunity-rules.json`.

**Files:**
- Modify: `scripts/md-to-json.ts`

The build step should parse each opportunity rule markdown, extract YAML frontmatter (which contains the structured conditions), and output a JSON array the scanner can consume at runtime.

---

## Task 6: Build opportunity scanner cron endpoint

**Objective:** Create a Vercel Cron API route that runs the opportunity scanner for all active users.

**Files:**
- Create: `app/api/cron/scan-opportunities/route.ts`

**Implementation:**

```typescript
// GET /api/cron/scan-opportunities
// Runs hourly via Vercel Cron
```

Logic:
1. Verify CRON_SECRET
2. List all profiles
3. Group by location (deduplicate weather fetches)
4. For each unique location, run `scanOpportunities(location, 7)`
5. Store opportunities (for now, return them — later, store per-user in R2)
6. Return summary: `{ locations_scanned: N, opportunities_found: N, top: [...] }`

---

## Task 7: Create Vercel cron configuration

**Objective:** Configure Vercel to run both cron jobs on schedule.

**Files:**
- Create or modify: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sweep-profiles",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/scan-opportunities",
      "schedule": "0 * * * *"
    }
  ]
}
```

Profile sweep: every 6 hours (matches "hot" tier minimum)
Opportunity scanner: every hour (catches weather changes)

---

## Task 8: Create test profiles for development

**Objective:** Create a few test user profiles in local storage (~/.photoscout/) so the sweep and scanner have data to work with.

**Files:**
- Create: `scripts/seed-test-profiles.ts`

The script should create 3 test profiles:
1. **test-user-001** — "hot" tier, Georgetown TX, Sony A7R V + 24-70mm, landscape shooter
2. **test-user-002** — "warm" tier, Austin TX, Canon R5 II + 70-200mm, action/sports
3. **test-user-003** — "cold" tier, Big Bend TX, Fuji X-T5, astro/landscape

Each profile should have realistic frontmatter, some AI context, and 2-3 session log entries.

---

## Task 9: Add API route for fetching opportunities

**Objective:** Create a user-facing API endpoint that returns opportunities for a given user/location.

**Files:**
- Create: `app/api/opportunities/route.ts`

```typescript
// GET /api/opportunities?userId=xxx (uses profile location)
// GET /api/opportunities?lat=30.63&lng=-97.68&days=7 (direct location)
```

Returns cached/computed opportunities sorted by score. This is what the Opportunities page will consume.

---

## Execution Order

Tasks 1-2 can be done first (they build the sweep system on existing infra).
Tasks 3-6 build the opportunity system.
Tasks 7-9 are configuration and testing.

Task 1 → Task 2 → Task 3+4 (parallel) → Task 5 → Task 6 → Task 7 → Task 8 → Task 9
