/**
 * Global tide data endpoint.
 *
 * Strategy:
 *  1. Try Open-Meteo marine (global, free, no API key) for sea_surface_height + hourly → derive extremes.
 *  2. If not in a marine region (inland), return null tides gracefully.
 *
 * This gives us global coverage without needing a paid Stormglass key.
 */

import { NextRequest, NextResponse } from "next/server";
import type { TideData, TideExtreme } from "@/lib/kitesurf-types";

export const dynamic = "force-dynamic";

function findExtremes(times: string[], heights: number[]): TideExtreme[] {
  const extremes: TideExtreme[] = [];
  for (let i = 1; i < heights.length - 1; i++) {
    const prev = heights[i - 1];
    const curr = heights[i];
    const next = heights[i + 1];
    if (curr > prev && curr > next) {
      extremes.push({ time: times[i], type: "high", height_m: Math.round(curr * 100) / 100 });
    } else if (curr < prev && curr < next) {
      extremes.push({ time: times[i], type: "low", height_m: Math.round(curr * 100) / 100 });
    }
  }
  return extremes.slice(0, 6); // next 6 extremes ≈ 3 tidal cycles
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  try {
    // Open-Meteo Marine API — free, global, no key required.
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=sea_level_height_msl&timezone=auto&forecast_days=3`;
    const res = await fetch(url, { next: { revalidate: 1800 } });

    if (!res.ok) {
      // Inland locations return 400 from marine API — this is expected.
      return NextResponse.json({
        station: "N/A (inland)",
        distance_km: 0,
        current_height_m: null,
        extremes: [],
        available: false,
      } satisfies TideData & { available: boolean });
    }

    const json = await res.json();
    const times: string[] = json.hourly?.time ?? [];
    const heights: number[] = json.hourly?.sea_level_height_msl ?? [];

    if (heights.length === 0 || heights.every((h: number | null) => h == null)) {
      return NextResponse.json({
        station: "N/A (no marine data)",
        distance_km: 0,
        current_height_m: null,
        extremes: [],
        available: false,
      } satisfies TideData & { available: boolean });
    }

    // Find the current hour's height
    const now = new Date();
    let currentIdx = 0;
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]) <= now) currentIdx = i;
      else break;
    }
    const current = heights[currentIdx] ?? null;

    // Filter out nulls for extreme-finding
    const cleanTimes: string[] = [];
    const cleanHeights: number[] = [];
    for (let i = 0; i < times.length; i++) {
      if (heights[i] != null) {
        cleanTimes.push(times[i]);
        cleanHeights.push(heights[i]);
      }
    }

    const allExtremes = findExtremes(cleanTimes, cleanHeights);
    // Only future extremes
    const future = allExtremes.filter((e) => new Date(e.time) >= now);

    return NextResponse.json({
      station: "Open-Meteo Marine",
      distance_km: 0,
      current_height_m: current != null ? Math.round(current * 100) / 100 : null,
      extremes: future,
      available: true,
    } satisfies TideData & { available: boolean });
  } catch (e) {
    return NextResponse.json(
      {
        station: "error",
        distance_km: 0,
        current_height_m: null,
        extremes: [],
        available: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 200 }
    );
  }
}
