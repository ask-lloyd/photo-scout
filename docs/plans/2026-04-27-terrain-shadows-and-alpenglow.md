# Terrain-Aware Shadows & Alpenglow Implementation Plan

> **For Hermes:** Use `subagent-driven-development` to implement task-by-task. Each phase ends with a deploy + visual verification gate before moving on.

**Goal:** Replace the flat-earth shadow wedge on `/map` with a real, terrain-aware shadow overlay computed from a DEM, plus an inverse "alpenglow" overlay that highlights which peaks/ridges remain lit when surrounding terrain is in shadow. Both update live as the time scrubber moves.

**Architecture:**
- Heightmap source: AWS Terrain Tiles (terrarium PNG) — already loaded today by the 3D Terrain layer. Decode: `elev_m = (R*256 + G + B/256) - 32768`.
- Sun position: `suncalc` (already a dep) — gives azimuth + altitude radians.
- Compute path: render the visible viewport's heightmap into an offscreen canvas (one texture sampled from current MapLibre terrain-RGB tiles), then a Web Worker ray-marches each pixel toward the sun in tile-space to produce a shadow mask. The mask is uploaded as a MapLibre `image` source and drawn as a `raster` layer with a multiply/screen blend.
- Alpenglow is the inverse mask, gated on sun altitude < 8° (low sun only) and gradient-tinted warm by altitude (more red the lower the sun).
- Debounced recompute on: scrubber change, map move-end, terrain layer toggle.

**Tech stack:** MapLibre GL JS (custom layer + image source), Web Worker for ray-marching, suncalc, TypeScript. No new heavy deps.

**Why this approach (vs custom WebGL shader):**
- Worker-on-canvas ray-march is ~150 LOC, works on every device, easy to debug.
- WebGL custom layer is a future Phase 5 — only if perf is bad on low-end devices.

**Acceptance criteria:**
- At sunset on a Dolomites spot, peaks like Sassolungo glow orange while their east faces and valleys go dark.
- Dragging the scrubber updates the overlay within ~150ms (debounced).
- Toggle "Terrain Shadows" / "Alpenglow" independently. Both off = back to the current flat-earth wedge (kept as a fallback for cheap quick reads).
- A new "Alpenglow Now" pill in the spot detail flyout reads "Sassolungo east face: peak alpenglow at 19:42, 12 min window."

---

## Phase 0 — Setup & Scaffolding

### Task 0.1: Branch + plan checkpoint

**Objective:** Create a working branch off `conditions-scout` and commit this plan.

**Files:**
- Modify: this file (already created)

**Steps:**
1. `git checkout -b feat/terrain-shadows-alpenglow`
2. `git add docs/plans/2026-04-27-terrain-shadows-and-alpenglow.md && git commit -m "docs: terrain shadows + alpenglow plan"`
3. Push: `git push -u origin feat/terrain-shadows-alpenglow`

**Verification:** Branch visible in `git branch -vv`.

---

### Task 0.2: Add a `terrainShadows` and `alpenglow` flag to map state

**Objective:** Wire the toggles into the existing `layers` state and panel UI without rendering anything yet.

**Files:**
- Modify: `app/map/page.tsx` (the `layers` useState block, both desktop + mobile layer panels)

**Step 1: Extend the layers shape**

In `app/map/page.tsx`, find the `useState({ sunMoonPath: ..., terrain3d: false })` and add:

```tsx
const [layers, setLayers] = useState({
  sunMoonPath: true,
  opportunitySpots: true,
  lightPollution: false,
  shadowOverlay: false,        // existing flat-earth wedge — keep as cheap fallback
  terrainShadows: false,       // NEW — DEM-cast shadows
  alpenglow: false,            // NEW — peaks lit at low sun
  cloudRadar: false,
  terrain3d: false,
});
```

**Step 2: Add labels in both layer panels**

In the `[ ["sunMoonPath","Sun/Moon Path"], ... ]` arrays (desktop and mobile), insert after `["shadowOverlay","Shadow Overlay (flat)"]` and rename:

```tsx
["shadowOverlay", "Shadow Overlay (flat — quick)"],
["terrainShadows", "Terrain Shadows"],
["alpenglow", "Alpenglow"],
```

**Step 3: Build & verify checkboxes appear, do nothing yet**

```bash
bun run build && PATH="$HOME/.hermes/node/bin:$PATH" vercel --prod --yes
```

Open `/map`, confirm two new checkboxes show up and clicking them logs no errors. Commit:

```bash
git add -A && git commit -m "feat(map): add terrainShadows + alpenglow layer flags (no-op stubs)"
```

---

## Phase 1 — Heightmap Sampling Infrastructure

### Task 1.1: Add terrain-RGB decoder utility

**Objective:** Pure function `decodeTerrarium(r,g,b) => elevMeters`, plus a viewport-to-DEM-grid helper.

**Files:**
- Create: `lib/terrain/dem.ts`
- Create: `lib/terrain/dem.test.ts`

**Step 1: Write failing test**

```ts
// lib/terrain/dem.test.ts
import { describe, expect, it } from "bun:test";
import { decodeTerrarium } from "./dem";

describe("decodeTerrarium", () => {
  it("returns 0 for sea level encoding", () => {
    // (128,0,0) → 128*256 + 0 + 0/256 - 32768 = 32768 - 32768 = 0
    expect(decodeTerrarium(128, 0, 0)).toBeCloseTo(0, 1);
  });
  it("returns ~3343m for a typical Dolomites peak encoding", () => {
    // 32768 + 3343 = 36111 → R=141, G=15, B=0   (141*256 + 15 = 36111)
    expect(decodeTerrarium(141, 15, 0)).toBeCloseTo(3343, 1);
  });
  it("handles below-sea-level (Dead Sea ~ -430m)", () => {
    // 32768 - 430 = 32338 → R=126, G=82
    expect(decodeTerrarium(126, 82, 0)).toBeCloseTo(-430, 1);
  });
});
```

**Step 2: Run — expect FAIL** (`module not found`)
```bash
bun test lib/terrain/dem.test.ts
```

**Step 3: Implement minimum**

```ts
// lib/terrain/dem.ts
export function decodeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}
```

**Step 4: Run — expect PASS**

**Step 5: Commit** `feat(terrain): terrarium PNG decoder`

---

### Task 1.2: Tile coordinate helpers

**Objective:** lng/lat ↔ XYZ tile coordinates at a given zoom, plus a `getTileBounds` helper.

**Files:**
- Modify: `lib/terrain/dem.ts`
- Modify: `lib/terrain/dem.test.ts`

**Step 1: Tests**

```ts
import { lngLatToTile, tileToLngLat } from "./dem";

it("round-trips a known tile", () => {
  // z=10 tile for Selva Val Gardena ~ (11.76°E, 46.55°N)
  const t = lngLatToTile(11.76, 46.55, 10);
  expect(t.x).toBe(545);
  expect(t.y).toBe(363);
  const back = tileToLngLat(t.x, t.y, 10);
  expect(back.lng).toBeCloseTo(11.6015625, 4);
  expect(back.lat).toBeCloseTo(46.5895, 2);
});
```

**Step 2: Implement** (Web Mercator projection — see https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames)

```ts
export function lngLatToTile(lng: number, lat: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z };
}
export function tileToLngLat(x: number, y: number, z: number) {
  const n = 2 ** z;
  const lng = (x / n) * 360 - 180;
  const lat =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return { lng, lat };
}
```

**Step 3:** Run tests, expect PASS. Commit `feat(terrain): tile<->lnglat helpers`.

---

### Task 1.3: Heightmap fetcher (main thread, debounced)

**Objective:** Given a viewport bbox + zoom, fetch the necessary terrarium tiles, draw them into an offscreen canvas, return an `ImageData` heightmap covering the viewport.

**Files:**
- Create: `lib/terrain/heightmap.ts`

**Step 1: Implement**

```ts
import { decodeTerrarium, lngLatToTile, tileToLngLat } from "./dem";

const TILE_SIZE = 256;
const TILE_URL = (z: number, x: number, y: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const tileCache = new Map<string, Promise<HTMLImageElement>>();

function loadTile(z: number, x: number, y: number) {
  const key = `${z}/${x}/${y}`;
  let p = tileCache.get(key);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = TILE_URL(z, x, y);
    });
    tileCache.set(key, p);
  }
  return p;
}

export interface Heightmap {
  /** Float32 elevation in meters, row-major, height*width */
  elevations: Float32Array;
  width: number;
  height: number;
  /** geographic bounds the heightmap covers (axis-aligned in mercator) */
  bbox: { west: number; south: number; east: number; north: number };
  /** pixel-to-meters scale at the heightmap center (rough, for ray-march step) */
  metersPerPixelLng: number;
  metersPerPixelLat: number;
}

export async function fetchHeightmap(
  bbox: { west: number; south: number; east: number; north: number },
  zoom: number
): Promise<Heightmap> {
  const z = Math.min(Math.max(Math.round(zoom), 8), 13); // clamp to useful range
  const tl = lngLatToTile(bbox.west, bbox.north, z);
  const br = lngLatToTile(bbox.east, bbox.south, z);
  const cols = br.x - tl.x + 1;
  const rows = br.y - tl.y + 1;
  const w = cols * TILE_SIZE;
  const h = rows * TILE_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const tiles: Promise<void>[] = [];
  for (let ty = tl.y; ty <= br.y; ty++) {
    for (let tx = tl.x; tx <= br.x; tx++) {
      tiles.push(
        loadTile(z, tx, ty).then((img) => {
          ctx.drawImage(img, (tx - tl.x) * TILE_SIZE, (ty - tl.y) * TILE_SIZE);
        })
      );
    }
  }
  await Promise.all(tiles);

  const px = ctx.getImageData(0, 0, w, h).data;
  const elevations = new Float32Array(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    elevations[j] = decodeTerrarium(px[i], px[i + 1], px[i + 2]);
  }

  // tile geo bounds -> exact heightmap bbox (probably wider than requested viewport)
  const nw = tileToLngLat(tl.x, tl.y, z);
  const se = tileToLngLat(br.x + 1, br.y + 1, z);
  const exactBbox = {
    west: nw.lng,
    north: nw.lat,
    east: se.lng,
    south: se.lat,
  };

  // Rough meters-per-pixel at heightmap center
  const centerLat = (exactBbox.north + exactBbox.south) / 2;
  const earthCirc = 40_075_017;
  const metersPerPixelLng =
    ((exactBbox.east - exactBbox.west) * Math.cos((centerLat * Math.PI) / 180) *
      earthCirc) /
    360 /
    w;
  const metersPerPixelLat =
    ((exactBbox.north - exactBbox.south) * earthCirc) / 360 / h;

  return {
    elevations,
    width: w,
    height: h,
    bbox: exactBbox,
    metersPerPixelLng,
    metersPerPixelLat,
  };
}
```

**Step 2:** Smoke test in dev console — expose temporarily on `window.__hm` and verify a known peak elevation roughly matches reality. Remove the debug global before commit.

**Step 3:** Commit `feat(terrain): heightmap fetcher from terrarium tiles`.

---

## Phase 2 — Terrain Shadow Mask (CPU, in Worker)

### Task 2.1: Shadow ray-march worker

**Objective:** Web Worker that takes a `Heightmap`, sun azimuth/altitude, and outputs a `Uint8Array` shadow mask (0 = lit, 255 = shadow), same dims.

**Files:**
- Create: `lib/terrain/shadow.worker.ts`
- Create: `lib/terrain/shadow-client.ts`

**Algorithm (per pixel):**
1. Compute step `(dx, dy)` in pixel-space pointing **toward** the sun (i.e. opposite shadow direction).
2. Compute vertical climb per step in meters: `dz = stepLengthMeters * tan(altitude)`.
3. March up to N steps (e.g. 200). At each step, compare interpolated heightmap value to the ray's current height. If terrain ever exceeds ray, pixel is in shadow.

**Step 1: Worker code**

```ts
// lib/terrain/shadow.worker.ts
/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope;

interface Job {
  type: "shadow";
  jobId: number;
  width: number;
  height: number;
  elevations: Float32Array;
  metersPerPixelLng: number;
  metersPerPixelLat: number;
  sunAzimuth: number;   // radians, suncalc convention (south=0, west=+pi/2)
  sunAltitude: number;  // radians
  /** if true, output alpenglow mask (lit pixels above an elev threshold) instead of shadow */
  alpenglow?: boolean;
  /** elevation threshold (m) for alpenglow inclusion */
  alpenglowMinElev?: number;
}

self.onmessage = (e: MessageEvent<Job>) => {
  const j = e.data;
  if (j.type !== "shadow") return;

  // Convert suncalc azimuth (south-clockwise) into east-x / south-y screen offsets.
  // Sun direction unit vector in *map* space (east=+x, south=+y):
  //   east = sin(az)
  //   south = -cos(az)
  // Marching toward the sun = +sun direction.
  const eastward = Math.sin(j.sunAzimuth);
  const southward = -Math.cos(j.sunAzimuth);

  // Step in pixels: 1 px in dominant axis
  const absE = Math.abs(eastward),
    absS = Math.abs(southward);
  const norm = Math.max(absE, absS) || 1;
  const stepX = eastward / norm;
  const stepY = southward / norm;
  const stepMeters =
    Math.abs(stepX) * j.metersPerPixelLng +
    Math.abs(stepY) * j.metersPerPixelLat;
  const dz = stepMeters * Math.tan(j.sunAltitude);

  const w = j.width,
    h = j.height,
    elev = j.elevations;
  const out = new Uint8Array(w * h);
  const MAX_STEPS = 250;

  function sample(x: number, y: number): number {
    // bilinear
    const x0 = Math.max(0, Math.min(w - 1, Math.floor(x)));
    const y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
    const x1 = Math.min(w - 1, x0 + 1);
    const y1 = Math.min(h - 1, y0 + 1);
    const fx = x - x0,
      fy = y - y0;
    const e00 = elev[y0 * w + x0];
    const e10 = elev[y0 * w + x1];
    const e01 = elev[y1 * w + x0];
    const e11 = elev[y1 * w + x1];
    return (
      e00 * (1 - fx) * (1 - fy) +
      e10 * fx * (1 - fy) +
      e01 * (1 - fx) * fy +
      e11 * fx * fy
    );
  }

  if (j.sunAltitude <= 0) {
    // night — everything shadowed
    out.fill(j.alpenglow ? 0 : 255);
    self.postMessage({ jobId: j.jobId, mask: out }, [out.buffer]);
    return;
  }

  const minElev = j.alpenglowMinElev ?? 1500;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const baseElev = elev[py * w + px];
      let inShadow = false;
      let rx = px + stepX,
        ry = py + stepY,
        rz = baseElev + dz;
      for (let s = 0; s < MAX_STEPS; s++) {
        if (rx < 0 || rx >= w || ry < 0 || ry >= h) break;
        const terrainHere = sample(rx, ry);
        if (terrainHere > rz) {
          inShadow = true;
          break;
        }
        rx += stepX;
        ry += stepY;
        rz += dz;
      }
      if (j.alpenglow) {
        // Alpenglow = lit AND high enough to catch low sun
        out[py * w + px] = !inShadow && baseElev >= minElev ? 255 : 0;
      } else {
        out[py * w + px] = inShadow ? 200 : 0;
      }
    }
  }

  self.postMessage({ jobId: j.jobId, mask: out }, [out.buffer]);
};
```

**Step 2: Client wrapper**

```ts
// lib/terrain/shadow-client.ts
import type { Heightmap } from "./heightmap";

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (mask: Uint8Array) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./shadow.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<{ jobId: number; mask: Uint8Array }>) => {
      const cb = pending.get(e.data.jobId);
      if (cb) {
        pending.delete(e.data.jobId);
        cb(e.data.mask);
      }
    };
  }
  return worker;
}

export function computeShadowMask(opts: {
  heightmap: Heightmap;
  sunAzimuth: number;
  sunAltitude: number;
  alpenglow?: boolean;
  alpenglowMinElev?: number;
}): Promise<Uint8Array> {
  const w = getWorker();
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    const elevCopy = new Float32Array(opts.heightmap.elevations);
    w.postMessage(
      {
        type: "shadow",
        jobId: id,
        width: opts.heightmap.width,
        height: opts.heightmap.height,
        elevations: elevCopy,
        metersPerPixelLng: opts.heightmap.metersPerPixelLng,
        metersPerPixelLat: opts.heightmap.metersPerPixelLat,
        sunAzimuth: opts.sunAzimuth,
        sunAltitude: opts.sunAltitude,
        alpenglow: opts.alpenglow,
        alpenglowMinElev: opts.alpenglowMinElev,
      },
      [elevCopy.buffer]
    );
  });
}
```

**Step 3:** Verify worker bundles — `bun run build` should succeed with the `new URL(..., import.meta.url)` worker pattern (Next 16 + Turbopack supports this natively).

**Step 4: Commit** `feat(terrain): shadow ray-march worker + client`.

---

### Task 2.2: Render shadow mask as a MapLibre image source

**Objective:** Take the `Uint8Array` mask + heightmap bbox, push to MapLibre as an image source + raster layer that overlays the basemap.

**Files:**
- Create: `lib/terrain/shadow-overlay.ts`

**Step 1: Implement**

```ts
import maplibregl from "maplibre-gl";
import type { Heightmap } from "./heightmap";

const SOURCE_ID = "terrain-shadow-img";
const LAYER_ID = "terrain-shadow-layer";

function maskToDataUrl(
  mask: Uint8Array,
  w: number,
  h: number,
  rgb: [number, number, number]
): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
    img.data[j] = rgb[0];
    img.data[j + 1] = rgb[1];
    img.data[j + 2] = rgb[2];
    img.data[j + 3] = mask[i]; // 0..255
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

export function renderShadowOverlay(
  map: maplibregl.Map,
  heightmap: Heightmap,
  mask: Uint8Array,
  opts: { id?: string; rgb?: [number, number, number]; opacity?: number } = {}
) {
  const sourceId = opts.id ? `${SOURCE_ID}-${opts.id}` : SOURCE_ID;
  const layerId = opts.id ? `${LAYER_ID}-${opts.id}` : LAYER_ID;
  const url = maskToDataUrl(
    mask,
    heightmap.width,
    heightmap.height,
    opts.rgb ?? [10, 14, 30]
  );
  const coords: [[number, number], [number, number], [number, number], [number, number]] =
    [
      [heightmap.bbox.west, heightmap.bbox.north],
      [heightmap.bbox.east, heightmap.bbox.north],
      [heightmap.bbox.east, heightmap.bbox.south],
      [heightmap.bbox.west, heightmap.bbox.south],
    ];

  const existing = map.getSource(sourceId) as maplibregl.ImageSource | undefined;
  if (existing) {
    existing.updateImage({ url, coordinates: coords });
  } else {
    map.addSource(sourceId, { type: "image", url, coordinates: coords });
    map.addLayer({
      id: layerId,
      type: "raster",
      source: sourceId,
      paint: { "raster-opacity": opts.opacity ?? 0.55, "raster-fade-duration": 0 },
    });
  }
}

export function removeShadowOverlay(map: maplibregl.Map, id?: string) {
  const sourceId = id ? `${SOURCE_ID}-${id}` : SOURCE_ID;
  const layerId = id ? `${LAYER_ID}-${id}` : LAYER_ID;
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}
```

**Step 2: Commit** `feat(terrain): shadow overlay image-source renderer`.

---

### Task 2.3: Wire terrain shadows into the map page

**Objective:** When `layers.terrainShadows` is on, fetch heightmap for current viewport, compute mask via worker, render overlay. Recompute on scrubber change (debounced 200ms) and on `moveend`.

**Files:**
- Modify: `app/map/page.tsx`

**Step 1:** Add a new effect after the existing flat shadow effect:

```tsx
// Terrain Shadows + Alpenglow effect
useEffect(() => {
  const map = mapRef.current;
  if (!map || !mapLoaded) return;
  if (!layers.terrainShadows && !layers.alpenglow) {
    removeShadowOverlay(map, "shadow");
    removeShadowOverlay(map, "alpenglow");
    return;
  }

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const recompute = async () => {
    if (cancelled || !map) return;
    const b = map.getBounds();
    const bbox = {
      west: b.getWest(), east: b.getEast(),
      south: b.getSouth(), north: b.getNorth(),
    };
    const zoom = map.getZoom();

    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setMinutes(timeMinutes);
    const sunPos = SunCalc.getPosition(
      d, (bbox.north + bbox.south) / 2, (bbox.east + bbox.west) / 2,
    );

    let hm: Heightmap;
    try { hm = await fetchHeightmap(bbox, zoom); }
    catch { return; }
    if (cancelled) return;

    if (layers.terrainShadows) {
      const mask = await computeShadowMask({
        heightmap: hm,
        sunAzimuth: sunPos.azimuth,
        sunAltitude: sunPos.altitude,
      });
      if (!cancelled) renderShadowOverlay(map, hm, mask, {
        id: "shadow", rgb: [10, 14, 30], opacity: 0.55,
      });
    } else removeShadowOverlay(map, "shadow");

    if (layers.alpenglow) {
      // alpenglow only meaningful at low sun
      const altDeg = (sunPos.altitude * 180) / Math.PI;
      if (altDeg > 0 && altDeg < 8) {
        const mask = await computeShadowMask({
          heightmap: hm,
          sunAzimuth: sunPos.azimuth,
          sunAltitude: sunPos.altitude,
          alpenglow: true,
          alpenglowMinElev: 1200,
        });
        // warmer redder when sun is lower
        const t = altDeg / 8; // 0 at horizon, 1 at 8°
        const rgb: [number, number, number] = [
          255,
          Math.round(120 + t * 80),
          Math.round(60 + t * 60),
        ];
        if (!cancelled) renderShadowOverlay(map, hm, mask, {
          id: "alpenglow", rgb, opacity: 0.65,
        });
      } else removeShadowOverlay(map, "alpenglow");
    } else removeShadowOverlay(map, "alpenglow");
  };

  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(recompute, 200);
  };
  debounced();
  map.on("moveend", debounced);
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    map.off("moveend", debounced);
  };
}, [layers.terrainShadows, layers.alpenglow, timeMinutes, mapLoaded]);
```

**Step 2:** Add the imports at top of file:

```tsx
import { fetchHeightmap, type Heightmap } from "@/lib/terrain/heightmap";
import { computeShadowMask } from "@/lib/terrain/shadow-client";
import { renderShadowOverlay, removeShadowOverlay } from "@/lib/terrain/shadow-overlay";
```

**Step 3:** Build, deploy, test on Selva at sunset.
- Expected: enabling Terrain Shadows shows valley shadows growing as scrubber approaches sunset.
- Expected: enabling Alpenglow at altitude=4° lights up Sassolungo + Sella peaks orange.

**Step 4: Commit** `feat(map): terrain-aware shadows + alpenglow overlay`.

---

## Phase 3 — Quality & Performance Pass

### Task 3.1: Lower-res compute mode

**Objective:** Add a `quality: "fast" | "high"` toggle. Fast mode downsamples heightmap to 0.5x before ray-march (4x speedup, fine for scrubber drags).

**Files:**
- Modify: `lib/terrain/shadow-client.ts`, `app/map/page.tsx`

Implement: when scrubber is actively dragging, run "fast"; on idle (`onMouseUp` / `onTouchEnd`), run "high". Quality is just a downsample factor passed to the heightmap.

**Verification:** scrubber drag stays at ~200ms latency on M4 Mac Mini; idle render is sharp.

**Commit:** `perf(terrain): adaptive quality during scrubber drag`.

---

### Task 3.2: Cache mask by (bbox, zoom, time-bucketed-to-5min, sunPos-rounded)

**Objective:** Avoid recomputing the same mask twice. Simple LRU keyed on a hash.

**Files:** Modify `lib/terrain/shadow-client.ts`, add `lib/terrain/cache.ts`.

**Commit:** `perf(terrain): LRU mask cache`.

---

### Task 3.3: Loading indicator

**Objective:** Small spinner pill in the layers panel when a compute is in flight.

**Files:** Modify `app/map/page.tsx`. Local `useState` `terrainComputing: boolean`.

**Commit:** `feat(map): terrain-shadow compute loading indicator`.

---

## Phase 4 — Spot-Aware Alpenglow Intelligence

### Task 4.1: Per-spot alpenglow window calculator

**Objective:** Given a spot lat/lng/elevation, compute today's "alpenglow window": the time range when the spot's surrounding peaks are catching low warm light. Output: `{ startMinutes, peakMinutes, endMinutes, qualityScore }`.

**Algorithm:**
1. For each minute from -30 to +30 around sunset, compute sun position.
2. Sample DEM in a 5km radius around the spot, find max elevation `peakElev`.
3. Check if a ray from sun azimuth/altitude actually reaches `peakElev` (use cached sun-line-of-sight).
4. "Lit window" = contiguous minutes where peak is lit AND sun altitude < 8°.

**Files:** Create `lib/alpenglow.ts`, plus `lib/alpenglow.test.ts`.

**Commit:** `feat(alpenglow): per-spot lit-window calculator`.

---

### Task 4.2: Add "Alpenglow Now" pill to spot detail flyout

**Objective:** When a spot is selected, show "Alpenglow window: 19:30–19:54, peak at 19:42 (4° altitude)" or "No alpenglow today (overcast / sun too high)".

**Files:** Modify `app/map/page.tsx` (the `selectedSpot` flyout JSX).

**Commit:** `feat(map): alpenglow window in spot flyout`.

---

### Task 4.3: Surface alpenglow-best spots in `/opportunities`

**Objective:** Add a new opportunity type `alpenglow_peak` that scores spots whose alpenglow window is happening within the next 90 minutes.

**Files:** Modify `lib/opportunity-scanner.ts`, `app/opportunities/page.tsx`.

**Commit:** `feat(opportunities): alpenglow opportunity type`.

---

## Phase 5 — Future (Not in This Plan)

- WebGL custom layer to skip the worker round-trip (sub-50ms scrubber response, mobile-friendly battery).
- Atmospheric scattering shader for true alpenglow color gradient (currently uniform tint).
- Pre-baked seasonal shadow heatmaps per spot (best time of year for any given face).

---

## Risk / Open Questions

1. **Terrarium tile rate-limits** — AWS terrain-tiles is free but unmonitored. If we burn it, fall back to Mapbox terrain-RGB with a token.
2. **Alpenglow false positives** — currently any high-elevation lit pixel glows orange, even rocky non-photogenic spots. Could later restrict to peaks (local-maxima detection on the DEM).
3. **Cloud cover** — overlay assumes clear sky. Phase 5 could multiply opacity by `1 - cloud_cover`.
4. **Worker bundling on Vercel** — Next 16 + Turbopack should handle `new URL(..., import.meta.url)`. If not, fall back to a `worker-loader`-style wrapper or main-thread compute with `requestIdleCallback`.

---

## Verification Checklist (post-implementation)

- [ ] Selva mid-day, Terrain Shadows ON: tiny shadows north of every peak, valleys mostly lit
- [ ] Selva 30 min before sunset, Terrain Shadows ON: long east-pointing shadows, valley already dark
- [ ] Selva 10 min before sunset, Alpenglow ON: Sassolungo + Sella + Marmolada glow orange while valleys dark
- [ ] Toggling layers off cleans up sources/layers (no zombie `terrain-shadow-img-*`)
- [ ] Scrubber drag at 60fps (no jank), final render sharp within 250ms of release
- [ ] Spot flyout shows accurate alpenglow window (cross-check against PhotoPills for one spot)
