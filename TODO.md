# PhotoScout — Remaining Tasks

Reference mockup: `file:///Users/asklloyd/.openclaw/workspace/specs/photoscout-mockup.html`
(Serve locally: `cd ~/.openclaw/workspace/specs && python3 -m http.server 8888` → http://localhost:8888/photoscout-mockup.html)

---

## Task 1: Fix Dashboard — Match Mockup Layout

The current dashboard loads but shows "Analyzing light conditions..." forever in headless browsers (geolocation fails). The layout also doesn't match the mockup.

**Changes needed:**

### 1a. Geolocation fallback
- Default to Georgetown, TX (30.6280, -97.6781) when geolocation is denied/unavailable
- Show location name "Georgetown, TX" in the header (not raw coords)
- Add a location search/change option in the header

### 1b. Header nav — match mockup
- Add full nav: Dashboard, Map, Opportunities, Shot Planner, Gear (currently only has "Gear Profile")
- Active tab underlined in orange
- Right side: location name + user avatar circle
- Use the same glass/blur header style as mockup

### 1c. Hero section — 3 cards in a row (not 2+1)
Mockup has 3 equal cards across the top:
1. **CURRENT LIGHT** — Score ring (smaller, left-aligned), character name "Warm Side-Light" in large text, "Golden hour approaching" subtitle, character tags as badges
2. **SUN POSITION** — Compass rose with sun dot, Azimuth/Altitude numbers, Golden Hour/Sunset/Blue Hour times listed
3. **IF YOU SHOOT RIGHT NOW** — Camera+lens name at top, then Aperture/Shutter/ISO/White Balance in large mono text, direction tip at bottom

### 1d. Day Timeline — match mockup
- Full-width colored gradient bar (blue→golden→white→golden→blue) showing the whole day
- Time labels: 5AM, Blue, Golden, midday, Golden, Blue
- Sun/moon icons on the bar at correct positions
- Below: 5 time window cards in a row (Blue Hour AM, Golden AM, Midday, Golden PM★, Blue Hour PM)
- Each card: time range, score, status ("Passed", "In 27 minutes!", etc.)
- Highlight the next upcoming window with orange border/glow

### 1e. Bottom section — Weather + Opportunities side by side
**Weather Conditions card (left):**
- Cloud Cover: big number + description ("Broken, mostly high cirrus")
- Visibility: big number + quality note
- Humidity: big number + photography note ("Good for warm tones")
- Wind: speed + direction
- Temperature
- Cloud Layers mini-bar (High/Mid/Low with %) + insight note

**Upcoming Opportunities card (right):**
- "View All →" link
- 3 opportunity cards stacked:
  - Icon + name + score badge + timing ("In 27 min")
  - Time + location
  - Description text
  - (Epic Sunset, Valley Fog, Storm Break as sample data)

---

## Task 2: Map View — `/map`

Create `app/map/page.tsx`. This is the interactive sun/moon map.

**Layout:**
- Full-screen map (Mapbox GL JS or Leaflet/MapLibre as free alternative)
- Floating panels:
  - **Top-left: Time Scrubber** — slider 12AM to 11:59PM, current time shown, drag to simulate
  - **Left: Layers panel** — checkboxes: Sun/Moon Path, Opportunity Spots, Light Pollution (Bortle), Shadow Overlay, Cloud Radar, 3D Terrain
  - **Right: Spot detail flyout** — appears when clicking a pin
  - **Bottom-left: Legend** — color-coded score dots (orange 70+, blue 50-69, gray <50, blue dot = you)

**Map features:**
- Dashed orange arc = sun path across sky (from SunCalc data)
- Spot pins from content/spots/*.json with score-colored circles
- Click pin → flyout with: name, score badge, distance, description, best time, facing direction, parking info, tags, "Plan Shot →" and "Save" buttons
- User location blue dot
- Sunrise/sunset markers on the sun path arc

**Note:** If Mapbox token isn't available, use MapLibre GL JS (free) with OpenStreetMap tiles. Can upgrade to Mapbox later.

---

## Task 3: Opportunities View — `/opportunities`

Create `app/opportunities/page.tsx`.

**Layout:**

### Header
- "Opportunities" title + "Next 7 days · Within 50 miles of Georgetown, TX"
- Filters: Type dropdown (All Types), Min Score dropdown (50+), Distance dropdown (50 miles)

### 7-Day Light Forecast strip
- 7 day cards in a row
- Each: Day name, date, weather icon, best score (big colored number), type label ("PM sunset", "AM fog", etc.)
- Today and high-score days highlighted with orange border

### Opportunity cards (stacked)
For each opportunity:
- Left: big colored score number
- Icon + title + confidence badge (HIGH/MODERATE) 
- Time + location
- Detailed description paragraph
- Bottom row: face direction, suggested settings, suggested spot
- Right side: timing label ("In 27 min", "Tomorrow AM", "4 days out") + "Plan Shot" button

**Data source:** For now, generate mock opportunities from the Light Engine + weather forecast. Scan next 7 days of weather and create opportunities when conditions match rules from content/opportunity-rules/ (create these if not done).

---

## Task 4: Shot Planner View — `/planner`

Create `app/planner/page.tsx`.

**Layout:**

### Header
- "← Back" + "Shot Plan" title

### Plan header card
- Spot name (large) + location + date
- Condition badges: Light Score, cloud %, wind, temp
- Action buttons: Add to Calendar, Share, Export PDF

### Your Gear bar
- Camera icon + body name, lens icons + names, tripod check
- "Change Gear" link

### Timeline (vertical)
Colored dot timeline on the left, time blocks stacked vertically:

1. **Arrive & Scout** (red dot) — arrival time, "30 min before golden hour", setup instructions, pre-shoot settings
2. **Golden Hour** (orange dot, ★★★★★ PEAK LIGHT badge) — light description, color temp, EV range, then TWO settings cards side by side:
   - Landscape (24-70mm): aperture, shutter, ISO, WB, focus, filter, bracket tip
   - Action (70-200mm): aperture, shutter, ISO, WB, focus, drive mode, positioning tip
   - Pro tip at bottom
3. **Sunset** (orange dot) — sun touches horizon, peak cloud color, settings row
4. **Blue Hour** (blue dot, TRIPOD REQUIRED badge) — long exposure settings, ND filter
5. **Wrap** (gray moon dot) — pack up, moon info

**Data:** Generate from Light Engine data for a selected spot + date. Use spot's facing_direction + lat/lng.

**Spot selector:** Dropdown of saved/nearby spots, date picker for planning future shoots.

---

## Task 5: Gear Page — Match Mockup Design

Current gear page works but looks basic compared to mockup.

**Changes:**
- Use same full nav header as other pages (not the arrow-back header)
- **Camera Body card:**
  - Camera name in large text + "Change" link
  - Subtitle: "Full Frame · 61MP · AI AF · 8-stop IBIS"
  - 4 stat boxes in a row: Base ISO, Max Usable ISO, Dynamic Range, Burst Rate
  - **ISO Quality Range bar** — gradient bar from green (Excellent) through yellow (Good) to red (Emergency only) with ISO values labeled at breakpoints
- **Lenses card:**
  - "+ Add Lens" button top-right
  - Each lens: bold name, subtitle (type · filter size · IS info), category tags as colored badges on the right
- **Shooting Preferences card:**
  - 2x2 grid of dropdowns:
    - Primary Style (Landscape, Action, Portrait, etc.)
    - Tripod Available (Yes always, Sometimes, No)
    - Scan Radius (10/25/50/100 miles)
    - Notification Preference (Push + Email score 70+, etc.)

---

## Visual Design Notes (apply to ALL pages)

Match the mockup's design system:
- Background: `#0a0a0a` (near black)
- Card backgrounds: `rgba(20,20,20,0.8)` with subtle border `rgba(255,255,255,0.06)` and `backdrop-filter: blur(12px)`
- Orange accent: `#f97316` (brand-500)
- Text: `#e5e5e5` primary, `#737373` muted
- Font: Inter
- Cards have subtle glow on important items (`box-shadow: 0 0 30px rgba(249,115,22,0.15)`)
- Score colors: orange (70+), blue (50-69), gray (<50)
- Tab nav: active = orange text + orange underline, inactive = gray
