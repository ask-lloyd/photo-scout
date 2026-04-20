/**
 * 7-day light forecast endpoint.
 *
 * Returns one entry per day with the best opportunity score, type, and
 * weather summary for the forecast strip on the Opportunities page.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchForecast, getTimeWindow } from "@/lib/opportunity-scanner";
import * as SunCalc from "suncalc";

export const dynamic = "force-dynamic";

// WMO Weather Codes → icon hint
function weatherIcon(code: number): string {
  if (code <= 1) return "clear";
  if (code <= 3) return "partly-cloudy";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 95) return "storm";
  return "cloudy";
}

// Determine best light type for a day based on conditions
function bestLightType(
  goldenPmScore: number,
  goldenAmScore: number,
  nightScore: number,
  cloudCover: number,
  stormBreak: boolean
): { type: string; label: string } {
  if (stormBreak) return { type: "storm", label: "Storm break!" };
  if (nightScore > 60) return { type: "astro", label: "Astro window" };
  if (goldenPmScore >= goldenAmScore && goldenPmScore >= 50)
    return { type: "sunset", label: "PM sunset" };
  if (goldenAmScore >= 50) return { type: "sunrise", label: "AM golden" };
  if (cloudCover > 80) return { type: "overcast", label: "Overcast" };
  if (cloudCover < 20) return { type: "clear", label: "Clear" };
  return { type: "cloudy", label: "Partly cloudy" };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "30.628");
  const lng = parseFloat(params.get("lng") ?? "-97.678");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  try {
    const forecast = await fetchForecast(lat, lng, 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: {
      date: string;
      dayLabel: string;
      dayName: string;
      icon: string;
      bestScore: number;
      lightType: string;
      lightLabel: string;
      isToday: boolean;
    }[] = [];

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + d);

      const dayStr = dayDate.toISOString().slice(0, 10);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = dayNames[dayDate.getDay()];
      const dayLabel = d === 0 ? "Today" : d === 1 ? "Tomorrow" : dayName;

      // Get sun windows for this day
      const windows = getTimeWindow(lat, lng, dayDate);

      // Collect hourly data for this day
      const dayHours = forecast.time
        .map((t, i) => ({ time: t, idx: i }))
        .filter((h) => h.time.startsWith(dayStr));

      if (dayHours.length === 0) continue;

      // Score golden hours and night based on cloud/weather data
      let goldenAmScore = 0;
      let goldenPmScore = 0;
      let nightScore = 0;
      let bestScore = 0;
      let bestWeatherCode = 0;
      let avgCloudCover = 0;
      let stormBreak = false;

      for (const h of dayHours) {
        const i = h.idx;
        const hourTime = new Date(h.time);
        const cc = forecast.cloudCover[i];
        avgCloudCover += cc;

        // Check golden hour AM
        const gAM = windows["golden_hour_am"];
        if (gAM && hourTime >= gAM.start && hourTime <= gAM.end) {
          const score = Math.max(0, 100 - cc * 0.8);
          goldenAmScore = Math.max(goldenAmScore, score);
        }

        // Check golden hour PM
        const gPM = windows["golden_hour_pm"];
        if (gPM && hourTime >= gPM.start && hourTime <= gPM.end) {
          // High clouds + low clouds = better sunset
          const highCloud = forecast.cloudCoverHigh[i];
          const lowCloud = forecast.cloudCoverLow[i];
          const score = Math.min(
            100,
            100 - cc * 0.5 + (highCloud > 30 && lowCloud < 40 ? 15 : 0)
          );
          goldenPmScore = Math.max(goldenPmScore, score);
        }

        // Check night
        const night = windows["night"];
        if (night && hourTime >= night.start && hourTime <= night.end) {
          const score = cc < 15 ? 80 : cc < 30 ? 60 : 30;
          nightScore = Math.max(nightScore, score);
        }

        // Storm break detection: rain earlier, clearing later
        if (forecast.weatherCode[i] >= 80 && i > 0 && forecast.cloudCover[Math.min(i + 2, forecast.cloudCover.length - 1)] < 50) {
          stormBreak = true;
        }

        bestWeatherCode = forecast.weatherCode[i];
      }

      avgCloudCover = avgCloudCover / dayHours.length;
      
      // Better scoring: even overcast days can have moderate scores
      // Base score from cloud conditions (lower clouds = better)
      const baseScore = Math.round(Math.max(0, 100 - avgCloudCover * 0.7));
      bestScore = Math.round(
        Math.max(goldenAmScore, goldenPmScore, nightScore, stormBreak ? 82 : 0, baseScore)
      );

      const lt = bestLightType(goldenPmScore, goldenAmScore, nightScore, avgCloudCover, stormBreak);

      days.push({
        date: `${dayName} ${dayDate.getDate()}`,
        dayLabel,
        dayName,
        icon: weatherIcon(bestWeatherCode),
        bestScore,
        lightType: lt.type,
        lightLabel: lt.label,
        isToday: d === 0,
      });
    }

    return NextResponse.json({ days, location: { lat, lng } });
  } catch (e) {
    console.error("[forecast] Error:", e);
    return NextResponse.json(
      { error: "Failed to compute forecast", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
