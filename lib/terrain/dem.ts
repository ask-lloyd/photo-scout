// Terrain DEM utilities — terrarium PNG decoder + tile coordinate helpers.
// Heightmap source: AWS Terrain Tiles (terrarium format).
//   elev_m = (R*256 + G + B/256) - 32768

export function decodeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

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
