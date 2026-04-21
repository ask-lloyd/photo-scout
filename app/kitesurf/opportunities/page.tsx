"use client";

import { useState, useEffect, useMemo } from "react";
import { NavHeader } from "@/components/nav-header";
import {
  Wind,
  Loader2,
  Compass,
  Zap,
  CloudRain,
  CloudLightning,
  Sun,
  Cloud,
  CloudFog,
} from "lucide-react";
import { useGeolocation } from "@/lib/hooks";
import {
  usePlanningLocation,
  useKitesurfGearProfile,
} from "@/lib/kitesurf-hooks";
import { scoreKitesurf } from "@/lib/kitesurf-scorer";
import type { KitesurfScore } from "@/lib/kitesurf-types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HourlyForecast {
  time: string[];
  wind_speed_knots: number[];
  wind_gusts_knots: number[];
  wind_direction_deg: number[];
  precipitation_mm: number[];
  weatherCode: number[];
  timezone: string;
}

interface ForecastDay {
  date: string;
  dayLabel: string;
  dayName: string;
  icon: string;
  bestScore: number;
  lightType: string;
  lightLabel: string;
  isToday: boolean;
  highTempC: number;
}

interface SessionWindow {
  startISO: string;
  endISO: string;
  startIdx: number;
  endIdx: number;
  peakWind: number;
  peakGust: number;
  avgDirection: number;
  directionLabel: string;
  peakScore: number;
  verdict: KitesurfScore["verdict"];
  recommendedKiteSize?: number;
  dayKey: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function bearingLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function averageBearing(degs: number[]): number {
  if (!degs.length) return 0;
  let x = 0;
  let y = 0;
  for (const d of degs) {
    const r = (d * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  const avg = (Math.atan2(y / degs.length, x / degs.length) * 180) / Math.PI;
  return (avg + 360) % 360;
}

function verdictBadge(v: KitesurfScore["verdict"]) {
  switch (v) {
    case "epic":
      return { text: "EPIC", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" };
    case "good":
      return { text: "GOOD", color: "bg-green-500/20 text-green-400 border-green-500/40" };
    case "marginal":
      return { text: "MARGINAL", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" };
    default:
      return { text: "SKIP", color: "bg-neutral-700/30 text-neutral-300 border-neutral-600/40" };
  }
}

function verdictBorder(v: KitesurfScore["verdict"]) {
  if (v === "epic") return "border-orange-500/40 shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)]";
  if (v === "good") return "border-green-500/30";
  return "border-white/10";
}

function dayBorder(score: number) {
  if (score >= 80) return "border-orange-500/40 bg-orange-500/10";
  if (score >= 60) return "border-green-500/40 bg-green-500/10";
  if (score >= 40) return "border-yellow-500/30 bg-yellow-500/5";
  return "border-white/5 bg-white/5";
}

function formatHourRange(startISO: string, endISO: string): string {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${fmt(s)} – ${fmt(e)}`;
}

function dayLabel(iso: string): { day: string; date: string; isToday: boolean } {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  return {
    day: isToday ? "Today" : isTomorrow ? "Tomorrow" : d.toLocaleDateString([], { weekday: "short" }),
    date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
    isToday,
  };
}

const weatherIconMap: Record<string, { icon: React.ElementType; color: string }> = {
  clear: { icon: Sun, color: "var(--golden-hour, #f59e0b)" },
  "partly-cloudy": { icon: Cloud, color: "var(--neutral-300)" },
  cloudy: { icon: Cloud, color: "var(--neutral-300)" },
  fog: { icon: CloudFog, color: "var(--blue-hour)" },
  rain: { icon: CloudRain, color: "var(--neutral-300)" },
  snow: { icon: Cloud, color: "var(--blue-hour)" },
  storm: { icon: CloudLightning, color: "var(--coral, #ef4444)" },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function KitesurfOpportunitiesPage() {
  const { coords, locationName: currentLocationName } = useGeolocation();
  const { location: planningLocation } = usePlanningLocation();
  const { gear } = useKitesurfGearProfile();

  const effectiveCoords = planningLocation
    ? { lat: planningLocation.lat, lng: planningLocation.lng }
    : coords;
  const effectiveName = planningLocation?.name ?? currentLocationName;

  const [hourly, setHourly] = useState<HourlyForecast | null>(null);
  const [forecastDays, setForecastDays] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveCoords) return;
    let cancelled = false;
    setLoading(true);

    const { lat, lng } = effectiveCoords;

    Promise.all([
      fetch(`/api/wind-forecast?lat=${lat}&lng=${lng}`).then((r) => r.json()),
      fetch(`/api/forecast?lat=${lat}&lng=${lng}`).then((r) => r.json()),
    ])
      .then(([wind, forecast]) => {
        if (cancelled) return;
        setHourly(wind);
        setForecastDays(forecast.days ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveCoords?.lat, effectiveCoords?.lng]);

  // Determine preferred bearing from the first kitesurf spot if present
  const preferredBearing = gear.spots?.[0]?.preferredBearing;

  // Score every hour
  const hourlyScores = useMemo(() => {
    if (!hourly) return [] as { score: KitesurfScore; speed: number; gust: number; dir: number }[];
    const out: { score: KitesurfScore; speed: number; gust: number; dir: number }[] = [];
    for (let i = 0; i < hourly.time.length; i++) {
      const speed = hourly.wind_speed_knots[i] ?? 0;
      const gust = hourly.wind_gusts_knots[i] ?? speed;
      const dir = hourly.wind_direction_deg[i] ?? 0;
      const precip = hourly.precipitation_mm[i] ?? 0;
      const wcode = hourly.weatherCode[i] ?? 0;
      const score = scoreKitesurf({
        wind: {
          speed_knots: speed,
          gust_knots: gust,
          direction_deg: dir,
          direction_label: bearingLabel(dir),
        },
        preferredBearing,
        precipitation_mm: precip,
        weatherCode: wcode,
        ownedKites: gear.kites,
        riderWeightKg: gear.weightKg,
      });
      out.push({ score, speed, gust, dir });
    }
    return out;
  }, [hourly, preferredBearing, gear.kites, gear.weightKg]);

  // Group consecutive hours with score ≥ 60 within the same calendar day
  const sessionWindows = useMemo<SessionWindow[]>(() => {
    if (!hourly || !hourlyScores.length) return [];
    const windows: SessionWindow[] = [];
    let cur: {
      startIdx: number;
      endIdx: number;
      speeds: number[];
      gusts: number[];
      dirs: number[];
      scores: number[];
      dayKey: string;
    } | null = null;

    const dayKeyOf = (iso: string) => iso.slice(0, 10);

    const flush = () => {
      if (!cur) return;
      const startISO = hourly.time[cur.startIdx];
      const endISO = hourly.time[cur.endIdx];
      const peakScoreIdxLocal = cur.scores.indexOf(Math.max(...cur.scores));
      const peakWind = Math.max(...cur.speeds);
      const peakGust = Math.max(...cur.gusts);
      const avgDir = averageBearing(cur.dirs);
      const peakScore = cur.scores[peakScoreIdxLocal];
      const peakGlobalIdx = cur.startIdx + peakScoreIdxLocal;
      const peakVerdict = hourlyScores[peakGlobalIdx].score.verdict;
      const recommendedKiteSize = hourlyScores[peakGlobalIdx].score.recommendedKiteSize;
      // endISO is the START of the last hour; add 1h to get the end of the session window
      const endPlusHour = new Date(new Date(endISO).getTime() + 60 * 60 * 1000).toISOString();
      windows.push({
        startISO,
        endISO: endPlusHour,
        startIdx: cur.startIdx,
        endIdx: cur.endIdx,
        peakWind,
        peakGust,
        avgDirection: avgDir,
        directionLabel: bearingLabel(avgDir),
        peakScore,
        verdict: peakVerdict,
        recommendedKiteSize,
        dayKey: cur.dayKey,
      });
      cur = null;
    };

    for (let i = 0; i < hourlyScores.length; i++) {
      const hs = hourlyScores[i];
      const dk = dayKeyOf(hourly.time[i]);
      if (hs.score.score >= 60) {
        if (!cur || cur.dayKey !== dk || cur.endIdx !== i - 1) {
          flush();
          cur = {
            startIdx: i,
            endIdx: i,
            speeds: [hs.speed],
            gusts: [hs.gust],
            dirs: [hs.dir],
            scores: [hs.score.score],
            dayKey: dk,
          };
        } else {
          cur.endIdx = i;
          cur.speeds.push(hs.speed);
          cur.gusts.push(hs.gust);
          cur.dirs.push(hs.dir);
          cur.scores.push(hs.score.score);
        }
      } else {
        flush();
      }
    }
    flush();
    return windows.sort((a, b) => a.startISO.localeCompare(b.startISO));
  }, [hourly, hourlyScores]);

  // Build 7-day strip summary from the hourly scores (best score per day)
  const daySummaries = useMemo(() => {
    if (!hourly || !hourlyScores.length) return [] as { dayKey: string; label: string; date: string; isToday: boolean; bestScore: number; bestVerdict: KitesurfScore["verdict"]; weatherIcon: string }[];
    const map = new Map<string, { bestScore: number; bestVerdict: KitesurfScore["verdict"]; times: string[] }>();
    for (let i = 0; i < hourlyScores.length; i++) {
      const dk = hourly.time[i].slice(0, 10);
      const entry = map.get(dk) ?? { bestScore: 0, bestVerdict: "skip" as KitesurfScore["verdict"], times: [] };
      if (hourlyScores[i].score.score > entry.bestScore) {
        entry.bestScore = hourlyScores[i].score.score;
        entry.bestVerdict = hourlyScores[i].score.verdict;
      }
      entry.times.push(hourly.time[i]);
      map.set(dk, entry);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((dk, idx) => {
      const entry = map.get(dk)!;
      const { day, date, isToday } = dayLabel(entry.times[0]);
      const iconStr = forecastDays[idx]?.icon ?? "clear";
      return {
        dayKey: dk,
        label: day,
        date,
        isToday,
        bestScore: entry.bestScore,
        bestVerdict: entry.bestVerdict,
        weatherIcon: iconStr,
      };
    }).slice(0, 7);
  }, [hourly, hourlyScores, forecastDays]);

  return (
    <>
      <NavHeader locationName={effectiveName} />
      <main className="pt-14">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--white)] flex items-center gap-2">
              <Wind className="w-6 h-6" style={{ color: "var(--teal, #14b8a6)" }} />
              Kitesurf Opportunities
            </h1>
            <p className="text-sm text-[var(--neutral-300)]">
              Next 7 days · Session windows near {effectiveName}
            </p>
          </div>

          {/* 7-day strip */}
          <div className="glass rounded-xl p-4 mb-6">
            <p className="text-xs uppercase tracking-widest text-[var(--neutral-300)] mb-3">
              7-Day Wind Outlook
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--teal, #14b8a6)" }} />
                <span className="ml-2 text-sm" style={{ color: "var(--neutral-300)" }}>
                  Loading forecast...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2 min-w-[560px] sm:min-w-0 overflow-x-auto">
                {daySummaries.map((d) => {
                  const fb = dayBorder(d.bestScore);
                  const iconInfo = weatherIconMap[d.weatherIcon] ?? weatherIconMap.cloudy;
                  const DayIcon = iconInfo.icon;
                  const badge = verdictBadge(d.bestVerdict);
                  return (
                    <div
                      key={d.dayKey}
                      className={`rounded-lg border p-2 text-center transition-colors ${fb}`}
                    >
                      <p className="text-[13px] font-medium text-[var(--neutral-200)]">{d.label}</p>
                      <p className="text-[11px] text-[var(--neutral-300)]">{d.date}</p>
                      <div className="flex justify-center my-1">
                        <DayIcon
                          className="w-6 h-6"
                          style={{ color: iconInfo.color }}
                          strokeWidth={1.5}
                        />
                      </div>
                      <p className="text-base font-bold text-[var(--white)]" style={{ fontFamily: "var(--font-mono)" }}>
                        {d.bestScore}
                      </p>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded-full border ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session windows */}
          <div className="space-y-4">
            {loading ? (
              <div className="glass rounded-xl p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "var(--teal, #14b8a6)" }} />
                <p style={{ color: "var(--neutral-300)" }}>Scanning wind conditions...</p>
              </div>
            ) : sessionWindows.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-[var(--neutral-300)]">
                  No kiteable session windows detected in the next 7 days. Keep an eye on the forecast!
                </p>
              </div>
            ) : (
              sessionWindows.map((w, idx) => {
                const badge = verdictBadge(w.verdict);
                const border = verdictBorder(w.verdict);
                const { day, date, isToday } = dayLabel(w.startISO);
                const hours = w.endIdx - w.startIdx + 1;
                return (
                  <div
                    key={`${w.startISO}-${idx}`}
                    className={`glass rounded-xl p-5 border ${border} transition-all`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
                      {/* Left: score */}
                      <div className="flex-shrink-0 flex sm:flex-col items-center gap-3 sm:gap-2">
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center">
                          <p className="text-2xl font-bold text-[var(--white)]" style={{ fontFamily: "var(--font-mono)" }}>
                            {w.peakScore}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-[var(--neutral-300)]">peak</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[11px] rounded-full border ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>

                      {/* Middle: details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-[var(--white)] text-lg">
                            {day}
                            {!isToday && <span className="text-[var(--neutral-300)] font-normal"> · {date}</span>}
                          </h3>
                          <span className="text-sm text-[var(--neutral-200)]">
                            {formatHourRange(w.startISO, w.endISO)}
                          </span>
                          <span className="text-[11px] uppercase tracking-wider text-[var(--neutral-300)]">
                            {hours}h window
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--neutral-200)] flex-wrap mt-2">
                          <span className="flex items-center gap-1">
                            <Wind className="w-4 h-4" style={{ color: "var(--teal, #14b8a6)" }} />
                            Peak <strong className="text-[var(--white)]">{w.peakWind.toFixed(0)} kt</strong>
                            <span className="text-[var(--neutral-300)]">· gust {w.peakGust.toFixed(0)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Compass className="w-4 h-4" style={{ color: "var(--neutral-300)" }} />
                            {w.directionLabel} ({Math.round(w.avgDirection)}°)
                          </span>
                          {w.recommendedKiteSize !== undefined && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-4 h-4" style={{ color: "var(--golden-hour, #f59e0b)" }} />
                              Recommended <strong className="text-[var(--white)]">{w.recommendedKiteSize}m²</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </>
  );
}
