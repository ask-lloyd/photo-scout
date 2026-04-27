import type {
  AppliedFilter,
  Camera,
  Filter,
  Lens,
  LightConditions,
  SettingsRecommendation,
} from "@/lib/types";

// ─── Constants ───

/** Circle of confusion by sensor size (mm) */
const CIRCLE_OF_CONFUSION: Record<Camera["sensor_size"], number> = {
  full_frame: 0.03,
  apsc: 0.02,
  micro43: 0.015,
};

/** Crop factor by sensor size */
const CROP_FACTOR: Record<Camera["sensor_size"], number> = {
  full_frame: 1.0,
  apsc: 1.5,
  micro43: 2.0,
};

// ─── Standard aperture / shutter / ISO stops ───

const STANDARD_APERTURES = [
  1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22,
];

const STANDARD_ISOS = [
  50, 64, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250,
  1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000,
  20000, 25600, 32000, 51200, 102400,
];

const STANDARD_SHUTTER_SPEEDS = [
  // Denominator values for fast speeds, then actual seconds for slow speeds
  // Stored as seconds
  1 / 8000, 1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125,
  1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 0.5, 1, 2, 4, 8, 15, 30,
];

// ─── Helpers ───

function nearestAperture(target: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, target));
  return STANDARD_APERTURES.reduce((prev, curr) =>
    Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
  );
}

function nearestISO(target: number, baseISO: number, maxISO: number): number {
  const clamped = Math.max(baseISO, Math.min(maxISO, target));
  return STANDARD_ISOS.reduce((prev, curr) =>
    Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
  );
}

function nearestShutterSpeed(target: number): number {
  if (target <= 0) return STANDARD_SHUTTER_SPEEDS[0];
  return STANDARD_SHUTTER_SPEEDS.reduce((prev, curr) =>
    Math.abs(Math.log2(curr) - Math.log2(target)) <
    Math.abs(Math.log2(prev) - Math.log2(target))
      ? curr
      : prev
  );
}

function formatShutterSpeed(seconds: number): string {
  if (seconds >= 1) {
    if (Number.isInteger(seconds)) return `${seconds}s`;
    return `${seconds.toFixed(1)}s`;
  }
  const denominator = Math.round(1 / seconds);
  return `1/${denominator}`;
}

/**
 * Estimate EV (Exposure Value at ISO 100) from light conditions.
 * Maps sun altitude + cloud cover to an approximate EV.
 */
function estimateEV(light: LightConditions): number {
  const alt = light.sunAltitude;

  // Calibrated to match real camera meter readings on a Sony A7R V for
  // typical landscape scenes (textbook Sunny-16 reads ~1 stop hot for
  // most non-18%-gray subjects). Recalibrated 2026-04 after field test
  // at Funes/Villnoß flagged 1/8s as too bright at golden hour.
  if (alt >= 45) {
    return 14; // Bright sun / midday — f/8, 1/250, ISO 100
  }
  if (alt >= 15) {
    return 11.5 + ((alt - 15) / 30) * 2.5; // EV 11.5-14
  }
  if (alt >= 6) {
    return 11 + ((alt - 6) / 9) * 0.5; // EV 11-11.5 (overcast-equivalent)
  }
  if (alt >= 0) {
    return 10 + (alt / 6) * 1; // EV 10-11 — golden hour
  }
  if (alt >= -6) {
    return 5 + ((alt + 6) / 6) * 5; // EV 5-10 — sunset → civil twilight
  }
  if (alt >= -12) {
    return 1 + ((alt + 12) / 6) * 4; // EV 1-5 — nautical twilight
  }
  // Night / astro
  return -2 + ((Math.max(alt, -18) + 18) / 6) * 3; // EV -2 to 1
}

/**
 * Adjust EV based on the cloud component score.
 * Lower cloud score = more overcast = lower EV.
 */
function adjustEVForClouds(ev: number, cloudScore: number): number {
  // cloudScore ranges from 5 (thick overcast) to 25 (dramatic broken).
  // Map: 25 = no adjustment, 5 = up to -3 EV. Cap penalty at low light —
  // a sky already at EV 7 shouldn't lose another 3 stops to cloud cover
  // (real meters don't drop that fast at golden/blue hour).
  const maxPenalty = Math.min(3, Math.max(0, ev - 6));
  const adjustment = -((25 - cloudScore) / 20) * maxPenalty;
  return ev + adjustment;
}

// ─── Public API ───

/**
 * Standard CPL light loss in stops. Modern multi-coated CPLs are typically
 * 1.3-1.7 stops; we use 1.5 as a middle-ground.
 */
const CPL_LIGHT_LOSS_STOPS = 1.5;

/**
 * Decide whether a CPL would actually help in these conditions.
 * Driven by light character (haze) + sun geometry (CPL is most effective
 * 90° from the sun) + scene type. Skips when light is already too dim.
 */
function shouldUseCPL(
  light: LightConditions,
  ev: number,
  style: string
): { useful: boolean; reason: string } {
  // CPL eats 1.5 stops — never worth it below EV ~6 (already noise-limited).
  if (ev < 6) return { useful: false, reason: "" };

  // Astro/action: never worth the light loss or rotation hassle.
  if (style === "astro" || style === "action") {
    return { useful: false, reason: "" };
  }

  const character = light.character ?? [];
  if (character.includes("hazy")) {
    return { useful: true, reason: "cuts haze, deepens distant detail" };
  }
  if (light.lightPhase === "daylight" || light.lightPhase === "midday") {
    return { useful: true, reason: "deepens blue sky, cuts glare on water and foliage" };
  }
  if (style === "landscape" && ev >= 8) {
    return { useful: true, reason: "boosts saturation, cuts reflections" };
  }
  return { useful: false, reason: "" };
}

/**
 * Pick the user's best-fit filter for the given lens. Prefers exact thread
 * match; falls back to a smaller filter (assumes user has a step-up ring is
 * NOT made — only exact matches qualify as "owned and ready").
 */
function findOwnedFilter(
  ownedFilters: Filter[],
  lens: Lens | null,
  type: Filter["type"] | Filter["type"][]
): Filter | undefined {
  if (!lens) return undefined;
  const types = Array.isArray(type) ? type : [type];
  return ownedFilters.find(
    (f) => types.includes(f.type) && f.filter_size_mm === lens.filter_size_mm
  );
}

/**
 * Compute the variable-ND stops needed to land on a target shutter speed.
 * Returns null if the target is outside the filter's range.
 */
function variableNdStopsFor(
  filter: Filter,
  currentShutter: number,
  targetShutter: number
): number | null {
  if (filter.type !== "variable_nd") return null;
  const min = filter.nd_stops_min ?? 1;
  const max = filter.nd_stops_max ?? 9;
  // Stops needed = log2(target / current)
  const stops = Math.log2(targetShutter / currentShutter);
  if (stops <= 0) return null;
  if (stops < min) return min;
  if (stops > max) return max;
  return Math.round(stops * 2) / 2; // half-stop precision
}

export function recommendSettings(
  light: LightConditions,
  camera: Camera,
  lens: Lens,
  options: {
    hasTripod: boolean;
    style: "landscape" | "action" | "portrait" | "astro";
    /** Filters the user owns. When provided, suggestions reference owned gear
     *  by name, and CPL light loss is reflected in shutter/ISO when applied. */
    ownedFilters?: Filter[];
  }
): SettingsRecommendation {
  const { style, hasTripod } = options;
  const ownedFilters = options.ownedFilters ?? [];
  const cropFactor = CROP_FACTOR[camera.sensor_size];
  const coc = CIRCLE_OF_CONFUSION[camera.sensor_size];

  // Representative focal length for calculations
  const focalLength =
    style === "landscape"
      ? lens.focal_length_min
      : style === "portrait"
        ? lens.focal_length_max
        : style === "astro"
          ? lens.focal_length_min
          : // action: mid-range to long
            Math.round((lens.focal_length_min + lens.focal_length_max) / 2);

  // 1. Calculate EV
  let ev = estimateEV(light);
  ev = adjustEVForClouds(ev, light.components.cloud);

  // 1b. If the user owns a matching CPL and conditions favor it, factor its
  //     light loss into the EV used for the rest of the calculation. (For a
  //     suggested-but-not-owned CPL we leave EV alone — the user will meter
  //     without it on the lens.)
  let appliedFilter: AppliedFilter | undefined;
  const cplDecision = shouldUseCPL(light, ev, style);
  const ownedCpl = cplDecision.useful
    ? findOwnedFilter(ownedFilters, lens, "cpl")
    : undefined;
  if (cplDecision.useful && ownedCpl) {
    ev -= CPL_LIGHT_LOSS_STOPS;
    appliedFilter = {
      type: "cpl",
      lightLossStops: CPL_LIGHT_LOSS_STOPS,
      ownedModel: `${ownedCpl.make} ${ownedCpl.model}`,
      reason: cplDecision.reason,
    };
  }

  // 2. Choose aperture based on style
  let aperture: number;
  switch (style) {
    case "landscape":
      aperture = nearestAperture(9.5, lens.max_aperture, lens.min_aperture); // f/8-f/11
      break;
    case "action":
      aperture = lens.max_aperture; // widest for max light
      break;
    case "portrait":
      aperture = nearestAperture(
        Math.max(lens.max_aperture, 2.8),
        lens.max_aperture,
        lens.min_aperture
      );
      break;
    case "astro":
      aperture = lens.max_aperture; // widest possible
      break;
    default:
      aperture = nearestAperture(8, lens.max_aperture, lens.min_aperture);
  }

  // 3. Choose shutter speed based on style and tripod
  let shutterSeconds: number;
  const effectiveFocalLength = focalLength * cropFactor;

  // Total IS stops (camera IBIS + lens IS, max practical ~7 stops)
  const ibisStops = camera.has_ibis ? camera.ibis_stops : 0;
  const lensISStops = lens.has_is ? lens.is_stops : 0;
  const totalISStops = Math.min(ibisStops + lensISStops, 7);

  switch (style) {
    case "landscape": {
      // Always solve for the correct shutter at base ISO and the chosen aperture:
      //   EV = log2(N² / t)  =>  t = N² / 2^EV
      // (At ISO 100. If base_iso != 100, scale t by base_iso/100.)
      const correctShutter =
        ((aperture * aperture) / Math.pow(2, ev)) * (camera.base_iso / 100);

      if (hasTripod) {
        // Tripod: clamp only at the camera's max exposure (30s).
        shutterSeconds = Math.min(correctShutter, 30);
      } else {
        // Handheld: don't go slower than the IS-aware safe shutter.
        // Reciprocal rule (1 / effective focal length) with IS gain, then a
        // practical floor of 1/15s (subject motion / micro-tremor dominate
        // beyond that regardless of IS spec).
        const reciprocal = 1 / effectiveFocalLength;
        const isSafe = Math.min(reciprocal * Math.pow(2, totalISStops), 1 / 15);
        // If the scene is bright enough to need a faster shutter than isSafe,
        // honor it. If the scene needs a slower shutter, cap at isSafe.
        shutterSeconds = Math.min(correctShutter, isSafe);
      }
      break;
    }
    case "action":
      shutterSeconds = 1 / 1000; // fast freeze
      break;
    case "portrait":
      shutterSeconds = 1 / 200;
      break;
    case "astro":
      // 500 rule
      shutterSeconds = 500 / (focalLength * cropFactor);
      break;
    default:
      shutterSeconds = 1 / 250;
  }

  // 4. Calculate ISO based on exposure equation
  // EV = log2(N² / t) at ISO 100
  // So at our chosen aperture and shutter: EV_achieved = log2(aperture² / shutterSeconds)
  // ISO needed = 100 * 2^(EV_achieved - EV_scene)
  const evAchieved = Math.log2(
    (aperture * aperture) / shutterSeconds
  );
  let isoNeeded = 100 * Math.pow(2, evAchieved - ev);

  // For tripod landscape, allow longer shutter instead of raising ISO
  if (style === "landscape" && hasTripod && isoNeeded > camera.base_iso) {
    // Recalculate: use base ISO, solve for shutter speed
    // EV = log2(N² / t) => t = N² / 2^EV * (ISO/100)
    const targetShutter =
      (aperture * aperture) / Math.pow(2, ev) * (camera.base_iso / 100);
    shutterSeconds = Math.min(nearestShutterSpeed(targetShutter), 30);
    isoNeeded = camera.base_iso;

    // Re-check: if shutter is maxed at 30s, may still need higher ISO
    const evWith30s = Math.log2((aperture * aperture) / shutterSeconds);
    const isoCheck = 100 * Math.pow(2, evWith30s - ev);
    if (isoCheck > camera.base_iso) {
      isoNeeded = isoCheck;
    }
  }

  // For astro, allow longer shutter already set by 500 rule, just find ISO
  if (style === "astro") {
    const evAstro = Math.log2((aperture * aperture) / shutterSeconds);
    isoNeeded = 100 * Math.pow(2, evAstro - ev);
  }

  const iso = nearestISO(isoNeeded, camera.base_iso, camera.max_usable_iso);
  shutterSeconds = nearestShutterSpeed(shutterSeconds);

  // 5. Hyperfocal distance (landscape only)
  let hyperfocalDistance: number | null = null;
  if (style === "landscape") {
    // H = f² / (N * c) + f  (in mm, then convert to meters)
    const hMm =
      (focalLength * focalLength) / (aperture * coc) + focalLength;
    hyperfocalDistance = Math.round((hMm / 1000) * 100) / 100; // meters, 2 decimals
  }

  // 6. Filter recommendations — prefer owned filters, otherwise suggest by spec
  const filterRecommendation: string[] = [];

  function describeOwned(f: Filter): string {
    return `✓ Use your ${f.make} ${f.model}`;
  }
  function describeSuggested(spec: string): string {
    return `Suggested: ${spec}`;
  }

  // CPL — already decided above; surface it as a recommendation string
  if (cplDecision.useful) {
    const owned = findOwnedFilter(ownedFilters, lens, "cpl");
    filterRecommendation.push(
      owned
        ? `${describeOwned(owned)} (CPL) — ${cplDecision.reason}`
        : `${describeSuggested(`${lens.filter_size_mm}mm CPL`)} — ${cplDecision.reason}`
    );
  }

  if (style === "landscape") {
    // GND for golden/blue hour
    if (
      light.lightPhase === "golden hour" ||
      light.lightPhase === "blue hour"
    ) {
      const owned = findOwnedFilter(ownedFilters, lens, "gnd");
      filterRecommendation.push(
        owned
          ? `${describeOwned(owned)} (GND) — balance bright sky with foreground`
          : `${describeSuggested(`${lens.filter_size_mm}mm 2-stop GND`)} — balance bright sky with foreground`
      );
    }

    // ND / Variable ND for long exposure when on a tripod and scene is bright
    if (hasTripod && ev > 8) {
      const ownedFixed = findOwnedFilter(ownedFilters, lens, "nd");
      const ownedVariable = findOwnedFilter(ownedFilters, lens, "variable_nd");

      // Target a 1-4s exposure for silky water / streaky clouds
      const targetShutter = 2; // seconds — sweet spot for most LE landscape

      if (ownedVariable) {
        const stops = variableNdStopsFor(ownedVariable, shutterSeconds, targetShutter);
        if (stops !== null) {
          filterRecommendation.push(
            `${describeOwned(ownedVariable)} (Variable ND) — dial to ~${stops} stops for ${formatShutterSpeed(targetShutter)} long exposure`
          );
        } else {
          filterRecommendation.push(
            `${describeOwned(ownedVariable)} (Variable ND) — for smooth water/clouds`
          );
        }
      } else if (ownedFixed) {
        filterRecommendation.push(
          `${describeOwned(ownedFixed)} (${ownedFixed.nd_stops ?? "?"}-stop ND) — for long exposure`
        );
      } else {
        filterRecommendation.push(
          `${describeSuggested(`${lens.filter_size_mm}mm 6-10 stop ND`)} — enables long exposure for smooth water/clouds`
        );
      }
    }
  }

  // 7. White balance from color temperature
  const whiteBalance = Math.round(
    (light.colorTemperature.min + light.colorTemperature.max) / 2
  );

  // 8. Focal length suggestion
  let focalLengthSuggestion: string;
  switch (style) {
    case "landscape":
      focalLengthSuggestion = `${lens.focal_length_min}-${Math.min(lens.focal_length_max, 35)}mm for wide landscapes`;
      break;
    case "portrait":
      focalLengthSuggestion = `${Math.max(lens.focal_length_min, 50)}-${lens.focal_length_max}mm for flattering compression`;
      break;
    case "action":
      focalLengthSuggestion = `${Math.max(lens.focal_length_min, 70)}-${lens.focal_length_max}mm for reach`;
      break;
    case "astro":
      focalLengthSuggestion = `${lens.focal_length_min}mm wide — maximize sky coverage`;
      break;
    default:
      focalLengthSuggestion = `${lens.focal_length_min}-${lens.focal_length_max}mm`;
  }

  // 9. Tips
  const tips: string[] = [];

  if (style === "landscape" && hasTripod) {
    tips.push(
      "Use a remote shutter or 2-second timer to avoid camera shake"
    );
    if (hyperfocalDistance !== null) {
      tips.push(
        `Focus at hyperfocal distance (~${hyperfocalDistance}m) for maximum depth of field`
      );
    }
  }

  if (style === "landscape" && !hasTripod) {
    if (totalISStops > 0) {
      tips.push(
        `IBIS gives you ~${totalISStops} stops — handheld down to ~${formatShutterSpeed(1 / (effectiveFocalLength / Math.pow(2, totalISStops)))} at ${focalLength}mm`
      );
    }
    tips.push(
      "Brace against a solid surface for extra stability"
    );
  }

  if (style === "action") {
    tips.push(
      "Use continuous AF and burst mode for best hit rate"
    );
    tips.push(
      `Your camera supports ${camera.burst_fps} fps burst — use it`
    );
  }

  if (style === "portrait") {
    tips.push(
      "Focus on the nearest eye for sharpest results"
    );
    if (aperture <= 2.8) {
      tips.push(
        "Wide aperture gives creamy bokeh but thin DOF — be precise with focus"
      );
    }
  }

  if (style === "astro") {
    tips.push(
      `500 rule: max exposure ${formatShutterSpeed(shutterSeconds)} at ${focalLength}mm to avoid star trails`
    );
    tips.push(
      "Use manual focus at infinity — live view zoom to confirm on a bright star"
    );
    tips.push(
      "Shoot RAW for maximum flexibility in post-processing"
    );
  }

  if (iso > 3200) {
    tips.push(
      `High ISO (${iso}) — consider noise reduction in post. Shoot RAW.`
    );
  }

  if (appliedFilter?.type === "cpl") {
    tips.push(
      `CPL costs ~${appliedFilter.lightLossStops} stops — already factored into shutter/ISO above. Rotate the front ring while watching the sky/reflections to find peak effect.`
    );
  }

  if (
    light.lightPhase === "golden hour" ||
    light.lightPhase === "blue hour"
  ) {
    tips.push(
      "Light changes rapidly — bracket exposures (±1-2 EV) for safety"
    );
  }

  return {
    aperture,
    shutterSpeed: formatShutterSpeed(shutterSeconds),
    iso,
    whiteBalance,
    focalLengthSuggestion,
    filterRecommendation,
    appliedFilter,
    exposureValue: Math.round(ev * 10) / 10,
    hyperfocalDistance,
    style,
    tips,
  };
}
