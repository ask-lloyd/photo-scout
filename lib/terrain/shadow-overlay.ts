// Render a Uint8 mask as a MapLibre image source + raster layer.
import maplibregl from "maplibre-gl";
import type { Heightmap } from "./heightmap";

const SRC = (id: string) => `terrain-shadow-img-${id}`;
const LYR = (id: string) => `terrain-shadow-layer-${id}`;

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
    img.data[j + 3] = mask[i];
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

export interface OverlayOpts {
  id: string;
  rgb?: [number, number, number];
  opacity?: number;
  /** layer id to insert before (e.g. spot markers) so overlay sits beneath */
  beforeId?: string;
}

export function renderShadowOverlay(
  map: maplibregl.Map,
  heightmap: Heightmap,
  mask: Uint8Array,
  opts: OverlayOpts
) {
  if (!mask.length) return;
  const sourceId = SRC(opts.id);
  const layerId = LYR(opts.id);
  const url = maskToDataUrl(
    mask,
    heightmap.width,
    heightmap.height,
    opts.rgb ?? [10, 14, 30]
  );
  const coords: [
    [number, number],
    [number, number],
    [number, number],
    [number, number]
  ] = [
    [heightmap.bbox.west, heightmap.bbox.north],
    [heightmap.bbox.east, heightmap.bbox.north],
    [heightmap.bbox.east, heightmap.bbox.south],
    [heightmap.bbox.west, heightmap.bbox.south],
  ];

  const existing = map.getSource(sourceId) as
    | maplibregl.ImageSource
    | undefined;
  if (existing) {
    existing.updateImage({ url, coordinates: coords });
  } else {
    map.addSource(sourceId, {
      type: "image",
      url,
      coordinates: coords,
    });
    map.addLayer(
      {
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": opts.opacity ?? 0.55,
          "raster-fade-duration": 0,
        },
      },
      opts.beforeId
    );
  }
}

export function removeShadowOverlay(map: maplibregl.Map, id: string) {
  const sourceId = SRC(id);
  const layerId = LYR(id);
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}
