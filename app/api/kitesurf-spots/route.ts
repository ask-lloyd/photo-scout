/**
 * Nearby kitesurf spots endpoint.
 *
 * Strategy:
 *  1. Start from our curated seed list (global).
 *  2. Also query OpenStreetMap Overpass API for `sport=kitesurfing` nodes within radius.
 *  3. Merge, de-dupe by proximity, return distance-sorted.
 *
 * The OSM enrichment catches local / lesser-known beaches that the seed list misses.
 */

import { NextRequest, NextResponse } from "next/server";
import { nearestSpots, SeedSpot } from "@/lib/kitesurf-spots-seed";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchOsmKiteSpots(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<Array<{ id: string; name: string; lat: number; lng: number; source: "osm" }>> {
  const radiusM = Math.round(radiusKm * 1000);
  const query = `
    [out:json][timeout:15];
    (
      node["sport"~"kitesurfing|windsurfing"](around:${radiusM},${lat},${lng});
      way["sport"~"kitesurfing|windsurfing"](around:${radiusM},${lat},${lng});
      node["leisure"="beach_resort"]["sport"~"kite"](around:${radiusM},${lat},${lng});
    );
    out center 40;
  `;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: query }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const elements: OsmElement[] = json.elements ?? [];
    return elements
      .map((el) => {
        const pLat = el.lat ?? el.center?.lat;
        const pLng = el.lon ?? el.center?.lon;
        if (pLat == null || pLng == null) return null;
        const name = el.tags?.name || el.tags?.["name:en"] || "Kite spot (OSM)";
        return {
          id: `osm-${el.type}-${el.id}`,
          name,
          lat: pLat,
          lng: pLng,
          source: "osm" as const,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  const radiusKm = parseFloat(params.get("radiusKm") ?? "200");
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const seedHits: (SeedSpot & { distance_km: number; source: "seed" })[] =
    nearestSpots(lat, lng, radiusKm, 25).map((s) => ({ ...s, source: "seed" as const }));

  const osmHits = await fetchOsmKiteSpots(lat, lng, radiusKm);

  // Merge: OSM spots that are within 2 km of a seed spot are considered duplicates.
  const merged: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    distance_km: number;
    source: "seed" | "osm";
    preferredBearing?: number;
    country?: string;
    notes?: string;
    wind_season?: string;
    best_wind_kts?: string;
    difficulty?: string;
  }> = [...seedHits];

  for (const o of osmHits) {
    const dup = seedHits.find((s) => haversineKm(s.lat, s.lng, o.lat, o.lng) < 2);
    if (dup) continue;
    const distance_km = haversineKm(lat, lng, o.lat, o.lng);
    if (distance_km > radiusKm) continue;
    merged.push({ id: o.id, name: o.name, lat: o.lat, lng: o.lng, distance_km, source: "osm" });
  }

  merged.sort((a, b) => a.distance_km - b.distance_km);
  return NextResponse.json({ spots: merged.slice(0, 25), count: merged.length });
}
