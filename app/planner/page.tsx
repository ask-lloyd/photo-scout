"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { MapPin, Star, Sunset, Waves, Moon } from "lucide-react";
import { useGearProfile } from "@/lib/hooks";
import type { Spot } from "@/lib/types";
import SunCalc from "suncalc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function fmt(date: Date) {
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
      <div className="text-[10px] uppercase tracking-wider text-[var(--neutral-300)] mb-0.5">
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: "var(--white)" }}>{value}</div>
    </div>
  );
}

export default function PlannerPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState("bob-wentz-park");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const { gear, loaded: gearLoaded } = useGearProfile();

  // Fetch spots
  useEffect(() => {
    fetch("/data/spots/index.json")
      .then((r) => r.json())
      .then((data: Spot[]) => setSpots(data))
      .catch(() => setSpots([]));
  }, []);

  const spot = spots.find((s) => s.id === selectedSpotId) ?? null;

  // Compute sun times
  const sunTimes = useMemo(() => {
    if (!spot) return null;
    const date = new Date(selectedDate + "T12:00:00");
    const times = SunCalc.getTimes(date, spot.latitude, spot.longitude);
    return times;
  }, [spot, selectedDate]);

  // Derive timeline times
  const timeline = useMemo(() => {
    if (!sunTimes) return null;

    const goldenStart = sunTimes.goldenHour;
    const sunset = sunTimes.sunset;
    const blueHourEnd = sunTimes.night;

    // Arrive 30 min before golden hour
    const arrive = new Date(goldenStart.getTime() - 30 * 60 * 1000);
    // Blue hour starts at sunset
    const blueHourStart = sunset;
    // Wrap = end of blue hour
    const wrap = blueHourEnd;

    return { arrive, goldenStart, sunset, blueHourStart, blueHourEnd, wrap };
  }, [sunTimes]);

  const cameraName = gear.camera
    ? `${gear.camera.make} ${gear.camera.model}`
    : "No camera set";
  const lensNames = gear.lenses.map((l) => `${l.make} ${l.model}`);

  return (
    <>
      <NavHeader />
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
            <h1 className="text-xl font-bold text-[var(--white)]">Shot Plan</h1>
          </div>

          {/* Spot / Date Selector */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Select value={selectedSpotId} onValueChange={(val: string | null) => { if (val) setSelectedSpotId(val); }}>
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

          {spot && timeline && (
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
                  <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
                    Light Score 92
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs">
                    15% Cloud
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs">
                    Wind 8 mph
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs">
                    72&deg;F
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
                <span className="text-xs uppercase tracking-wider text-[var(--neutral-300)] font-semibold">
                  Your Gear
                </span>
                <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs">
                  {cameraName}
                </span>
                {lensNames.length > 0 ? (
                  lensNames.map((name) => (
                    <span
                      key={name}
                      className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="px-3 py-1 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs">
                    No lenses set
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    gear.hasTripod
                      ? "bg-green-500/20 text-green-400"
                      : "bg-[#262626] text-[var(--neutral-300)]"
                  }`}
                >
                  Tripod {gear.hasTripod ? "Ready" : "N/A"}
                </span>
                <Link
                  href="/gear"
                  className="text-orange-500 text-xs hover:text-orange-400 transition-colors ml-auto cursor-pointer"
                >
                  Change Gear
                </Link>
              </div>

              {/* Vertical Timeline */}
              <div className="space-y-0">
                {/* 1. Arrive & Scout */}
                <div className="flex gap-5 md:gap-5">
                  <div className="hidden md:flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">
                      <MapPin className="w-5 h-5" style={{ color: "var(--neutral-300)" }} strokeWidth={1.5} />
                    </div>
                    <div className="w-0.5 flex-1 bg-[#262626]/30 my-2"></div>
                  </div>
                  <div className="glass rounded-xl p-5 flex-1 mb-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[var(--white)] font-semibold">
                        {fmt(timeline.arrive)} — Arrive &amp; Scout
                      </span>
                    </div>
                    <p className="text-[var(--neutral-300)] text-xs mb-3">
                      30 min before golden hour
                    </p>
                    <p className="text-[var(--neutral-200)] text-sm mb-4">
                      Walk the shoreline and identify your best compositions.
                      Check wind direction for kitesurfer positions. Scout
                      foreground rocks and leading lines toward the west. Set up
                      your tripod in a sheltered spot if wind is strong.
                    </p>
                    <div className="glass rounded-lg p-3">
                      <p className="text-xs text-[var(--neutral-300)] uppercase tracking-wider mb-2">
                        Pre-shoot Settings
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        <SettingPill label="Aperture" value="f/11" />
                        <SettingPill label="Shutter" value="1/125" />
                        <SettingPill label="ISO" value="100" />
                        <SettingPill label="WB" value="5200K" />
                        <SettingPill label="Focal" value="24-35mm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Golden Hour */}
                <div className="flex gap-5 md:gap-5">
                  <div className="hidden md:flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="w-0.5 flex-1 bg-orange-500/30 my-2"></div>
                  </div>
                  <div className="glass rounded-xl p-5 flex-1 mb-4 border border-orange-500/20 glow">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="text-[var(--white)] font-semibold">
                        {fmt(timeline.goldenStart)} — GOLDEN HOUR
                      </span>
                      <span className="text-orange-400 text-sm flex gap-0.5">
                        {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 fill-current" strokeWidth={1.5} />)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] uppercase tracking-wider font-semibold">
                        Peak Light
                      </span>
                    </div>
                    <p className="text-[var(--neutral-200)] text-xs mb-3">
                      Color temp 3500-5500K &middot; EV 8-12 &middot; Warm
                      directional light with long shadows
                    </p>
                    <p className="text-[var(--neutral-200)] text-sm mb-4">
                      The magic window. Warm, directional light will rake across
                      the lake surface and illuminate kitesurfers from behind.
                      Limestone rocks glow golden. Start with wide compositions,
                      then switch to telephoto for action shots as the light
                      intensifies.
                    </p>

                    {/* Two settings cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {/* Landscape */}
                      <div className="glass rounded-lg p-4">
                        <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">
                          Landscape (24-70mm)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <SettingPill label="Aperture" value="f/8" />
                          <SettingPill label="Shutter" value="1/125" />
                          <SettingPill label="ISO" value="200" />
                          <SettingPill label="WB" value="5500K" />
                          <SettingPill label="Focus" value="Hyperfocal 8.2ft" />
                          <SettingPill label="Filter" value="GND 2-stop soft" />
                        </div>
                        <p className="text-[var(--neutral-300)] text-xs mt-2">
                          Tip: Use GND filter to balance bright sky with darker
                          foreground rocks.
                        </p>
                      </div>

                      {/* Action */}
                      <div className="glass rounded-lg p-4">
                        <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
                          Action (70-200mm)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <SettingPill label="Aperture" value="f/4" />
                          <SettingPill label="Shutter" value="1/1000" />
                          <SettingPill label="ISO" value="400" />
                          <SettingPill label="WB" value="5500K" />
                          <SettingPill label="Focus" value="AF-C, tracking" />
                          <SettingPill
                            label="Drive"
                            value="Hi+ burst (10fps)"
                          />
                        </div>
                        <p className="text-[var(--neutral-300)] text-xs mt-2">
                          Tip: Track kitesurfers with continuous AF; burst mode
                          catches peak action.
                        </p>
                      </div>
                    </div>

                    {/* Pro tip */}
                    <div className="glass rounded-lg p-3 border border-orange-500/10">
                      <p className="text-xs text-orange-400 font-semibold mb-1">
                        PRO TIP
                      </p>
                      <p className="text-[var(--neutral-200)] text-xs">
                        Shoot both landscape and action during golden hour — the
                        light changes fast. Start wide, then swap to telephoto
                        as the sun drops lower and backlighting intensifies.
                        Watch for lens flare when shooting into the light; use
                        your hand or a lens hood.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Sunset */}
                <div className="flex gap-5 md:gap-5">
                  <div className="hidden md:flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                      <Sunset className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="w-0.5 flex-1 bg-amber-500/30 my-2"></div>
                  </div>
                  <div className="glass rounded-xl p-5 flex-1 mb-4 border border-amber-500/10">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[var(--white)] font-semibold">
                        {fmt(timeline.sunset)} — Sunset
                      </span>
                    </div>
                    <p className="text-[var(--neutral-200)] text-xs mb-3">
                      Sun direction: {spot.facing_direction}&deg;W &middot;
                      Color temp 3200-4800K
                    </p>
                    <p className="text-[var(--neutral-200)] text-sm mb-4">
                      The sun touches the horizon. Silhouettes become the
                      dominant composition. Switch to a wide angle to capture
                      the full sky, or stay telephoto for compressed sun-on-horizon
                      shots. Colors shift rapidly from gold to deep orange and
                      magenta.
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      <SettingPill label="Aperture" value="f/11" />
                      <SettingPill label="Shutter" value="1/60" />
                      <SettingPill label="ISO" value="200" />
                      <SettingPill label="WB" value="4800K" />
                      <SettingPill label="Tip" value="f/16 for sun star" />
                    </div>
                  </div>
                </div>

                {/* 4. Blue Hour */}
                <div className="flex gap-5 md:gap-5">
                  <div className="hidden md:flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <Waves className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="w-0.5 flex-1 bg-blue-500/30 my-2"></div>
                  </div>
                  <div className="glass rounded-xl p-5 flex-1 mb-4 border border-blue-500/10">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="text-[var(--white)] font-semibold">
                        {fmt(timeline.blueHourStart)} &ndash;{" "}
                        {fmt(timeline.blueHourEnd)} — Blue Hour
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] uppercase tracking-wider font-semibold">
                        Tripod Required
                      </span>
                    </div>
                    <p className="text-[var(--neutral-200)] text-xs mb-3">
                      Sun angle -4&deg; to -6&deg; &middot; Color temp
                      7000-9000K &middot; EV 2-6
                    </p>
                    <p className="text-[var(--neutral-200)] text-sm mb-4">
                      The sky turns deep blue with residual warmth on the
                      horizon. Long exposures smooth the lake surface into glass.
                      This is the time for silky water shots and moody
                      landscapes. Use a remote shutter or timer to avoid shake.
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      <SettingPill label="Aperture" value="f/8" />
                      <SettingPill label="Shutter" value="2-8 sec" />
                      <SettingPill label="ISO" value="100" />
                      <SettingPill label="WB" value="7500K" />
                      <SettingPill label="Filter" value="ND 3-stop" />
                    </div>
                  </div>
                </div>

                {/* 5. Wrap */}
                <div className="flex gap-5 md:gap-5">
                  <div className="hidden md:flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">
                      <Moon className="w-5 h-5" style={{ color: "var(--neutral-300)" }} strokeWidth={1.5} />
                    </div>
                    {/* No connecting line after last entry */}
                  </div>
                  <div className="glass rounded-xl p-5 flex-1 mb-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[var(--white)] font-semibold">
                        {fmt(timeline.wrap)} — Wrap
                      </span>
                    </div>
                    <p className="text-[var(--neutral-200)] text-sm">
                      Pack up gear carefully in the dark — use a headlamp with a
                      red filter to preserve night vision. Check your shots on
                      the back of the camera. The waxing crescent moon may still
                      be visible low in the west for a final composition if
                      conditions allow.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Loading state */}
          {spots.length === 0 && (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-[var(--neutral-200)]">Loading spots...</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
