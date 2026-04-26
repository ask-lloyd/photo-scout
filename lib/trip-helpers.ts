/**
 * Helpers for the Day Trip Planner: Google Maps deep-links, per-spot weather,
 * and Dolomites preset itineraries.
 */

import type { Spot } from "./types";

// ─── Google Maps deep-links ──────────────────────────────────────────────
// Use the universal `?api=1` URLs — they open the Google Maps app on mobile
// (iOS + Android) when installed, falling back to web. Apple Maps on iOS
// also recognizes them. No API key required.

export function googleMapsPlaceUrl(spot: Pick<Spot, "name" | "latitude" | "longitude">): string {
  const q = encodeURIComponent(`${spot.name} (${spot.latitude},${spot.longitude})`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function googleMapsDirectionsUrl(
  origin: { lat: number; lng: number } | null,
  destination: { lat: number; lng: number; name?: string }
): string {
  const dest = `${destination.lat},${destination.lng}`;
  const destName = destination.name ? `&destination_place_id=` : "";
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving${destName}`;
}

// Apple Maps fallback (iOS) — we provide a separate button for Apple users
export function appleMapsDirectionsUrl(
  origin: { lat: number; lng: number } | null,
  destination: { lat: number; lng: number }
): string {
  const dest = `${destination.lat},${destination.lng}`;
  if (origin) {
    return `https://maps.apple.com/?saddr=${origin.lat},${origin.lng}&daddr=${dest}&dirflg=d`;
  }
  return `https://maps.apple.com/?daddr=${dest}&dirflg=d`;
}

// ─── Weather at a specific datetime ──────────────────────────────────────
// Fetch Open-Meteo hourly for the spot/date, return the row matching the
// given hour. Returns null if unavailable (e.g., date too far out — Open-
// Meteo gives ~16 days).

export interface StopWeather {
  tempC: number;
  cloudCover: number; // %
  precipMm: number;
  windKmh: number;
  weatherCode: number;
  icon: string;
  summary: string;
}

const wxCache = new Map<string, { ts: number; data: StopWeather | null }>();
const WX_TTL_MS = 30 * 60 * 1000;

export async function fetchStopWeather(
  lat: number,
  lng: number,
  isoDateTime: string // "YYYY-MM-DDTHH:mm" local time
): Promise<StopWeather | null> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}@${isoDateTime}`;
  const cached = wxCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < WX_TTL_MS) return cached.data;

  try {
    const date = isoDateTime.slice(0, 10);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,cloud_cover,precipitation,wind_speed_10m,weather_code&start_date=${date}&end_date=${date}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const j = await res.json();
    const times: string[] = j.hourly?.time ?? [];
    if (!times.length) return null;
    // Find closest hour
    const target = isoDateTime.slice(0, 13); // "YYYY-MM-DDTHH"
    let idx = times.findIndex((t) => t.startsWith(target));
    if (idx < 0) {
      // Find nearest
      const targetMs = new Date(isoDateTime).getTime();
      let best = 0;
      let bestDiff = Infinity;
      times.forEach((t, i) => {
        const diff = Math.abs(new Date(t).getTime() - targetMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = i;
        }
      });
      idx = best;
    }
    const code = j.hourly.weather_code[idx];
    const out: StopWeather = {
      tempC: j.hourly.temperature_2m[idx],
      cloudCover: j.hourly.cloud_cover[idx],
      precipMm: j.hourly.precipitation[idx] ?? 0,
      windKmh: j.hourly.wind_speed_10m[idx],
      weatherCode: code,
      icon: weatherIcon(code),
      summary: weatherSummary(code, j.hourly.cloud_cover[idx]),
    };
    wxCache.set(cacheKey, { ts: Date.now(), data: out });
    return out;
  } catch {
    wxCache.set(cacheKey, { ts: Date.now(), data: null });
    return null;
  }
}

function weatherIcon(code: number): string {
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

function weatherSummary(code: number, cloud: number): string {
  if (code <= 1) return "Clear";
  if (code <= 3) return cloud >= 70 ? "Mostly cloudy" : "Partly cloudy";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

// ─── Dolomites preset itineraries ────────────────────────────────────────
// Curated multi-stop days using only spots already in the library.

export interface PresetItinerary {
  id: string;
  name: string;
  description: string;
  basecamp: string;
  stops: { spotId: string; window: string; shootMinutes: number }[];
}

export const DOLOMITES_PRESETS: PresetItinerary[] = [
  {
    id: "dolomites-classic-day",
    name: "Dolomites Classic Day",
    description: "Sunrise at Braies → midday Funes → sunset Cadini. Long but iconic.",
    basecamp: "Cortina d'Ampezzo or Val Pusteria",
    stops: [
      { spotId: "lago-di-braies", window: "sunrise", shootMinutes: 90 },
      { spotId: "val-di-funes-st-magdalena", window: "midday", shootMinutes: 60 },
      { spotId: "cadini-di-misurina", window: "sunset", shootMinutes: 75 },
    ],
  },
  {
    id: "dolomites-cortina-day",
    name: "Cortina Base Day",
    description: "Mostly local — sunrise at Misurina, evening Cadini overlook. Easy day.",
    basecamp: "Cortina d'Ampezzo",
    stops: [
      { spotId: "lago-di-misurina", window: "sunrise", shootMinutes: 75 },
      { spotId: "cortina-d-ampezzo", window: "midday", shootMinutes: 60 },
      { spotId: "cadini-di-misurina", window: "evening_golden", shootMinutes: 90 },
    ],
  },
  {
    id: "dolomites-meadows-day",
    name: "Alpine Meadows Day",
    description: "Funes morning light then Alpe di Siusi sunset. West side of range.",
    basecamp: "Val Gardena / Castelrotto",
    stops: [
      { spotId: "val-di-funes-st-magdalena", window: "sunrise", shootMinutes: 75 },
      { spotId: "alpe-di-siusi", window: "evening_golden", shootMinutes: 120 },
    ],
  },
];
