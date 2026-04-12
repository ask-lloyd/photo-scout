/**
 * POST /api/profile/refresh?userId=xxx
 *
 * On-demand profile refresh for Pro users.
 * - Checks subscription.plan === "pro"
 * - Debounces: skips if last_agent_update < 5 minutes ago
 * - Runs the agent update pipeline (sun + weather → light score → recommendations)
 * - Updates AI Context and session log
 * - Returns refreshed profile data
 *
 * For now, this runs synchronously. In production, this would kick off
 * an async agent job and return immediately with a "refreshing" status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveProfile, nextUpdateTime, computeTier } from "@/lib/profile";
import { computeLightScore, fetchWeather, getDirectionToFace, getLightWindows } from "@/lib/light-engine";
import { recommendSettings } from "@/lib/settings-advisor";
import * as SunCalc from "suncalc";
import type { Camera, Lens } from "@/lib/types";

const TEST_USER_ID = "test-user-001";
const DEBOUNCE_MINUTES = 5;

export async function POST(req: NextRequest) {
  const userId =
    req.nextUrl.searchParams.get("userId") || TEST_USER_ID;

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  // Pro-only gate
  if (profile.frontmatter.subscription.plan !== "pro") {
    return NextResponse.json(
      { error: "On-demand refresh requires Pro subscription" },
      { status: 403 }
    );
  }

  // Debounce: skip if last update was < 5 minutes ago
  const lastUpdate = new Date(
    profile.frontmatter.activity.last_agent_update
  ).getTime();
  const minutesSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60);

  if (minutesSinceUpdate < DEBOUNCE_MINUTES) {
    return NextResponse.json({
      status: "fresh",
      message: `Last updated ${Math.round(minutesSinceUpdate)} minutes ago. Next refresh available in ${Math.round(DEBOUNCE_MINUTES - minutesSinceUpdate)} minutes.`,
      lastUpdate: profile.frontmatter.activity.last_agent_update,
    });
  }

  // ─── Run agent update pipeline ───
  const { lat, lng } = profile.frontmatter.location.primary;
  const now = new Date();

  try {
    // 1. Fetch weather
    const weather = await fetchWeather(lat, lng);

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
    const entry = {
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

    return NextResponse.json({
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
    });
  } catch (error: unknown) {
    console.error("Profile refresh error:", error);
    return NextResponse.json(
      {
        error: "Refresh failed",
        details:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function describeWeather(w: {
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
  parts.push(`${Math.round(w.temperature * 9 / 5 + 32)}°F`);
  parts.push(`wind ${Math.round(w.windSpeed)} km/h`);

  return parts.join(", ");
}
