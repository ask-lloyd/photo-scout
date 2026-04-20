"use client";

import { Cloud, Droplets, Eye, Thermometer, Wind } from "lucide-react";
import type { WeatherData } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";
import { formatTemp, formatDistance } from "@/lib/format";

function weatherCodeToDescription(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] || "Unknown";
}

export function WeatherPanel({ weather }: { weather: WeatherData }) {
  const { locale } = useLocale();
  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: "var(--dark-800)",
        border: "1px solid var(--dark-600)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Cloud className="w-4 h-4" style={{ color: "var(--blue-hour)" }} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--golden-hour)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          Current Weather
        </span>
      </div>
      <p className="text-[13px]s mb-4" style={{ color: "var(--neutral-300)" }}>
        {weatherCodeToDescription(weather.weatherCode)}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4" style={{ color: "var(--coral)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--white)" }}>
                {formatTemp(weather.temperature, locale)}
              </p>
              <p className="text-[13px]s" style={{ color: "var(--neutral-300)" }}>Temperature</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4" style={{ color: "var(--blue-hour)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--white)" }}>
                {weather.humidity}%
              </p>
              <p className="text-[13px]s" style={{ color: "var(--neutral-300)" }}>Humidity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4" style={{ color: "var(--teal)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--white)" }}>
                {locale === "US" ? (weather.windSpeed * 0.621371).toFixed(0) : weather.windSpeed.toFixed(0)} {locale === "US" ? "mph" : "km/h"}
              </p>
              <p className="text-[13px]s" style={{ color: "var(--neutral-300)" }}>Wind Speed</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" style={{ color: "var(--violet)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--white)" }}>
                {formatDistance(weather.visibility / 1000, locale)}
              </p>
              <p className="text-[13px]s" style={{ color: "var(--neutral-300)" }}>Visibility</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4" style={{ color: "var(--neutral-200)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--white)" }}>
                {weather.cloudCoverTotal}%
              </p>
              <p className="text-[13px]s" style={{ color: "var(--neutral-300)" }}>Cloud Cover</p>
            </div>
          </div>
          <div>
            <p className="text-[13px]s mb-1" style={{ color: "var(--neutral-300)" }}>Cloud Layers</p>
            <div className="space-y-1">
              <CloudBar label="High" value={weather.cloudCoverHigh} color="var(--violet)" />
              <CloudBar label="Mid" value={weather.cloudCoverMid} color="var(--blue-hour)" />
              <CloudBar label="Low" value={weather.cloudCoverLow} color="var(--neutral-300)" />
            </div>
          </div>
        </div>
      </div>

      {weather.precipitation > 0 && (
        <div
          className="mt-3 pt-3 text-sm"
          style={{
            borderTop: "1px solid var(--dark-600)",
            color: "var(--blue-hour)",
          }}
        >
          Precipitation: {weather.precipitation} mm
        </div>
      )}
    </div>
  );
}

function CloudBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px]s">
      <span className="w-6" style={{ color: "var(--neutral-300)" }}>{label}</span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--dark-600)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="w-8 text-right" style={{ color: "var(--neutral-300)" }}>{value}%</span>
    </div>
  );
}
