import type {
  Camera,
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

  // Calibrated to match real camera meter readings (typical scenes meter
  // ~1 stop below textbook Sunny-16, since they aren't 18% gray).
  if (alt >= 45) {
    return 14; // Bright sun / midday — meters at f/8, 1/250, ISO 100
  }
  if (alt >= 15 && alt < 45) {
    const t = (alt - 15) / 30;
    return 11 + t * 3; // EV 11-14
  }
  if (alt >= 6 && alt < 15) {
    return 10 + (alt - 6) / 9; // EV 10-11
  }
  if (alt >= 0 && alt < 6) {
    return 8 + (alt / 6) * 2; // EV 8-10
  }
  if (alt >= -6 && alt < 0) {
    return 2 + ((alt + 6) / 6) * 6; // EV 2-8
  }
  if (alt >= -12 && alt < -6) {
    return ((alt + 12) / 6) * 2; // EV 0-2
  }
  // Night
  return -2 + ((Math.max(alt, -18) + 18) / 6) * 2; // EV -2 to 0
}

/**
 * Adjust EV based on the cloud component score.
 * Lower cloud score = more overcast = lower EV.
 */
function adjustEVForClouds(ev: number, cloudScore: number): number {
  // cloudScore ranges from 5 (thick overcast) to 25 (dramatic broken).
  // Map: 25 = no adjustment, 5 = -3 EV
  const adjustment = -((25 - cloudScore) / 20) * 3;
  return ev + adjustment;
}

// ─── Public API ───

export function recommendSettings(
  light: LightConditions,
  camera: Camera,
  lens: Lens,
  options: {
    hasTripod: boolean;
    style: "landscape" | "action" | "portrait" | "astro";
  }
): SettingsRecommendation {
  const { style, hasTripod } = options;
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

  // 6. Filter recommendations
  const filterRecommendation: string[] = [];
  if (style === "landscape") {
    // GND for golden/blue hour
    if (
      light.lightPhase === "golden hour" ||
      light.lightPhase === "blue hour"
    ) {
      filterRecommendation.push(
        "2-stop GND (graduated neutral density) — balance bright sky with darker foreground"
      );
    }

    // ND for long exposure
    if (hasTripod && ev > 8) {
      filterRecommendation.push(
        "ND filter (6-10 stop) — enables long exposure for smooth water/clouds"
      );
    }

    // CPL for haze / reflections
    if (light.character.includes("hazy") || light.lightPhase === "daylight") {
      filterRecommendation.push(
        "CPL (circular polarizer) — reduce haze, cut reflections, deepen sky"
      );
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
    exposureValue: Math.round(ev * 10) / 10,
    hyperfocalDistance,
    style,
    tips,
  };
}
