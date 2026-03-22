# PhotoScout Design System — AI Agent Reference

> **Version:** 1.0 · **Date:** March 2026
> **Purpose:** This document is the single source of truth for any AI coding agent (Claude Code, Cursor, Copilot, etc.) building or modifying PhotoScout UI. Follow these rules precisely when generating components, pages, or styles.

---

## 1. Brand Identity

**Product:** PhotoScout — Light Intelligence for Photographers
**Tagline:** "Light Intelligence"
**Core concept:** Where light, weather, and terrain converge for the perfect shot.
**Voice:** Confident, precise, inspiring — like a seasoned photographer sharing a field tip. Warm authority with technical depth. Never academic or dry.
**Audience:** Landscape and nature photographers, enthusiast to professional. Gear-aware, weather-obsessed, field-ready.

### Brand Principles (apply to every design decision)

1. **Precision First** — Every data point earns its place. No decorative fluff. Data is the design.
2. **Light-Centric** — Light quality is the hero of every screen. All UI radiates from this concept.
3. **Layered Depth** — Progressive disclosure: simple surface, rich detail beneath on interaction.
4. **Field-Ready** — Designed for gloved hands, harsh sun, quick glances. High contrast, large touch targets, minimal chrome.

---

## 2. Color System

### 2.1 Brand Colors

Use these as the primary accent palette. Each maps to a product concept.

| Token                | Hex       | RGB              | Usage                                    |
|----------------------|-----------|------------------|------------------------------------------|
| `--golden-hour`      | `#E8A225` | `232, 162, 37`   | Primary CTA, active states, scores, highlights |
| `--golden-hour-light`| `#F2C05E` | `242, 192, 94`   | Hover states, secondary emphasis          |
| `--golden-hour-subtle`| `rgba(232, 162, 37, 0.12)` | — | Tag backgrounds, subtle fills    |
| `--blue-hour`        | `#3B6FD4` | `59, 111, 212`   | Links, informational, map elements        |
| `--blue-hour-light`  | `#6B94E0` | `107, 148, 224`  | Blue hour hover/active                    |
| `--blue-hour-subtle` | `rgba(59, 111, 212, 0.12)` | —  | Info backgrounds                |
| `--coral`            | `#E06848` | `224, 104, 72`   | Alerts, epic opportunities, urgent states |
| `--coral-subtle`     | `rgba(224, 104, 72, 0.12)` | — | Alert card backgrounds           |
| `--teal`             | `#2DB88A` | `45, 184, 138`   | Success, optimal conditions, confirmations |
| `--teal-subtle`      | `rgba(45, 184, 138, 0.12)` | — | Success backgrounds              |
| `--violet`           | `#8B6CC1` | `139, 108, 193`  | Night/astro features, Pro tier badge       |
| `--violet-subtle`    | `rgba(139, 108, 193, 0.12)` | —| Astro card backgrounds            |

### 2.2 Surface Colors (Dark Theme)

PhotoScout is dark-first. These surface layers create depth hierarchy.

| Token         | Hex       | Usage                                |
|---------------|-----------|--------------------------------------|
| `--dark-900`  | `#0C0E14` | Page background, app base            |
| `--dark-800`  | `#12151E` | Card backgrounds, panels             |
| `--dark-700`  | `#1A1E2A` | Elevated cards, inner sections       |
| `--dark-600`  | `#242836` | Secondary backgrounds, dividers      |
| `--dark-500`  | `#2E3344` | Elevated hover states                |
| `--dark-400`  | `#3D4358` | Borders, separators                  |

### 2.3 Text Colors

| Token          | Hex       | Usage                              |
|----------------|-----------|-------------------------------------|
| `--pure-white` | `#FFFFFF` | High emphasis, data values          |
| `--white`      | `#F0F2F8` | Primary text, headings              |
| `--neutral-100`| `#B4BAD0` | Secondary text, descriptions        |
| `--neutral-200`| `#8E95B0` | Tertiary text, body copy            |
| `--neutral-300`| `#6B7394` | Muted text, captions, labels        |

### 2.4 Semantic Condition Mapping

When displaying weather/light conditions, use these color mappings:

| Condition            | Color Token      | Trigger                        |
|----------------------|-----------------|--------------------------------|
| Golden Hour / Warm   | `--golden-hour` | Light score 70+                |
| Blue Hour / Cool     | `--blue-hour`   | Pre-dawn, post-sunset          |
| Epic Alert           | `--coral`       | Opportunity score 85+          |
| Clear / Optimal      | `--teal`        | Low cloud, high visibility     |
| Astro Window         | `--violet`      | Dark sky, Milky Way visible    |
| Overcast / Flat      | `--neutral-300` | Light score < 30               |

---

## 3. Typography

### 3.1 Font Stack

```css
--font-display: 'Syne', sans-serif;      /* Headings, brand moments, display text */
--font-body: 'Figtree', sans-serif;       /* Body copy, UI labels, descriptions */
--font-mono: 'IBM Plex Mono', monospace;  /* Camera data, values, timestamps, code */
```

**Google Fonts import:**
```
https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Figtree:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap
```

### 3.2 Type Scale

| Role         | Font          | Weight | Size  | Letter Spacing | Color            | Line Height |
|-------------|---------------|--------|-------|----------------|------------------|-------------|
| Display XL  | Syne          | 800    | 36px  | -0.02em        | `--white`        | 1.2         |
| Display LG  | Syne          | 700    | 28px  | -0.01em        | `--white`        | 1.2         |
| Heading     | Syne          | 600    | 20px  | normal         | `--white`        | 1.3         |
| Subheading  | Figtree       | 600    | 16px  | normal         | `--neutral-100`  | 1.4         |
| Body        | Figtree       | 400    | 14px  | normal         | `--neutral-200`  | 1.6         |
| Caption     | Figtree       | 400    | 12px  | normal         | `--neutral-300`  | 1.5         |
| Data Value  | IBM Plex Mono | 500    | 14px  | normal         | `--golden-hour`  | 1.3         |
| Label/Tag   | IBM Plex Mono | 400    | 11px  | 0.06em         | `--neutral-300`  | 1.4         |
| Micro Label | IBM Plex Mono | 400    | 10px  | 0.08em         | `--golden-hour`  | 1.2         |

### 3.3 Typography Rules

- Camera settings (aperture, shutter speed, ISO, white balance) ALWAYS use `--font-mono` in `--golden-hour` color.
- Section numbers and labels use `--font-mono` in uppercase with `--golden-hour` color.
- Wordmark: "Photo" in `--white`, "Scout" in `--golden-hour`, font `Syne 700`, letter-spacing `-0.02em`.
- Never use system fonts or generic sans-serif as primary.

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

```css
--space-xs:  4px;
--space-sm:  8px;
--space-md:  12px;
--space-base: 16px;
--space-lg:  20px;
--space-xl:  24px;
--space-2xl: 32px;
--space-3xl: 40px;
--space-4xl: 48px;
--space-5xl: 64px;
```

### 4.2 Border Radius Scale

```css
--radius-xs:      4px;    /* Tags, small badges */
--radius-sm:      6px;    /* Chips, version badges */
--radius-md:      8px;    /* Buttons, inputs */
--radius-default: 10px;   /* Standard cards, swatches */
--radius-lg:      12px;   /* Feature cards, panels */
--radius-xl:      16px;   /* Hero cards, modals */
--radius-full:    9999px; /* Avatars, score rings, dots */
```

### 4.3 Layout Patterns

- **Max content width:** 960px with 32px side padding
- **Card padding:** 20–24px standard, 32px for hero/elevated cards
- **Section spacing:** 48px top padding with 1px `--dark-600` top border
- **Grid gaps:** 12px for tight grids, 16–24px for card grids
- **Responsive breakpoint:** 640px — stack to single column below this

---

## 5. Component Patterns

### 5.1 Light Quality Score

The hero component. A conic-gradient ring showing score as fill, with inner circle containing the numeric value.

```
Structure:
┌─────────────────────────────────┐
│  [Score Ring]  Score Title      │
│      87        Character Tags   │
│               [Tag] [Tag] [Tag] │
│               Time Window Label │
└─────────────────────────────────┘
```

- Ring: `conic-gradient(--golden-hour 0deg, --golden-hour Xdeg, --dark-600 Xdeg)` where X = score × 3.6
- Inner circle: `--dark-700` background
- Score number: Syne 700, 22px, `--golden-hour`
- Character tag: Figtree 600, 14px, `--white` (e.g., "Warm Dramatic Side-Light")
- Tags: 10px chips with `--golden-hour` text on `--golden-hour-subtle` background

### 5.2 Camera Settings Card

```
Structure:
┌──────┬──────┬──────┬──────┐
│  ƒ   │  SS  │ ISO  │  WB  │
│  11  │1/250 │ 200  │5600K │
└──────┴──────┴──────┴──────┘
┌─────────────────────────────┐
│ 💡 Contextual tip text      │
└─────────────────────────────┘
```

- Settings cells: `--dark-600` background, label in `--font-mono` 9px `--neutral-300`, value in `--font-mono` 14px 600 `--white`
- Tip banner: `--golden-hour-subtle` background with `--golden-hour-light` text

### 5.3 Opportunity Alert Card

- Container: `--coral-subtle` background with `rgba(224, 104, 72, 0.2)` border
- Pulsing dot: 8px `--coral` with `box-shadow: 0 0 8px` glow
- Title: Syne 600, 13px, `--coral`
- Body: Figtree 400, 12px, `--neutral-100`
- Metadata: IBM Plex Mono 400, 10px, `--neutral-300`

### 5.4 Astro Window Card

- Same structure as Opportunity Alert but with `--violet-subtle` / `--violet` colors
- Include "PRO" badge: `--font-mono` 9px in `--violet` on `rgba(139, 108, 193, 0.15)` background

### 5.5 Buttons

| Variant   | Background        | Text Color    | Border                      | Shadow                              |
|-----------|-------------------|---------------|-----------------------------|--------------------------------------|
| Primary   | `--golden-hour`   | `--dark-900`  | none                        | `0 2px 12px rgba(232,162,37,0.3)`   |
| Secondary | `--dark-600`      | `--white`     | `1px solid --dark-400`      | none                                 |
| Outline   | transparent       | `--golden-hour`| `1px solid --golden-hour`  | none                                 |
| Ghost     | transparent       | `--neutral-200`| none                       | none                                 |

All buttons: Figtree, `--radius-md`, padding `10px 20px`, 13px.

### 5.6 Input Fields

- Default: `--dark-600` background, `1px solid --dark-400` border
- Focused: `1.5px solid --golden-hour` border, `box-shadow: 0 0 0 3px --golden-hour-subtle`
- Search icon: 16px, stroke `--neutral-300` (default) or `--golden-hour` (focused)
- Placeholder text: Figtree 13px `--neutral-300`
- Input text: Figtree 13px `--white`

### 5.7 Tags / Chips

```css
font-family: var(--font-body);
font-size: 10px;
font-weight: 500;
color: var(--golden-hour);
background: var(--golden-hour-subtle);
padding: 2px 8px;
border-radius: var(--radius-xs);
border: 1px solid rgba(232, 162, 37, 0.15);
```

For different condition types, swap to the corresponding color and subtle variant.

### 5.8 Cards

| Type      | Background                                     | Border                      | Padding | Radius         |
|-----------|-------------------------------------------------|-----------------------------|---------|----------------|
| Standard  | `--dark-800`                                    | `1px solid --dark-600`      | 20px    | `--radius-lg`  |
| Elevated  | `linear-gradient(135deg, --dark-800, --dark-700)`| `1px solid --dark-600`     | 32px    | `--radius-xl`  |
| Inner     | `--dark-700`                                    | none                        | 16px    | `--radius-default` |
| Alert     | `--[color]-subtle`                              | `1px solid rgba(..., 0.2)` | 16px    | `--radius-default` |

---

## 6. Iconography

**System:** Lucide React icons
**Base size:** 24×24
**Stroke width:** 1.5px
**Stroke color:** `--neutral-100` (default), `--golden-hour` (active/selected), `--neutral-300` (disabled)
**Stroke linecap/linejoin:** round

### Key icons by feature area:

| Feature           | Icon(s)                              |
|-------------------|--------------------------------------|
| Light Score       | `Sun`, `Sunrise`, `Sunset`           |
| Camera Settings   | `Camera`, `Aperture`, `Sliders`      |
| Map               | `Map`, `MapPin`, `Compass`, `Navigation` |
| Weather           | `Cloud`, `CloudRain`, `Thermometer`, `Wind`, `Eye` (visibility) |
| Time              | `Clock`, `Calendar`, `Timer`         |
| Opportunities     | `AlertTriangle`, `Star`, `Zap`       |
| Community         | `Users`, `Heart`, `Share`, `MessageCircle` |
| Settings          | `Settings`, `User`, `CreditCard`     |
| Navigation        | `ChevronRight`, `ChevronDown`, `ArrowLeft`, `Menu`, `X` |

**Never use decorative icons.** Every icon must communicate function.

---

## 7. Motion & Animation

```css
/* Easing curves */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);        /* Primary — most transitions */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);     /* Scrubber, bidirectional */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* Playful — bounce/settle */

/* Duration scale */
--duration-fast: 120ms;     /* Hover, toggle, micro-interactions */
--duration-normal: 200ms;   /* Card transitions, panel open/close */
--duration-slow: 350ms;     /* Modals, full-screen transitions */
--duration-map: 800ms;      /* Map fly-to, sun position sweep */
```

### Animation specifications:

| Element              | Animation                                    | Duration   | Easing       |
|----------------------|----------------------------------------------|------------|--------------|
| Score ring fill      | Counter + conic gradient fill                | 600ms      | `--ease-out` |
| Opportunity cards    | Staggered fade-up from 10px below            | 200ms each | `--ease-out`, 50ms stagger |
| Sun position (scrub) | Smooth lerp during drag, spring settle on release | continuous / 300ms | `--ease-in-out` / `--ease-spring` |
| Pull-to-refresh      | Golden shimmer pulse                         | 1.5s loop  | `--ease-in-out` |
| Pro gate blur        | Frosted glass reveal                         | 300ms      | `--ease-out` |
| Button hover         | Background color shift                       | 120ms      | `--ease-out` |
| Card press           | scale(0.98) + slight shadow reduction        | 120ms      | `--ease-out` |
| Modal open           | Fade + scale(0.95→1)                         | 350ms      | `--ease-out` |

**Always respect `prefers-reduced-motion`.** When reduced motion is active: disable all non-essential animations, map transitions become instant, score ring renders at final state without animation.

---

## 8. UX Patterns

### 8.1 Information Architecture

| Tab           | Purpose                                        | Default | Pro-gated |
|---------------|------------------------------------------------|---------|-----------|
| **Scout**     | Today's conditions, light score, camera settings| ✓ Home  | Partial   |
| **Map**       | Sun/moon map + weather overlay + time scrubber | ✓       | No        |
| **Opportunities** | 7-day forecast scanner, alert cards        | Preview | Yes       |
| **Planner**   | Shot planning timeline per location + date     | Preview | Yes       |
| **Spots**     | Community locations with EXIF data             | Limited | Yes (unlimited) |

### 8.2 Progressive Disclosure

- **Level 0 (glance):** Light score number + character tag + time window
- **Level 1 (tap/expand):** Full condition breakdown — cloud layers, humidity, visibility, sun angle, wind
- **Level 2 (deep dive):** Minute-by-minute timeline, alternate locations comparison

### 8.3 Pro Tier Gating

- Free users see blurred previews with `backdrop-filter: blur(8px)` overlay
- Overlay uses `--dark-800` at 60% opacity with centered upgrade CTA
- Pro badge: `--font-mono` 9px, `--violet` text on `rgba(139, 108, 193, 0.15)` background, `--radius-xs`
- **Rule: Never fully block content. Always tease with visible-but-blurred data.**

### 8.4 Map Design

- **Basemap:** Custom Mapbox GL dark style — desaturated terrain, subtle contours, minimal labels
- **Never use default bright/white Mapbox styles**
- Sun position overlay: `--golden-hour` with 0.3 opacity arc
- Shadow casting: `rgba(0, 0, 0, 0.15)` polygon overlay
- Selected pin: `--golden-hour` fill with pulse animation
- Time scrubber: Horizontal bar at bottom of map, golden hour gradient for relevant time ranges

### 8.5 Data Display Rules

- Camera settings ALWAYS formatted as: `ƒ/[value] · [shutter] · ISO [value] · [kelvin]K`
- Use middle dot `·` as separator, never pipes or dashes
- Temperatures in user's preferred unit, always with degree symbol
- Times in user's local timezone, 24h or 12h per preference
- Scores always integer 1–100, no decimal places
- Distances: metric (km) default, imperial option

### 8.6 Responsive Behavior

| Breakpoint | Layout                                      |
|------------|---------------------------------------------|
| ≥1024px    | Full desktop — sidebar + main content       |
| 768–1023px | Tablet — collapsible sidebar, full cards    |
| <768px     | Mobile — bottom tab bar, stacked cards, sheet modals |
| <640px     | Compact mobile — single column, reduced padding (16px) |

### 8.7 Touch & Interaction

- All interactive elements: minimum 44×44px touch target
- Map: long-press to drop scout pin, tap pin for quick popup, double-tap to set planner target
- Cards: swipe-to-dismiss in opportunity lists, swipe-to-save
- Pull-to-refresh on main Scout view with golden shimmer feedback
- Time scrubber: drag horizontally, snaps to 5-minute intervals, haptic feedback at golden/blue hour boundaries

---

## 9. Accessibility

| Requirement               | Implementation                                              |
|---------------------------|-------------------------------------------------------------|
| WCAG 2.1 AA              | All text ≥ 4.5:1 contrast ratio on dark surfaces            |
| Large text (18px+)       | Minimum 3:1 contrast ratio                                  |
| Touch targets             | ≥ 44px in both dimensions                                   |
| Reduced motion            | `@media (prefers-reduced-motion: reduce)` — disable animations |
| Screen readers            | `aria-label` on all data visualizations with text equivalents |
| Color independence        | Never rely on color alone — all conditions have icon + text label |
| Focus indicators          | `--golden-hour` 2px outline with 2px offset on keyboard focus |
| High contrast mode        | Optional toggle — increases border contrast, switches to lighter text |

---

## 10. CSS Variables — Complete Token Sheet

Copy this block into your root stylesheet or Tailwind config:

```css
:root {
  /* ── Brand Colors ── */
  --golden-hour: #E8A225;
  --golden-hour-light: #F2C05E;
  --golden-hour-subtle: rgba(232, 162, 37, 0.12);
  --blue-hour: #3B6FD4;
  --blue-hour-light: #6B94E0;
  --blue-hour-subtle: rgba(59, 111, 212, 0.12);
  --coral: #E06848;
  --coral-subtle: rgba(224, 104, 72, 0.12);
  --teal: #2DB88A;
  --teal-subtle: rgba(45, 184, 138, 0.12);
  --violet: #8B6CC1;
  --violet-subtle: rgba(139, 108, 193, 0.12);

  /* ── Surfaces ── */
  --dark-900: #0C0E14;
  --dark-800: #12151E;
  --dark-700: #1A1E2A;
  --dark-600: #242836;
  --dark-500: #2E3344;
  --dark-400: #3D4358;

  /* ── Text ── */
  --pure-white: #FFFFFF;
  --white: #F0F2F8;
  --neutral-100: #B4BAD0;
  --neutral-200: #8E95B0;
  --neutral-300: #6B7394;

  /* ── Typography ── */
  --font-display: 'Syne', sans-serif;
  --font-body: 'Figtree', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* ── Type Scale ── */
  --text-xs: 10px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 28px;
  --text-3xl: 36px;
  --text-4xl: 48px;

  /* ── Spacing ── */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-base: 16px;
  --space-lg: 20px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 40px;
  --space-4xl: 48px;
  --space-5xl: 64px;

  /* ── Radius ── */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-default: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* ── Motion ── */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 350ms;
  --duration-map: 800ms;

  /* ── Shadows ── */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-golden: 0 2px 12px rgba(232, 162, 37, 0.3);
  --shadow-glow: 0 0 8px;
}
```

---

## 11. File & Asset Conventions

| Asset Type     | Format    | Naming Convention                     |
|----------------|-----------|---------------------------------------|
| App icons      | SVG / PNG | `app-icon-{size}.svg`                 |
| Favicons       | SVG / ICO | `favicon-{size}.svg`                  |
| UI icons       | SVG       | `icon-{name}.svg` (from Lucide)       |
| Logo           | SVG       | `logomark.svg`, `wordmark.svg`        |
| Components     | TSX/JSX   | `PascalCase.tsx`                      |
| CSS files      | CSS       | `kebab-case.css`                      |
| Design tokens  | JSON/CSS  | `tokens.css` or `tokens.json`         |

---

## 12. Do / Don't Quick Reference

### DO:
- Use dark surfaces as the base — `--dark-900` for page, `--dark-800` for cards
- Use `--golden-hour` as the primary accent for CTAs, scores, and active states
- Use `--font-mono` for all camera data, settings values, timestamps, and scores
- Show Light Quality Score as a conic-gradient ring with centered number
- Apply `backdrop-filter: blur()` for Pro tier gating overlays
- Use Lucide icons at 24×24 with 1.5px stroke
- Separate data values with middle dot `·` (not pipes, dashes, or commas)
- Ensure 44px minimum touch targets everywhere
- Animate score rings, stagger card entrances, spring-settle map positions
- Test with `prefers-reduced-motion` enabled

### DON'T:
- Never use a white/light theme as default (dark-first always)
- Never use default bright Mapbox styles — always custom dark basemap
- Never use Inter, Roboto, Arial, or system fonts
- Never display camera settings in body font — always mono
- Never fully block free users — always show blurred preview of Pro content
- Never use color alone to convey condition state — always pair with icon + text
- Never use purple gradients, glass morphism trends, or generic "AI" aesthetics
- Never exceed 960px content width
- Never put decorative icons that don't serve a functional purpose
- Never use comma-separated camera settings — always middle dot separated

---

*This document should be included in the project root as `STYLE_GUIDE.md` or in a `.claude/` or `.cursor/` rules directory for AI agent consumption. Update version number when design tokens change.*
