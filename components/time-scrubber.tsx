"use client";

import { useMemo } from "react";
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

  const quickSets: Array<{ label: string; minutes: number | null; tone: "warm" | "blue" | "neutral" }> = [
    {
      label: "Blue AM",
      minutes: events.dawnMin,
      tone: "blue",
    },
    {
      label: "Sunrise",
      minutes: events.sunriseMin,
      tone: "warm",
    },
    {
      label: "Golden AM",
      minutes:
        events.sunriseMin != null && events.goldenEndMin != null
          ? Math.round((events.sunriseMin + events.goldenEndMin) / 2)
          : null,
      tone: "warm",
    },
    {
      label: "Noon",
      minutes: 12 * 60,
      tone: "neutral",
    },
    {
      label: "Golden PM",
      minutes:
        events.goldenStartMin != null && events.sunsetMin != null
          ? Math.round((events.goldenStartMin + events.sunsetMin) / 2)
          : null,
      tone: "warm",
    },
    {
      label: "Sunset",
      minutes: events.sunsetMin,
      tone: "warm",
    },
    {
      label: "Blue PM",
      minutes: events.duskMin,
      tone: "blue",
    },
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
        <div className="text-sm text-[var(--neutral-100)] font-mono tabular-nums">
          {minutesToTimeStr(timeMinutes)}
        </div>
      </div>

      {/* Slider with markers */}
      <div className="relative pt-3 pb-1">
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
          onChange={(e) => setTimeMinutes(Number(e.target.value))}
          className="w-full accent-[#f97316] h-1.5 bg-neutral-700 rounded-full appearance-none cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--neutral-400)] mt-0.5">
        <span>12 AM</span>
        <span>12 PM</span>
        <span>11:59 PM</span>
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
              onClick={() => qs.minutes != null && setTimeMinutes(qs.minutes)}
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
