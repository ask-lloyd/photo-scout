"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SunCalc from "suncalc";

interface Props {
  timeMinutes: number;
  setTimeMinutes: (m: number) => void;
  lat: number;
  lng: number;
  /** ISO date string for "today" — defaults to local today */
  date?: Date;
}

function fmt(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dateToMinutes(d: Date | null | undefined): number | null {
  if (!d || isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

// minutes-of-day advanced per real-time tick
const SPEEDS = [1, 4, 12, 60] as const;
type Speed = (typeof SPEEDS)[number];
// Tick interval is fixed; we step by (speed) minutes per tick.
// Real-time mapping: 5 ticks/sec → 1×=5min/sec, 4×=20min/sec, 12×=1hr/sec, 60×=5hr/sec.
const TICK_MS = 200;

export function TimeScrubber({
  timeMinutes,
  setTimeMinutes,
  lat,
  lng,
  date,
}: Props) {
  const today = useMemo(() => {
    const t = date ? new Date(date) : new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, [date]);

  const sunTimes = useMemo(() => SunCalc.getTimes(today, lat, lng), [today, lat, lng]);

  const events = useMemo(() => {
    const sunriseMin = dateToMinutes(sunTimes.sunrise);
    const sunsetMin = dateToMinutes(sunTimes.sunset);
    const dawnMin = dateToMinutes(sunTimes.dawn); // civil dawn
    const duskMin = dateToMinutes(sunTimes.dusk); // civil dusk
    const goldenEndMin = dateToMinutes(sunTimes.goldenHourEnd); // morning golden ends
    const goldenStartMin = dateToMinutes(sunTimes.goldenHour); // evening golden starts
    return { sunriseMin, sunsetMin, dawnMin, duskMin, goldenEndMin, goldenStartMin };
  }, [sunTimes]);

  // ── Playback state ────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(4);
  // Optional bounded sweep: when set, playback loops within [start, end]
  const [sweepRange, setSweepRange] = useState<{ start: number; end: number; label: string } | null>(null);

  // Use refs so the interval reads the latest values without resetting
  const speedRef = useRef(speed);
  const sweepRef = useRef(sweepRange);
  const minutesRef = useRef(timeMinutes);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { sweepRef.current = sweepRange; }, [sweepRange]);
  useEffect(() => { minutesRef.current = timeMinutes; }, [timeMinutes]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const cur = minutesRef.current;
      const inc = speedRef.current;
      const sweep = sweepRef.current;
      let next = cur + inc;
      if (sweep) {
        if (next >= sweep.end) next = sweep.start; // loop within window
      } else {
        if (next >= 1440) next = 0; // wrap full day
      }
      setTimeMinutes(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isPlaying, setTimeMinutes]);

  // ── Sweep golden window ───────────────────────────────────────
  // Picks the "next upcoming" golden hour from current time; falls back to AM
  function startGoldenSweep() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    // AM golden window: [sunrise - 30, goldenHourEnd + 15]
    const amStart =
      events.sunriseMin != null ? Math.max(0, events.sunriseMin - 30) : null;
    const amEnd =
      events.goldenEndMin != null
        ? Math.min(1440, events.goldenEndMin + 15)
        : null;

    // PM golden window: [goldenHour - 15, sunset + 30]
    const pmStart =
      events.goldenStartMin != null
        ? Math.max(0, events.goldenStartMin - 15)
        : null;
    const pmEnd =
      events.sunsetMin != null ? Math.min(1440, events.sunsetMin + 30) : null;

    let pick: { start: number; end: number; label: string } | null = null;
    // Prefer the next upcoming window
    if (amStart != null && amEnd != null && nowMin <= amEnd) {
      pick = { start: amStart, end: amEnd, label: "Sweep AM" };
    } else if (pmStart != null && pmEnd != null && nowMin <= pmEnd) {
      pick = { start: pmStart, end: pmEnd, label: "Sweep PM" };
    } else if (amStart != null && amEnd != null) {
      pick = { start: amStart, end: amEnd, label: "Sweep AM" };
    } else if (pmStart != null && pmEnd != null) {
      pick = { start: pmStart, end: pmEnd, label: "Sweep PM" };
    }
    if (!pick) return;
    setSweepRange(pick);
    setSpeed(4); // 4× = ~12 sec to traverse a typical 60-min window
    setTimeMinutes(pick.start);
    setIsPlaying(true);
  }

  function stopSweep() {
    setSweepRange(null);
    setIsPlaying(false);
  }

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  }

  const quickSets: Array<{ label: string; minutes: number | null; tone: "warm" | "blue" | "neutral" }> = [
    { label: "Blue AM", minutes: events.dawnMin, tone: "blue" },
    { label: "Sunrise", minutes: events.sunriseMin, tone: "warm" },
    {
      label: "Golden AM",
      minutes:
        events.sunriseMin != null && events.goldenEndMin != null
          ? Math.round((events.sunriseMin + events.goldenEndMin) / 2)
          : null,
      tone: "warm",
    },
    { label: "Noon", minutes: 12 * 60, tone: "neutral" },
    {
      label: "Golden PM",
      minutes:
        events.goldenStartMin != null && events.sunsetMin != null
          ? Math.round((events.goldenStartMin + events.sunsetMin) / 2)
          : null,
      tone: "warm",
    },
    { label: "Sunset", minutes: events.sunsetMin, tone: "warm" },
    { label: "Blue PM", minutes: events.duskMin, tone: "blue" },
    {
      label: "Now",
      minutes: (() => {
        const n = new Date();
        return n.getHours() * 60 + n.getMinutes();
      })(),
      tone: "neutral",
    },
  ];

  // marker positions on the slider track (% from left)
  const pct = (m: number | null) =>
    m == null ? null : Math.max(0, Math.min(100, (m / 1440) * 100));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold tracking-widest text-[var(--neutral-300)]">
          TIME
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-[#f97316] hover:bg-[#ea580c] text-white text-[10px] cursor-pointer transition-colors"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause time" : "Play time"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button
            onClick={cycleSpeed}
            className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--neutral-300)]/40 text-[var(--neutral-100)] hover:bg-white/5 cursor-pointer font-mono tabular-nums min-w-[34px]"
            title="Playback speed"
          >
            {speed}×
          </button>
          <div className="text-sm text-[var(--neutral-100)] font-mono tabular-nums ml-1 min-w-[64px] text-right">
            {minutesToTimeStr(timeMinutes)}
          </div>
        </div>
      </div>

      {/* Slider with markers */}
      <div className="relative pt-3 pb-1">
        {/* Golden window highlight band (when sweeping) */}
        {sweepRange && (
          <div
            className="absolute top-3 h-1.5 bg-orange-400/30 rounded-full pointer-events-none"
            style={{
              left: `${pct(sweepRange.start)}%`,
              width: `${pct(sweepRange.end)! - pct(sweepRange.start)!}%`,
            }}
          />
        )}
        {/* Sun event markers above the track */}
        {events.sunriseMin != null && (
          <div
            className="absolute top-0 -translate-x-1/2 text-[9px] text-amber-300 select-none pointer-events-none"
            style={{ left: `${pct(events.sunriseMin)}%` }}
            title={`Sunrise ${fmt(sunTimes.sunrise)}`}
          >
            ▲
          </div>
        )}
        {events.sunsetMin != null && (
          <div
            className="absolute top-0 -translate-x-1/2 text-[9px] text-orange-400 select-none pointer-events-none"
            style={{ left: `${pct(events.sunsetMin)}%` }}
            title={`Sunset ${fmt(sunTimes.sunset)}`}
          >
            ▼
          </div>
        )}
        <input
          type="range"
          min={0}
          max={1440}
          value={timeMinutes}
          onChange={(e) => {
            // manual scrub cancels a bounded sweep so the user can roam freely
            if (sweepRange) setSweepRange(null);
            setTimeMinutes(Number(e.target.value));
          }}
          className="w-full accent-[#f97316] h-1.5 bg-neutral-700 rounded-full appearance-none cursor-pointer relative"
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--neutral-400)] mt-0.5">
        <span>12 AM</span>
        <span>12 PM</span>
        <span>11:59 PM</span>
      </div>

      {/* Sweep golden window action */}
      <div className="mt-2">
        {sweepRange ? (
          <button
            onClick={stopSweep}
            className="w-full text-[11px] py-1.5 rounded-md bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/40 cursor-pointer transition-colors"
            title={`Sweeping ${minutesToTimeStr(sweepRange.start)} – ${minutesToTimeStr(sweepRange.end)}`}
          >
            ⏹ Stop sweep ({sweepRange.label})
          </button>
        ) : (
          <button
            onClick={startGoldenSweep}
            className="w-full text-[11px] py-1.5 rounded-md bg-orange-500/15 hover:bg-orange-500/25 text-orange-200 border border-orange-500/40 cursor-pointer transition-colors"
            title="Auto-play through the next golden hour window"
          >
            ✨ Sweep golden window
          </button>
        )}
      </div>

      {/* Quick-set buttons */}
      <div className="grid grid-cols-4 gap-1 mt-2.5">
        {quickSets.map((qs) => {
          const disabled = qs.minutes == null;
          const active = !disabled && Math.abs(timeMinutes - qs.minutes!) < 3;
          const toneClass =
            qs.tone === "warm"
              ? "border-orange-500/40 text-orange-200 hover:bg-orange-500/15"
              : qs.tone === "blue"
                ? "border-blue-500/40 text-blue-200 hover:bg-blue-500/15"
                : "border-neutral-600 text-[var(--neutral-200)] hover:bg-neutral-700/50";
          return (
            <button
              key={qs.label}
              disabled={disabled}
              onClick={() => {
                if (qs.minutes != null) {
                  if (sweepRange) setSweepRange(null);
                  setTimeMinutes(qs.minutes);
                }
              }}
              className={`text-[11px] py-1 px-1 rounded border transition-colors cursor-pointer ${toneClass} ${
                active ? "bg-[#f97316] text-white border-[#f97316]" : "bg-transparent"
              } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              title={
                qs.minutes != null
                  ? minutesToTimeStr(qs.minutes)
                  : "Not available today"
              }
            >
              {qs.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function minutesToTimeStr(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${min.toString().padStart(2, "0")} ${period}`;
}
