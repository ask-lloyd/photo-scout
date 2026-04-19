/**
 * POST /api/profile/refresh?userId=xxx
 *
 * On-demand profile refresh for Pro users.
 * - Checks subscription.plan === "pro"
 * - Debounces: skips if last_agent_update < 5 minutes ago
 * - Delegates to the shared agent pipeline (lib/agent-pipeline.ts)
 * - Returns refreshed profile data
 */

import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/profile";
import { runAgentUpdate } from "@/lib/agent-pipeline";

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
  try {
    const result = await runAgentUpdate(profile);
    return NextResponse.json(result);
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
