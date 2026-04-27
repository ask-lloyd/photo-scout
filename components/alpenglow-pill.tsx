"use client";

import { useEffect, useState } from "react";
import {
  nextAlpenglowWindow,
  formatTime,
  type AlpenglowWindow,
} from "@/lib/alpenglow";

interface Props {
  lat: number;
  lng: number;
  /** Compact single-line variant for inline use in bottom card */
  compact?: boolean;
}

export function AlpenglowPill({ lat, lng, compact = false }: Props) {
  const [win, setWin] = useState<AlpenglowWindow | null>(null);

  useEffect(() => {
    setWin(nextAlpenglowWindow(new Date(), lat, lng));
    const t = setInterval(() => {
      setWin(nextAlpenglowWindow(new Date(), lat, lng));
    }, 60_000);
    return () => clearInterval(t);
  }, [lat, lng]);

  if (compact) {
    if (!win) {
      return (
        <div className="text-[11px] text-[var(--neutral-400)] truncate">
          No alpenglow today
        </div>
      );
    }
    const intensity = 1 - win.peakAltitudeDeg / 8;
    return (
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-orange-300">
          {win.type === "sunrise" ? "Sunrise glow" : "Sunset glow"}
        </div>
        <div
          className="text-[12px] font-medium text-orange-100 truncate"
          style={{ opacity: 0.7 + 0.3 * intensity }}
        >
          {formatTime(win.start)}–{formatTime(win.end)}
          <span className="text-[var(--neutral-400)] ml-1">
            ★ {formatTime(win.peak)}
          </span>
        </div>
      </div>
    );
  }

  if (!win) {
    return (
      <div className="mt-3 rounded-lg px-3 py-2 bg-neutral-800/60 border border-neutral-700/50">
        <div className="text-[11px] uppercase tracking-wider text-[var(--neutral-300)]">
          Alpenglow
        </div>
        <div className="text-sm text-[var(--neutral-200)] mt-0.5">
          No window remaining today
        </div>
      </div>
    );
  }

  const label = win.type === "sunrise" ? "Sunrise alpenglow" : "Sunset alpenglow";
  const intensity = 1 - win.peakAltitudeDeg / 8;
  const bg = `linear-gradient(135deg, rgba(255,${Math.round(
    140 + (1 - intensity) * 60
  )},${Math.round(70 + (1 - intensity) * 40)},0.25), rgba(255,${Math.round(
    100 + (1 - intensity) * 60
  )},60,0.18))`;

  return (
    <div
      className="mt-3 rounded-lg px-3 py-2 border border-orange-500/30"
      style={{ background: bg }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-orange-300">
          {label}
        </div>
        <div className="text-[11px] text-orange-200/80">
          peak {formatTime(win.peak)}
        </div>
      </div>
      <div className="text-sm text-[var(--neutral-100)] mt-0.5 font-medium">
        {formatTime(win.start)} – {formatTime(win.end)}
      </div>
      <div className="text-[11px] text-[var(--neutral-300)] mt-0.5">
        sun at {win.peakAltitudeDeg.toFixed(1)}° at peak
      </div>
    </div>
  );
}
