// Heightmap fetcher — pulls terrarium tiles for a bbox, decodes to Float32 elevations.
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
      img.onerror = (e) => {
        tileCache.delete(key);
        reject(e);
      };
      img.src = TILE_URL(z, x, y);
    });
    tileCache.set(key, p);
  }
  return p;
}

export interface Heightmap {
  /** Float32 elevation in meters, row-major width*height. */
  elevations: Float32Array;
  width: number;
  height: number;
  bbox: { west: number; south: number; east: number; north: number };
  metersPerPixelLng: number;
  metersPerPixelLat: number;
  zoom: number;
}

export async function fetchHeightmap(
  bbox: { west: number; south: number; east: number; north: number },
  zoom: number,
  opts: { downsample?: number } = {}
): Promise<Heightmap> {
  const z = Math.min(Math.max(Math.round(zoom), 8), 12);
  const tl = lngLatToTile(bbox.west, bbox.north, z);
  const br = lngLatToTile(bbox.east, bbox.south, z);
  const cols = br.x - tl.x + 1;
  const rows = br.y - tl.y + 1;
  const w = cols * TILE_SIZE;
  const h = rows * TILE_SIZE;

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = (canvas as HTMLCanvasElement).getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) throw new Error("Failed to acquire 2D context for heightmap canvas");

  const jobs: Promise<void>[] = [];
  for (let ty = tl.y; ty <= br.y; ty++) {
    for (let tx = tl.x; tx <= br.x; tx++) {
      jobs.push(
        loadTile(z, tx, ty).then((img) => {
          ctx.drawImage(
            img,
            (tx - tl.x) * TILE_SIZE,
            (ty - tl.y) * TILE_SIZE
          );
        })
      );
    }
  }
  await Promise.all(jobs);

  const px = ctx.getImageData(0, 0, w, h).data;

  const ds = Math.max(1, Math.floor(opts.downsample ?? 1));
  const outW = Math.floor(w / ds);
  const outH = Math.floor(h / ds);
  const elevations = new Float32Array(outW * outH);
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const sx = ox * ds;
      const sy = oy * ds;
      const i = (sy * w + sx) * 4;
      elevations[oy * outW + ox] = decodeTerrarium(px[i], px[i + 1], px[i + 2]);
    }
  }

  const nw = tileToLngLat(tl.x, tl.y, z);
  const se = tileToLngLat(br.x + 1, br.y + 1, z);
  const exactBbox = { west: nw.lng, north: nw.lat, east: se.lng, south: se.lat };

  const centerLat = (exactBbox.north + exactBbox.south) / 2;
  const earthCirc = 40_075_017;
  const metersPerPixelLng =
    (((exactBbox.east - exactBbox.west) *
      Math.cos((centerLat * Math.PI) / 180) *
      earthCirc) /
      360) /
    outW;
  const metersPerPixelLat =
    (((exactBbox.north - exactBbox.south) * earthCirc) / 360) / outH;

  return {
    elevations,
    width: outW,
    height: outH,
    bbox: exactBbox,
    metersPerPixelLng,
    metersPerPixelLat,
    zoom: z,
  };
}
