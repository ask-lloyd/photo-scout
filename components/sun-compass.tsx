"use client";

import { Compass } from "lucide-react";

interface SunCompassProps {
  azimuth: number;
  altitude: number;
  directionToFace: { bearing: number; label: string };
}

export function SunCompass({ azimuth, altitude, directionToFace }: SunCompassProps) {
  const sunAngleRad = (azimuth - 90) * (Math.PI / 180);
  const faceAngleRad = (directionToFace.bearing - 90) * (Math.PI / 180);
  // Map altitude to a radius: higher = closer to center
  const altFactor = Math.max(0.2, 1 - Math.max(0, altitude) / 90);
  const sunR = 35 * altFactor;
  const sunX = 50 + sunR * Math.cos(sunAngleRad);
  const sunY = 50 + sunR * Math.sin(sunAngleRad);

  const faceR = 35;
  const faceEndX = 50 + faceR * Math.cos(faceAngleRad);
  const faceEndY = 50 + faceR * Math.sin(faceAngleRad);

  const isBelowHorizon = altitude < 0;

  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{
        background: "var(--dark-800)",
        border: "1px solid var(--dark-600)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-4 h-4" style={{ color: "var(--golden-hour)" }} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--golden-hour)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          Sun Position
        </span>
      </div>

      <div className="relative w-full aspect-square max-w-[200px] mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Compass ring */}
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--dark-600)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="var(--dark-600)" strokeWidth="0.3" opacity="0.5" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="var(--dark-600)" strokeWidth="0.3" opacity="0.3" />

          {/* Cardinal directions */}
          <text x="50" y="7" textAnchor="middle" fill="var(--neutral-300)" fontSize="5">N</text>
          <text x="93" y="52" textAnchor="middle" fill="var(--neutral-300)" fontSize="5">E</text>
          <text x="50" y="97" textAnchor="middle" fill="var(--neutral-300)" fontSize="5">S</text>
          <text x="7" y="52" textAnchor="middle" fill="var(--neutral-300)" fontSize="5">W</text>

          {/* Direction to face arrow */}
          <line
            x1="50"
            y1="50"
            x2={faceEndX}
            y2={faceEndY}
            stroke="var(--teal)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx={faceEndX} cy={faceEndY} r="2" fill="var(--teal)" opacity="0.7" />

          {/* Sun position */}
          <circle
            cx={sunX}
            cy={sunY}
            r="4"
            fill={isBelowHorizon ? "var(--blue-hour)" : "var(--golden-hour)"}
            opacity={isBelowHorizon ? 0.5 : 1}
          />
          {!isBelowHorizon && (
            <circle
              cx={sunX}
              cy={sunY}
              r="6"
              fill="var(--golden-hour)"
              opacity="0.2"
            />
          )}
        </svg>
      </div>

      <div className="space-y-1 mt-2 text-sm">
        <div className="flex justify-between">
          <span style={{ color: "var(--neutral-300)" }}>Altitude</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--white)" }}>
            {altitude.toFixed(1)}&deg;
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--neutral-300)" }}>Azimuth</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--white)" }}>
            {azimuth.toFixed(0)}&deg;
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "var(--neutral-300)" }}>Face</span>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--teal)" }}
          >
            {directionToFace.label} ({directionToFace.bearing.toFixed(0)}&deg;)
          </span>
        </div>
      </div>
    </div>
  );
}
