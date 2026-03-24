"use client";

import { useGeolocation, useLightData, useGearProfile } from "@/lib/hooks";
import { recommendSettings } from "@/lib/settings-advisor";
import { NavHeader } from "@/components/nav-header";
import { Loader2, Sunset, Moon, Sunrise } from "lucide-react";
import { useMemo } from "react";
import * as SunCalc from "suncalc";
import { useLocale } from "@/lib/locale-context";
import { formatTemp, formatTime as formatTimeLocale, formatDistance } from "@/lib/format";

// ─── Helpers ───

function bearingToLabel(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--golden-hour)";
  if (score >= 50) return "var(--blue-hour)";
  return "var(--neutral-300)";
}

function phaseColor(phase: string): string {
  if (phase === "golden hour") return "var(--golden-hour)";
  if (phase === "blue hour") return "var(--blue-hour)";
  if (phase === "daylight" || phase === "sweet light") return "var(--golden-hour-light)";
  return "var(--neutral-300)";
}

function characterTitle(character: string[]): string {
  return character
    .slice(0, 2)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(" ");
}

function characterSubtitle(phase: string): string {
  switch (phase) {
    case "golden hour": return "Golden hour light active";
    case "blue hour": return "Blue hour atmosphere";
    case "sweet light": return "Sweet warm light";
    case "daylight": return "Standard daylight";
    case "harsh midday": return "Harsh overhead sun";
    case "night": return "Night conditions";
    default: return "Twilight conditions";
  }
}

// ─── Dashboard ───

export default function Dashboard() {
  const { locale } = useLocale();
  const { coords, loading: geoLoading, locationName } = useGeolocation();
  const { data: lightData, loading: lightLoading } = useLightData(coords?.lat, coords?.lng);
  const { gear } = useGearProfile();

  const isLoading = geoLoading || lightLoading;

  // Compute sun times on the client
  const sunTimes = useMemo(() => {
    if (!coords) return null;
    const now = new Date();
    const times = SunCalc.getTimes(now, coords.lat, coords.lng);
    return times;
  }, [coords]);

  // Settings recommendation
  const settings = useMemo(() => {
    if (!lightData) return null;
    const camera = gear.camera || {
      id: "default", make: "Generic", model: "Camera",
      sensor_size: "full_frame" as const, megapixels: 24, base_iso: 100,
      max_usable_iso: 12800, dynamic_range_ev: 14, has_ibis: true,
      ibis_stops: 5, burst_fps: 10, mount: "universal", tags: [],
    };
    const lens = gear.lenses[0] || {
      id: "default", make: "Generic", model: "24-70mm f/2.8",
      mount: ["universal"], focal_length_min: 24, focal_length_max: 70,
      max_aperture: 2.8, min_aperture: 22, has_is: false, is_stops: 0,
      weight_g: 800, filter_size_mm: 82, tags: [],
    };
    return recommendSettings(lightData.conditions, camera, lens, {
      hasTripod: gear.hasTripod,
      style: (gear.shootingStyles[0] as "landscape" | "action" | "portrait" | "astro") || "landscape",
    });
  }, [lightData, gear]);

  // Timeline windows
  const timelinePhases = useMemo(() => {
    if (!lightData || !sunTimes) return [];
    const phases = [
      { label: "Blue Hour AM", phase: "blue hour", key: "dawn", endKey: "sunrise" },
      { label: "Golden AM", phase: "golden hour", key: "sunrise", endKey: "goldenHourEnd" },
      { label: "Midday", phase: "daylight", key: "goldenHourEnd", endKey: "goldenHour" },
      { label: "Golden PM", phase: "golden hour", key: "goldenHour", endKey: "sunset" },
      { label: "Blue Hour PM", phase: "blue hour", key: "sunset", endKey: "dusk" },
    ];
    const now = new Date();
    return phases.map((p) => {
      const start = sunTimes[p.key as keyof SunCalc.GetTimesResult] as Date;
      const end = sunTimes[p.endKey as keyof SunCalc.GetTimesResult] as Date;
      const isActive = now >= start && now <= end;
      const isPast = now > end;
      // Find matching window from API data
      const matchingWindow = lightData.windows.find(
        (w: { phase: string; name: string }) => w.phase === p.phase && w.name.toLowerCase().includes(
          p.label.includes("AM") ? "morning" : p.label.includes("PM") ? "evening" : ""
        )
      );
      const score = matchingWindow?.score ?? (p.phase === "daylight" ? 35 : 65);
      return {
        ...p,
        start,
        end,
        isActive,
        isPast,
        score,
        status: isActive ? "Active Now" : isPast ? "Passed" : "Upcoming",
      };
    });
  }, [lightData, sunTimes]);

  // Current time position for timeline (percentage)
  const timelinePosition = useMemo(() => {
    if (!sunTimes) return 50;
    const dawn = (sunTimes.dawn as Date).getTime();
    const dusk = (sunTimes.dusk as Date).getTime();
    const now = Date.now();
    const pct = ((now - dawn) / (dusk - dawn)) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [sunTimes]);

  // Mock opportunities
  const opportunities = useMemo(() => {
    if (!lightData || !sunTimes) return [];
    const goldenStart = sunTimes.goldenHour as Date;
    const sunset = sunTimes.sunset as Date;
    return [
      {
        icon: Sunset,
        iconColor: "var(--golden-hour)",
        name: "Golden Hour Sunset",
        score: 85,
        timing: `Today, ${formatTimeLocale(goldenStart, locale)} - ${formatTimeLocale(sunset, locale)}`,
        location: locationName,
        description: "Warm directional light ideal for landscapes and portraits with long shadows.",
      },
      {
        icon: Moon,
        iconColor: "var(--blue-hour)",
        name: "Blue Hour Serenity",
        score: 72,
        timing: `Today, ${formatTimeLocale(sunset, locale)} - ${formatTimeLocale(sunTimes.dusk as Date, locale)}`,
        location: locationName,
        description: "Cool ambient tones perfect for cityscapes and moody water reflections.",
      },
      {
        icon: Sunrise,
        iconColor: "var(--golden-hour-light)",
        name: "Morning Golden Light",
        score: 78,
        timing: `Tomorrow, ${formatTimeLocale(sunTimes.sunrise as Date, locale)} - ${formatTimeLocale(sunTimes.goldenHourEnd as Date, locale)}`,
        location: locationName,
        description: "Fresh golden warmth with dew and calm air. Great for nature and macro.",
      },
    ];
  }, [lightData, sunTimes, locationName, locale]);

  return (
    <>
      <NavHeader locationName={locationName} />
      <main className="pt-14" style={{ background: "var(--dark-900)", minHeight: "100vh" }}>
        <div className="max-w-[960px] mx-auto px-4 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "var(--golden-hour)" }} />
                <p style={{ color: "var(--neutral-300)" }}>Analyzing light conditions...</p>
              </div>
            </div>
          ) : lightData ? (
            <div className="space-y-6">
              {/* ─── Hero: 3 Cards ─── */}
              <div className="grid grid-cols-12 gap-6">

                {/* Card 1: CURRENT LIGHT */}
                <div
                  className="col-span-12 md:col-span-4 rounded-2xl p-6 card-surface"
                  style={{
                    background: "var(--dark-800)",
                    border: "1px solid var(--dark-600)",
                    boxShadow: "var(--shadow-golden)",
                  }}
                >
                  <div
                    className="section-label mb-4"
                  >
                    Current Light
                  </div>
                  <div className="flex gap-5 items-center">
                    {/* Score Ring */}
                    <div
                      className="score-ring rounded-full flex items-center justify-center shrink-0"
                      style={{
                        "--pct": `${lightData.conditions.score}%`,
                        width: 96,
                        height: 96,
                      } as React.CSSProperties}
                    >
                      <div
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: 76,
                          height: 76,
                          background: "var(--dark-700)",
                        }}
                      >
                        <span style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: 22,
                          color: "var(--golden-hour)",
                        }}>
                          {lightData.conditions.score}
                        </span>
                      </div>
                    </div>
                    {/* Text */}
                    <div className="min-w-0">
                      <div style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "var(--golden-hour)",
                      }}>
                        {characterTitle(lightData.conditions.character)}
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: "var(--neutral-200)" }}>
                        {characterSubtitle(lightData.conditions.lightPhase)}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {lightData.conditions.character.map((tag: string) => (
                          <span
                            key={tag}
                            className="tag"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: SUN POSITION */}
                <div
                  className="col-span-12 md:col-span-4 rounded-2xl p-6 card-surface"
                  style={{
                    background: "var(--dark-800)",
                    border: "1px solid var(--dark-600)",
                  }}
                >
                  <div className="section-label mb-4">
                    Sun Position
                  </div>
                  <div className="flex gap-5 items-start">
                    {/* SVG Compass */}
                    <div className="shrink-0">
                      <svg width="96" height="96" viewBox="0 0 96 96">
                        {/* Rings */}
                        <circle cx="48" cy="48" r="44" fill="none" stroke="var(--dark-600)" strokeWidth="1" />
                        <circle cx="48" cy="48" r="30" fill="none" stroke="var(--dark-600)" strokeWidth="1" />
                        <circle cx="48" cy="48" r="16" fill="none" stroke="var(--dark-600)" strokeWidth="1" />
                        {/* NESW labels */}
                        <text x="48" y="10" textAnchor="middle" fill="var(--neutral-300)" fontSize="8" fontWeight="bold">N</text>
                        <text x="90" y="51" textAnchor="middle" fill="var(--neutral-300)" fontSize="8" fontWeight="bold">E</text>
                        <text x="48" y="94" textAnchor="middle" fill="var(--neutral-300)" fontSize="8" fontWeight="bold">S</text>
                        <text x="6" y="51" textAnchor="middle" fill="var(--neutral-300)" fontSize="8" fontWeight="bold">W</text>
                        {/* Dashed line from center to sun */}
                        {(() => {
                          const azRad = (lightData.sun.azimuth - 90) * (Math.PI / 180);
                          const altNorm = Math.max(0, Math.min(1, lightData.sun.altitude / 90));
                          const r = 40 * (1 - altNorm);
                          const sx = 48 + r * Math.cos(azRad);
                          const sy = 48 + r * Math.sin(azRad);
                          return (
                            <>
                              <line x1="48" y1="48" x2={sx} y2={sy} stroke="var(--golden-hour)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                              <circle cx={sx} cy={sy} r="5" fill="var(--golden-hour)" />
                              <circle cx={sx} cy={sy} r="8" fill="none" stroke="var(--golden-hour)" strokeWidth="1" opacity="0.3" />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                    {/* Sun data */}
                    <div className="space-y-2.5 text-sm min-w-0">
                      <div>
                        <span style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Azimuth </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--white)" }}>
                          {Math.round(lightData.sun.azimuth)}&deg; {bearingToLabel(lightData.sun.azimuth)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Altitude </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--white)" }}>
                          {lightData.sun.altitude.toFixed(1)}&deg;
                        </span>
                      </div>
                      {sunTimes && (
                        <>
                          <div>
                            <span style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Golden Hour </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--golden-hour)" }}>
                              {formatTimeLocale(sunTimes.goldenHour as Date, locale)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Sunset </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--white)" }}>
                              {formatTimeLocale(sunTimes.sunset as Date, locale)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Blue Hour </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--blue-hour)" }}>
                              {formatTimeLocale(sunTimes.sunset as Date, locale)} - {formatTimeLocale(sunTimes.dusk as Date, locale)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 3: IF YOU SHOOT RIGHT NOW */}
                <div
                  className="col-span-12 md:col-span-4 rounded-2xl p-6 card-surface"
                  style={{
                    background: "var(--dark-800)",
                    border: "1px solid var(--dark-600)",
                  }}
                >
                  <div className="section-label mb-1">
                    If You Shoot Right Now
                  </div>
                  {settings && (
                    <>
                      <div className="text-xs mb-4" style={{ color: "var(--neutral-300)" }}>
                        {gear.camera ? `${gear.camera.make} ${gear.camera.model}` : "Generic Camera"}{" "}
                        &middot; {gear.lenses[0] ? gear.lenses[0].model : "24-70mm f/2.8"}
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: "var(--neutral-300)" }}>Aperture</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--golden-hour)" }}>
                            f/{settings.aperture}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: "var(--neutral-300)" }}>Shutter</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--golden-hour)" }}>
                            {settings.shutterSpeed}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: "var(--neutral-300)" }}>ISO</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--golden-hour)" }}>
                            {settings.iso}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: "var(--neutral-300)" }}>White Balance</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--golden-hour)" }}>
                            {settings.whiteBalance}K
                          </span>
                        </div>
                      </div>
                      {/* Direction tip */}
                      <div
                        className="mt-4 px-3 py-2 rounded-lg text-xs"
                        style={{
                          background: "var(--golden-hour-subtle)",
                          border: "1px solid rgba(212, 135, 45, 0.15)",
                          color: "var(--golden-hour-light)",
                        }}
                      >
                        Face {lightData.conditions.directionToFace.label} ({lightData.conditions.directionToFace.bearing}&deg;) for best light
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ─── Day Timeline ─── */}
              <div
                className="rounded-2xl p-6 card-surface"
                style={{
                  background: "var(--dark-800)",
                  border: "1px solid var(--dark-600)",
                }}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="section-label">
                    Today&apos;s Light Timeline
                  </div>
                  <div className="text-sm" style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>
                    {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  </div>
                </div>

                {/* Timeline bar */}
                <div className="relative mb-6">
                  <div className="timeline-bar h-10 rounded-lg w-full relative overflow-hidden">
                    {/* Time markers */}
                    {sunTimes && (() => {
                      const dawn = (sunTimes.dawn as Date).getTime();
                      const dusk = (sunTimes.dusk as Date).getTime();
                      const range = dusk - dawn;
                      const markers = [
                        { time: sunTimes.dawn as Date, label: formatTimeLocale(sunTimes.dawn as Date, locale) },
                        { time: sunTimes.sunrise as Date, label: formatTimeLocale(sunTimes.sunrise as Date, locale) },
                        { time: sunTimes.solarNoon as Date, label: formatTimeLocale(sunTimes.solarNoon as Date, locale) },
                        { time: sunTimes.goldenHour as Date, label: formatTimeLocale(sunTimes.goldenHour as Date, locale) },
                        { time: sunTimes.sunset as Date, label: formatTimeLocale(sunTimes.sunset as Date, locale) },
                        { time: sunTimes.dusk as Date, label: formatTimeLocale(sunTimes.dusk as Date, locale) },
                      ];
                      return markers.map((m, i) => {
                        const pct = ((m.time.getTime() - dawn) / range) * 100;
                        if (pct < 0 || pct > 100) return null;
                        return (
                          <div
                            key={i}
                            className="absolute top-0 h-full flex flex-col items-center justify-end pb-1"
                            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                          >
                            <span className="text-[9px]" style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-200)" }}>
                              {m.label}
                            </span>
                          </div>
                        );
                      });
                    })()}
                    {/* Current time indicator */}
                    <div
                      className="absolute top-0 h-full"
                      style={{ left: `${timelinePosition}%`, transform: "translateX(-50%)" }}
                    >
                      <div className="w-0.5 h-full relative" style={{ background: "var(--white)" }}>
                        <div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
                          style={{ background: "var(--white)" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {timelinePhases.map((p) => {
                    const isGoldenPM = p.label === "Golden PM";
                    return (
                      <div
                        key={p.label}
                        className="rounded-xl p-3"
                        style={{
                          background: "var(--dark-700)",
                          border: isGoldenPM
                            ? "1px solid rgba(212, 135, 45, 0.4)"
                            : "1px solid var(--dark-600)",
                          boxShadow: isGoldenPM ? "0 0 20px rgba(212, 135, 45, 0.1)" : undefined,
                        }}
                      >
                        <div className="text-xs font-semibold mb-1" style={{ color: phaseColor(p.phase) }}>
                          {p.label}
                        </div>
                        <div className="text-xs mb-2" style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-300)" }}>
                          {!isNaN(p.start?.getTime()) && !isNaN(p.end?.getTime())
                            ? `${formatTimeLocale(p.start, locale)} - ${formatTimeLocale(p.end, locale)}`
                            : "—"}
                        </div>
                        <div className="flex items-center justify-between">
                          <span style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 18,
                            color: scoreColor(p.score),
                          }}>
                            {p.score}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{
                              color: p.isActive ? "var(--teal)" : p.isPast ? "var(--neutral-300)" : "var(--neutral-200)",
                            }}
                          >
                            {p.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ─── Bottom: Weather + Opportunities ─── */}
              <div className="grid grid-cols-12 gap-6">

                {/* Weather */}
                <div
                  className="col-span-12 md:col-span-5 rounded-2xl p-6 card-surface"
                  style={{
                    background: "var(--dark-800)",
                    border: "1px solid var(--dark-600)",
                  }}
                >
                  <div className="section-label mb-5">
                    Weather Conditions
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    {/* Left column */}
                    <div>
                      <div className="text-xs mb-1" style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Cloud Cover</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: "var(--white)" }}>
                        {lightData.weather.cloudCoverTotal}%
                      </div>
                      <div className="w-full h-1.5 rounded-full mt-1.5" style={{ background: "var(--dark-600)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${lightData.weather.cloudCoverTotal}%`,
                            background: "var(--golden-hour)",
                          }}
                        />
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--neutral-300)" }}>
                        {lightData.weather.cloudCoverTotal > 80
                          ? "Heavy overcast"
                          : lightData.weather.cloudCoverTotal > 50
                            ? "Partly cloudy"
                            : lightData.weather.cloudCoverTotal > 20
                              ? "Scattered clouds"
                              : "Mostly clear"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Visibility</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: "var(--white)" }}>
                        {formatDistance(lightData.weather.visibility / 1000, locale)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Humidity</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: "var(--white)" }}>
                        {lightData.weather.humidity}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Temperature</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: "var(--white)" }}>
                        {formatTemp(lightData.weather.temperature, locale)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Wind</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: "var(--white)" }}>
                        {Math.round(locale === "US" ? lightData.weather.windSpeed * 0.621371 : lightData.weather.windSpeed)} {locale === "US" ? "mph" : "km/h"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-2" style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>Cloud Layers</div>
                      <div className="space-y-1.5">
                        {[
                          { label: "High", value: lightData.weather.cloudCoverHigh },
                          { label: "Mid", value: lightData.weather.cloudCoverMid },
                          { label: "Low", value: lightData.weather.cloudCoverLow },
                        ].map((layer) => (
                          <div key={layer.label} className="flex items-center gap-2">
                            <span className="text-[10px] w-6" style={{ color: "var(--neutral-300)" }}>{layer.label}</span>
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--dark-600)" }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${layer.value}%`,
                                  background: layer.label === "High" ? "var(--violet)" : layer.label === "Mid" ? "var(--blue-hour)" : "var(--neutral-300)",
                                }}
                              />
                            </div>
                            <span className="text-[10px] w-7 text-right" style={{ color: "var(--neutral-300)" }}>
                              {layer.value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Photography notes */}
                  <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--dark-600)" }}>
                    <div className="space-y-1.5">
                      {lightData.weather.cloudCoverHigh > 30 && lightData.weather.cloudCoverLow < 30 && (
                        <div className="text-xs" style={{ color: "var(--neutral-200)" }}>
                          ✓ High clouds may enhance sunset colors
                        </div>
                      )}
                      {lightData.weather.humidity >= 40 && lightData.weather.humidity <= 65 && (
                        <div className="text-xs" style={{ color: "var(--neutral-200)" }}>
                          ✓ Good humidity for warm tones
                        </div>
                      )}
                      {lightData.weather.windSpeed < 15 && (
                        <div className="text-xs" style={{ color: "var(--neutral-200)" }}>
                          ✓ Low wind — stable for long exposures
                        </div>
                      )}
                      {lightData.weather.visibility / 1000 >= 10 && (
                        <div className="text-xs" style={{ color: "var(--neutral-200)" }}>
                          ✓ Good visibility for distant subjects
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Opportunities */}
                <div
                  className="col-span-12 md:col-span-7 rounded-2xl p-6 card-surface"
                  style={{
                    background: "var(--dark-800)",
                    border: "1px solid var(--dark-600)",
                  }}
                >
                  <div className="flex justify-between items-center mb-5">
                    <div className="section-label">
                      Upcoming Opportunities
                    </div>
                    <span className="text-xs cursor-pointer" role="button" style={{ color: "var(--golden-hour)" }}>
                      View All →
                    </span>
                  </div>
                  <div className="space-y-3">
                    {opportunities.map((opp, i) => (
                      <div
                        key={i}
                        className="rounded-xl p-4 flex gap-4"
                        style={{
                          background: "var(--dark-700)",
                          border: "1px solid var(--dark-600)",
                        }}
                      >
                        <div className="w-8 h-8 shrink-0 mt-0.5"><opp.icon className="w-8 h-8" style={{ color: opp.iconColor }} strokeWidth={1.5} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm" style={{ color: "var(--white)" }}>
                              {opp.name}
                            </span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 700,
                                background: "var(--golden-hour-subtle)",
                                color: scoreColor(opp.score),
                              }}
                            >
                              {opp.score}
                            </span>
                          </div>
                          <div className="text-xs mb-1" style={{ color: "var(--neutral-200)", fontFamily: "var(--font-mono)" }}>
                            {opp.timing} &middot; {opp.location}
                          </div>
                          <div className="text-xs" style={{ color: "var(--neutral-300)" }}>
                            {opp.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-32" style={{ color: "var(--neutral-300)" }}>
              <p>Unable to load light conditions. Please try again.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
