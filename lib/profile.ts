/**
 * Profile markdown ↔ TypeScript conversion.
 *
 * A user profile.md has three sections:
 *   1. YAML frontmatter (structured data)
 *   2. ## AI Context (freeform agent memory)
 *   3. ## Session Log (append-only session entries)
 *
 * This module handles parsing, serializing, creating defaults,
 * and computing activity tiers.
 */

import matter from "gray-matter";
import type {
  UserProfile,
  UserProfileFrontmatter,
  SessionLogEntry,
  UserLocation,
} from "@/lib/types";
import { storageRead, storageWrite, storageExists, profileKey } from "@/lib/storage";

// ─── Parsing ───

/**
 * Parse a raw profile.md string into a structured UserProfile.
 */
export function parseProfile(raw: string): UserProfile {
  const { data, content } = matter(raw);
  const frontmatter = data as UserProfileFrontmatter;

  // Split body into AI Context and Session Log sections
  const sections = splitSections(content);

  return {
    frontmatter,
    aiContext: sections.aiContext,
    sessionLog: parseSessionLog(sections.sessionLog),
    raw,
  };
}

/**
 * Split markdown body into AI Context and Session Log.
 */
function splitSections(body: string): {
  aiContext: string;
  sessionLog: string;
} {
  const aiContextMatch = body.match(
    /## AI Context\s*\n([\s\S]*?)(?=\n## Session Log|$)/
  );
  const sessionLogMatch = body.match(/## Session Log\s*\n([\s\S]*?)$/);

  return {
    aiContext: aiContextMatch?.[1]?.trim() || "",
    sessionLog: sessionLogMatch?.[1]?.trim() || "",
  };
}

/**
 * Parse session log markdown into structured entries.
 *
 * Format:
 * ### 2026-03-28 — Golden Hour, Georgetown TX
 * - Light score: 87 | Clear, 72°F, wind 8mph
 * - **Agent note:** ...
 */
function parseSessionLog(raw: string): SessionLogEntry[] {
  if (!raw) return [];

  const entries: SessionLogEntry[] = [];
  const blocks = raw.split(/(?=^### )/m);

  for (const block of blocks) {
    const headerMatch = block.match(
      /^### (\d{4}-\d{2}-\d{2})\s*[—–-]\s*(.*)\n([\s\S]*)/
    );
    if (headerMatch) {
      entries.push({
        date: headerMatch[1],
        title: headerMatch[2].trim(),
        body: headerMatch[3].trim(),
      });
    }
  }

  return entries;
}

// ─── Serialization ───

/**
 * Serialize a UserProfile back to markdown.
 */
export function serializeProfile(profile: UserProfile): string {
  const fm = { ...profile.frontmatter };
  fm.updated = new Date().toISOString();

  const yamlContent = matter.stringify("", fm);

  const sessionLogMd = profile.sessionLog
    .map(
      (entry) =>
        `### ${entry.date} — ${entry.title}\n${entry.body}`
    )
    .join("\n\n");

  return (
    yamlContent.trim() +
    "\n\n## AI Context\n\n" +
    (profile.aiContext || "_No context yet._") +
    "\n\n## Session Log\n\n" +
    (sessionLogMd || "_No sessions recorded yet._") +
    "\n"
  );
}

// ─── Activity Tier ───

export type ActivityTier = "hot" | "warm" | "cold";

/**
 * Compute activity tier from last_active timestamp.
 *
 * Hot:  active within 48 hours  → update every 6 hours
 * Warm: active within 14 days   → update daily
 * Cold: inactive 14+ days       → update weekly
 */
export function computeTier(lastActive: string | Date): ActivityTier {
  const now = Date.now();
  const last =
    typeof lastActive === "string"
      ? new Date(lastActive).getTime()
      : lastActive.getTime();
  const hoursAgo = (now - last) / (1000 * 60 * 60);

  if (hoursAgo < 48) return "hot";
  if (hoursAgo < 14 * 24) return "warm";
  return "cold";
}

/**
 * Staleness thresholds in hours.
 */
const STALENESS: Record<ActivityTier, number> = {
  hot: 6,
  warm: 24,
  cold: 7 * 24,
};

/**
 * Check if a profile's agent data is stale and needs an update.
 */
export function isProfileStale(profile: UserProfile): boolean {
  const { activity } = profile.frontmatter;
  const tier = computeTier(activity.last_active);
  const lastUpdate = new Date(activity.last_agent_update).getTime();
  const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
  return hoursSinceUpdate >= STALENESS[tier];
}

/**
 * Compute next scheduled update time based on tier.
 */
export function nextUpdateTime(tier: ActivityTier): string {
  const now = Date.now();
  return new Date(now + STALENESS[tier] * 60 * 60 * 1000).toISOString();
}

// ─── Profile CRUD ───

/**
 * Get a user profile from storage.
 */
export async function getProfile(
  userId: string
): Promise<UserProfile | null> {
  const raw = await storageRead(profileKey(userId));
  if (!raw) return null;
  return parseProfile(raw);
}

/**
 * Save a user profile to storage.
 */
export async function saveProfile(profile: UserProfile): Promise<void> {
  const md = serializeProfile(profile);
  await storageWrite(profileKey(profile.frontmatter.id), md);
}

/**
 * Touch last_active and save. Called on every app visit.
 */
export async function touchProfile(userId: string): Promise<UserProfile | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;

  const now = new Date().toISOString();
  const newTier = computeTier(now);

  profile.frontmatter.activity.last_active = now;
  profile.frontmatter.activity.tier = newTier;
  profile.frontmatter.activity.next_scheduled_update = nextUpdateTime(newTier);
  profile.frontmatter.activity.total_sessions += 1;

  await saveProfile(profile);
  return profile;
}

/**
 * Create a new user profile with defaults.
 * Called on first login (after OAuth).
 */
export async function createProfile(opts: {
  id: string;
  name: string;
  email: string;
  image?: string;
  location?: UserLocation;
}): Promise<UserProfile> {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const defaultLocation: UserLocation = opts.location ?? {
    name: "Georgetown, TX",
    lat: 30.6327,
    lng: -97.6781,
    timezone: "America/Chicago",
  };

  const frontmatter: UserProfileFrontmatter = {
    id: opts.id,
    name: opts.name,
    email: opts.email,
    image: opts.image,
    created: today,
    updated: now,
    location: {
      primary: defaultLocation,
      saved: [],
    },
    gear: {
      cameras: [],
      lenses: [],
      accessories: [],
    },
    preferences: {
      styles: [],
      preferred_times: [],
      experience: "intermediate",
    },
    activity: {
      tier: "hot",
      last_active: now,
      last_agent_update: now,
      next_scheduled_update: nextUpdateTime("hot"),
      total_sessions: 1,
    },
    subscription: {
      plan: "free",
    },
  };

  const profile: UserProfile = {
    frontmatter,
    aiContext: `New user. ${opts.name} just signed up. No shooting history yet.`,
    sessionLog: [],
    raw: "",
  };

  // Generate raw markdown and save
  profile.raw = serializeProfile(profile);
  await saveProfile(profile);

  return profile;
}

/**
 * Ensure a profile exists. Create if missing.
 */
export async function ensureProfile(opts: {
  id: string;
  name: string;
  email: string;
  image?: string;
}): Promise<UserProfile> {
  const existing = await getProfile(opts.id);
  if (existing) return existing;
  return createProfile(opts);
}
