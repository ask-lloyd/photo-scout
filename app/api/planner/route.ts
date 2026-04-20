import { NextResponse } from "next/server";
import SunCalc from "suncalc";
import {
  computeLightScore,
  fetchWeather,
  getColorTemperature,
  getDirectionToFace,
} from "@/lib/light-engine";
import { fetchForecast } from "@/lib/opportunity-scanner";
import { recommendSettings } from "@/lib/settings-advisor";
import type { Camera, Lens, WeatherData } from "@/lib/types";

// ─── Default gear for recommendations ───

const DEFAULT_CAMERA: Camera = {
  id: "sony-a7rv",
  make: "Sony",
  model: "A7R V",
  sensor_size: "full_frame",
  megapixels: 61,
  base_iso: 100,
  max_usable_iso: 12800,
  dynamic_range_ev: 14.7,
  has_ibis: true,
  ibis_stops: 8,
  burst_fps: 10,
  mount: "sony_e",
  tags: ["landscape", "resolution"],
};

const LANDSCAPE_LENS: Lens = {
  id: "sony-fe-24-70-f28-gm-ii",
  make: "Sony",
  model: "FE 24-70mm f/2.8 GM II",
  mount: ["sony_e"],
  focal_length_min: 24,
  focal_length_max: 70,
  max_aperture: 2.8,
  min_aperture: 22,
  has_is: false,
  is_stops: 0,
  weight_g: 695,
  filter_size_mm: 82,
  tags: ["standard-zoom", "professional"],
};

const ACTION_LENS: Lens = {
  id: "sony-fe-70-200-f28-gm-ii",
  make: "Sony",
  model: "FE 70-200mm f/2.8 GM II",
  mount: ["sony_e"],
  focal_length_min: 70,
  focal_length_max: 200,
  max_aperture: 2.8,
  min_aperture: 22,
  has_is: true,
  is_stops: 5,
  weight_g: 1045,
  filter_size_mm: 77,
  tags: ["telephoto-zoom", "professional"],
};

// ─── Helpers ───

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
}

function findClosestForecastHour(
  forecast: { time: string[]; cloudCover: number[]; cloudCoverHigh: number[]; cloudCoverMid: number[]; cloudCoverLow: number[]; humidity: number[]; visibility: number[]; temperature: number[]; windSpeed: number[]; precipitation: number[]; weatherCode: number[] },
  targetDate: Date
): WeatherData {
  const targetMs = targetDate.getTime();
  let closestIdx = 0;
  let closestDiff = Infinity;

  for (let i = 0; i < forecast.time.length; i++) {
    const diff = Math.abs(new Date(forecast.time[i]).getTime() - targetMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  }

  return {
    cloudCoverTotal: forecast.cloudCover[closestIdx] ?? 30,
    cloudCoverLow: forecast.cloudCoverLow[closestIdx] ?? 10,
    cloudCoverMid: forecast.cloudCoverMid[closestIdx] ?? 10,
    cloudCoverHigh: forecast.cloudCoverHigh[closestIdx] ?? 10,
    humidity: forecast.humidity[closestIdx] ?? 50,
    visibility: forecast.visibility[closestIdx] ?? 15,
    temperature: forecast.temperature[closestIdx] ?? 18,
    windSpeed: forecast.windSpeed[closestIdx] ?? 10,
    precipitation: forecast.precipitation[closestIdx] ?? 0,
    weatherCode: forecast.weatherCode[closestIdx] ?? 0,
  };
}

function computePhase(
  name: string,
  startTime: Date,
  endTime: Date,
  weather: WeatherData,
  camera: Camera,
  landscapeLens: Lens,
  actionLens: Lens,
  hasTripod: boolean
) {
  const midTime = new Date((startTime.getTime() + endTime.getTime()) / 2);
  const sunPos = SunCalc.getPosition(midTime, 0, 0); // lat/lng set externally
  // We pass sunAltDeg directly
  return buildPhase(name, startTime, endTime, weather, camera, landscapeLens, actionLens, hasTripod);
}

function buildPhase(
  name: string,
  startTime: Date,
  endTime: Date,
  weather: WeatherData,
  camera: Camera,
  landscapeLens: Lens,
  actionLens: Lens,
  hasTripod: boolean,
  sunAltDeg?: number,
  sunAzDeg?: number
) {
  const altDeg = sunAltDeg ?? 0;
  const conditions = computeLightScore(altDeg, weather);
  const colorTemp = getColorTemperature(altDeg, weather);

  if (sunAzDeg !== undefined) {
    conditions.directionToFace = getDirectionToFace(sunAzDeg, altDeg);
    conditions.sunAzimuth = sunAzDeg;
  }

  const landscapeSettings = recommendSettings(conditions, camera, landscapeLens, {
    hasTripod,
    style: "landscape",
  });
  const actionSettings = recommendSettings(conditions, camera, actionLens, {
    hasTripod,
    style: "action",
  });

  return {
    name,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    lightScore: conditions.score,
    lightPhase: conditions.lightPhase,
    colorTemp: `${colorTemp.min}-${colorTemp.max}K`,
    evRange: `EV ${landscapeSettings.exposureValue}`,
    settings: {
      landscape: landscapeSettings,
      action: actionSettings,
    },
  };
}

// ─── Route Handler ───

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Valid lat and lng parameters required" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch weather
    let weather: WeatherData;
    let forecast: Awaited<ReturnType<typeof fetchForecast>> | null = null;

    if (isToday(dateStr)) {
      weather = await fetchWeather(lat, lng);
    } else {
      forecast = await fetchForecast(lat, lng, 7);
      // Use golden hour time for weather lookup
      const date = new Date(dateStr + "T12:00:00");
      const times = SunCalc.getTimes(date, lat, lng);
      weather = findClosestForecastHour(forecast, times.goldenHour);
    }

    // 2. Compute sun times
    const date = new Date(dateStr + "T12:00:00");
    const times = SunCalc.getTimes(date, lat, lng);

    const goldenStart = times.goldenHour;
    const sunset = times.sunset;
    const blueHourStart = sunset;
    const blueHourEnd = times.dusk;
    const wrap = times.night;
    const arrive = new Date(goldenStart.getTime() - 30 * 60 * 1000);

    // 3. Build phases with actual sun positions and weather at each time
    const camera = DEFAULT_CAMERA;
    const landscapeLens = LANDSCAPE_LENS;
    const actionLens = ACTION_LENS;
    const hasTripod = true;

    function getWeatherAtTime(targetTime: Date): WeatherData {
      if (forecast) {
        return findClosestForecastHour(forecast, targetTime);
      }
      return weather;
    }

    function getSunAlt(time: Date): number {
      const pos = SunCalc.getPosition(time, lat, lng);
      return pos.altitude * (180 / Math.PI);
    }

    function getSunAz(time: Date): number {
      const pos = SunCalc.getPosition(time, lat, lng);
      return ((pos.azimuth * (180 / Math.PI)) + 180) % 360;
    }

    // Phase: Arrive
    const arriveMid = new Date(arrive.getTime() + 15 * 60 * 1000);
    const arriveAlt = getSunAlt(arriveMid);
    const arriveAz = getSunAz(arriveMid);

    // Phase: Golden Hour
    const goldenMid = new Date((goldenStart.getTime() + sunset.getTime()) / 2);
    const goldenAlt = getSunAlt(goldenMid);
    const goldenAz = getSunAz(goldenMid);

    // Phase: Sunset
    const sunsetAlt = getSunAlt(sunset);
    const sunsetAz = getSunAz(sunset);

    // Phase: Blue Hour
    const blueMid = new Date((blueHourStart.getTime() + blueHourEnd.getTime()) / 2);
    const blueAlt = getSunAlt(blueMid);
    const blueAz = getSunAz(blueMid);

    // Phase: Wrap
    const wrapAlt = getSunAlt(wrap);
    const wrapAz = getSunAz(wrap);

    const phases = [
      buildPhase("Arrive & Scout", arrive, goldenStart, getWeatherAtTime(arriveMid), camera, landscapeLens, actionLens, hasTripod, arriveAlt, arriveAz),
      buildPhase("Golden Hour", goldenStart, sunset, getWeatherAtTime(goldenMid), camera, landscapeLens, actionLens, hasTripod, goldenAlt, goldenAz),
      buildPhase("Sunset", new Date(sunset.getTime() - 10 * 60 * 1000), new Date(sunset.getTime() + 10 * 60 * 1000), getWeatherAtTime(sunset), camera, landscapeLens, actionLens, hasTripod, sunsetAlt, sunsetAz),
      buildPhase("Blue Hour", blueHourStart, blueHourEnd, getWeatherAtTime(blueMid), camera, landscapeLens, actionLens, hasTripod, blueAlt, blueAz),
      buildPhase("Wrap", blueHourEnd, wrap, getWeatherAtTime(wrap), camera, landscapeLens, actionLens, hasTripod, wrapAlt, wrapAz),
    ];

    // Golden hour light score
    const goldenConditions = computeLightScore(goldenAlt, getWeatherAtTime(goldenMid));

    return NextResponse.json({
      weather: {
        cloudCover: weather.cloudCoverTotal,
        humidity: weather.humidity,
        visibility: weather.visibility,
        temperature: weather.temperature,
        windSpeed: weather.windSpeed,
      },
      lightScore: goldenConditions.score,
      sun: {
        goldenStart: goldenStart.toISOString(),
        sunset: sunset.toISOString(),
        blueHourStart: blueHourStart.toISOString(),
        blueHourEnd: blueHourEnd.toISOString(),
        wrap: wrap.toISOString(),
      },
      phases,
    });
  } catch (error) {
    console.error("Planner API error:", error);
    return NextResponse.json(
      { error: "Failed to compute planner data" },
      { status: 500 }
    );
  }
}
