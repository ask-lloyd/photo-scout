"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as SunCalc from "suncalc";
import {
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Car,
  Sunrise,
  Sun,
  Sunset as SunsetIcon,
  Moon,
  Clock,
  MapPin,
  AlertTriangle,
  Copy,
  Trash2,
  Navigation,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { useGeolocation, useSpots } from "@/lib/hooks";
import type { Spot } from "@/lib/types";
import {
  googleMapsPlaceUrl,
  googleMapsDirectionsUrl,
  appleMapsDirectionsUrl,
  fetchStopWeather,
  type StopWeather,
  DOLOMITES_PRESETS,
  type PresetItinerary,
} from "@/lib/trip-helpers";

// ─── Types ────────────────────────────────────────────────────────────────

type LightWindow =
  | "sunrise"
  | "morning_golden"
  | "midday"
  | "evening_golden"
  | "sunset"
  | "blue_hour"
  | "astro"
  | "custom";

interface TripStop {
  id: string;          // unique within trip
  spotId: string;
  window: LightWindow;
  customTime?: string; // "HH:MM" only if window === "custom"
  shootMinutes: number; // dwell time at the spot
}

interface Trip {
  date: string;             // YYYY-MM-DD
  origin: "current" | string; // future: "spot:<id>" — for now just current location
  drivingSpeedKmh: number;  // user-configurable; default 50 for mountain roads
  bufferMinutes: number;    // safety buffer added to each drive leg
  stops: TripStop[];
}

const STORAGE_KEY = "photoscout-trip";

// ─── Storage helpers ──────────────────────────────────────────────────────

function loadTrip(date: string): Trip {
  if (typeof window === "undefined") return defaultTrip(date);
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${date}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultTrip(date);
}

function saveTrip(trip: Trip) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_KEY}:${trip.date}`, JSON.stringify(trip));
  } catch (e) {
    console.warn("Failed to save trip", e);
  }
}

function defaultTrip(date: string): Trip {
  return {
    date,
    origin: "current",
    drivingSpeedKmh: 50, // mountain default
    bufferMinutes: 15,
    stops: [],
  };
}

function uuid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Distance / drive math ────────────────────────────────────────────────

const DETOUR_FACTOR = 1.35; // straight-line → real road distance approximation

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

function driveMinutes(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  speedKmh: number
) {
  const km = haversineKm(a, b) * DETOUR_FACTOR;
  return (km / speedKmh) * 60;
}

// ─── Light-window resolver ────────────────────────────────────────────────

function windowToTime(
  window: LightWindow,
  spot: Spot,
  date: Date,
  customTime?: string
): { time: Date; label: string } | null {
  // SunCalc on a date with timezone-naive time picks UTC midnight; using the
  // user's local date string + noon should give the right "day" for any TZ.
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);
  const t = SunCalc.getTimes(noon, spot.latitude, spot.longitude);
  switch (window) {
    case "sunrise":
      return { time: t.sunrise, label: "Sunrise" };
    case "morning_golden":
      return { time: t.goldenHourEnd, label: "Morning golden hour" };
    case "midday":
      return { time: t.solarNoon, label: "Midday" };
    case "evening_golden":
      // SunCalc.goldenHour = start of evening golden hour
      return { time: t.goldenHour, label: "Evening golden hour" };
    case "sunset":
      return { time: t.sunset, label: "Sunset" };
    case "blue_hour":
      return { time: t.dusk, label: "Blue hour (dusk)" };
    case "astro":
      return { time: t.night, label: "Astronomical night" };
    case "custom": {
      if (!customTime) return null;
      const [h, m] = customTime.split(":").map(Number);
      const d = new Date(date);
      d.setHours(h || 0, m || 0, 0, 0);
      return { time: d, label: "Custom time" };
    }
  }
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function TripPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-20 pb-12">
          <div className="max-w-3xl mx-auto px-4">Loading…</div>
        </main>
      }
    >
      <TripPageInner />
    </Suspense>
  );
}

function TripPageInner() {
  const sp = useSearchParams();
  const todayLocal = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const initialDate = sp.get("date") ?? todayLocal;

  const [date, setDate] = useState(initialDate);
  const [trip, setTrip] = useState<Trip>(() => defaultTrip(initialDate));
  const [loaded, setLoaded] = useState(false);
  const { coords, locationName } = useGeolocation();
  const spots = useSpots();
  const spotById = useMemo(() => new Map(spots.map((s) => [s.id, s])), [spots]);

  // Load trip when date changes
  useEffect(() => {
    setTrip(loadTrip(date));
    setLoaded(true);
  }, [date]);

  // Persist on change (after initial load)
  useEffect(() => {
    if (loaded) saveTrip(trip);
  }, [trip, loaded]);

  const updateTrip = useCallback((patch: Partial<Trip>) => {
    setTrip((prev) => ({ ...prev, ...patch }));
  }, []);

  const addStop = (spotId: string) => {
    const spot = spotById.get(spotId);
    if (!spot) return;
    // Default window: first entry from spot.best_time, mapped to our enum
    const mapBest: Record<string, LightWindow> = {
      sunrise: "sunrise",
      golden_morning: "morning_golden",
      golden_evening: "evening_golden",
      sunset: "sunset",
      blue_hour: "blue_hour",
      midday: "midday",
      astro: "astro",
      night: "astro",
    };
    const firstBest = spot.best_time?.[0];
    const window: LightWindow =
      (firstBest && mapBest[firstBest]) || "evening_golden";
    setTrip((prev) => ({
      ...prev,
      stops: [
        ...prev.stops,
        { id: uuid(), spotId, window, shootMinutes: 60 },
      ],
    }));
  };

  const removeStop = (id: string) =>
    setTrip((prev) => ({ ...prev, stops: prev.stops.filter((s) => s.id !== id) }));

  const moveStop = (id: string, dir: -1 | 1) => {
    setTrip((prev) => {
      const idx = prev.stops.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const next = [...prev.stops];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return { ...prev, stops: next };
    });
  };

  const updateStop = (id: string, patch: Partial<TripStop>) =>
    setTrip((prev) => ({
      ...prev,
      stops: prev.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const applyPreset = (preset: PresetItinerary) => {
    const replace = trip.stops.length === 0
      ? true
      : confirm(`Replace your current ${trip.stops.length} stop(s) with the "${preset.name}" itinerary?`);
    if (!replace) return;
    setTrip((prev) => ({
      ...prev,
      stops: preset.stops.map((s) => ({
        id: uuid(),
        spotId: s.spotId,
        window: s.window as LightWindow,
        shootMinutes: s.shootMinutes,
      })),
    }));
  };

  // Compute schedule
  const schedule = useMemo(
    () => computeSchedule(trip, coords, spotById),
    [trip, coords, spotById]
  );

  // Available spots to add (not already in trip), sorted by proximity to user
  const inTripIds = new Set(trip.stops.map((s) => s.spotId));
  const availableSpots = useMemo(() => {
    const list = spots.filter((s) => !inTripIds.has(s.id));
    if (!coords) return list.sort((a, b) => a.name.localeCompare(b.name));
    // Sort by squared euclidean distance from current coords (good enough for ranking)
    return list.sort((a, b) => {
      const da = (a.latitude - coords.lat) ** 2 + (a.longitude - coords.lng) ** 2;
      const db = (b.latitude - coords.lat) ** 2 + (b.longitude - coords.lng) ** 2;
      return da - db;
    });
  }, [spots, inTripIds, coords]);

  return (
    <>
      <NavHeader locationName={locationName} />
      <main className="min-h-screen pt-20 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Link
              href="/"
              className="text-[var(--neutral-200)] hover:text-[var(--white)] transition-colors text-sm cursor-pointer"
            >
              &larr; Back
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--white)]">
              Day Trip Planner
            </h1>
          </div>

          <p className="text-sm text-[var(--neutral-300)] mb-4">
            Sequence the spots you want to shoot. We compute drive times and
            tell you when to leave each location to nail the light.
          </p>

          {/* Trip controls */}
          <div className="glass rounded-xl p-3 sm:p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-[var(--neutral-300)] font-semibold mb-1">
                  Date
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full glass rounded-lg px-3 py-2 text-sm bg-transparent border border-neutral-700 focus:border-orange-500/50 outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-[var(--neutral-300)] font-semibold mb-1">
                  Avg drive speed (km/h)
                </span>
                <input
                  type="number"
                  min={20}
                  max={120}
                  value={trip.drivingSpeedKmh}
                  onChange={(e) =>
                    updateTrip({
                      drivingSpeedKmh: Math.max(20, Math.min(120, Number(e.target.value) || 50)),
                    })
                  }
                  className="w-full glass rounded-lg px-3 py-2 text-sm bg-transparent border border-neutral-700 focus:border-orange-500/50 outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-[var(--neutral-300)] font-semibold mb-1">
                  Buffer per leg (min)
                </span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={trip.bufferMinutes}
                  onChange={(e) =>
                    updateTrip({
                      bufferMinutes: Math.max(0, Math.min(120, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full glass rounded-lg px-3 py-2 text-sm bg-transparent border border-neutral-700 focus:border-orange-500/50 outline-none"
                />
              </label>
            </div>
            <p className="text-[11px] text-[var(--neutral-300)] mt-2">
              Drive time = straight-line × {DETOUR_FACTOR} ÷ avg speed. For
              mountain roads (Dolomites), 40–50 km/h is realistic. For highway,
              try 80–95.
            </p>
          </div>

          {/* Preset itineraries */}
          {trip.stops.length === 0 && (
            <PresetPicker presets={DOLOMITES_PRESETS} onApply={applyPreset} />
          )}

          {/* Stops list */}
          <div className="space-y-3 mb-4">
            {trip.stops.length === 0 && (
              <div className="glass rounded-xl p-6 text-center text-sm text-[var(--neutral-300)]">
                No stops yet. Pick a preset above or add a spot below to start planning your day.
              </div>
            )}
            {trip.stops.map((stop, i) => {
              const spot = spotById.get(stop.spotId);
              const sched = schedule.stops[i];
              const prevStop = i > 0 ? trip.stops[i - 1] : null;
              const prevSpot = prevStop ? spotById.get(prevStop.spotId) : null;
              const legOrigin = prevSpot
                ? { lat: prevSpot.latitude, lng: prevSpot.longitude }
                : coords;
              return (
                <StopCard
                  key={stop.id}
                  index={i}
                  stop={stop}
                  spot={spot}
                  scheduled={sched}
                  isFirst={i === 0}
                  isLast={i === trip.stops.length - 1}
                  legOrigin={legOrigin}
                  tripDate={trip.date}
                  onChange={(patch) => updateStop(stop.id, patch)}
                  onRemove={() => removeStop(stop.id)}
                  onMoveUp={() => moveStop(stop.id, -1)}
                  onMoveDown={() => moveStop(stop.id, 1)}
                />
              );
            })}
          </div>

          {/* Add spot picker */}
          {availableSpots.length > 0 && (
            <AddStopPicker spots={availableSpots} coords={coords} onPick={addStop} />
          )}

          {/* Summary */}
          {trip.stops.length > 0 && (
            <TripSummary trip={trip} schedule={schedule} />
          )}

          {/* Conflicts */}
          {schedule.warnings.length > 0 && (
            <div className="glass rounded-xl p-4 mt-4 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">
                  Schedule conflicts
                </span>
              </div>
              <ul className="text-xs text-[var(--neutral-200)] space-y-1 list-disc pl-4">
                {schedule.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ─── Schedule computation ─────────────────────────────────────────────────

interface ScheduledStop {
  shootStart: Date | null;
  shootEnd: Date | null;
  windowLabel: string;
  leaveAt: Date | null;        // when to leave the previous location
  driveMinutes: number | null; // duration of preceding leg
  arriveAt: Date | null;
}

interface ComputedSchedule {
  stops: ScheduledStop[];
  warnings: string[];
}

function computeSchedule(
  trip: Trip,
  origin: { lat: number; lng: number } | null,
  spotById: Map<string, Spot>
): ComputedSchedule {
  const out: ComputedSchedule = { stops: [], warnings: [] };
  const date = new Date(`${trip.date}T12:00:00`);
  let prevLoc: { lat: number; lng: number } | null = origin;
  let prevDepartTime: Date | null = null;
  let prevShootEnd: Date | null = null;
  let prevSpotName = origin ? "your current location" : "start";

  trip.stops.forEach((stop, i) => {
    const spot = spotById.get(stop.spotId);
    if (!spot) {
      out.stops.push({
        shootStart: null,
        shootEnd: null,
        windowLabel: "—",
        leaveAt: null,
        driveMinutes: null,
        arriveAt: null,
      });
      return;
    }
    const w = windowToTime(stop.window, spot, date, stop.customTime);
    if (!w) {
      out.stops.push({
        shootStart: null,
        shootEnd: null,
        windowLabel: "—",
        leaveAt: null,
        driveMinutes: null,
        arriveAt: null,
      });
      return;
    }
    const shootStart = w.time;
    const shootEnd = new Date(shootStart.getTime() + stop.shootMinutes * 60_000);

    let driveMin: number | null = null;
    let leaveAt: Date | null = null;
    let arriveAt: Date | null = null;

    if (prevLoc) {
      driveMin = driveMinutes(
        prevLoc,
        { lat: spot.latitude, lng: spot.longitude },
        trip.drivingSpeedKmh
      ) + trip.bufferMinutes;
      arriveAt = new Date(shootStart.getTime() - 5 * 60_000); // arrive 5 min early
      leaveAt = new Date(arriveAt.getTime() - driveMin * 60_000);

      if (prevShootEnd && leaveAt < prevShootEnd) {
        const overlapMin = Math.round((prevShootEnd.getTime() - leaveAt.getTime()) / 60_000);
        out.warnings.push(
          `Tight transition to ${spot.name}: you'd need to leave ${prevSpotName} ${overlapMin} min before finishing the shot. Trim shoot time, increase speed, or drop a stop.`
        );
      }
      if (prevDepartTime && leaveAt < prevDepartTime) {
        out.warnings.push(
          `${spot.name} starts before the previous stop wraps. Reorder or shorten earlier shoots.`
        );
      }
    }

    out.stops.push({
      shootStart,
      shootEnd,
      windowLabel: w.label,
      leaveAt,
      driveMinutes: driveMin,
      arriveAt,
    });

    prevLoc = { lat: spot.latitude, lng: spot.longitude };
    prevShootEnd = shootEnd;
    prevDepartTime = shootEnd;
    prevSpotName = spot.name;
  });

  return out;
}

// ─── Stop Card ────────────────────────────────────────────────────────────

const WINDOW_OPTIONS: { value: LightWindow; label: string; icon: React.ReactNode }[] = [
  { value: "sunrise", label: "Sunrise", icon: <Sunrise size={14} /> },
  { value: "morning_golden", label: "Morning golden", icon: <Sun size={14} /> },
  { value: "midday", label: "Midday", icon: <Sun size={14} /> },
  { value: "evening_golden", label: "Evening golden", icon: <Sun size={14} /> },
  { value: "sunset", label: "Sunset", icon: <SunsetIcon size={14} /> },
  { value: "blue_hour", label: "Blue hour", icon: <Moon size={14} /> },
  { value: "astro", label: "Astro", icon: <Moon size={14} /> },
  { value: "custom", label: "Custom", icon: <Clock size={14} /> },
];

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function StopCard({
  index,
  stop,
  spot,
  scheduled,
  isFirst,
  isLast,
  legOrigin,
  tripDate,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  stop: TripStop;
  spot: Spot | undefined;
  scheduled: ScheduledStop | undefined;
  isFirst: boolean;
  isLast: boolean;
  legOrigin: { lat: number; lng: number } | null;
  tripDate: string;
  onChange: (patch: Partial<TripStop>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [weather, setWeather] = useState<StopWeather | null>(null);
  const [wxLoading, setWxLoading] = useState(false);

  // Fetch weather for the shoot start time
  useEffect(() => {
    if (!spot || !scheduled?.shootStart) return;
    const d = scheduled.shootStart;
    const iso = `${tripDate}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setWxLoading(true);
    fetchStopWeather(spot.latitude, spot.longitude, iso)
      .then((w) => setWeather(w))
      .finally(() => setWxLoading(false));
  }, [spot, scheduled?.shootStart, tripDate]);

  if (!spot) {
    return (
      <div className="glass rounded-xl p-4 text-sm text-red-400">
        Missing spot data
        <button onClick={onRemove} className="ml-2 underline">
          Remove
        </button>
      </div>
    );
  }
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Drive leg leading in */}
      {scheduled && scheduled.driveMinutes !== null && (
        <div className="px-4 py-2 bg-[#262626] flex items-center justify-between gap-2 text-xs text-[var(--neutral-300)] border-b border-neutral-700 flex-wrap">
          <div className="flex items-center gap-2">
            <Car size={12} />
            <span>
              Drive ~{Math.round(scheduled.driveMinutes)} min &middot; Leave by{" "}
              <span className="text-orange-400 font-semibold">{fmt(scheduled.leaveAt)}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <a
              href={googleMapsDirectionsUrl(legOrigin, { lat: spot.latitude, lng: spot.longitude, name: spot.name })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 active:bg-orange-500/30 cursor-pointer text-[11px] min-h-[32px]"
              title="Open driving directions in Google Maps"
            >
              <Navigation size={11} /> Google
            </a>
            <a
              href={appleMapsDirectionsUrl(legOrigin, { lat: spot.latitude, lng: spot.longitude })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/5 text-[var(--neutral-200)] hover:bg-white/10 active:bg-white/15 cursor-pointer text-[11px] min-h-[32px]"
              title="Open in Apple Maps"
            >
              <Navigation size={11} /> Apple
            </a>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Top row: number + name + actions */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <MapPin size={12} className="text-[var(--neutral-300)]" />
              <h3 className="text-sm font-semibold text-[var(--white)] break-words">
                {spot.name}
              </h3>
              <a
                href={googleMapsPlaceUrl(spot)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--neutral-300)] hover:text-orange-400 cursor-pointer"
                title="Open spot in Google Maps"
              >
                <ExternalLink size={11} />
              </a>
            </div>
            {scheduled && scheduled.shootStart && (
              <p className="text-xs text-[var(--neutral-300)] mt-0.5">
                {scheduled.windowLabel} &middot; {fmt(scheduled.shootStart)}–
                {fmt(scheduled.shootEnd)}
              </p>
            )}
            {/* Weather row */}
            <div className="mt-1.5 text-xs text-[var(--neutral-200)]">
              {wxLoading && <span className="text-[var(--neutral-400)]">Checking weather…</span>}
              {!wxLoading && weather && (
                <span className="flex items-center gap-2 flex-wrap">
                  <span>{weather.icon}</span>
                  <span>{weather.summary}</span>
                  <span className="text-[var(--neutral-400)]">·</span>
                  <span>{Math.round(weather.tempC)}°C</span>
                  <span className="text-[var(--neutral-400)]">·</span>
                  <span>{Math.round(weather.cloudCover)}% cloud</span>
                  {weather.precipMm > 0.2 && (
                    <>
                      <span className="text-[var(--neutral-400)]">·</span>
                      <span className="text-blue-400">{weather.precipMm.toFixed(1)}mm rain</span>
                    </>
                  )}
                  <span className="text-[var(--neutral-400)]">·</span>
                  <span>{Math.round(weather.windKmh)} km/h wind</span>
                </span>
              )}
              {!wxLoading && !weather && scheduled?.shootStart && (
                <span className="text-[var(--neutral-400)]">Weather not available (date may be too far out)</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <div className="flex gap-1">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="w-9 h-9 rounded-lg bg-[#262626] hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                title="Move up"
                aria-label="Move stop up"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="w-9 h-9 rounded-lg bg-[#262626] hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                title="Move down"
                aria-label="Move stop down"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={onRemove}
                className="w-9 h-9 rounded-lg bg-[#262626] hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center cursor-pointer"
                title="Remove"
                aria-label="Remove stop"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Light window picker */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {WINDOW_OPTIONS.map((w) => (
            <button
              key={w.value}
              onClick={() => onChange({ window: w.value })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-colors ${
                stop.window === w.value
                  ? "bg-orange-500 text-white"
                  : "bg-[#262626] text-[var(--neutral-200)] hover:bg-[#333]"
              }`}
            >
              {w.icon}
              {w.label}
            </button>
          ))}
        </div>

        {/* Custom time + dwell */}
        <div className="grid grid-cols-2 gap-2">
          {stop.window === "custom" && (
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--neutral-300)] mb-1">
                Time
              </span>
              <input
                type="time"
                value={stop.customTime ?? ""}
                onChange={(e) => onChange({ customTime: e.target.value })}
                className="w-full glass rounded-lg px-2 py-1.5 text-xs bg-transparent border border-neutral-700"
              />
            </label>
          )}
          <label className={stop.window === "custom" ? "block" : "block col-span-2 sm:col-span-1"}>
            <span className="block text-[10px] uppercase tracking-wider text-[var(--neutral-300)] mb-1">
              Shoot duration (min)
            </span>
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={stop.shootMinutes}
              onChange={(e) =>
                onChange({ shootMinutes: Math.max(5, Math.min(480, Number(e.target.value) || 60)) })
              }
              className="w-full glass rounded-lg px-2 py-1.5 text-xs bg-transparent border border-neutral-700"
            />
          </label>
        </div>

        {/* Quick info chips */}
        <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-[var(--neutral-300)]">
          {spot.parking && (
            <span className="px-2 py-0.5 rounded-full bg-[#262626]">
              🅿️ {spot.parking}
            </span>
          )}
          {spot.elevation_ft && (
            <span className="px-2 py-0.5 rounded-full bg-[#262626]">
              ⛰ {spot.elevation_ft.toLocaleString()} ft
            </span>
          )}
          {spot.tags?.slice(0, 3).map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-[#262626]">
              {t}
            </span>
          ))}
        </div>

        {/* Expandable spot intel */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[var(--neutral-300)] hover:text-[var(--white)] cursor-pointer"
          >
            <Info size={12} />
            {expanded ? "Hide spot details" : "Show spot details"}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <Link
            href={`/planner?spot=${encodeURIComponent(spot.id)}&date=${encodeURIComponent(tripDate)}`}
            className="flex items-center gap-1 text-orange-500 hover:text-orange-400 cursor-pointer"
          >
            Shot planner →
          </Link>
        </div>
        {expanded && <SpotDetails spot={spot} />}
      </div>
    </div>
  );
}

// ─── Spot details (lazy-loaded body_html from /data/spots/<id>.json) ──────

function SpotDetails({ spot }: { spot: Spot }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/data/spots/${spot.id}.json`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) {
          setHtml(d.body_html ?? null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [spot.id]);

  return (
    <div className="mt-3 pt-3 border-t border-neutral-700">
      {!loaded && <p className="text-xs text-[var(--neutral-400)]">Loading details…</p>}
      {loaded && !html && <p className="text-xs text-[var(--neutral-400)]">No detailed notes for this spot yet.</p>}
      {html && (
        <div
          className="prose prose-invert prose-sm max-w-none text-xs spot-details"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}

// ─── Preset Picker ────────────────────────────────────────────────────────

function PresetPicker({
  presets,
  onApply,
}: {
  presets: PresetItinerary[];
  onApply: (p: PresetItinerary) => void;
}) {
  return (
    <div className="glass rounded-xl p-3 sm:p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-orange-400" />
        <h3 className="text-sm font-semibold text-[var(--white)]">Quick-start: Dolomites itineraries</h3>
      </div>
      <p className="text-xs text-[var(--neutral-300)] mb-3">
        Start from a curated day, then tweak. Each preset uses spots already in your library.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => onApply(p)}
            className="text-left rounded-lg border border-neutral-700 hover:border-orange-500/50 hover:bg-white/5 p-3 cursor-pointer transition-colors"
          >
            <div className="text-xs font-semibold text-[var(--white)] mb-1">{p.name}</div>
            <div className="text-[11px] text-[var(--neutral-300)] leading-relaxed mb-1.5">
              {p.description}
            </div>
            <div className="text-[10px] text-[var(--neutral-400)]">
              📍 {p.basecamp} · {p.stops.length} stops
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Add stop picker ──────────────────────────────────────────────────────

// Roughly classify by country/region using lat/lng so the picker can group
// "near you" vs "far". Cheap rectangular bounding boxes are fine here.
function regionFor(s: Spot): { code: string; label: string } {
  if (s.latitude >= 36 && s.latitude <= 47.5 && s.longitude >= 6 && s.longitude <= 19) {
    return { code: "it", label: "Italy" };
  }
  if (s.latitude >= 24 && s.latitude <= 50 && s.longitude >= -125 && s.longitude <= -66) {
    return { code: "us", label: "United States" };
  }
  return { code: "other", label: "Other" };
}

function haversineKmRough(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

const NEAR_KM = 500; // anything within 500 km is "nearby" for a day-trip context

function AddStopPicker({
  spots,
  coords,
  onPick,
}: {
  spots: Spot[];
  coords: { lat: number; lng: number } | null;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showFar, setShowFar] = useState(false);

  // Annotate spots with distance + region
  const annotated = useMemo(() => {
    return spots.map((s) => {
      const distanceKm = coords
        ? haversineKmRough(coords, { lat: s.latitude, lng: s.longitude })
        : null;
      return { spot: s, distanceKm, region: regionFor(s) };
    });
  }, [spots, coords]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return annotated;
    return annotated.filter(
      (a) =>
        a.spot.name.toLowerCase().includes(q) ||
        a.region.label.toLowerCase().includes(q) ||
        a.spot.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [query, annotated]);

  // Split into nearby vs far when we have coords and no active query
  const { nearby, far } = useMemo(() => {
    if (!coords || query.trim()) {
      return { nearby: filtered, far: [] };
    }
    const n: typeof filtered = [];
    const f: typeof filtered = [];
    filtered.forEach((a) => {
      if (a.distanceKm != null && a.distanceKm <= NEAR_KM) n.push(a);
      else f.push(a);
    });
    return { nearby: n, far: f };
  }, [filtered, coords, query]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glass rounded-xl px-4 py-3 w-full text-sm text-[var(--neutral-200)] hover:text-[var(--white)] border border-dashed border-neutral-600 transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
      >
        <Plus size={16} /> Add a spot
      </button>
    );
  }
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search spots, regions, tags…"
          className="flex-1 glass rounded-lg px-3 py-2.5 text-base bg-transparent border border-neutral-700 focus:border-orange-500/50 outline-none"
          inputMode="search"
        />
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2.5 rounded-lg text-sm text-[var(--neutral-300)] hover:text-[var(--neutral-200)] cursor-pointer"
        >
          Cancel
        </button>
      </div>
      <div className="max-h-[60vh] sm:max-h-72 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--neutral-300)] p-2">No matches.</p>
        )}

        {/* Nearby section */}
        {nearby.length > 0 && (
          <>
            {coords && !query.trim() && (
              <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-orange-400/80 font-semibold">
                Near you
              </div>
            )}
            {nearby.map(({ spot: s, distanceKm, region }) => (
              <SpotRow
                key={s.id}
                spot={s}
                distanceKm={distanceKm}
                regionLabel={region.label}
                onPick={() => {
                  onPick(s.id);
                  setQuery("");
                  setOpen(false);
                }}
              />
            ))}
          </>
        )}

        {/* Far section (collapsed by default) */}
        {far.length > 0 && (
          <>
            <button
              onClick={() => setShowFar((v) => !v)}
              className="w-full text-left px-2 pt-2 pb-0.5 text-[10px] uppercase tracking-wider text-[var(--neutral-400)] font-semibold flex items-center gap-1 hover:text-[var(--neutral-200)] cursor-pointer"
            >
              {showFar ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              Other regions ({far.length})
            </button>
            {showFar &&
              far.map(({ spot: s, distanceKm, region }) => (
                <SpotRow
                  key={s.id}
                  spot={s}
                  distanceKm={distanceKm}
                  regionLabel={region.label}
                  onPick={() => {
                    onPick(s.id);
                    setQuery("");
                    setOpen(false);
                  }}
                />
              ))}
          </>
        )}
      </div>
    </div>
  );
}

function SpotRow({
  spot,
  distanceKm,
  regionLabel,
  onPick,
}: {
  spot: Spot;
  distanceKm: number | null;
  regionLabel: string;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 cursor-pointer min-h-[48px] flex items-center justify-between gap-2"
    >
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-[var(--white)] truncate">{spot.name}</span>
        <span className="block text-[11px] text-[var(--neutral-400)] truncate">
          {regionLabel}
          {spot.tags?.[0] ? ` · ${spot.tags[0]}` : ""}
        </span>
      </span>
      {distanceKm != null && (
        <span className="text-[10px] text-[var(--neutral-300)] font-mono whitespace-nowrap flex-shrink-0">
          {distanceKm < 10
            ? `${distanceKm.toFixed(1)} km`
            : distanceKm < 1000
            ? `${Math.round(distanceKm)} km`
            : `${Math.round(distanceKm / 100) / 10}k km`}
        </span>
      )}
    </button>
  );
}

// ─── Trip summary ─────────────────────────────────────────────────────────

function TripSummary({ trip, schedule }: { trip: Trip; schedule: ComputedSchedule }) {
  const totalDriveMin = schedule.stops.reduce(
    (sum, s) => sum + (s.driveMinutes ?? 0),
    0
  );
  const totalShootMin = trip.stops.reduce((sum, s) => sum + s.shootMinutes, 0);
  const firstLeave = schedule.stops[0]?.leaveAt;
  const lastEnd = schedule.stops[schedule.stops.length - 1]?.shootEnd;

  const copyItinerary = () => {
    if (typeof window === "undefined") return;
    const lines: string[] = [`# Trip itinerary — ${trip.date}`, ""];
    schedule.stops.forEach((s, i) => {
      const stop = trip.stops[i];
      const spot = stop ? stop.spotId : "?";
      if (s.driveMinutes != null) {
        lines.push(`Leave by ${fmt(s.leaveAt)} (drive ~${Math.round(s.driveMinutes)} min)`);
      }
      lines.push(`${i + 1}. ${spot} — ${s.windowLabel} ${fmt(s.shootStart)}–${fmt(s.shootEnd)}`);
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n"));
  };

  const clearTrip = () => {
    if (!confirm("Clear all stops for this date?")) return;
    if (typeof window !== "undefined") localStorage.removeItem(`${STORAGE_KEY}:${trip.date}`);
    location.reload();
  };

  return (
    <div className="glass rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--neutral-200)]">
          Day Summary
        </h3>
        <div className="flex gap-1">
          <button
            onClick={copyItinerary}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--neutral-300)] hover:text-[var(--neutral-200)] hover:bg-white/5 cursor-pointer"
            title="Copy itinerary"
          >
            <Copy size={12} /> Copy
          </button>
          <button
            onClick={clearTrip}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--neutral-300)] hover:text-red-400 hover:bg-white/5 cursor-pointer"
            title="Clear trip"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Stat label="First leave" value={fmt(firstLeave ?? null)} />
        <Stat label="Last shoot ends" value={fmt(lastEnd ?? null)} />
        <Stat
          label="Total drive"
          value={`${Math.round(totalDriveMin)} min`}
        />
        <Stat
          label="Total shooting"
          value={`${Math.floor(totalShootMin / 60)}h ${totalShootMin % 60}m`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--neutral-300)] mb-1">
        {label}
      </div>
      <div className="text-sm sm:text-base text-[var(--white)] font-semibold">{value}</div>
    </div>
  );
}
