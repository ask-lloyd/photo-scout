/**
 * Vercel Cron endpoint: sweep all user profiles and run agent updates
 * for any that are stale.
 *
 * Schedule: called by Vercel Cron (configured in vercel.json)
 * Auth: Bearer token matching CRON_SECRET env var (skipped in dev)
 */

import { NextResponse } from "next/server";
import { storageListProfiles } from "@/lib/storage";
import { getProfile, isProfileStale } from "@/lib/profile";
import { fetchWeather } from "@/lib/light-engine";
import { runAgentUpdate } from "@/lib/agent-pipeline";
import type { WeatherData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for Vercel Pro

const MAX_PROFILES_PER_SWEEP = 50;
const DELAY_BETWEEN_UPDATES_MS = 100;

// ─── Helpers ───

/**
 * Extract userId from a storage key.
 * R2 keys:   "users/{id}/profile.md"
 * Local keys: "{id}/profile.md"
 */
function extractUserId(key: string): string {
  return key.replace(/^users\//, "").replace(/\/profile\.md$/, "");
}

/** Small delay to avoid rate-limiting external APIs. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cache key for weather deduplication by rounded lat/lng. */
function weatherCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

// ─── Route Handler ───

export async function GET(request: Request): Promise<NextResponse> {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const weatherCache = new Map<string, WeatherData>();

  let swept = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const details: Array<{
    userId: string;
    action: "updated" | "skipped" | "error";
    reason?: string;
    durationMs?: number;
  }> = [];

  try {
    const keys = await storageListProfiles();
    const profileKeys = keys.slice(0, MAX_PROFILES_PER_SWEEP);

    for (const key of profileKeys) {
      swept++;
      const userId = extractUserId(key);

      try {
        const profile = await getProfile(userId);
        if (!profile) {
          skipped++;
          details.push({ userId, action: "skipped", reason: "profile not found" });
          continue;
        }

        if (!isProfileStale(profile)) {
          skipped++;
          details.push({ userId, action: "skipped", reason: "not stale" });
          continue;
        }

        // Pre-fetch weather into cache if not already there
        const loc = profile.frontmatter.location.primary;
        const cacheKey = weatherCacheKey(loc.lat, loc.lng);
        if (!weatherCache.has(cacheKey)) {
          try {
            const weather = await fetchWeather(loc.lat, loc.lng);
            weatherCache.set(cacheKey, weather);
          } catch (e) {
            // Weather fetch failure is non-fatal; agent pipeline handles missing weather
            console.warn(`[sweep] Weather fetch failed for ${userId}:`, e);
          }
        }

        // Run agent update
        const updateStart = Date.now();
        await runAgentUpdate(profile, weatherCache);
        const durationMs = Date.now() - updateStart;

        updated++;
        details.push({ userId, action: "updated", durationMs });

        // Rate-limit delay between updates
        await sleep(DELAY_BETWEEN_UPDATES_MS);
      } catch (e) {
        errors++;
        details.push({
          userId,
          action: "error",
          reason: e instanceof Error ? e.message : String(e),
        });
        console.error(`[sweep] Error updating profile ${userId}:`, e);
      }
    }
  } catch (e) {
    console.error("[sweep] Fatal error listing profiles:", e);
    return NextResponse.json(
      {
        error: "Failed to list profiles",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  const totalMs = Date.now() - startTime;

  return NextResponse.json({
    swept,
    updated,
    skipped,
    errors,
    durationMs: totalMs,
    details,
  });
}
