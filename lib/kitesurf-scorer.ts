/**
 * Kitesurf scoring engine.
 *
 * Given current wind (and optionally a preferred bearing / user quiver),
 * produces a 0-100 score with human-readable reasons and a recommended kite size.
 */

import type { WindConditions, KitesurfScore, OwnedKite } from "./kitesurf-types";

// Rule-of-thumb rider weight (kg) → ideal kite size (m²) at 18 knots
// For lighter winds, use larger kites; for heavier, smaller.
function recommendKiteSize(
  windKnots: number,
  riderWeightKg: number | undefined,
  ownedKites: OwnedKite[]
): number | undefined {
  if (!ownedKites.length) return undefined;
  // Collect every size the user owns across all kite models
  const allSizes = new Set<number>();
  ownedKites.forEach((k) => k.sizes_m2.forEach((s) => allSizes.add(s)));
  const sizes = Array.from(allSizes).sort((a, b) => a - b);
  if (!sizes.length) return undefined;

  // Simplified power calc: ideal m² ≈ (rider_kg * 2.2) / (wind_knots - 4)
  // Falls back to 75kg if unknown. Clamp below and above.
  const kg = riderWeightKg ?? 75;
  const ideal = windKnots > 6 ? (kg * 2.2) / (windKnots - 4) : 17;

  // Find the owned size closest to ideal
  let best = sizes[0];
  let bestDiff = Math.abs(sizes[0] - ideal);
  for (const s of sizes) {
    const diff = Math.abs(s - ideal);
    if (diff < bestDiff) {
      best = s;
      bestDiff = diff;
    }
  }
  return best;
}

function bearingDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export interface KitesurfScoreInput {
  wind: WindConditions;
  preferredBearing?: number; // shore faces this direction — wind from here = onshore
  precipitation_mm?: number;
  weatherCode?: number;
  hoursOfDaylight?: number;
  ownedKites?: OwnedKite[];
  riderWeightKg?: number;
}

export function scoreKitesurf(input: KitesurfScoreInput): KitesurfScore {
  const { wind, preferredBearing, precipitation_mm = 0, weatherCode = 0, hoursOfDaylight, ownedKites = [], riderWeightKg } = input;
  const reasons: string[] = [];
  let score = 0;

  // Wind speed core
  const s = wind.speed_knots;
  let windScore = 0;
  if (s < 6) {
    windScore = 0;
    reasons.push(`Too light — ${s.toFixed(0)} kt (need 8+ for foil, 14+ for twintip).`);
  } else if (s < 10) {
    windScore = 30;
    reasons.push(`Light wind at ${s.toFixed(0)} kt — foil session only.`);
  } else if (s < 14) {
    windScore = 55;
    reasons.push(`${s.toFixed(0)} kt — light twintip or big kite.`);
  } else if (s <= 25) {
    windScore = 90;
    reasons.push(`${s.toFixed(0)} kt — ideal session wind.`);
  } else if (s <= 35) {
    windScore = 75;
    reasons.push(`${s.toFixed(0)} kt — strong, pick a small kite.`);
  } else {
    windScore = 20;
    reasons.push(`${s.toFixed(0)} kt — overpowered / dangerous.`);
  }
  score += windScore * 0.55;

  // Gust factor
  const gustRatio = wind.gust_knots / Math.max(wind.speed_knots, 1);
  if (gustRatio > 1.5) {
    score -= 15;
    reasons.push(`Very gusty (ratio ${gustRatio.toFixed(1)}× mean).`);
  } else if (gustRatio > 1.3) {
    score -= 8;
    reasons.push(`Gusty conditions.`);
  } else {
    score += 5;
    reasons.push(`Steady wind.`);
  }

  // Direction vs shore
  if (preferredBearing !== undefined) {
    const delta = bearingDelta(wind.direction_deg, preferredBearing);
    if (delta < 30) {
      score += 10;
      reasons.push(`Onshore (${wind.direction_label}) — safe direction.`);
    } else if (delta < 70) {
      score += 5;
      reasons.push(`Side-on (${wind.direction_label}) — great for riding.`);
    } else if (delta < 110) {
      score -= 2;
      reasons.push(`Side-shore (${wind.direction_label}) — doable.`);
    } else if (delta < 150) {
      score -= 10;
      reasons.push(`Side-off (${wind.direction_label}) — caution.`);
    } else {
      score -= 25;
      reasons.push(`Offshore (${wind.direction_label}) — DO NOT kite alone.`);
    }
  }

  // Precipitation / storms
  if (weatherCode >= 95) {
    score = Math.min(score, 15);
    reasons.push(`Thunderstorm — do not kite.`);
  } else if (precipitation_mm > 1) {
    score -= 5;
    reasons.push(`Rain expected.`);
  }

  // Daylight
  if (hoursOfDaylight !== undefined && hoursOfDaylight < 1.5) {
    score -= 10;
    reasons.push(`Less than 90 min of daylight left.`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let verdict: KitesurfScore["verdict"] = "skip";
  if (score >= 80) verdict = "epic";
  else if (score >= 60) verdict = "good";
  else if (score >= 40) verdict = "marginal";

  return {
    score,
    verdict,
    reasons,
    recommendedKiteSize: recommendKiteSize(s, riderWeightKg, ownedKites),
  };
}
