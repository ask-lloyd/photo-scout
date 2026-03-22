import { NextResponse } from "next/server";
import SunCalc from "suncalc";
import { computeLightScore, fetchWeather, getLightWindows, getLightCharacter, getColorTemperature, getDirectionToFace } from "@/lib/light-engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const dateStr = searchParams.get("date");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Valid lat and lng parameters required" },
      { status: 400 }
    );
  }

  const date = dateStr ? new Date(dateStr) : new Date();

  try {
    const weather = await fetchWeather(lat, lng);
    const sunPos = SunCalc.getPosition(date, lat, lng);
    const sunAltitudeDeg = sunPos.altitude * (180 / Math.PI);
    const sunAzimuthDeg = ((sunPos.azimuth * (180 / Math.PI)) + 180) % 360;

    const conditions = computeLightScore(sunAltitudeDeg, weather);
    conditions.character = getLightCharacter(conditions, sunAltitudeDeg, weather);
    conditions.colorTemperature = getColorTemperature(sunAltitudeDeg, weather);
    conditions.directionToFace = getDirectionToFace(sunAzimuthDeg, sunAltitudeDeg);
    conditions.sunAltitude = sunAltitudeDeg;
    conditions.sunAzimuth = sunAzimuthDeg;

    const windows = getLightWindows(lat, lng, date);

    return NextResponse.json({
      conditions,
      weather,
      windows: windows.map((w) => ({
        ...w,
        start: w.start.toISOString(),
        end: w.end.toISOString(),
      })),
      sun: {
        altitude: sunAltitudeDeg,
        azimuth: sunAzimuthDeg,
      },
    });
  } catch (error) {
    console.error("Light API error:", error);
    return NextResponse.json(
      { error: "Failed to compute light conditions" },
      { status: 500 }
    );
  }
}
