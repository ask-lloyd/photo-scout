/**
 * Hourly wind forecast — next 7 days via Open-Meteo.
 * Returns parallel arrays indexed by hour.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,weather_code` +
      `&wind_speed_unit=kn&timezone=auto&forecast_days=7`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = await res.json();
    const h = json.hourly ?? {};
    return NextResponse.json({
      time: (h.time ?? []) as string[],
      wind_speed_knots: (h.wind_speed_10m ?? []) as number[],
      wind_gusts_knots: (h.wind_gusts_10m ?? []) as number[],
      wind_direction_deg: (h.wind_direction_10m ?? []) as number[],
      precipitation_mm: (h.precipitation ?? []) as number[],
      weatherCode: (h.weather_code ?? []) as number[],
      timezone: json.timezone ?? "UTC",
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch wind forecast", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
