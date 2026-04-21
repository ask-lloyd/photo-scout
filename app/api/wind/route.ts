/**
 * Multi-model wind consensus endpoint.
 *
 * Queries several Open-Meteo weather models in parallel and returns a consensus
 * current-wind reading plus a confidence score based on how much they agree.
 *
 * Models used:
 *   - ecmwf_ifs025  → European Centre (widely considered the most accurate globally)
 *   - gfs_seamless  → NOAA GFS (US-strong)
 *   - icon_seamless → German DWD ICON (strong over Europe)
 *   - best_match    → Open-Meteo's ensemble blend (default)
 *
 * Confidence is computed from the standard deviation of wind-speed
 * predictions: low stdev → high confidence, high stdev → low confidence.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const MODELS = [
  { id: "ecmwf_ifs025", label: "ECMWF (Europe)" },
  { id: "gfs_seamless", label: "GFS (NOAA)" },
  { id: "icon_seamless", label: "ICON (DWD)" },
  { id: "best_match", label: "Open-Meteo blend" },
] as const;

function bearingLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function circularMean(degs: number[]): number {
  // Average bearings correctly (wrap-safe).
  const x = degs.reduce((s, d) => s + Math.cos((d * Math.PI) / 180), 0);
  const y = degs.reduce((s, d) => s + Math.sin((d * Math.PI) / 180), 0);
  const mean = (Math.atan2(y, x) * 180) / Math.PI;
  return (mean + 360) % 360;
}

async function queryModel(
  lat: number,
  lng: number,
  model: string
): Promise<{ speed: number; gust: number; dir: number } | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m` +
    `&wind_speed_unit=kn&timezone=auto&models=${model}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    const c = json.current ?? {};
    if (c.wind_speed_10m == null) return null;
    return {
      speed: c.wind_speed_10m,
      gust: c.wind_gusts_10m ?? c.wind_speed_10m,
      dir: c.wind_direction_10m ?? 0,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const results = await Promise.all(
    MODELS.map(async (m) => ({ model: m, data: await queryModel(lat, lng, m.id) }))
  );

  const valid = results.filter((r) => r.data !== null) as {
    model: (typeof MODELS)[number];
    data: { speed: number; gust: number; dir: number };
  }[];

  if (valid.length === 0) {
    return NextResponse.json({ error: "No models returned data" }, { status: 502 });
  }

  const speeds = valid.map((r) => r.data.speed);
  const gusts = valid.map((r) => r.data.gust);
  const dirs = valid.map((r) => r.data.dir);
  const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const meanGust = gusts.reduce((a, b) => a + b, 0) / gusts.length;
  const meanDir = circularMean(dirs);

  // Confidence: std-dev of speeds. <2kt = high, <4kt = moderate, else low.
  const variance =
    speeds.reduce((s, v) => s + (v - meanSpeed) ** 2, 0) / speeds.length;
  const stdev = Math.sqrt(variance);
  const confidence = stdev < 2 ? "high" : stdev < 4 ? "moderate" : "low";
  const spreadKnots = Math.round(stdev * 10) / 10;

  return NextResponse.json({
    consensus: {
      speed_knots: Math.round(meanSpeed * 10) / 10,
      gust_knots: Math.round(meanGust * 10) / 10,
      direction_deg: Math.round(meanDir),
      direction_label: bearingLabel(meanDir),
    },
    confidence,
    spread_knots: spreadKnots,
    models: valid.map((r) => ({
      id: r.model.id,
      label: r.model.label,
      speed_knots: Math.round(r.data.speed * 10) / 10,
      gust_knots: Math.round(r.data.gust * 10) / 10,
      direction_deg: Math.round(r.data.dir),
      direction_label: bearingLabel(r.data.dir),
    })),
  });
}
