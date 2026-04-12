/**
 * GET /api/profile?userId=xxx
 *   → Returns the user's profile (frontmatter + aiContext summary).
 *   → Touches last_active on every call.
 *
 * PUT /api/profile
 *   → Updates profile fields (gear, preferences, location).
 *   → Body: { userId, updates: { gear?, preferences?, location? } }
 *
 * POST /api/profile
 *   → Creates a new profile (called on first login).
 *   → Body: { id, name, email, image? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getProfile,
  touchProfile,
  saveProfile,
  createProfile,
} from "@/lib/profile";

// Hardcoded test user until auth is wired up
const TEST_USER_ID = "test-user-001";

export async function GET(req: NextRequest) {
  const userId =
    req.nextUrl.searchParams.get("userId") || TEST_USER_ID;

  // Touch last_active and get updated profile
  const profile = await touchProfile(userId);

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  // Return structured data (not the raw markdown)
  return NextResponse.json({
    id: profile.frontmatter.id,
    name: profile.frontmatter.name,
    email: profile.frontmatter.email,
    image: profile.frontmatter.image,
    location: profile.frontmatter.location,
    gear: profile.frontmatter.gear,
    preferences: profile.frontmatter.preferences,
    activity: profile.frontmatter.activity,
    subscription: profile.frontmatter.subscription,
    aiContext: profile.aiContext,
    sessionLog: profile.sessionLog,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const userId = body.userId || TEST_USER_ID;
  const updates = body.updates;

  if (!updates) {
    return NextResponse.json(
      { error: "Missing 'updates' in request body" },
      { status: 400 }
    );
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  // Apply updates to frontmatter
  if (updates.gear) {
    profile.frontmatter.gear = {
      ...profile.frontmatter.gear,
      ...updates.gear,
    };
  }
  if (updates.preferences) {
    profile.frontmatter.preferences = {
      ...profile.frontmatter.preferences,
      ...updates.preferences,
    };
  }
  if (updates.location) {
    if (updates.location.primary) {
      profile.frontmatter.location.primary = updates.location.primary;
    }
    if (updates.location.saved) {
      profile.frontmatter.location.saved = updates.location.saved;
    }
  }
  if (updates.subscription) {
    profile.frontmatter.subscription = {
      ...profile.frontmatter.subscription,
      ...updates.subscription,
    };
  }

  await saveProfile(profile);

  return NextResponse.json({ ok: true, id: profile.frontmatter.id });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.id || !body.name || !body.email) {
    return NextResponse.json(
      { error: "Missing required fields: id, name, email" },
      { status: 400 }
    );
  }

  const profile = await createProfile({
    id: body.id,
    name: body.name,
    email: body.email,
    image: body.image,
  });

  return NextResponse.json(
    {
      ok: true,
      id: profile.frontmatter.id,
      created: true,
    },
    { status: 201 }
  );
}
