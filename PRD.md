# PhotoScout — Product Requirements Document

**Version:** 1.0
**Date:** March 21, 2026
**Status:** Draft
**Author:** Lloyd (PM) / Ryan Belke (Founder)

---

## 1. Executive Summary

Photographers spend years developing intuition for light — memorizing how sun angle, cloud cover, humidity, wind, and terrain interact, then mentally translating conditions into camera settings. That knowledge lives in their heads, built through thousands of failed shots.

**PhotoScout** eliminates the guesswork. It's a web application that fuses real-time solar ephemeris data, weather intelligence, terrain analysis, and photography expertise into a single tool that answers: *what to shoot, where to face, when to be there, and exactly what settings to use.*

Think of it as: **"Your expert photographer friend who already checked everything and texts you: 'Be at the overlook in 40 minutes, face southwest, f/8, ISO 200. The clouds are going to light up.'"**

---

## 2. Problem Statement

### The Photographer's Workflow Today

1. **Check weather** — Multiple apps (Weather.com, Windy, cloud forecast sites)
2. **Check sun position** — The Photographer's Ephemeris (TPE), SunCalc, or PhotoPills
3. **Check golden/blue hour** — Separate calculators
4. **Scout locations** — Google Maps, Instagram, local knowledge
5. **Mentally compute settings** — "Partly cloudy sunset at this angle means f/8, 1/250, ISO 200... probably"
6. **Hope for the best**

### What's Missing

- **No tool connects weather → light quality → camera settings.** TPE tells you where the sun is. Weather apps tell you cloud cover. Neither says "the light will be warm and diffused at 6:47pm, shoot at f/5.6, ISO 400, 1/125."
- **No tool scouts opportunities proactively.** Photographers react to conditions rather than being alerted to upcoming photogenic moments.
- **No tool accounts for hyperlocal conditions.** A valley 10 miles away might have completely different fog/cloud dynamics.

---

## 3. Target Users

### Primary: Enthusiast Photographers
- Own interchangeable-lens cameras (Sony, Canon, Nikon, Fuji)
- Shoot landscapes, golden hour, action/sports, astro
- 1-5 years experience — past auto mode, still building intuition
- Willing to pay for a tool that makes them better

### Secondary: Professional Landscape Photographers
- Strong existing intuition but want efficiency
- Value scouting/alert features over settings recommendations
- Want to discover new locations in unfamiliar regions

### Tertiary: Travel Photographers
- Visiting a region for the first time
- Need compressed local knowledge: "Where should I be and when?"

---

## 4. Core Features

### 4.1 Light Intelligence Engine

The central computation layer that fuses multiple data sources into a unified light model.

**Inputs:**

| Data Source | What It Provides | API/Library |
|---|---|---|
| Sun position | Azimuth, altitude, golden/blue hour times | `suncalc` (npm, client-side) |
| Moon position | Phase, rise/set, illumination % | `suncalc` (included) |
| Weather — current | Cloud cover %, type (cirrus/cumulus/stratus), humidity, visibility, temp | Open-Meteo (free, no key) |
| Weather — forecast | Hourly cloud/precip/visibility for next 7 days | Open-Meteo |
| Air quality | Haze, particulate matter (affects light scatter) | OpenWeatherMap Air Pollution API |
| Elevation/terrain | Horizon obstruction, valley fog potential | Mapbox Terrain API |
| User location | GPS coordinates | Browser Geolocation API |

**Outputs:**
- **Light Quality Score** (1-100) — composite rating of how photogenic conditions are
- **Light Character** — descriptive tags: "warm diffused", "harsh direct", "dramatic side-light", "moody overcast", "golden backlit"
- **Color Temperature Estimate** — approximate Kelvin range
- **Direction to Face** — compass bearing for optimal light angle
- **Shadow Analysis** — where shadows fall, length, contrast ratio

#### Light Quality Scoring Algorithm

```
Base Score Components:
├── Sun Altitude Factor (0-25 pts)
│   ├── Golden hour (0-6° altitude): 25 pts
│   ├── Sweet spot (6-15°): 20 pts
│   ├── Midday harsh (45°+): 5 pts
│   └── Below horizon (blue hour): 22 pts
│
├── Cloud Factor (0-25 pts)
│   ├── Broken clouds 40-70%: 25 pts (dramatic light)
│   ├── High thin clouds (cirrus): 20 pts (color amplifier)
│   ├── Full overcast: 12 pts (soft/even, good for portraits)
│   ├── Clear sky: 15 pts (good, not dramatic)
│   └── Low thick overcast: 5 pts (flat, dull)
│
├── Atmospheric Factor (0-25 pts)
│   ├── Humidity 40-65%: adds warmth and scatter
│   ├── Visibility 10-25km: optimal haze for depth
│   ├── Post-rain clarity: bonus points
│   └── Air quality (moderate particulates enhance sunsets)
│
└── Special Events (0-25 pts)
    ├── Fog/mist present: +15
    ├── Storm clearing: +20
    ├── Snow on ground (reflector): +10
    ├── Moonrise during blue hour: +15
    └── Milky Way visibility: +20 (dark sky + new moon)
```

### 4.2 Camera Settings Advisor

Given the Light Intelligence output + user's camera/lens, recommend specific settings.

**User Profile Inputs (one-time setup):**
- Camera body (e.g., Sony A7R V)
- Lens(es) owned (e.g., 24-70mm f/2.8, 70-200mm f/4)
- Shooting style preferences (landscape, portrait, action, astro)
- Tripod available?

**Output per time window:**

```
┌─────────────────────────────────────────────────┐
│  GOLDEN HOUR — Today 7:12 PM - 7:44 PM         │
│  Light Quality: 87/100 ★★★★☆                   │
│  Character: Warm dramatic side-light            │
│                                                  │
│  RECOMMENDED SETTINGS                            │
│  ├── Aperture:   f/8 (max sharpness, deep DOF)  │
│  ├── Shutter:    1/250s                          │
│  ├── ISO:        200                             │
│  ├── WB:         5500K (or Daylight preset)      │
│  ├── Focal:      35-50mm for landscapes          │
│  ├── Filter:     2-stop GND (bright sky)         │
│                                                  │
│  FACE: Southwest (218°)                          │
│  TIP: Sun at 12° — side-light on west-facing    │
│       subjects. Look for long shadows.           │
│                                                  │
│  EXPOSURE BRACKET: ±1.3 EV for HDR              │
│  FOCUS: f/8 hyperfocal = 8.2ft (24mm)           │
└─────────────────────────────────────────────────┘
```

**Settings Logic:**
- **Available light (EV)** — from sun altitude + cloud cover + atmospheric conditions
- **Subject type** — landscape (deep DOF), portrait (shallow DOF), action (fast shutter)
- **Lens constraints** — max aperture, focal length range, IS/VR
- **Body constraints** — usable ISO range (sensor-specific), dynamic range
- **Tripod status** — if yes, longer exposures become viable

### 4.3 Interactive Sun/Moon Map

Builds on what The Photographer's Ephemeris (TPE) does, fully integrated.

**Features:**
- **Sun path arc** — visual overlay of the sun's trajectory across the sky
- **Moon path arc** — with phase indicator
- **Golden/blue hour shading** — map tints showing which areas are in golden light vs shadow
- **Shadow casting** — terrain elevation data shows where mountains/buildings cast shadows
- **Milky Way arc** — galactic center position and visibility window
- **Time scrubber** — drag a timeline to see how light changes throughout the day
- **AR compass overlay** — mobile: device orientation overlays sun/moon paths on camera viewfinder (Phase 5)

**Map Stack:** Mapbox GL JS (WebGL, 3D terrain support, custom overlay layers)

### 4.4 Opportunity Scout

Proactively scans upcoming conditions for photogenic moments.

Every hour, evaluates 7-day forecasts for the user's region (configurable radius: 10-100 miles) and generates **Opportunities.**

| Type | Trigger Conditions | Example Alert |
|---|---|---|
| 🌅 Epic Sunset | Cloud 30-60% + low humidity + clear western horizon | "Tomorrow's sunset looks dramatic — 40% broken clouds, warm light 7:12-7:38 PM" |
| 🌫️ Fog Event | Temp → dew point overnight + valley terrain + clear sky | "Valley fog likely at Lake Travis sunrise — be in position by 6:45 AM" |
| ⛈️ Storm Break | Rain ending + clearing from west + golden hour timing | "Storm clears at 6 PM, golden hour at 7:12 — post-rain clarity + dramatic sky" |
| 🌌 Astro Window | New moon ± 3 days + clear sky + low light pollution | "Milky Way core visible tonight 11 PM-2 AM, limiting magnitude 5.8" |
| 🌈 Rainbow Potential | Sun altitude < 42° + rain in opposite direction | "Conditions favor rainbow at 5:30 PM — face east" |
| 🏔️ Alpenglow | Clear sky + mountains + sun 1-5° below horizon | "Alpenglow on peaks expected 7:45-7:55 PM" |
| 🌊 Flat Water | Wind < 5mph + sunrise/sunset + lake/coast nearby | "Mirror-calm at Lake Georgetown tomorrow sunrise — reflections" |

**Notification Channels:** Web push, email digest, SMS (Twilio), calendar integration

### 4.5 Location Database & Community Spots

**Seeded Data:**
- Popular photography locations from public geotagged photo data
- National/state park overlooks and trailheads
- Google Maps "scenic viewpoint" POIs

**Per Spot Metadata:**
- Best time of day, season, conditions
- Sample compositions and tips
- Parking info, accessibility, permits
- Community ratings and reports

**Community Contributions:**
- Users pin new spots with notes
- Upload sample shots with EXIF data (auto-extracts settings)
- "What worked" reports tied to weather conditions
- AI agent reviews submissions for quality before publishing

### 4.6 Shot Planner

Select a spot + date → get a minute-by-minute plan:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHOT PLAN: Bob Wentz Park, Lake Travis
Date: Saturday, March 22, 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ARRIVAL: 6:15 AM (30 min before blue hour)

06:15 — Setup & Scout
  Position: East shore, face west
  Wind: 4 mph NNW — light chop

06:45-07:08 — BLUE HOUR ★★★★
  Settings: f/8, 2s (tripod), ISO 100, WB 7500K
  Shoot: Long exposure for smooth water

07:08-07:42 — GOLDEN HOUR ★★★★★
  Light Quality: 91/100
  Settings: f/11, 1/125, ISO 200, WB 5200K
  Shoot: Backlit spray from kitesurfers

07:42-08:30 — POST-GOLDEN
  Settings: f/8, 1/500, ISO 200
  Shoot: Action/sports, shutter priority

08:30+ — WRAP
  Light harshens. Switch to detail/macro in shade.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 5. Architecture — Markdown-as-Database

### 5.1 The Pattern

```
Markdown Files (source of truth)
       │
       ▼  build step / file watcher
JSON Files (API contract for frontend)
       │
       ▼
Next.js (UI consumes static JSON)
```

**Why markdown-as-db:**
- Camera/lens databases are structured reference docs — natural markdown
- Spot data is descriptive, community-editable text
- AI agents can read, understand context, and edit markdown files without an ORM
- Git gives versioning, diffs, rollback for free
- No database to manage, no migrations, no connection pooling
- The settings knowledge base evolves through document editing, not code changes

**What does NOT live in markdown:**
- Real-time computed data (sun position, weather) — ephemeral API calls
- User auth tokens — lightweight KV store
- Transient state (current light score) — computed on-the-fly

### 5.2 Content File Structure

```
photo-scout/
├── content/                          # ← THE "DATABASE"
│   ├── cameras/
│   │   ├── _schema.md                # field definitions for AI/human editors
│   │   ├── sony-a7rv.md
│   │   ├── canon-r5-ii.md
│   │   └── ...
│   ├── lenses/
│   │   ├── _schema.md
│   │   ├── sony-fe-24-70-f28-gm-ii.md
│   │   └── ...
│   ├── spots/
│   │   ├── _schema.md
│   │   ├── us/texas/bob-wentz-park.md
│   │   ├── us/texas/enchanted-rock.md
│   │   └── ...
│   ├── shooting-guides/
│   │   ├── _schema.md
│   │   ├── landscape-golden-hour.md
│   │   ├── action-sports-daylight.md
│   │   ├── astrophotography.md
│   │   └── ...
│   ├── settings-rules/
│   │   ├── _schema.md
│   │   ├── exposure-base-tables.md
│   │   ├── iso-performance.md
│   │   ├── hyperfocal-tables.md
│   │   └── filter-recommendations.md
│   └── opportunity-rules/
│       ├── _schema.md
│       ├── epic-sunset.md
│       ├── fog-event.md
│       ├── storm-break.md
│       └── ...
│
├── users/                             # user data (git-ignored)
│   └── {user-id}/
│       ├── profile.md
│       ├── gear.md
│       ├── saved-spots.md
│       └── preferences.md
│
├── public/data/                       # GENERATED JSON (build artifact)
│   ├── cameras.json
│   ├── lenses.json
│   ├── spots/index.json
│   ├── shooting-guides.json
│   └── ...
│
├── scripts/
│   ├── md-to-json.ts                  # markdown → JSON converter
│   ├── validate-content.ts            # schema validation
│   └── watch-content.ts               # dev mode file watcher
│
├── app/                               # Next.js app
└── lib/
    ├── light-engine.ts                # sun + weather → light score
    ├── settings-advisor.ts            # light + gear → settings
    └── opportunity-scanner.ts         # forecast → opportunities
```

### 5.3 Markdown File Format

Every content file uses **YAML frontmatter** for structured data + **markdown body** for rich text. The build step extracts frontmatter → JSON fields, renders body → HTML.

**Camera example: `content/cameras/sony-a7rv.md`**
```markdown
---
id: sony-a7rv
make: Sony
model: A7R V
sensor_size: full_frame
megapixels: 61
base_iso: 100
max_usable_iso: 12800
dynamic_range_ev: 14.7
has_ibis: true
ibis_stops: 8
burst_fps: 10
mount: sony_e
tags: [landscape, studio, resolution]
---

# Sony A7R V

## Strengths
- 61MP resolution — massive cropping latitude
- AI-based autofocus (human, animal, bird, vehicle, insect)
- 8-stop IBIS for handheld shooting down to ~1/4s at wide angles
- 14.7 EV dynamic range at base ISO

## Settings Notes
- Best quality: ISO 100-400
- Acceptable for print: ISO 100-3200
- Acceptable for web: ISO 100-12800
```

**Spot example: `content/spots/us/texas/bob-wentz-park.md`**
```markdown
---
id: bob-wentz-park
name: Bob Wentz Park at Windy Point
latitude: 30.4316
longitude: -97.8467
elevation_ft: 780
facing_direction: 270
best_time: [sunrise, golden_evening, sunset]
best_season: [spring, fall]
tags: [lake, kitesurfing, sunset, wide-vista]
parking: free
---

# Bob Wentz Park at Windy Point

Unobstructed western horizon across Lake Travis.
Kitesurfers provide dynamic foreground subjects during golden hour.

## Best Compositions
- **Sunset wide**: South end of beach, face WNW. 16-35mm.
- **Kitesurfer action**: Mid-beach, backlit spray. 70-200mm, 1/1000+
- **Sunrise calm**: Mirror reflections. Tripod, long exposure.
```

### 5.4 Conversion Pipeline

```typescript
// scripts/md-to-json.ts
// Reads YAML frontmatter (gray-matter) + renders body (marked)
// Outputs:
//   - index.json per directory (lightweight, frontmatter only)
//   - {slug}.json per file (full detail with rendered HTML body)
```

**Build integration:**
```json
{
  "scripts": {
    "prebuild": "tsx scripts/md-to-json.ts",
    "build": "next build",
    "dev": "concurrently \"tsx scripts/watch-content.ts\" \"next dev\""
  }
}
```

### 5.5 Integration Map

| Integration | How It Works | Markdown Involvement |
|---|---|---|
| **SunCalc** | Client-side JS library. Takes lat/lng/date → sun/moon positions. | None — pure computation |
| **Open-Meteo** | Client fetches weather directly (SWR cache, 30-min stale). | None — ephemeral data |
| **Mapbox** | Client-side WebGL. Loads spot coords from `spots/index.json`. | Spots compiled from markdown |
| **Camera DB** | Build compiles `cameras/*.md` → `cameras.json`. UI reads JSON. | Source of truth |
| **Settings Advisor** | Loads rules from compiled `shooting-guides/*.json` + `settings-rules/*.json`. | Rules are editable markdown |
| **Opportunity Scanner** | Vercel Cron evaluates `opportunity-rules/*.md` against weather forecasts. Generates opportunity markdown files. | Rules AND output are markdown |
| **User Data** | API routes read/write `users/{id}/*.md` in blob storage. | Source of truth |
| **Community Spots** | Submissions → `users/{id}/submitted-spots/`. AI agent reviews, approves → `content/spots/`. | Full lifecycle in markdown |

### 5.6 AI Agent Integration

This is where markdown-as-db pays massive dividends. Every piece of domain knowledge is a text file an agent can reason about.

| Task | Agent Action |
|---|---|
| Add new camera | Read `_schema.md`, research specs, create `cameras/{slug}.md` |
| Tune settings rules | Read community EXIF reports vs guide recommendations, edit `shooting-guides/*.md` |
| Review spot submissions | Read user submission, validate, move to `content/spots/` |
| Generate opportunity alerts | Evaluate rules against weather, write natural-language opportunity markdown |
| Improve opportunity rules | Analyze which opportunities users acted on, adjust scoring |
| Curate community reports | Review submitted reports, fix formatting, append to spot files |

---

## 6. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Data Layer** | Markdown files (YAML frontmatter + body) | Source of truth, AI-native |
| **Build Step** | `gray-matter` + `marked` + custom `md-to-json.ts` | Markdown → typed JSON |
| **Frontend** | Next.js 14+ (App Router, static/ISR) | SSR, RSC, Vercel-native |
| **Styling** | Tailwind CSS + shadcn/ui | Fast iteration, consistent design |
| **Maps** | Mapbox GL JS | WebGL, 3D terrain, custom layers, 50k loads/mo free |
| **Sun/Moon** | `suncalc` (npm) | Zero-dep, client-side, battle-tested |
| **Weather** | Open-Meteo API | Free, no key, hourly, cloud layer data |
| **Auth** | JWT (stateless) + Vercel KV for refresh tokens | Maps user → markdown directory |
| **User Storage** | Vercel Blob or Cloudflare R2 | User markdown files + photo uploads |
| **Background Jobs** | Vercel Cron + QStash | Opportunity scanner (hourly) |
| **AI Agent** | Claude / GPT via API (or OpenClaw agent) | Content curation, rule tuning |
| **Hosting** | Vercel | Static/ISR, edge functions, cron |
| **Version Control** | Git | Content versioning, community PRs |
| **Analytics** | PostHog | Open-source product analytics |

**What's gone vs traditional stack:**
- ~~PostgreSQL~~ → markdown files
- ~~PostGIS~~ → client-side haversine filtering
- ~~Prisma~~ → `gray-matter` + `fs.readFileSync`
- ~~Database migrations~~ → edit/add markdown files
- ~~Connection pooling~~ → no connections
- ~~Managed DB costs~~ → $0

---

## 7. User Experience

### 7.1 Views

**A. Dashboard ("Today")** — Home screen. Current Light Score with character tags, sun position compass, "If You Shoot Right Now" settings, day timeline with all light windows scored, weather conditions panel, upcoming opportunities.

**B. Map** — Mapbox with sun/moon path arcs, scored spot pins, time scrubber, layer toggles (light pollution, shadows, cloud radar, 3D terrain). Click pin → spot detail flyout.

**C. Opportunity Feed** — 7-day light forecast strip, detailed cards per opportunity with score, time window, settings, suggested spot. Filter by type/score/distance.

**D. Shot Planner** — Select spot + date → minute-by-minute plan. Each time block has settings for different shooting styles (landscape vs action), tips, filter recommendations. Export as PDF, add to calendar, share link.

**E. Gear Profile** — Camera body with ISO quality visualization, lens inventory with category tags, shooting preferences, scan radius, notification settings.

### 7.2 Onboarding (< 2 minutes)

1. Sign up (email or Google)
2. "What do you shoot?" — select styles
3. "What's in your bag?" — search/select camera + lenses
4. "Tripod?" — Yes/Sometimes/No
5. "Home base?" — auto-detect or search
6. → Dashboard

---

## 8. Monetization

### Freemium Model

**Free:**
- Current conditions + camera settings
- Today's light timeline
- Sun/moon map (current day)
- 3 saved spots
- 1 top opportunity per day

**Pro ($8/month or $60/year):**
- 7-day forecast + opportunity scanning
- Unlimited saved spots
- Full shot planner with export
- Community spot database
- Custom notification rules
- Multi-location scanning
- Historical light data

**Team ($20/month):**
- Everything in Pro
- Shared spot collections
- Group shoot planning
- Workshop/tour leader features

---

## 9. Development Phases

### Phase 1: MVP (8 weeks)
Core value prop — light conditions + recommended settings for current location.

- [ ] User auth (email + Google)
- [ ] Camera/lens markdown database (seed top 20 bodies, 50 lenses)
- [ ] `md-to-json.ts` build pipeline
- [ ] SunCalc integration (sun/moon position, golden/blue hour)
- [ ] Open-Meteo weather integration (current + 48hr)
- [ ] Light Quality scoring algorithm v1
- [ ] Camera Settings Advisor v1
- [ ] Dashboard view (timeline, conditions, settings)
- [ ] Shooting guides markdown (5 core guides)
- [ ] Mobile-first responsive web
- [ ] Vercel deployment

**Key Metric:** User returns within 48 hours

### Phase 2: Map & Planning (6 weeks)
- [ ] Mapbox integration with sun/moon path overlay
- [ ] Time scrubber
- [ ] Shadow analysis (terrain elevation)
- [ ] Shot Planner view
- [ ] Spot database seeded (top 500 US locations)
- [ ] Save spots, add notes
- [ ] PWA support

**Key Metric:** Shot plans created per user per week

### Phase 3: Opportunities (6 weeks)
- [ ] Opportunity Scanner cron job (hourly)
- [ ] 7-day forecast analysis
- [ ] Opportunity rule markdowns (7 types)
- [ ] Push notifications (web push)
- [ ] Email digest
- [ ] Calendar integration
- [ ] Notification preferences

**Key Metric:** Opportunities acted on

### Phase 4: Community (6 weeks)
- [ ] Community spot submissions
- [ ] Photo uploads with EXIF extraction
- [ ] "What worked" condition reports
- [ ] AI agent moderation pipeline
- [ ] Spot ratings + reviews
- [ ] Explore feed

**Key Metric:** Community spots added per week

### Phase 5: Advanced (ongoing)
- [ ] AI scene recognition
- [ ] Lens recommendation per scene
- [ ] Milky Way planner with Bortle scale map
- [ ] Historical weather patterns
- [ ] Timelapse calculator
- [ ] ND filter calculator
- [ ] Focus stacking advisor
- [ ] Mobile AR sun path overlay
- [ ] Camera tethering (push settings via WiFi/BT)

---

## 10. Competitive Landscape

| App | Strengths | Weakness | PhotoScout Edge |
|---|---|---|---|
| **TPE** | Gold standard sun/moon planning | No weather, no settings, no alerts | All-in-one with proactive alerts |
| **PhotoPills** | Comprehensive toolkit with AR | Mobile-only, steep learning curve, no weather | Web, simpler UX, weather-integrated |
| **PhotoTime** | Simple golden hour times | That's all it does | Full light analysis beyond timing |
| **Windy/Weather** | Detailed weather data | Not photography-focused | Photography-specific interpretation |
| **SunCalc.org** | Free, web-based | Bare-bones, no settings | Modern UX, integrated, actionable |

**Moat:** No existing tool connects weather + sun position + camera settings + proactive opportunity scanning. Every current solution requires the photographer to be the integration layer.

---

## 11. Tradeoffs & Scale Considerations

### Markdown-as-DB Wins
- AI-first editing (agents' native medium)
- Git versioning with full history
- Zero infrastructure cost
- Human-readable, community-contributable
- Pre-compiled JSON served from CDN (faster than any DB query)

### Limits & Thresholds

| Threshold | Issue | Mitigation |
|---|---|---|
| >10k spots | Client-side distance filtering slows | Lightweight API with spatial index (SQLite + Spatialite) |
| >50k users | Blob storage file management | Shard by user ID prefix + KV lookup |
| >1k writes/min | Merge conflicts, build queue | Move user-generated content to KV, keep curated content in markdown |
| Real-time features | Markdown can't do websockets | Add thin real-time layer (Supabase Realtime) |

---

## 12. Success Metrics (6 months post-launch)

| Metric | Target |
|---|---|
| Registered users | 10,000 |
| WAU | 3,000 (30% retention) |
| Pro subscribers | 500 (5% conversion) |
| Shot plans created | 2,000/week |
| Opportunities delivered | 50,000/month |
| Community spots | 2,000 |
| NPS | 50+ |
| MRR | $4,000 |

---

## 13. Open Questions

1. **Native mobile vs PWA?** — Start PWA, evaluate based on AR needs and push notification reliability
2. **AI/LLM in-app?** — Natural-language shooting advice worth prototyping Phase 5
3. **Camera tethering?** — Push settings via WiFi/BT APIs (Sony/Canon/Nikon all have them)
4. **Camera manufacturer partnerships?** — Bundled trial with purchases
5. **Workshop marketplace?** — Pro photographers sell guided shoots at their spots

---

## 14. Naming

Working name: **PhotoScout**

Alternatives considered:
- **LightCast** — weather + light forecast vibe
- **Lumora** — "lumen" + "ora" (hour), premium feel
- **Ephemera** — nod to TPE, fleeting light
- **ShootWeather** — SEO-friendly

---

## 15. Reference Materials

- [Mockup HTML](/specs/photoscout-mockup.html) — Clickable UI prototype with all 5 views
- [Markdown-as-DB Architecture Detail](/specs/photoscout-mddb-architecture.md) — Deep dive on file formats and integration map
- [Original Spec](/specs/photoscout-spec.md) — Initial product spec with traditional architecture

---

*Next step: Initialize the repo, build the markdown content pipeline, and start Phase 1.*
