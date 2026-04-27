/// <reference lib="webworker" />
// Shadow ray-march worker.
// For each pixel, march toward the sun in heightmap-space; if terrain
// ever exceeds the ray's height, that pixel is shadowed.
declare const self: DedicatedWorkerGlobalScope;

interface Job {
  type: "shadow";
  jobId: number;
  width: number;
  height: number;
  elevations: Float32Array;
  metersPerPixelLng: number;
  metersPerPixelLat: number;
  sunAzimuth: number; // suncalc convention: south=0, west=+pi/2
  sunAltitude: number; // radians
  alpenglow?: boolean;
  /** Min prominence (meters) for a pixel to count as alpenglow-eligible terrain.
   *  Prominence = baseElev - min(neighborhood within `alpenglowProminenceRadiusM`).
   *  Filters out flat ground / water while letting any hill, ridge, or dune qualify.
   *  Default: 50m */
  alpenglowMinProminence?: number;
  /** Neighborhood radius (meters) used to evaluate prominence. Default: 500m. */
  alpenglowProminenceRadiusM?: number;
  maxSteps?: number;
}

self.onmessage = (e: MessageEvent<Job>) => {
  const j = e.data;
  if (j.type !== "shadow") return;

  const w = j.width;
  const h = j.height;
  const elev = j.elevations;
  const out = new Uint8Array(w * h);

  if (j.sunAltitude <= 0) {
    out.fill(j.alpenglow ? 0 : 200);
    self.postMessage({ jobId: j.jobId, mask: out }, [out.buffer]);
    return;
  }

  // suncalc azimuth: south-clockwise. Sun direction vector in map space (east=+x, south=+y):
  //   east  = sin(az)
  //   south = -cos(az)
  // Marching toward the sun = +sun direction (so shadows fall away from it).
  const eastward = Math.sin(j.sunAzimuth);
  const southward = -Math.cos(j.sunAzimuth);

  const absE = Math.abs(eastward);
  const absS = Math.abs(southward);
  const norm = Math.max(absE, absS) || 1;
  const stepX = eastward / norm;
  const stepY = southward / norm;

  const stepMeters =
    Math.abs(stepX) * j.metersPerPixelLng +
    Math.abs(stepY) * j.metersPerPixelLat;
  const dz = stepMeters * Math.tan(j.sunAltitude);
  const MAX_STEPS = j.maxSteps ?? 220;
  const minProminence = j.alpenglowMinProminence ?? 50;
  const promRadiusM = j.alpenglowProminenceRadiusM ?? 500;
  // Convert prominence-radius to pixels using the smaller of the two axes.
  const mPerPx = Math.min(j.metersPerPixelLng, j.metersPerPixelLat) || 1;
  const promRadiusPx = Math.max(2, Math.min(40, Math.round(promRadiusM / mPerPx)));

  // Precompute local-min elevation per pixel using a separable horizontal+vertical
  // min filter (O(w*h*r), cheap). Used only for alpenglow prominence check.
  let localMin: Float32Array | null = null;
  if (j.alpenglow) {
    const tmp = new Float32Array(w * h);
    // Horizontal pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let m = Infinity;
        const x0 = Math.max(0, x - promRadiusPx);
        const x1 = Math.min(w - 1, x + promRadiusPx);
        for (let xi = x0; xi <= x1; xi++) {
          const v = elev[y * w + xi];
          if (v < m) m = v;
        }
        tmp[y * w + x] = m;
      }
    }
    // Vertical pass
    localMin = new Float32Array(w * h);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let m = Infinity;
        const y0 = Math.max(0, y - promRadiusPx);
        const y1 = Math.min(h - 1, y + promRadiusPx);
        for (let yi = y0; yi <= y1; yi++) {
          const v = tmp[yi * w + x];
          if (v < m) m = v;
        }
        localMin[y * w + x] = m;
      }
    }
  }

  function sample(x: number, y: number): number {
    const x0 = x | 0;
    const y0 = y | 0;
    const x1 = x0 + 1 < w ? x0 + 1 : w - 1;
    const y1 = y0 + 1 < h ? y0 + 1 : h - 1;
    const fx = x - x0;
    const fy = y - y0;
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

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const baseElev = elev[py * w + px];
      let inShadow = false;
      let rx = px + stepX;
      let ry = py + stepY;
      let rz = baseElev + dz;
      for (let s = 0; s < MAX_STEPS; s++) {
        if (rx < 0 || rx >= w - 1 || ry < 0 || ry >= h - 1) break;
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
        const idx = py * w + px;
        const prominence = localMin ? baseElev - localMin[idx] : 0;
        out[idx] = !inShadow && prominence >= minProminence ? 255 : 0;
      } else {
        out[py * w + px] = inShadow ? 200 : 0;
      }
    }
  }

  self.postMessage({ jobId: j.jobId, mask: out }, [out.buffer]);
};

export {};
