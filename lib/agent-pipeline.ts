/**
 * Reusable agent update pipeline.
 *
 * Runs: fetch weather → sun position → light score → session log → save profile.
 * Used by the on-demand refresh endpoint and the batch sweep cron.
 */

import { saveProfile, nextUpdateTime, computeTier } from "@/lib/profile";
import {
  computeLightScore,
  fetchWeather,
  getDirectionToFace,
  getLightWindows,
} from "@/lib/light-engine";
import * as SunCalc from "suncalc";
import type {
  UserProfile,
  WeatherData,
  SessionLogEntry,
  LightConditions,
} from "@/lib/types";

// ─── Public result type ───

export interface AgentUpdateResult {
  status: "refreshed";
  light: {
    score: number;
    phase: string;
    character: string[];
    colorTemperature: LightConditions["colorTemperature"];
    directionToFace: LightConditions["directionToFace"];
    components: LightConditions["components"];
  };
  weather: WeatherData;
  windows: {
    name: string;
    start: string;
    end: string;
    score: number;
    phase: string;
  }[];
  nextBestWindow: { name: string; score: number; start: string } | null;
  sessionEntry: SessionLogEntry;
}

// ─── Helpers ───

export function describeWeather(w: {
  cloudCoverTotal: number;
  temperature: number;
  windSpeed: number;
  humidity: number;
  visibility: number;
}): string {
  const parts: string[] = [];

  if (w.cloudCoverTotal < 10) parts.push("Clear");
  else if (w.cloudCoverTotal < 40) parts.push("Partly cloudy");
  else if (w.cloudCoverTotal < 70) parts.push("Broken clouds");
  else if (w.cloudCoverTotal < 85) parts.push("Mostly cloudy");
  else parts.push("Overcast");

  // Temperature in Fahrenheit for US locale
  parts.push(`${Math.round((w.temperature * 9) / 5 + 32)}°F`);
  parts.push(`wind ${Math.round(w.windSpeed)} km/h`);

  return parts.join(", ");
}

// ─── Core pipeline ───

/**
 * Run the full agent update pipeline for a single profile.
 *
 * @param profile  - The user profile to refresh (mutated in place & saved).
 * @param weatherCache - Optional pre-fetched weather keyed by "lat,lng".
 *                       If the key exists, the cached value is used instead
 *                       of making a network call.  Useful for batch sweeps.
 */
export async function runAgentUpdate(
  profile: UserProfile,
  weatherCache?: Map<string, WeatherData>,
): Promise<AgentUpdateResult> {
  const { lat, lng } = profile.frontmatter.location.primary;
  const now = new Date();

  // 1. Fetch weather (or use cache)
  const cacheKey = `${lat},${lng}`;
  let weather: WeatherData;
  if (weatherCache?.has(cacheKey)) {
    weather = weatherCache.get(cacheKey)!;
  } else {
    weather = await fetchWeather(lat, lng);
    weatherCache?.set(cacheKey, weather);
  }

  // 2. Get sun position
  const sunPos = SunCalc.getPosition(now, lat, lng);
  const sunAltDeg = (sunPos.altitude * 180) / Math.PI;
  const sunAzDeg = ((sunPos.azimuth * 180) / Math.PI + 180) % 360;

  // 3. Compute light score
  const light = computeLightScore(sunAltDeg, weather);
  light.sunAzimuth = sunAzDeg;
  light.sunAltitude = sunAltDeg;
  const direction = getDirectionToFace(sunAzDeg, sunAltDeg);
  light.directionToFace = direction;

  // 4. Get today's light windows
  const windows = getLightWindows(lat, lng, now);

  // 5. Find next best window
  const upcoming = windows
    .filter((w) => w.end > now && w.score >= 50)
    .sort((a, b) => b.score - a.score);

  // 6. Build session log entry
  const weatherDesc = describeWeather(weather);
  const entry: SessionLogEntry = {
    date: now.toISOString().slice(0, 10),
    title: `${light.lightPhase}, ${profile.frontmatter.location.primary.name}`,
    body: [
      `- Light score: ${light.score} | ${weatherDesc}`,
      `- Phase: ${light.lightPhase} | Color temp: ${light.colorTemperature.label}`,
      `- Face: ${direction.label} (${direction.bearing}°)`,
      upcoming.length > 0
        ? `- **Next best window:** ${upcoming[0].name} (score ${upcoming[0].score})`
        : "- No high-quality windows remaining today",
      `- **Agent note:** Auto-refresh at ${now.toLocaleTimeString()}.`,
    ].join("\n"),
  };

  // Append to session log (keep last 50 entries)
  profile.sessionLog = [entry, ...profile.sessionLog].slice(0, 50);

  // 7. Update activity timestamps
  const tier = computeTier(now.toISOString());
  profile.frontmatter.activity.last_agent_update = now.toISOString();
  profile.frontmatter.activity.next_scheduled_update = nextUpdateTime(tier);
  profile.frontmatter.activity.tier = tier;

  await saveProfile(profile);

  return {
    status: "refreshed",
    light: {
      score: light.score,
      phase: light.lightPhase,
      character: light.character,
      colorTemperature: light.colorTemperature,
      directionToFace: light.directionToFace,
      components: light.components,
    },
    weather,
    windows: windows.map((w) => ({
      name: w.name,
      start: w.start.toISOString(),
      end: w.end.toISOString(),
      score: w.score,
      phase: w.phase,
    })),
    nextBestWindow: upcoming[0]
      ? {
          name: upcoming[0].name,
          score: upcoming[0].score,
          start: upcoming[0].start.toISOString(),
        }
      : null,
    sessionEntry: entry,
  };
}
