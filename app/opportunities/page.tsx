"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import {
  Sunset,
  CloudFog,
  Cloud,
  CloudRain,
  CloudLightning,
  Sun,
  Star,
  Compass,
  Camera,
  MapPin,
  Loader2,
  Sunrise,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGeolocation, useOpportunities } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import { LightScore, LightScoreInfo, lightScoreColorClass } from "@/components/light-score";
import type { Opportunity } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Forecast day type                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Icon/color helpers                                                 */
/* ------------------------------------------------------------------ */

const weatherIconMap: Record<string, { icon: React.ElementType; color: string }> = {
  clear: { icon: Sun, color: "var(--teal, #14b8a6)" },
  "partly-cloudy": { icon: Cloud, color: "var(--neutral-300)" },
  cloudy: { icon: Cloud, color: "var(--neutral-300)" },
  fog: { icon: CloudFog, color: "var(--blue-hour)" },
  rain: { icon: CloudRain, color: "var(--neutral-300)" },
  snow: { icon: Cloud, color: "var(--blue-hour)" },
  storm: { icon: CloudLightning, color: "var(--coral, #ef4444)" },
};

const oppTypeIconMap: Record<string, { icon: React.ElementType; color: string }> = {
  sunset: { icon: Sunset, color: "var(--golden-hour)" },
  golden_hour: { icon: Sunset, color: "var(--golden-hour)" },
  blue_hour: { icon: Sunrise, color: "var(--blue-hour)" },
  fog: { icon: CloudFog, color: "var(--blue-hour)" },
  storm: { icon: CloudLightning, color: "var(--coral, #ef4444)" },
  astro: { icon: Star, color: "var(--violet, #8b5cf6)" },
  clouds: { icon: Cloud, color: "var(--neutral-200)" },
};

function accentForType(type: string): string {
  const map: Record<string, string> = {
    sunset: "orange",
    golden_hour: "orange",
    blue_hour: "blue",
    fog: "blue",
    storm: "purple",
    astro: "indigo",
    clouds: "gray",
  };
  return map[type] ?? "gray";
}

function accentClasses(accent: string) {
  const map: Record<
    string,
    { border: string; bg: string; text: string; borderHover: string; glow: string }
  > = {
    orange: {
      border: "border-orange-500/20",
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      borderHover: "hover:border-orange-500/40",
      glow: "shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)]",
    },
    blue: {
      border: "border-blue-500/20",
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      borderHover: "hover:border-blue-500/40",
      glow: "",
    },
    purple: {
      border: "border-purple-500/20",
      bg: "bg-purple-500/20",
      text: "text-[13px]urple-400",
      borderHover: "hover:border-purple-500/40",
      glow: "",
    },
    indigo: {
      border: "border-indigo-500/20",
      bg: "bg-indigo-500/20",
      text: "text-indigo-400",
      borderHover: "hover:border-indigo-500/40",
      glow: "",
    },
    gray: {
      border: "border-neutral-700/30",
      bg: "bg-neutral-700/20",
      text: "text-[var(--neutral-200)]",
      borderHover: "hover:border-neutral-600/40",
      glow: "",
    },
  };
  return map[accent] ?? map.gray;
}

function forecastBorder(score: number) {
  if (score >= 70) return "border-orange-500/40 bg-orange-500/10";
  if (score >= 50) return "border-blue-500/40 bg-blue-500/10";
  return "border-white/5 bg-white/5";
}

function confidenceLabel(
  c: "high" | "moderate" | "low"
): { text: string; color: string } | null {
  if (c === "high")
    return { text: "HIGH CONFIDENCE", color: "bg-green-500/20 text-green-400" };
  if (c === "moderate")
    return { text: "MODERATE", color: "bg-yellow-500/20 text-yellow-400" };
  return null;
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

function formatTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${fmt(s)} – ${fmt(e)}`;
}

function faceDirectionFromConditions(opp: Opportunity): string {
  if (opp.settings?.faceDirection) return opp.settings.faceDirection;
  // Derive from type
  if (opp.type === "sunset" || opp.type === "golden_hour")
    return "Face W-SW";
  if (opp.type === "fog") return "Face E (elevated)";
  if (opp.type === "astro") return "Face S";
  return "Any direction";
}

function suggestedSettings(opp: Opportunity): string {
  if (opp.settings) {
    return `f/${opp.settings.aperture} · ${opp.settings.shutterSpeed} · ISO ${opp.settings.iso}`;
  }
  // Sensible defaults by type
  const map: Record<string, string> = {
    sunset: "f/8 · 1/250 · ISO 200",
    golden_hour: "f/8 · 1/250 · ISO 200",
    blue_hour: "f/4 · 1/30 · ISO 800",
    fog: "f/11 · 1/125 · ISO 400",
    storm: "f/8 · 1/500 · ISO 400",
    astro: "f/1.8 · 20s · ISO 3200",
    clouds: "f/8 · 1/250 · ISO 200",
  };
  return map[opp.type] ?? "f/8 · 1/250 · ISO 400";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OpportunitiesPage() {
  const { coords, locationName } = useGeolocation();
  const { locale } = useLocale();
  const { opportunities: liveOpps, loading: oppsLoading } = useOpportunities(
    coords?.lat,
    coords?.lng,
    locationName
  );

  // Forecast strip data
  const [forecastDays, setForecastDays] = useState<ForecastDay[]>([]);
  const [forecastLoading, setForecastLoading] = useState(true);

  useEffect(() => {
    if (!coords) return;
    fetch(`/api/forecast?lat=${coords.lat}&lng=${coords.lng}`)
      .then((r) => r.json())
      .then((data) => {
        setForecastDays(data.days ?? []);
        setForecastLoading(false);
      })
      .catch(() => setForecastLoading(false));
  }, [coords]);

  // Filters
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [minScore, setMinScore] = useState(0);
  const [maxDistance, setMaxDistance] = useState(50);

  // Get unique types for the filter dropdown
  const availableTypes = useMemo(() => {
    const types = new Set(liveOpps.map((o) => o.type));
    return Array.from(types);
  }, [liveOpps]);

  // Filter opportunities
  const filteredOpps = useMemo(() => {
    return liveOpps.filter((opp) => {
      if (typeFilter !== "All Types" && opp.type !== typeFilter) return false;
      if (opp.score < minScore) return false;
      return true;
    });
  }, [liveOpps, typeFilter, minScore, maxDistance]);

  return (
    <>
      <NavHeader locationName={locationName} />
      <main className="pt-14">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* ---- Header + Filters ---- */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-lg font-bold text-[var(--white)]">
                Opportunities
              </h1>
              <p className="text-sm text-[var(--neutral-300)]">
                Next 7 days · Near {locationName}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={typeFilter}
                onValueChange={(val: string | null) => {
                  if (val) setTypeFilter(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Types">All Types</SelectItem>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(minScore)}
                onValueChange={(val: string | null) => {
                  if (val) setMinScore(Number(val));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Score</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                  <SelectItem value="70">70+</SelectItem>
                  <SelectItem value="80">80+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ---- 7-Day Light Forecast Strip ---- */}
          <div className="glass rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[13px] uppercase tracking-widest text-[var(--neutral-300)]">
                7-Day Light Forecast
              </p>
              <LightScoreInfo />
            </div>
            {forecastLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2
                  className="w-5 h-5 animate-spin"
                  style={{ color: "var(--golden-hour)" }}
                />
                <span
                  className="ml-2 text-sm"
                  style={{ color: "var(--neutral-300)" }}
                >
                  Loading forecast...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2 min-w-[560px] sm:min-w-0 overflow-x-auto">
                {forecastDays.map((day, i) => {
                  const fb = forecastBorder(day.bestScore);
                  const iconInfo = weatherIconMap[day.icon] ?? weatherIconMap.cloudy;
                  const DayIcon = iconInfo.icon;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-2 text-center transition-colors ${fb}`}
                    >
                      <p className="text-[13px] font-medium text-[var(--neutral-200)]">
                        {day.dayLabel}
                      </p>
                      <p className="text-[13px] text-[var(--neutral-300)]">
                        {day.date}
                      </p>
                      <div className="flex justify-center my-1">
                        <DayIcon
                          className="w-6 h-6"
                          style={{ color: iconInfo.color }}
                          strokeWidth={1.5}
                        />
                      </div>
                      <LightScore score={day.bestScore} variant="compact" />
                      <p className="text-[13px] text-[var(--neutral-300)] mt-1">
                        {day.lightLabel}
                      </p>
                      <p className="text-[13px] text-[var(--neutral-200)] mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                        {locale === "US"
                          ? `${Math.round(day.highTempC * 9 / 5 + 32)}°`
                          : `${day.highTempC}°`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---- Opportunity Cards ---- */}
          <div className="space-y-4">
            {oppsLoading ? (
              <div className="glass rounded-xl p-12 text-center">
                <Loader2
                  className="w-6 h-6 animate-spin mx-auto mb-3"
                  style={{ color: "var(--golden-hour)" }}
                />
                <p style={{ color: "var(--neutral-300)" }}>
                  Scanning conditions and analyzing opportunities...
                </p>
              </div>
            ) : filteredOpps.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-[var(--neutral-300)]">
                  {liveOpps.length === 0
                    ? "No photo opportunities detected in the next 7 days. Conditions may improve — check back soon!"
                    : "No opportunities match your filters. Try broadening your search."}
                </p>
              </div>
            ) : (
              filteredOpps.map((opp, idx) => {
                const accent = accentForType(opp.type);
                const ac = accentClasses(accent);
                const iconInfo = oppTypeIconMap[opp.type] ?? oppTypeIconMap.sunset;
                const OppIcon = iconInfo.icon;
                const conf = confidenceLabel(opp.confidence);
                const isTop = idx === 0;

                return (
                  <div
                    key={opp.id}
                    className={`glass rounded-xl p-5 border ${ac.border} ${
                      isTop ? ac.glow : ""
                    } cursor-pointer ${ac.borderHover} transition-all`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
                      {/* Left: emoji + score */}
                      <div className="flex-shrink-0 text-center flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0">
                        <div className="sm:mb-1">
                          <OppIcon
                            className="w-8 h-8"
                            style={{ color: iconInfo.color }}
                            strokeWidth={1.5}
                          />
                        </div>
                        <div
                          className={`w-14 h-14 rounded-xl ${ac.bg} flex flex-col items-center justify-center`}
                        >
                          <LightScore score={opp.score} variant="compact" />
                        </div>
                      </div>

                      {/* Middle: details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-[var(--white)] text-lg">
                            {opp.title}
                          </h3>
                          {conf && (
                            <span
                              className={`px-2 py-0.5 text-[13px] rounded-full ${conf.color}`}
                            >
                              {conf.text}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--neutral-200)] mb-2">
                          {opp.timing.label} · {formatTimeRange(opp.timing.start, opp.timing.end)} · {opp.location.name}
                        </p>
                        <p className="text-sm text-[var(--neutral-200)] mb-3">
                          {opp.description}
                        </p>
                        <div className="flex items-center gap-4 text-[13px] text-[var(--neutral-300)] flex-wrap">
                          <span>
                            <Compass className="w-4 h-4 inline mr-1" />
                            {faceDirectionFromConditions(opp)}
                          </span>
                          <span>
                            <Camera className="w-4 h-4 inline mr-1" />
                            {suggestedSettings(opp)}
                          </span>
                          <span>
                            <MapPin className="w-4 h-4 inline mr-1" />
                            {opp.location.name}
                          </span>
                        </div>
                      </div>

                      {/* Right: timing + button */}
                      <div className="flex-shrink-0 sm:text-right flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                        <div
                          className={`text-sm font-semibold ${
                            opp.timing.daysOut === 0
                              ? "text-orange-400"
                              : "text-[var(--neutral-200)]"
                          }`}
                        >
                          {opp.timing.label}
                        </div>
                        <Link
                          href={`/planner?date=${(opp.timing.start ?? "").slice(0, 10)}`}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                            isTop
                              ? "bg-orange-500 text-white hover:bg-orange-600"
                              : "bg-white/10 text-[var(--neutral-200)] hover:bg-white/20"
                          }`}
                        >
                          Plan Shot
                        </Link>
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
