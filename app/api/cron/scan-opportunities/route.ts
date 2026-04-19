/**
 * Vercel Cron endpoint: scan photo opportunities for all active users.
 *
 * Runs hourly. Deduplicates locations so users in the same area share one scan.
 * For now we return/log opportunities; future: store per-user in R2 + notifications.
 *
 * Schedule: called by Vercel Cron (configured in vercel.json)
 * Auth: Bearer token matching CRON_SECRET env var (skipped in dev)
 */

import { NextResponse } from "next/server";
import { storageListProfiles } from "@/lib/storage";
import { getProfile } from "@/lib/profile";
import { scanOpportunities } from "@/lib/opportunity-scanner";
import type { Opportunity, UserLocation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for Vercel Pro

// ─── Helpers ───

/**
 * Extract userId from a storage key.
 * R2 keys:   "users/{id}/profile.md"
 * Local keys: "{id}/profile.md"
 */
function extractUserId(key: string): string {
  return key.replace(/^users\//, "").replace(/\/profile\.md$/, "");
}

/** Round-based cache key for location deduplication. */
function locationCacheKey(lat: number, lng: number): string {
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

  try {
    // 1. List all profiles and extract user IDs
    const keys = await storageListProfiles();
    const userIds = keys.map(extractUserId);

    // 2. Deduplicate locations — group by rounded lat/lng
    const locationMap = new Map<
      string,
      { location: UserLocation; userIds: string[] }
    >();

    for (const userId of userIds) {
      try {
        const profile = await getProfile(userId);
        if (!profile) continue;

        const loc = profile.frontmatter.location.primary;
        const key = locationCacheKey(loc.lat, loc.lng);

        if (locationMap.has(key)) {
          locationMap.get(key)!.userIds.push(userId);
        } else {
          locationMap.set(key, { location: loc, userIds: [userId] });
        }
      } catch (e) {
        console.warn(
          `[scan-opportunities] Failed to load profile for ${userId}:`,
          e
        );
      }
    }

    // 3. Scan each unique location
    let totalOpportunities = 0;
    const allOpportunities: Opportunity[] = [];

    for (const [key, entry] of locationMap) {
      try {
        console.log(
          `[scan-opportunities] Scanning ${entry.location.name} (${key}) for ${entry.userIds.length} user(s)`
        );
        const opportunities = await scanOpportunities(entry.location, 7);
        totalOpportunities += opportunities.length;
        allOpportunities.push(...opportunities);
      } catch (e) {
        console.error(
          `[scan-opportunities] Error scanning location ${entry.location.name} (${key}):`,
          e
        );
      }
    }

    // 4. Pick top 5 by score
    const topOpportunities = allOpportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const durationMs = Date.now() - startTime;

    console.log(
      `[scan-opportunities] Done: ${locationMap.size} locations, ${totalOpportunities} opportunities in ${durationMs}ms`
    );

    return NextResponse.json({
      locationsScanned: locationMap.size,
      opportunitiesFound: totalOpportunities,
      topOpportunities,
      durationMs,
    });
  } catch (e) {
    console.error("[scan-opportunities] Fatal error:", e);
    return NextResponse.json(
      {
        error: "Failed to scan opportunities",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
