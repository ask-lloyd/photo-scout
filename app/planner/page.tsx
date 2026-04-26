"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { LightScore } from "@/components/light-score";
import { MapPin, Star, Sunset, Waves, Moon, Loader2 } from "lucide-react";
import { useGearProfile, useGeolocation } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import { formatTemp } from "@/lib/format";
import type { Spot, SettingsRecommendation } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types for API response ───

interface PlannerPhase {
  name: string;
  startTime: string;
  endTime: string;
  lightScore: number;
  lightPhase: string;
  colorTemp: string;
  evRange: string;
  settings: {
    landscape: SettingsRecommendation;
    action: SettingsRecommendation;
  };
}

interface PlannerData {
  weather: {
    cloudCover: number;
    humidity: number;
    visibility: number;
    temperature: number;
    windSpeed: number;
  };
  lightScore: number;
  sun: {
    goldenStart: string;
    sunset: string;
    blueHourStart: string;
    blueHourEnd: string;
    wrap: string;
  };
  phases: PlannerPhase[];
}

// ─── Hook: usePlannerData ───

function usePlannerData(spot: Spot | null, date: string) {
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spot) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/planner?lat=${spot.latitude}&lng=${spot.longitude}&date=${date}&spotId=${spot.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch planner data");
        return r.json();
      })
      .then((json: PlannerData) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [spot, date]);

  return { data, loading, error };
}

// ─── Helpers ───

function fmt(isoOrDate: string | Date) {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SettingPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-2 text-center">
      <div className="text-[13px] uppercase tracking-wider text-[var(--neutral-300)] mb-0.5">
        {label}
      </div>
      <div
        className="text-sm font-semibold"
        style={{ color: "var(--white)" }}
      >
        {value}
      </div>
    </div>
  );
}

function bearingToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(((deg % 360 + 360) % 360) / 45) % 8;
  return dirs[idx];
}

// ─── Context-aware description generators ───

function getArriveDescription(spot: Spot): string {
  const parts: string[] = [];

  if (spot.tags.includes("lake") || spot.tags.includes("waterfront")) {
    parts.push("Walk the shoreline and identify your best compositions.");
  } else if (spot.tags.includes("cityscape") || spot.tags.includes("urban")) {
    parts.push("Scout vantage points and check for interesting reflections in glass and water.");
  } else if (spot.tags.includes("mountain") || spot.tags.includes("overlook")) {
    parts.push("Find your best vantage point with clear sightlines to the horizon.");
  } else {
    parts.push("Explore the area and identify strong compositions with foreground interest.");
  }

  if (spot.tags.includes("windsurfing") || spot.tags.includes("kitesurfing")) {
    parts.push("Check wind direction for kitesurfer positions.");
  }

  if (spot.facing_direction !== undefined) {
    const dir = bearingToCardinal(spot.facing_direction);
    parts.push(`Scout foreground elements and leading lines toward the ${dir}.`);
  }

  parts.push("Set up your tripod in a stable spot and dial in your initial framing.");

  return parts.join(" ");
}

function getGoldenHourDescription(spot: Spot): string {
  const parts: string[] = ["The magic window."];

  if (spot.facing_direction !== undefined) {
    const dir = bearingToCardinal(spot.facing_direction);
    parts.push(`Warm, directional light rakes across the scene from the ${dir}.`);
  } else {
    parts.push("Warm, directional light with long shadows.");
  }

  if (spot.tags.includes("lake") || spot.tags.includes("waterfront")) {
    parts.push("The light illuminates the water surface with golden reflections.");
    parts.push("Rocks and shoreline features glow golden.");
  } else if (spot.tags.includes("cityscape")) {
    parts.push("Buildings catch warm side-light with long shadows adding depth.");
  } else if (spot.tags.includes("mountain")) {
    parts.push("Mountain peaks and ridgelines glow with warm alpenglow.");
  }

  parts.push("Start with wide compositions, then switch to telephoto as the light intensifies.");

  return parts.join(" ");
}

function getSunsetDescription(spot: Spot): string {
  const parts: string[] = ["The sun touches the horizon."];

  if (spot.facing_direction !== undefined) {
    const dir = bearingToCardinal(spot.facing_direction);
    const isWest = spot.facing_direction >= 225 && spot.facing_direction <= 315;
    if (isWest) {
      parts.push(`Facing ${dir} — perfect for shooting directly into the sunset.`);
    } else {
      parts.push(`Facing ${dir} — look for warm reflected light on the landscape.`);
    }
  }

  parts.push("Silhouettes become dominant. Colors shift rapidly from gold to deep orange and magenta.");
  parts.push("Switch to a wide angle for the full sky, or stay telephoto for compressed sun-on-horizon shots.");

  return parts.join(" ");
}

function getBlueHourDescription(spot: Spot): string {
  const parts: string[] = ["The sky turns deep blue with residual warmth on the horizon."];

  if (spot.tags.includes("lake") || spot.tags.includes("waterfront")) {
    parts.push("Long exposures smooth the water surface into glass — perfect for silky water shots and moody landscapes.");
  } else if (spot.tags.includes("cityscape") || spot.tags.includes("urban")) {
    parts.push("City lights begin to glow against the deep blue sky — the sweet spot for urban photography.");
    parts.push("Look for light reflections in wet surfaces or glass.");
  } else if (spot.tags.includes("bridge")) {
    parts.push("Bridge lights create stunning reflections. Long exposures smooth traffic into light trails.");
  } else {
    parts.push("This is the time for moody landscapes with rich, saturated colors.");
  }

  parts.push("Use a remote shutter or timer to avoid shake.");

  return parts.join(" ");
}

function getWrapDescription(date: string): string {
  const month = new Date(date + "T12:00:00").getMonth();
  const parts: string[] = ["Pack up gear carefully in the dark — use a headlamp with a red filter to preserve night vision."];

  parts.push("Check your shots on the back of the camera.");

  if (month >= 5 && month <= 8) {
    parts.push("Summer evenings stay warm — take your time reviewing captures before heading out.");
  } else if (month >= 11 || month <= 1) {
    parts.push("Winter nights get cold fast — warm up in your car while reviewing shots.");
  } else {
    parts.push("Watch your footing on the trail back — conditions change quickly after dark.");
  }

  return parts.join(" ");
}

function getProTip(spot: Spot): string {
  if (spot.tags.includes("lake") || spot.tags.includes("waterfront")) {
    return "Shoot both landscape and action during golden hour — the light changes fast. Start wide, then swap to telephoto as the sun drops lower and backlighting intensifies. Watch for lens flare when shooting into the light; use your hand or a lens hood.";
  }
  if (spot.tags.includes("cityscape")) {
    return "Bracket exposures heavily during transitions — the dynamic range between lit buildings and sky changes rapidly. Shoot in RAW for maximum flexibility blending exposures in post.";
  }
  return "Shoot both landscape and action during golden hour — the light changes fast. Start wide, then swap to telephoto as the sun drops lower. Watch for lens flare when shooting into the light; use your hand or a lens hood.";
}

// ─── Format settings helpers ───

function fmtAperture(a: number): string {
  return `f/${a % 1 === 0 ? a : a.toFixed(1)}`;
}

function fmtWB(wb: number): string {
  return `${wb}K`;
}

function fmtHyperfocal(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 100)}cm`;
  return `${h.toFixed(1)}m`;
}

// ─── Main Component ───

export default function PlannerPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState("bob-wentz-park");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const { gear, loaded: gearLoaded } = useGearProfile();
  const { locationName } = useGeolocation();
  const { locale } = useLocale();

  // Fetch spots
  useEffect(() => {
    fetch("/data/spots/index.json")
      .then((r) => r.json())
      .then((data: Spot[]) => setSpots(data))
      .catch(() => setSpots([]));
  }, []);

  const spot = spots.find((s) => s.id === selectedSpotId) ?? null;
  const { data: plannerData, loading, error } = usePlannerData(spot, selectedDate);

  // Derive timeline from API data
  const timeline = useMemo(() => {
    if (!plannerData) return null;
    return {
      arrive: new Date(new Date(plannerData.sun.goldenStart).getTime() - 30 * 60 * 1000),
      goldenStart: new Date(plannerData.sun.goldenStart),
      sunset: new Date(plannerData.sun.sunset),
      blueHourStart: new Date(plannerData.sun.blueHourStart),
      blueHourEnd: new Date(plannerData.sun.blueHourEnd),
      wrap: new Date(plannerData.sun.wrap),
    };
  }, [plannerData]);

  // Get phase by index
  const getPhase = useCallback(
    (idx: number): PlannerPhase | null => {
      if (!plannerData) return null;
      return plannerData.phases[idx] ?? null;
    },
    [plannerData]
  );

  const cameraName = gear.camera
    ? `${gear.camera.make} ${gear.camera.model}`
    : "No camera set";
  const lensNames = gear.lenses.map((l) => `${l.make} ${l.model}`);

  const windDisplay = plannerData
    ? locale === "US"
      ? `Wind ${Math.round(plannerData.weather.windSpeed * 0.621371)} mph`
      : `Wind ${Math.round(plannerData.weather.windSpeed)} km/h`
    : "";

  return (
    <>
      <NavHeader locationName={locationName} />
      <main className="pt-14">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Back + Title */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/"
              className="text-[var(--neutral-200)] hover:text-[var(--white)] transition-colors text-sm cursor-pointer"
            >
              &larr; Back
            </Link>
            <h1 className="text-[13px]l font-bold text-[var(--white)]">
              Shot Plan
            </h1>
          </div>

          {/* Spot / Date Selector */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Select
              value={selectedSpotId}
              onValueChange={(val: string | null) => {
                if (val) setSelectedSpotId(val);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a spot..." />
              </SelectTrigger>
              <SelectContent>
                {spots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm text-[var(--white)] bg-transparent border border-neutral-700 focus:border-orange-500/50 outline-none cursor-pointer"
            />
          </div>

          {/* Loading state */}
          {loading && (
            <div className="glass rounded-xl p-8 text-center flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
              <p className="text-[var(--neutral-200)]">
                Computing your shot plan...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-red-400">
                Failed to load planner data. Please try again.
              </p>
            </div>
          )}

          {/* No spot selected */}
          {spots.length === 0 && !loading && (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-[var(--neutral-200)]">Loading spots...</p>
            </div>
          )}

          {spot && plannerData && timeline && !loading && (
            <>
              {/* Plan Header Card */}
              <div className="glass rounded-2xl p-6 border border-orange-500/20 glow mb-6">
                <h2 className="text-2xl font-bold text-[var(--white)] mb-1">
                  {spot.name}
                </h2>
                <p className="text-[var(--neutral-200)] text-sm mb-4">
                  {spot.latitude.toFixed(4)}&deg;N,{" "}
                  {Math.abs(spot.longitude).toFixed(4)}&deg;W &middot;{" "}
                  {spot.elevation_ft} ft &middot;{" "}
                  {fmtDate(new Date(selectedDate + "T12:00:00"))}
                </p>

                {/* Condition badges */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <LightScore
                    score={plannerData.lightScore}
                    variant="badge"
                    showLabel
                  />
                  <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-[13px]s">
                    {Math.round(plannerData.weather.cloudCover)}% Cloud
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-[13px]s">
                    {windDisplay}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-[13px]s">
                    {formatTemp(plannerData.weather.temperature, locale)}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button className="glass px-4 py-2 rounded-lg text-sm text-[var(--neutral-200)] hover:text-[var(--white)] transition-colors border border-neutral-700 hover:border-neutral-600 cursor-pointer">
                    Add to Calendar
                  </button>
                  <button className="glass px-4 py-2 rounded-lg text-sm text-[var(--neutral-200)] hover:text-[var(--white)] transition-colors border border-neutral-700 hover:border-neutral-600 cursor-pointer">
                    Share
                  </button>
                  <button className="glass px-4 py-2 rounded-lg text-sm text-[var(--neutral-200)] hover:text-[var(--white)] transition-colors border border-neutral-700 hover:border-neutral-600 cursor-pointer">
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Gear Bar */}
              <div className="glass rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
                <span className="text-[13px]s uppercase tracking-wider text-[var(--neutral-300)] font-semibold">
                  Your Gear
                </span>
                <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-[13px]s">
                  {cameraName}
                </span>
                {lensNames.length > 0 ? (
                  lensNames.map((name) => (
                    <span
                      key={name}
                      className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-[13px]s"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-[13px]s">
                    No lenses set
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-[13px]s ${
                    gear.hasTripod
                      ? "bg-green-500/20 text-green-400"
                      : "bg-[#262626] text-[var(--neutral-300)]"
                  }`}
                >
                  Tripod {gear.hasTripod ? "Ready" : "N/A"}
                </span>
                <Link
                  href="/gear"
                  className="text-orange-500 text-[13px]s hover:text-orange-400 transition-colors ml-auto cursor-pointer"
                >
                  Change Gear
                </Link>
              </div>

              {/* Vertical Timeline */}
              <div className="space-y-0">
                {/* 1. Arrive & Scout */}
                {(() => {
                  const phase = getPhase(0);
                  if (!phase) return null;
                  const ls = phase.settings.landscape;
                  return (
                    <div className="flex gap-5 md:gap-5">
                      <div className="hidden md:flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">
                          <MapPin
                            className="w-5 h-5"
                            style={{ color: "var(--neutral-300)" }}
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="w-0.5 flex-1 bg-[#262626]/30 my-2"></div>
                      </div>
                      <div className="glass rounded-xl p-5 flex-1 mb-4">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[var(--white)] font-semibold">
                            {fmt(phase.startTime)} — Arrive &amp; Scout
                          </span>
                        </div>
                        <p className="text-[var(--neutral-300)] text-[13px]s mb-3">
                          30 min before golden hour
                        </p>
                        <p className="text-[var(--neutral-200)] text-sm mb-4">
                          {getArriveDescription(spot)}
                        </p>
                        <div className="glass rounded-lg p-3">
                          <p className="text-[13px]s text-[var(--neutral-300)] uppercase tracking-wider mb-2">
                            Pre-shoot Settings
                          </p>
                          <div className="grid grid-cols-5 gap-2">
                            <SettingPill
                              label="Aperture"
                              value={fmtAperture(ls.aperture)}
                            />
                            <SettingPill
                              label="Shutter"
                              value={ls.shutterSpeed}
                            />
                            <SettingPill label="ISO" value={String(ls.iso)} />
                            <SettingPill
                              label="WB"
                              value={fmtWB(ls.whiteBalance)}
                            />
                            <SettingPill
                              label="Focal"
                              value={ls.focalLengthSuggestion.split(" ")[0]}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Golden Hour */}
                {(() => {
                  const phase = getPhase(1);
                  if (!phase) return null;
                  const ls = phase.settings.landscape;
                  const ac = phase.settings.action;
                  return (
                    <div className="flex gap-5 md:gap-5">
                      <div className="hidden md:flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                          <Star
                            className="w-5 h-5 text-white"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="w-0.5 flex-1 bg-orange-500/30 my-2"></div>
                      </div>
                      <div className="glass rounded-xl p-5 flex-1 mb-4 border border-orange-500/20 glow">
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <span className="text-[var(--white)] font-semibold">
                            {fmt(phase.startTime)} — GOLDEN HOUR
                          </span>
                          <LightScore
                            score={phase.lightScore}
                            variant="badge"
                          />
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[13px] uppercase tracking-wider font-semibold">
                            Peak Light
                          </span>
                        </div>
                        <p className="text-[var(--neutral-200)] text-[13px]s mb-3">
                          Color temp {phase.colorTemp} &middot;{" "}
                          {phase.evRange} &middot;{" "}
                          {phase.lightPhase === "golden hour"
                            ? "Warm directional light with long shadows"
                            : phase.lightPhase}
                        </p>
                        <p className="text-[var(--neutral-200)] text-sm mb-4">
                          {getGoldenHourDescription(spot)}
                        </p>

                        {/* Two settings cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          {/* Landscape */}
                          <div className="glass rounded-lg p-4">
                            <p className="text-orange-400 text-[13px]s font-semibold uppercase tracking-wider mb-3">
                              Landscape ({ls.focalLengthSuggestion.split(" ")[0]})
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <SettingPill
                                label="Aperture"
                                value={fmtAperture(ls.aperture)}
                              />
                              <SettingPill
                                label="Shutter"
                                value={ls.shutterSpeed}
                              />
                              <SettingPill
                                label="ISO"
                                value={String(ls.iso)}
                              />
                              <SettingPill
                                label="WB"
                                value={fmtWB(ls.whiteBalance)}
                              />
                              <SettingPill
                                label="Focus"
                                value={`Hyperfocal ${fmtHyperfocal(ls.hyperfocalDistance)}`}
                              />
                              <SettingPill
                                label="Filter"
                                value={
                                  ls.filterRecommendation.length > 0
                                    ? ls.filterRecommendation[0].split("—")[0].trim()
                                    : "None needed"
                                }
                              />
                            </div>
                            {ls.tips.length > 0 && (
                              <p className="text-[var(--neutral-300)] text-[13px]s mt-2">
                                Tip: {ls.tips[0]}
                              </p>
                            )}
                          </div>

                          {/* Action */}
                          <div className="glass rounded-lg p-4">
                            <p className="text-blue-400 text-[13px]s font-semibold uppercase tracking-wider mb-3">
                              Action ({ac.focalLengthSuggestion.split(" ")[0]})
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <SettingPill
                                label="Aperture"
                                value={fmtAperture(ac.aperture)}
                              />
                              <SettingPill
                                label="Shutter"
                                value={ac.shutterSpeed}
                              />
                              <SettingPill
                                label="ISO"
                                value={String(ac.iso)}
                              />
                              <SettingPill
                                label="WB"
                                value={fmtWB(ac.whiteBalance)}
                              />
                              <SettingPill label="Focus" value="AF-C, tracking" />
                              <SettingPill
                                label="Drive"
                                value="Hi+ burst"
                              />
                            </div>
                            {ac.tips.length > 0 && (
                              <p className="text-[var(--neutral-300)] text-[13px]s mt-2">
                                Tip: {ac.tips[0]}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Pro tip */}
                        <div className="glass rounded-lg p-3 border border-orange-500/10">
                          <p className="text-[13px]s text-orange-400 font-semibold mb-1">
                            PRO TIP
                          </p>
                          <p className="text-[var(--neutral-200)] text-[13px]s">
                            {getProTip(spot)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Sunset */}
                {(() => {
                  const phase = getPhase(2);
                  if (!phase) return null;
                  const ls = phase.settings.landscape;
                  return (
                    <div className="flex gap-5 md:gap-5">
                      <div className="hidden md:flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                          <Sunset
                            className="w-5 h-5 text-white"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="w-0.5 flex-1 bg-amber-500/30 my-2"></div>
                      </div>
                      <div className="glass rounded-xl p-5 flex-1 mb-4 border border-amber-500/10">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[var(--white)] font-semibold">
                            {fmt(phase.startTime)} — Sunset
                          </span>
                          <LightScore
                            score={phase.lightScore}
                            variant="badge"
                          />
                        </div>
                        <p className="text-[var(--neutral-200)] text-[13px]s mb-3">
                          Sun direction: {spot.facing_direction}&deg;{bearingToCardinal(spot.facing_direction)} &middot;{" "}
                          Color temp {phase.colorTemp}
                        </p>
                        <p className="text-[var(--neutral-200)] text-sm mb-4">
                          {getSunsetDescription(spot)}
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          <SettingPill
                            label="Aperture"
                            value={fmtAperture(ls.aperture)}
                          />
                          <SettingPill
                            label="Shutter"
                            value={ls.shutterSpeed}
                          />
                          <SettingPill label="ISO" value={String(ls.iso)} />
                          <SettingPill
                            label="WB"
                            value={fmtWB(ls.whiteBalance)}
                          />
                          <SettingPill label="Tip" value="f/16 for sun star" />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Blue Hour */}
                {(() => {
                  const phase = getPhase(3);
                  if (!phase) return null;
                  const ls = phase.settings.landscape;
                  return (
                    <div className="flex gap-5 md:gap-5">
                      <div className="hidden md:flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <Waves
                            className="w-5 h-5 text-white"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="w-0.5 flex-1 bg-blue-500/30 my-2"></div>
                      </div>
                      <div className="glass rounded-xl p-5 flex-1 mb-4 border border-blue-500/10">
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <span className="text-[var(--white)] font-semibold">
                            {fmt(phase.startTime)} &ndash;{" "}
                            {fmt(phase.endTime)} — Blue Hour
                          </span>
                          <LightScore
                            score={phase.lightScore}
                            variant="badge"
                          />
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[13px] uppercase tracking-wider font-semibold">
                            Tripod Required
                          </span>
                        </div>
                        <p className="text-[var(--neutral-200)] text-[13px]s mb-3">
                          {phase.lightPhase} &middot; Color temp{" "}
                          {phase.colorTemp} &middot; {phase.evRange}
                        </p>
                        <p className="text-[var(--neutral-200)] text-sm mb-4">
                          {getBlueHourDescription(spot)}
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          <SettingPill
                            label="Aperture"
                            value={fmtAperture(ls.aperture)}
                          />
                          <SettingPill
                            label="Shutter"
                            value={ls.shutterSpeed}
                          />
                          <SettingPill label="ISO" value={String(ls.iso)} />
                          <SettingPill
                            label="WB"
                            value={fmtWB(ls.whiteBalance)}
                          />
                          <SettingPill
                            label="Filter"
                            value={
                              ls.filterRecommendation.length > 0
                                ? ls.filterRecommendation[0].split("—")[0].trim()
                                : "None"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Wrap */}
                {(() => {
                  const phase = getPhase(4);
                  if (!phase) return null;
                  return (
                    <div className="flex gap-5 md:gap-5">
                      <div className="hidden md:flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">
                          <Moon
                            className="w-5 h-5"
                            style={{ color: "var(--neutral-300)" }}
                            strokeWidth={1.5}
                          />
                        </div>
                      </div>
                      <div className="glass rounded-xl p-5 flex-1 mb-4">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[var(--white)] font-semibold">
                            {fmt(phase.startTime)} — Wrap
                          </span>
                        </div>
                        <p className="text-[var(--neutral-200)] text-sm">
                          {getWrapDescription(selectedDate)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
