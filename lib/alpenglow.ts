// Per-spot alpenglow window calculator.
// Today's golden/alpenglow window = continuous span where sun altitude is in [0°, 8°]
// (warm low-sun light), bounded around sunrise/sunset.
//
// v1 is sun-altitude only — does not account for terrain occlusion. A peak in a
// deep valley may technically be "alpenglow time" but actually be in shadow. The
// terrain-aware DEM check is a future refinement.
import SunCalc from "suncalc";

export interface AlpenglowWindow {
  /** Date object marking the start of the lit-warm window */
  start: Date;
  /** Date object marking when sun is closest to horizon (most saturated color) */
  peak: Date;
  /** Date object marking the end of the warm window */
  end: Date;
  /** "sunrise" or "sunset" */
  type: "sunrise" | "sunset";
  /** Sun altitude (degrees) at peak — lower = redder */
  peakAltitudeDeg: number;
}

const ALPENGLOW_MAX_ALT_DEG = 8;
const ALPENGLOW_MIN_ALT_DEG = 0;

/**
 * Returns the next alpenglow window (sunset by default, or sunrise if it's earlier today)
 * relative to `now` for a given location.
 *
 * Returns null if no window remains today.
 */
export function nextAlpenglowWindow(
  now: Date,
  lat: number,
  lng: number
): AlpenglowWindow | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const sunrise = scanWindow(today, lat, lng, "sunrise");
  const sunset = scanWindow(today, lat, lng, "sunset");

  // Filter to upcoming
  const candidates = [sunrise, sunset].filter(
    (w): w is AlpenglowWindow => w !== null && w.end.getTime() >= now.getTime()
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.start.getTime() - b.start.getTime());
  return candidates[0];
}

function scanWindow(
  dayStart: Date,
  lat: number,
  lng: number,
  type: "sunrise" | "sunset"
): AlpenglowWindow | null {
  // Use SunCalc to find anchor (sunrise/sunset), then sweep ±60 min @ 1-min resolution.
  const times = SunCalc.getTimes(dayStart, lat, lng);
  const anchor = type === "sunrise" ? times.sunrise : times.sunset;
  if (!anchor || isNaN(anchor.getTime())) return null;

  let start: Date | null = null;
  let end: Date | null = null;
  let peak: Date | null = null;
  let peakAlt = 999;

  for (let dm = -60; dm <= 60; dm++) {
    const t = new Date(anchor.getTime() + dm * 60_000);
    const altDeg =
      (SunCalc.getPosition(t, lat, lng).altitude * 180) / Math.PI;
    const inWindow =
      altDeg >= ALPENGLOW_MIN_ALT_DEG && altDeg <= ALPENGLOW_MAX_ALT_DEG;
    if (inWindow) {
      if (!start) start = t;
      end = t;
      // Peak = closest to horizon (smallest |altitude|)
      const dist = Math.abs(altDeg);
      if (dist < peakAlt) {
        peakAlt = dist;
        peak = t;
      }
    }
  }

  if (!start || !end || !peak) return null;
  return { start, peak, end, type, peakAltitudeDeg: peakAlt };
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatWindowDuration(w: AlpenglowWindow): string {
  const mins = Math.round((w.end.getTime() - w.start.getTime()) / 60_000);
  return `${mins} min`;
}
