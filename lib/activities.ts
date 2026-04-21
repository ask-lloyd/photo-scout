// Activity system — multi-activity expansion (conditions-scout branch)
export type ActivityId = "photography" | "kitesurf";

export interface ActivityMeta {
  id: ActivityId;
  label: string;
  tagline: string;
  icon: string; // emoji for now — swap for SVG later
  color: string; // CSS var or hex
  // Where the activity picker sends the user after selection
  homePath: string;
  // Nav items shown when this activity is active
  nav: { href: string; label: string }[];
}

export const ACTIVITIES: Record<ActivityId, ActivityMeta> = {
  photography: {
    id: "photography",
    label: "Photography",
    tagline: "Light, sun position, and shooting conditions.",
    icon: "📸",
    color: "var(--golden-hour)",
    homePath: "/dashboard",
    nav: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/map", label: "Map" },
      { href: "/opportunities", label: "Opportunities" },
      { href: "/planner", label: "Shot Planner" },
      { href: "/gear", label: "Gear" },
    ],
  },
  kitesurf: {
    id: "kitesurf",
    label: "Kitesurfing",
    tagline: "Wind, tide, and session-window intelligence.",
    icon: "🪁",
    color: "#4cc9f0",
    homePath: "/kitesurf",
    nav: [
      { href: "/kitesurf", label: "Dashboard" },
      { href: "/kitesurf/spots", label: "Spots" },
      { href: "/kitesurf/opportunities", label: "Sessions" },
      { href: "/kitesurf/gear", label: "Gear" },
    ],
  },
};

export const ACTIVITY_LIST: ActivityMeta[] = [
  ACTIVITIES.photography,
  ACTIVITIES.kitesurf,
];
