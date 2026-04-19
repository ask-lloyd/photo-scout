#!/usr/bin/env npx tsx
/**
 * Seed test profiles for local development.
 * Creates 3 test user profiles in ~/.photoscout/users/{id}/profile.md
 *
 * Usage: npx tsx scripts/seed-test-profiles.ts
 */

import fs from "fs";
import path from "path";
import os from "os";

const PHOTOSCOUT_DIR = path.join(os.homedir(), ".photoscout", "users");

interface TestProfile {
  id: string;
  content: string;
}

const now = new Date("2026-04-19T12:00:00.000Z");

const profiles: TestProfile[] = [
  // test-user-001: Hot tier, Georgetown TX, Sony gear, landscape, pro
  // last_agent_update 30+ hours ago (stale for hot tier = 6hr threshold)
  {
    id: "test-user-001",
    content: `---
id: test-user-001
name: Ryan Test
email: ryan@test.com
created: '2026-04-01'
updated: '2026-04-19T12:00:00.000Z'
location:
  primary:
    name: Georgetown, TX
    lat: 30.6327
    lng: -97.6781
    timezone: America/Chicago
  saved: []
gear:
  cameras:
    - ref: sony-a7rv
      primary: true
  lenses:
    - ref: sony-fe-24-70-f28-gm-ii
      primary: true
    - ref: sony-fe-70-200-f28-gm-ii
  accessories:
    - type: tripod
      name: Peak Design Travel Tripod
preferences:
  styles:
    - landscape
    - golden_hour
  preferred_times:
    - golden_hour_pm
    - blue_hour_pm
  experience: intermediate
activity:
  tier: hot
  last_active: '2026-04-19T10:00:00.000Z'
  last_agent_update: '2026-04-18T06:00:00.000Z'
  next_scheduled_update: '2026-04-19T12:00:00.000Z'
  total_sessions: 15
subscription:
  plan: pro
  since: '2026-04-01'
---

## AI Context

Ryan is a landscape photographer based in Georgetown, TX. Prefers golden hour and blue hour shots. Recently interested in lake reflections at Bob Wentz Park. Shoots primarily with Sony A7R V + 24-70mm GM II. Has been exploring Enchanted Rock for astro.

## Session Log

### 2026-04-18 — Golden Hour, Georgetown TX
- Light score: 82 | Partly cloudy, 75°F, wind 12 km/h
- Phase: Golden Hour | Color temp: Warm (3500K)
- Face: WSW (248°)
- **Next best window:** Blue Hour PM (score 71)
- **Agent note:** Auto-refresh at 6:45 PM.

### 2026-04-17 — Midday, Georgetown TX
- Light score: 35 | Clear, 82°F, wind 8 km/h
- Phase: Midday | Color temp: Neutral (5500K)
- **Agent note:** Low-quality light. Best window is Golden Hour PM at 7:12 PM.
`,
  },

  // test-user-002: Warm tier, Austin TX, Canon R5 II, action/sports, free
  // last_agent_update 2 days ago (stale for warm tier = 24hr threshold)
  {
    id: "test-user-002",
    content: `---
id: test-user-002
name: Maya Sports
email: maya@test.com
created: '2026-03-15'
updated: '2026-04-19T12:00:00.000Z'
location:
  primary:
    name: Austin, TX
    lat: 30.2672
    lng: -97.7431
    timezone: America/Chicago
  saved: []
gear:
  cameras:
    - ref: canon-r5-ii
      primary: true
  lenses:
    - ref: canon-rf-70-200-f28
      primary: true
  accessories: []
preferences:
  styles:
    - action
    - sports
  preferred_times:
    - morning
    - midday
  experience: advanced
activity:
  tier: warm
  last_active: '2026-04-18T14:00:00.000Z'
  last_agent_update: '2026-04-17T12:00:00.000Z'
  next_scheduled_update: '2026-04-18T12:00:00.000Z'
  total_sessions: 8
subscription:
  plan: free
  since: '2026-03-15'
---

## AI Context

Maya is a sports and action photographer based in Austin, TX. Frequently shoots outdoor events, trail running, and cycling at Lady Bird Lake. Uses Canon R5 II for its fast burst rate and AF tracking. Prefers bright, high-contrast light for freezing motion.

## Session Log

### 2026-04-17 — Morning, Austin TX
- Light score: 68 | Clear, 70°F, wind 5 km/h
- Phase: Morning | Color temp: Neutral (5200K)
- **Agent note:** Good light for action. High contrast helps subject separation.

### 2026-04-15 — Overcast, Austin TX
- Light score: 45 | Overcast, 65°F, wind 10 km/h
- Phase: Midday | Color temp: Cool (6500K)
- **Agent note:** Flat light, less ideal for sports. Consider adding fill flash.
`,
  },

  // test-user-003: Cold tier, Big Bend TX, Fujifilm X-T5, astro/landscape, pro
  // last_agent_update 8+ days ago (stale for cold tier = 7 day threshold)
  {
    id: "test-user-003",
    content: `---
id: test-user-003
name: Carlos Astro
email: carlos@test.com
created: '2026-02-01'
updated: '2026-04-19T12:00:00.000Z'
location:
  primary:
    name: Big Bend, TX
    lat: 29.2498
    lng: -103.2502
    timezone: America/Chicago
  saved: []
gear:
  cameras:
    - ref: fujifilm-x-t5
      primary: true
  lenses:
    - ref: fujifilm-xf-16-55-f28
      primary: true
  accessories:
    - type: tripod
      name: Gitzo Systematic Series 3
    - type: tracker
      name: Sky-Watcher Star Adventurer
preferences:
  styles:
    - astro
    - landscape
  preferred_times:
    - night
    - blue_hour_am
  experience: advanced
activity:
  tier: cold
  last_active: '2026-04-10T22:00:00.000Z'
  last_agent_update: '2026-04-11T06:00:00.000Z'
  next_scheduled_update: '2026-04-18T06:00:00.000Z'
  total_sessions: 3
subscription:
  plan: pro
  since: '2026-02-01'
---

## AI Context

Carlos is an astrophotography enthusiast based near Big Bend National Park, TX. Shoots Milky Way core season and dark-sky landscapes. Uses Fujifilm X-T5 with a star tracker for deep-sky widefield. Visits are infrequent but planned around new moon phases. Last trip focused on the Window Trail viewpoint.

## Session Log

### 2026-04-10 — Night, Big Bend TX
- Light score: 91 | Clear, 55°F, wind 3 km/h
- Phase: Night (New Moon +2) | Bortle: 2
- Milky Way core rise: 11:42 PM
- **Agent note:** Excellent conditions. Core visible until 4:15 AM.

### 2026-03-12 — Night, Big Bend TX
- Light score: 78 | Partly cloudy, 48°F, wind 8 km/h
- Phase: Night (Waning Crescent) | Bortle: 2
- **Agent note:** Intermittent clouds. 60% clear sky windows.
`,
  },
];

function seedProfiles() {
  console.log("🌱 Seeding test profiles...\n");

  for (const profile of profiles) {
    const userDir = path.join(PHOTOSCOUT_DIR, profile.id);
    const profilePath = path.join(userDir, "profile.md");

    fs.mkdirSync(userDir, { recursive: true });
    fs.writeFileSync(profilePath, profile.content, "utf-8");

    console.log(`  ✅ ${profile.id} → ${profilePath}`);
  }

  console.log(`\n🎉 Created ${profiles.length} test profiles in ${PHOTOSCOUT_DIR}`);
}

seedProfiles();
