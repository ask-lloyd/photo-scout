// Client wrapper around the shadow ray-march worker.
import type { Heightmap } from "./heightmap";

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (mask: Uint8Array) => void>();

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (!worker) {
    worker = new Worker(new URL("./shadow.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (
      e: MessageEvent<{ jobId: number; mask: Uint8Array }>
    ) => {
      const cb = pending.get(e.data.jobId);
      if (cb) {
        pending.delete(e.data.jobId);
        cb(e.data.mask);
      }
    };
  }
  return worker;
}

export interface ShadowJobOpts {
  heightmap: Heightmap;
  sunAzimuth: number;
  sunAltitude: number;
  alpenglow?: boolean;
  alpenglowMinElev?: number;
  maxSteps?: number;
}

export function computeShadowMask(opts: ShadowJobOpts): Promise<Uint8Array> {
  const w = getWorker();
  if (!w) return Promise.resolve(new Uint8Array(0));
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    // Worker keeps the buffer; we send a copy so the caller's heightmap stays usable.
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
        maxSteps: opts.maxSteps,
      },
      [elevCopy.buffer]
    );
  });
}
