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
  alpenglowMinElev?: number;
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
  const minElev = j.alpenglowMinElev ?? 1500;

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
        out[py * w + px] = !inShadow && baseElev >= minElev ? 255 : 0;
      } else {
        out[py * w + px] = inShadow ? 200 : 0;
      }
    }
  }

  self.postMessage({ jobId: j.jobId, mask: out }, [out.buffer]);
};

export {};
