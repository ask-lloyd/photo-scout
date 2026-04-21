/**
 * Wind conditions endpoint — current wind speed, gust, direction.
 * Open-Meteo (no API key needed).
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function bearingLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = await res.json();
    const c = json.current ?? {};
    const speed = c.wind_speed_10m ?? 0;
    const gust = c.wind_gusts_10m ?? speed;
    const dir = c.wind_direction_10m ?? 0;
    return NextResponse.json({
      speed_knots: Math.round(speed * 10) / 10,
      gust_knots: Math.round(gust * 10) / 10,
      direction_deg: dir,
      direction_label: bearingLabel(dir),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch wind", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
