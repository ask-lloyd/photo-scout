/**
 * Kitesurf-specific types (conditions-scout branch)
 */

export interface Kite {
  id: string;
  brand: string;
  model: string;
  sizes_m2: number[];
  discipline: string[];
  wind_range_knots: [number, number] | null;
  year?: number | null;
  url?: string;
  summary?: string;
}

export interface Board {
  id: string;
  brand: string;
  model: string;
  type: "twintip" | "directional" | "foilboard";
  sizes_cm: string[];
  discipline: string[];
  year?: number | null;
  url?: string;
  summary?: string;
}

// User owns a specific kite MODEL in specific sizes
export interface OwnedKite {
  id: string;            // brand+model ref, e.g. "duotone-evo"
  brand: string;
  model: string;
  sizes_m2: number[];    // e.g. [8, 10, 12] — sizes the user owns
}

export interface OwnedBoard {
  id: string;
  brand: string;
  model: string;
  type: "twintip" | "directional" | "foilboard";
  size_cm?: string;      // which size the user owns (optional)
}

export interface KitesurfSpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  preferredBearing?: number; // 0-359, direction shore faces (wind coming FROM this direction = onshore)
  notes?: string;
}

export interface KitesurfGearProfile {
  kites: OwnedKite[];
  boards: OwnedBoard[];
  harness?: string;        // free text
  skillLevel?: "beginner" | "intermediate" | "advanced" | "expert";
  weightKg?: number;
  primaryDiscipline?: string;
  spots: KitesurfSpot[];
}

export interface WindConditions {
  speed_knots: number;
  gust_knots: number;
  direction_deg: number;   // 0-359
  direction_label: string; // e.g. "NE"
}

export interface TideExtreme {
  time: string;            // ISO
  type: "high" | "low";
  height_m: number;
}

export interface TideData {
  station: string;
  distance_km: number;
  current_height_m: number | null;
  extremes: TideExtreme[];
}

export interface KitesurfScore {
  score: number;           // 0-100
  verdict: "epic" | "good" | "marginal" | "skip";
  reasons: string[];       // human-readable factors
  recommendedKiteSize?: number;  // m² — from user's quiver, for current wind
}

export interface KitesurfOpportunity {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  score: number;
  confidence: "high" | "moderate" | "low";
  timing: { start: string; end: string; label: string; daysOut: number };
  conditions: {
    wind_knots: number;
    wind_direction: number;
    gust_knots: number;
    temperature: number;
  };
}
