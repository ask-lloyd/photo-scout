import * as SunCalc from "suncalc";
import type {
  LightConditions,
  LightWindow,
  WeatherData,
} from "@/lib/types";

// ─── Helpers ───

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function bearingToLabel(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

// ─── Sun Altitude Factor (0-25 pts) ───

function computeSunAltitudeFactor(sunAltitude: number): number {
  if (sunAltitude >= 0 && sunAltitude <= 6) {
    // Golden hour
    return 25;
  }
  if (sunAltitude > 6 && sunAltitude <= 15) {
    // Sweet spot
    return 20;
  }
  if (sunAltitude < 0 && sunAltitude >= -6) {
    // Blue hour
    return 22;
  }
  if (sunAltitude < -6 && sunAltitude >= -12) {
    // Nautical twilight
    return 15;
  }
  if (sunAltitude < -12) {
    // Night
    return 10;
  }
  if (sunAltitude > 15 && sunAltitude <= 45) {
    // Lerp from 15 to 8
    const t = clamp01((sunAltitude - 15) / (45 - 15));
    return Math.round(lerp(15, 8, t));
  }
  // Above 45 - harsh midday
  return 5;
}

// ─── Cloud Factor (0-25 pts) ───

function computeCloudFactor(weather: WeatherData): number {
  const { cloudCoverTotal, cloudCoverHigh, cloudCoverLow } = weather;

  // Low thick overcast (check first — worst case)
  if (cloudCoverLow > 60) {
    return 5;
  }
  // High thin clouds — color amplifier
  if (cloudCoverHigh > 40 && cloudCoverLow < 20) {
    return 20;
  }
  // Broken clouds 40-70% — dramatic light
  if (cloudCoverTotal >= 40 && cloudCoverTotal <= 70) {
    return 25;
  }
  // Full overcast >85% — soft/even
  if (cloudCoverTotal > 85) {
    return 12;
  }
  // Clear sky <10%
  if (cloudCoverTotal < 10) {
    return 15;
  }

  // Fallback: scale linearly for remaining ranges
  // 10-40%: between clear and broken
  if (cloudCoverTotal >= 10 && cloudCoverTotal < 40) {
    return Math.round(lerp(15, 25, clamp01((cloudCoverTotal - 10) / 30)));
  }
  // 70-85%: between broken and overcast
  return Math.round(lerp(25, 12, clamp01((cloudCoverTotal - 70) / 15)));
}

// ─── Atmospheric Factor (0-25 pts) ───

function computeAtmosphericFactor(weather: WeatherData): number {
  let score = 0;

  // Humidity
  if (weather.humidity >= 40 && weather.humidity <= 65) {
    score += 8;
  } else if (
    (weather.humidity >= 20 && weather.humidity < 40) ||
    (weather.humidity > 65 && weather.humidity <= 80)
  ) {
    score += 5;
  }
  // else: extreme humidity, +0

  // Visibility (km)
  const visKm = weather.visibility / 1000; // API returns meters
  if (visKm >= 10 && visKm <= 25) {
    score += 8;
  } else if (visKm > 25) {
    score += 6;
  } else {
    score += 4; // <10km, possibly foggy
  }

  // Wind
  if (weather.windSpeed < 15) {
    score += 5;
  }

  // Temperature comfort
  if (weather.temperature >= 10 && weather.temperature <= 25) {
    score += 4;
  }

  return Math.min(score, 25);
}

// ─── Special Events Factor (0-25 pts) ───

function computeSpecialFactor(
  weather: WeatherData,
  sunAltitude: number
): number {
  let score = 0;

  const visKm = weather.visibility / 1000;

  // Fog likely
  if (visKm < 2 && weather.humidity > 90) {
    score += 15;
  }

  // Post-rain/storm clearing: weather codes 1-3 (mainly clear/partly cloudy)
  // after recent rain (codes 51-67, 80-82, 95-99)
  const clearingCodes = [1, 2, 3];
  if (
    clearingCodes.includes(weather.weatherCode) &&
    weather.cloudCoverTotal >= 30 &&
    weather.cloudCoverTotal <= 60
  ) {
    score += 20;
  }

  // Dramatic potential: no precipitation, broken clouds during golden hour
  if (
    weather.precipitation === 0 &&
    weather.cloudCoverTotal >= 30 &&
    weather.cloudCoverTotal <= 60 &&
    sunAltitude >= -6 &&
    sunAltitude <= 6
  ) {
    score += 10;
  }

  return Math.min(score, 25);
}

// ─── Light Phase ───

function getLightPhase(sunAltitude: number): string {
  if (sunAltitude < -18) return "night";
  if (sunAltitude < -12) return "astronomical twilight";
  if (sunAltitude < -6) return "nautical twilight";
  if (sunAltitude < 0) return "blue hour";
  if (sunAltitude <= 6) return "golden hour";
  if (sunAltitude <= 15) return "sweet light";
  if (sunAltitude <= 45) return "daylight";
  return "harsh midday";
}

// ─── Public API ───

export function computeLightScore(
  sunAltitude: number,
  weather: WeatherData
): LightConditions {
  const sunFactor = computeSunAltitudeFactor(sunAltitude);
  const cloudFactor = computeCloudFactor(weather);
  const atmosphericFactor = computeAtmosphericFactor(weather);
  const specialFactor = computeSpecialFactor(weather, sunAltitude);

  const score = clamp(
    sunFactor + cloudFactor + atmosphericFactor + specialFactor,
    0,
    100
  );

  const colorTemp = getColorTemperature(sunAltitude, weather);
  const character = getLightCharacter(
    { score } as LightConditions,
    sunAltitude,
    weather
  );

  return {
    score,
    character,
    colorTemperature: colorTemp,
    directionToFace: { bearing: 0, label: "N" }, // Requires sun azimuth; set externally
    sunAltitude,
    sunAzimuth: 0, // Set externally when sun position is known
    lightPhase: getLightPhase(sunAltitude),
    components: {
      sunAltitude: sunFactor,
      cloud: cloudFactor,
      atmospheric: atmosphericFactor,
      special: specialFactor,
    },
  };
}

export function getLightCharacter(
  conditions: LightConditions,
  sunAltitude: number,
  weather: WeatherData
): string[] {
  const tags: string[] = [];

  // Sun-altitude-based character
  if (sunAltitude >= 0 && sunAltitude <= 6) {
    tags.push("golden");
    if (weather.cloudCoverTotal >= 40 && weather.cloudCoverTotal <= 70) {
      tags.push("dramatic side-light");
    } else if (weather.cloudCoverTotal < 20) {
      tags.push("golden backlit");
    } else {
      tags.push("warm diffused");
    }
  } else if (sunAltitude < 0 && sunAltitude >= -6) {
    tags.push("soft blue");
    if (weather.cloudCoverTotal > 60) {
      tags.push("moody overcast");
    }
  } else if (sunAltitude < -6) {
    tags.push("deep blue");
    if (sunAltitude < -12) {
      tags.push("night");
    }
  } else if (sunAltitude > 45) {
    tags.push("harsh direct");
    tags.push("overhead");
  } else if (sunAltitude > 15) {
    if (weather.cloudCoverTotal > 85) {
      tags.push("flat overcast");
    } else if (weather.cloudCoverTotal >= 40) {
      tags.push("soft diffused");
    } else {
      tags.push("bright daylight");
    }
  } else {
    // 6-15 sweet spot
    if (weather.cloudCoverTotal >= 40 && weather.cloudCoverTotal <= 70) {
      tags.push("dramatic");
    }
    tags.push("warm");
  }

  // Atmospheric modifiers
  if (weather.visibility / 1000 < 2 && weather.humidity > 90) {
    tags.push("foggy");
  } else if (weather.visibility / 1000 < 10) {
    tags.push("hazy");
  }

  if (weather.cloudCoverTotal > 85) {
    tags.push("even light");
  }

  if (weather.cloudCoverHigh > 40 && weather.cloudCoverLow < 20) {
    tags.push("color amplified");
  }

  // Deduplicate
  return Array.from(new Set(tags));
}

export function getColorTemperature(
  sunAltitude: number,
  weather: WeatherData
): { min: number; max: number; label: string } {
  // Golden hour
  if (sunAltitude >= 0 && sunAltitude <= 6) {
    return { min: 2500, max: 3500, label: "warm golden" };
  }
  // Blue hour
  if (sunAltitude < 0 && sunAltitude >= -6) {
    return { min: 7000, max: 10000, label: "cool blue" };
  }
  // Night / deep twilight
  if (sunAltitude < -6) {
    return { min: 10000, max: 15000, label: "deep blue / artificial" };
  }
  // Overcast midday
  if (weather.cloudCoverTotal > 85) {
    return { min: 6000, max: 7500, label: "cool overcast" };
  }
  // Sweet spot with some clouds
  if (sunAltitude > 6 && sunAltitude <= 15) {
    return { min: 3500, max: 5000, label: "warm daylight" };
  }
  // Midday clear
  return { min: 5200, max: 5800, label: "neutral daylight" };
}

export function getDirectionToFace(
  sunAzimuth: number,
  sunAltitude: number
): { bearing: number; label: string } {
  let bearing: number;

  if (sunAltitude >= 0 && sunAltitude <= 15) {
    // Golden hour / sweet spot: face toward the sun for backlight,
    // or 90 degrees for side light. Recommend facing toward the sun.
    bearing = sunAzimuth;
  } else if (sunAltitude < 0) {
    // Blue hour / twilight: face toward where sun set/will rise
    bearing = sunAzimuth;
  } else if (sunAltitude > 45) {
    // Harsh midday: face away from sun (seek shade / even light)
    bearing = (sunAzimuth + 180) % 360;
  } else {
    // General daylight: face 90 degrees to sun for side light
    bearing = (sunAzimuth + 90) % 360;
  }

  bearing = ((bearing % 360) + 360) % 360;

  return {
    bearing: Math.round(bearing),
    label: bearingToLabel(bearing),
  };
}

export function getLightWindows(
  lat: number,
  lng: number,
  date: Date
): LightWindow[] {
  const windows: LightWindow[] = [];
  const times = SunCalc.getTimes(date, lat, lng);

  // Collect key transition times from SunCalc
  const sunriseEnd = times.sunriseEnd;
  const sunsetStart = times.sunsetStart;
  const sunrise = times.sunrise;
  const sunset = times.sunset;
  const goldenHourEnd = times.goldenHourEnd; // morning golden hour ends
  const goldenHour = times.goldenHour; // evening golden hour starts
  const dawn = times.dawn; // civil dawn (-6 degrees)
  const dusk = times.dusk; // civil dusk (-6 degrees)
  const nauticalDawn = times.nauticalDawn; // -12 degrees
  const nauticalDusk = times.nauticalDusk; // -12 degrees
  const nightEnd = times.nightEnd; // astronomical dawn (-18 degrees)
  const night = times.night; // astronomical dusk (-18 degrees)
  const solarNoon = times.solarNoon;

  // Build ordered windows for the day
  const orderedPhases: {
    name: string;
    start: Date;
    end: Date;
    phase: string;
    estimatedAltitude: number;
  }[] = [];

  // Night (pre-dawn)
  if (nightEnd && nauticalDawn) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    orderedPhases.push({
      name: "Night (pre-dawn)",
      start: dayStart,
      end: nightEnd,
      phase: "night",
      estimatedAltitude: -20,
    });
  }

  // Astronomical twilight morning
  if (nightEnd && nauticalDawn) {
    orderedPhases.push({
      name: "Astronomical Twilight (morning)",
      start: nightEnd,
      end: nauticalDawn,
      phase: "astronomical twilight",
      estimatedAltitude: -15,
    });
  }

  // Nautical twilight morning
  if (nauticalDawn && dawn) {
    orderedPhases.push({
      name: "Nautical Twilight (morning)",
      start: nauticalDawn,
      end: dawn,
      phase: "nautical twilight",
      estimatedAltitude: -9,
    });
  }

  // Blue hour morning (civil dawn to sunrise)
  if (dawn && sunrise) {
    orderedPhases.push({
      name: "Blue Hour (morning)",
      start: dawn,
      end: sunrise,
      phase: "blue hour",
      estimatedAltitude: -3,
    });
  }

  // Golden hour morning (sunrise to goldenHourEnd)
  if (sunrise && goldenHourEnd) {
    orderedPhases.push({
      name: "Golden Hour (morning)",
      start: sunrise,
      end: goldenHourEnd,
      phase: "golden hour",
      estimatedAltitude: 3,
    });
  }

  // Morning daylight
  if (goldenHourEnd && solarNoon) {
    orderedPhases.push({
      name: "Morning Daylight",
      start: goldenHourEnd,
      end: solarNoon,
      phase: "daylight",
      estimatedAltitude: 30,
    });
  }

  // Afternoon daylight
  if (solarNoon && goldenHour) {
    orderedPhases.push({
      name: "Afternoon Daylight",
      start: solarNoon,
      end: goldenHour,
      phase: "daylight",
      estimatedAltitude: 30,
    });
  }

  // Golden hour evening
  if (goldenHour && sunset) {
    orderedPhases.push({
      name: "Golden Hour (evening)",
      start: goldenHour,
      end: sunset,
      phase: "golden hour",
      estimatedAltitude: 3,
    });
  }

  // Blue hour evening (sunset to civil dusk)
  if (sunset && dusk) {
    orderedPhases.push({
      name: "Blue Hour (evening)",
      start: sunset,
      end: dusk,
      phase: "blue hour",
      estimatedAltitude: -3,
    });
  }

  // Nautical twilight evening
  if (dusk && nauticalDusk) {
    orderedPhases.push({
      name: "Nautical Twilight (evening)",
      start: dusk,
      end: nauticalDusk,
      phase: "nautical twilight",
      estimatedAltitude: -9,
    });
  }

  // Astronomical twilight evening
  if (nauticalDusk && night) {
    orderedPhases.push({
      name: "Astronomical Twilight (evening)",
      start: nauticalDusk,
      end: night,
      phase: "astronomical twilight",
      estimatedAltitude: -15,
    });
  }

  // Night (post-dusk)
  if (night) {
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    orderedPhases.push({
      name: "Night (evening)",
      start: night,
      end: dayEnd,
      phase: "night",
      estimatedAltitude: -20,
    });
  }

  // Estimate scores based on phase altitude and default clear-sky weather
  const defaultWeather: WeatherData = {
    cloudCoverTotal: 30,
    cloudCoverLow: 10,
    cloudCoverMid: 10,
    cloudCoverHigh: 10,
    humidity: 50,
    visibility: 15000,
    temperature: 18,
    windSpeed: 10,
    precipitation: 0,
    weatherCode: 1,
  };

  for (const phase of orderedPhases) {
    if (
      isNaN(phase.start.getTime()) ||
      isNaN(phase.end.getTime()) ||
      phase.start >= phase.end
    ) {
      continue; // Skip invalid windows (polar regions, etc.)
    }

    const conditions = computeLightScore(
      phase.estimatedAltitude,
      defaultWeather
    );

    windows.push({
      name: phase.name,
      start: phase.start,
      end: phase.end,
      score: conditions.score,
      character: conditions.character,
      phase: phase.phase,
    });
  }

  return windows;
}

export async function fetchWeather(
  lat: number,
  lng: number
): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}` +
    `&longitude=${lng}` +
    `&current=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,` +
    `relative_humidity_2m,visibility,temperature_2m,wind_speed_10m,` +
    `precipitation,weather_code` +
    `&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Open-Meteo API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const current = data.current;

  return {
    cloudCoverTotal: current.cloud_cover ?? 0,
    cloudCoverLow: current.cloud_cover_low ?? 0,
    cloudCoverMid: current.cloud_cover_mid ?? 0,
    cloudCoverHigh: current.cloud_cover_high ?? 0,
    humidity: current.relative_humidity_2m ?? 50,
    visibility: current.visibility ?? 10000, // meters
    temperature: current.temperature_2m ?? 15,
    windSpeed: current.wind_speed_10m ?? 0,
    precipitation: current.precipitation ?? 0,
    weatherCode: current.weather_code ?? 0,
  };
}
