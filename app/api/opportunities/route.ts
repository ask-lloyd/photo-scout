import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/profile";
import { scanOpportunities } from "@/lib/opportunity-scanner";
import type { UserLocation } from "@/lib/types";

const TEST_USER_ID = "test-user-001";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get("userId");
  const latStr = params.get("lat");
  const lngStr = params.get("lng");
  const days = Math.min(Math.max(parseInt(params.get("days") ?? "7", 10) || 7, 1), 14);

  let location: UserLocation;

  if (userId) {
    // Resolve location from user profile
    const profile = await getProfile(userId);
    if (!profile) {
      return NextResponse.json(
        { error: `Profile not found for userId: ${userId}` },
        { status: 404 }
      );
    }
    location = profile.frontmatter.location.primary;
  } else if (latStr && lngStr) {
    // Use direct lat/lng
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Invalid lat/lng values" },
        { status: 400 }
      );
    }
    location = {
      name: "Custom Location",
      lat,
      lng,
      timezone: "UTC",
    };
  } else {
    // Fallback to test user for dev convenience
    const profile = await getProfile(TEST_USER_ID);
    if (!profile) {
      return NextResponse.json(
        { error: "No userId or lat/lng provided, and test user not found" },
        { status: 400 }
      );
    }
    location = profile.frontmatter.location.primary;
  }

  const opportunities = await scanOpportunities(location, days);

  return NextResponse.json({
    location: { name: location.name, lat: location.lat, lng: location.lng },
    opportunities,
    count: opportunities.length,
    scannedDays: days,
  });
}
