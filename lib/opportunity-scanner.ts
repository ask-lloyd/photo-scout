import * as SunCalc from "suncalc";
import { format, differenceInMinutes, differenceInCalendarDays } from "date-fns";
import type {
  Opportunity,
  OpportunityRule,
  OpportunityCondition,
  HourlyForecast,
  UserLocation,
} from "@/lib/types";

// ─── Fetch 7-day hourly forecast from Open-Meteo ───

export async function fetchForecast(
  lat: number,
  lng: number,
  days: number = 7
): Promise<HourlyForecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: [
      "cloud_cover",
      "cloud_cover_low",
      "cloud_cover_mid",
      "cloud_cover_high",
      "relative_humidity_2m",
      "visibility",
      "temperature_2m",
      "wind_speed_10m",
      "precipitation",
      "weather_code",
    ].join(","),
    forecast_days: days.toString(),
    timezone: "auto",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const h = data.hourly;

  return {
    time: h.time as string[],
    cloudCover: h.cloud_cover as number[],
    cloudCoverHigh: h.cloud_cover_high as number[],
    cloudCoverMid: h.cloud_cover_mid as number[],
    cloudCoverLow: h.cloud_cover_low as number[],
    humidity: h.relative_humidity_2m as number[],
    visibility: (h.visibility as number[]).map((v: number) => v / 1000), // meters → km
    temperature: h.temperature_2m as number[],
    windSpeed: h.wind_speed_10m as number[],
    precipitation: h.precipitation as number[],
    weatherCode: h.weather_code as number[],
  };
}

// ─── Load opportunity rules from generated JSON ───

let cachedRules: OpportunityRule[] | null = null;

export function loadOpportunityRules(): OpportunityRule[] {
  if (cachedRules) return cachedRules;

  try {
    // Works in Node.js / Next.js server context
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rules = require("../public/data/opportunity-rules.json");
    cachedRules = rules as OpportunityRule[];
    return cachedRules;
  } catch {
    // File doesn't exist yet (build pipeline hasn't run)
    console.warn(
      "[opportunity-scanner] opportunity-rules.json not found — returning empty rules"
    );
    return [];
  }
}

// ─── Evaluate a single condition against hour data ───

export function evaluateCondition(
  condition: OpportunityCondition,
  hourData: Record<string, number>
): number {
  const actual = hourData[condition.field];
  if (actual === undefined || actual === null) return 0;

  switch (condition.operator) {
    case "gt":
      return actual > (condition.value as number) ? 1 : 0;
    case "lt":
      return actual < (condition.value as number) ? 1 : 0;
    case "eq":
      return actual === (condition.value as number) ? 1 : 0;
    case "between": {
      const [min, max] = condition.value as [number, number];
      if (actual >= min && actual <= max) return 1;
      // Partial credit: within 20% of range edges
      const range = max - min;
      const margin = range * 0.2;
      if (actual >= min - margin && actual < min) {
        return 0.5;
      }
      if (actual > max && actual <= max + margin) {
        return 0.5;
      }
      return 0;
    }
    default:
      return 0;
  }
}

// ─── Time window computation using SunCalc ───

export function getTimeWindow(
  lat: number,
  lng: number,
  date: Date
): Record<string, { start: Date; end: Date }> {
  const times = SunCalc.getTimes(date, lat, lng);

  const windows: Record<string, { start: Date; end: Date }> = {};

  // SunCalc goldenHourEnd = end of morning golden hour
  // SunCalc goldenHour = start of evening golden hour
  if (times.sunrise && times.goldenHourEnd) {
    windows["golden_hour_am"] = {
      start: times.sunrise,
      end: times.goldenHourEnd,
    };
  }

  if (times.goldenHour && times.sunset) {
    windows["golden_hour_pm"] = {
      start: times.goldenHour,
      end: times.sunset,
    };
  }

  // Sunrise window: ~15 min before to ~15 min after
  if (times.sunrise) {
    windows["sunrise"] = {
      start: new Date(times.sunrise.getTime() - 15 * 60 * 1000),
      end: new Date(times.sunrise.getTime() + 15 * 60 * 1000),
    };
  }

  // Sunset window: ~15 min before to ~15 min after
  if (times.sunset) {
    windows["sunset"] = {
      start: new Date(times.sunset.getTime() - 15 * 60 * 1000),
      end: new Date(times.sunset.getTime() + 15 * 60 * 1000),
    };
  }

  // Blue hour AM: civil dawn to sunrise
  if (times.dawn && times.sunrise) {
    windows["blue_hour_am"] = {
      start: times.dawn,
      end: times.sunrise,
    };
  }

  // Blue hour PM: sunset to civil dusk
  if (times.sunset && times.dusk) {
    windows["blue_hour_pm"] = {
      start: times.sunset,
      end: times.dusk,
    };
  }

  // Night: nautical dusk to nautical dawn next day
  if (times.nauticalDusk) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextTimes = SunCalc.getTimes(nextDay, lat, lng);
    if (nextTimes.nauticalDawn) {
      windows["night"] = {
        start: times.nauticalDusk,
        end: nextTimes.nauticalDawn,
      };
    }
  }

  // Midday: 10am to 3pm
  const midStart = new Date(date);
  midStart.setHours(10, 0, 0, 0);
  const midEnd = new Date(date);
  midEnd.setHours(15, 0, 0, 0);
  windows["midday"] = { start: midStart, end: midEnd };

  return windows;
}

// ─── Check if a date falls within allowed time windows ───

export function isInTimeWindow(
  date: Date,
  windows: Record<string, { start: Date; end: Date }>,
  allowedWindows: string[]
): boolean {
  const ts = date.getTime();
  for (const wName of allowedWindows) {
    const w = windows[wName];
    if (w && ts >= w.start.getTime() && ts <= w.end.getTime()) {
      return true;
    }
  }
  return false;
}

// ─── Generate human-readable timing label ───

function timingLabel(start: Date, now: Date): string {
  const diffMin = differenceInMinutes(start, now);
  const diffDays = differenceInCalendarDays(start, now);

  if (diffMin < 0) {
    return "Now";
  }
  if (diffMin <= 90) {
    return `In ${diffMin} min`;
  }
  if (diffDays === 0) {
    return `Today ${format(start, "h:mm a")}`;
  }
  if (diffDays === 1) {
    return `Tomorrow ${format(start, "h:mm a")}`;
  }
  // 2-6 days out
  return format(start, "EEE h:mm a");
}

// ─── Main scanner pipeline ───

export async function scanOpportunities(
  location: UserLocation,
  days: number = 7
): Promise<Opportunity[]> {
  const { lat, lng, name: locationName } = location;
  const now = new Date();

  // 1. Fetch forecast
  const forecast = await fetchForecast(lat, lng, days);

  // 2. Load rules
  const rules = loadOpportunityRules();
  if (rules.length === 0) return [];

  // 3. Pre-compute time windows per day
  const dayWindowsCache = new Map<string, Record<string, { start: Date; end: Date }>>();

  function getWindowsForDate(d: Date): Record<string, { start: Date; end: Date }> {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dayWindowsCache.has(key)) {
      dayWindowsCache.set(key, getTimeWindow(lat, lng, d));
    }
    return dayWindowsCache.get(key)!;
  }

  // 4. Evaluate each hour against each rule
  interface Candidate {
    rule: OpportunityRule;
    score: number;
    startTime: Date;
    endTime: Date;
    hourData: Record<string, number>;
  }

  // Group candidates by rule+day for merging consecutive hours
  const candidateMap = new Map<string, Candidate>();

  for (let i = 0; i < forecast.time.length; i++) {
    const hourTime = new Date(forecast.time[i]);

    // Skip past hours
    if (hourTime.getTime() < now.getTime() - 60 * 60 * 1000) continue;

    const hourData: Record<string, number> = {
      cloudCover: forecast.cloudCover[i],
      cloudCoverHigh: forecast.cloudCoverHigh[i],
      cloudCoverMid: forecast.cloudCoverMid[i],
      cloudCoverLow: forecast.cloudCoverLow[i],
      humidity: forecast.humidity[i],
      visibility: forecast.visibility[i], // already in km
      windSpeed: forecast.windSpeed[i],
      temperature: forecast.temperature[i],
      precipitation: forecast.precipitation[i],
    };

    const dayWindows = getWindowsForDate(hourTime);

    for (const rule of rules) {
      // Check time window
      if (
        rule.time_windows.length > 0 &&
        !isInTimeWindow(hourTime, dayWindows, rule.time_windows)
      ) {
        continue;
      }

      // Evaluate conditions
      let weightedScore = 0;
      let totalWeight = 0;

      for (const cond of rule.conditions) {
        const condScore = evaluateCondition(cond, hourData);
        weightedScore += condScore * cond.weight;
        totalWeight += cond.weight;
      }

      // Normalize and apply rule weight
      const normalizedScore =
        totalWeight > 0
          ? (weightedScore / totalWeight) * rule.score_weight * 100
          : 0;

      if (normalizedScore < rule.min_score) continue;

      // Merge key: rule + day
      const dayKey = `${hourTime.getFullYear()}-${hourTime.getMonth()}-${hourTime.getDate()}`;
      const mapKey = `${rule.id}::${dayKey}`;

      const existing = candidateMap.get(mapKey);
      if (existing) {
        // Merge: extend time range, keep max score and best conditions
        if (hourTime.getTime() < existing.startTime.getTime()) {
          existing.startTime = hourTime;
        }
        const hourEnd = new Date(hourTime.getTime() + 60 * 60 * 1000);
        if (hourEnd.getTime() > existing.endTime.getTime()) {
          existing.endTime = hourEnd;
        }
        if (normalizedScore > existing.score) {
          existing.score = normalizedScore;
          existing.hourData = hourData;
        }
      } else {
        candidateMap.set(mapKey, {
          rule,
          score: normalizedScore,
          startTime: hourTime,
          endTime: new Date(hourTime.getTime() + 60 * 60 * 1000),
          hourData,
        });
      }
    }
  }

  // 5. Build opportunity objects
  const opportunities: Opportunity[] = [];
  let idCounter = 0;

  for (const [, candidate] of candidateMap) {
    const { rule, score, startTime, endTime, hourData } = candidate;
    const daysOut = differenceInCalendarDays(startTime, now);

    const confidence: "high" | "moderate" | "low" =
      score >= 80 ? "high" : score >= 65 ? "moderate" : "low";

    opportunities.push({
      id: `opp-${++idCounter}`,
      ruleId: rule.id,
      type: rule.type,
      title: rule.name,
      description: rule.description,
      score: Math.round(score),
      confidence,
      timing: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        label: timingLabel(startTime, now),
        daysOut,
      },
      location: {
        name: locationName,
        lat,
        lng,
      },
      conditions: {
        cloudCover: hourData.cloudCover,
        windSpeed: hourData.windSpeed,
        humidity: hourData.humidity,
        visibility: hourData.visibility,
        temperature: hourData.temperature,
      },
    });
  }

  // 6. Sort by score descending, return top 20
  opportunities.sort((a, b) => b.score - a.score);
  return opportunities.slice(0, 20);
}
