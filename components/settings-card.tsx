"use client";

import { Camera as CameraIcon } from "lucide-react";
import type { LightConditions, Camera, Lens } from "@/lib/types";
import { recommendSettings } from "@/lib/settings-advisor";
import Link from "next/link";

interface SettingsCardProps {
  conditions: LightConditions;
  camera: Camera | null;
  lens: Lens | null;
  hasTripod: boolean;
  style: "landscape" | "action" | "portrait" | "astro";
  cameras: Camera[];
  lenses: Lens[];
}

export function SettingsCard({ conditions, camera, lens, hasTripod, style }: SettingsCardProps) {
  if (!camera || !lens) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--dark-800)",
          border: "1px solid var(--dark-600)",
        }}
      >
        <div
          className="flex items-center gap-2 mb-4"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--golden-hour)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          <CameraIcon className="w-4 h-4" style={{ color: "var(--golden-hour)" }} />
          If You Shoot Right Now
        </div>
        <div className="text-center py-8 space-y-2">
          <CameraIcon className="w-8 h-8 mx-auto" style={{ color: "var(--neutral-300)", opacity: 0.5 }} />
          <p className="text-sm" style={{ color: "var(--neutral-200)" }}>
            Set up your gear to get settings recommendations.
          </p>
          <Link
            href="/gear"
            className="inline-block text-sm font-medium cursor-pointer"
            style={{ color: "var(--golden-hour)" }}
          >
            Configure Gear Profile &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const settings = recommendSettings(conditions, camera, lens, { hasTripod, style });

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: "var(--dark-800)",
        border: "1px solid var(--dark-600)",
      }}
    >
      <div
        className="flex items-center gap-2 mb-1"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--golden-hour)",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
        }}
      >
        <CameraIcon className="w-4 h-4" style={{ color: "var(--golden-hour)" }} />
        If You Shoot Right Now
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--neutral-300)" }}>
        {camera.make} {camera.model} &middot; {lens.make} {lens.focal_length_min}-{lens.focal_length_max}mm
      </p>

      {/* 4 cells in a row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div
          className="text-center p-3 rounded-lg"
          style={{ background: "var(--dark-600)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--neutral-300)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Aperture
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--white)",
              marginTop: 4,
            }}
          >
            f/{settings.aperture}
          </p>
        </div>
        <div
          className="text-center p-3 rounded-lg"
          style={{ background: "var(--dark-600)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--neutral-300)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Shutter
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--white)",
              marginTop: 4,
            }}
          >
            {settings.shutterSpeed}
          </p>
        </div>
        <div
          className="text-center p-3 rounded-lg"
          style={{ background: "var(--dark-600)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--neutral-300)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            ISO
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--white)",
              marginTop: 4,
            }}
          >
            {settings.iso}
          </p>
        </div>
        <div
          className="text-center p-3 rounded-lg"
          style={{ background: "var(--dark-600)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--neutral-300)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            WB
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--white)",
              marginTop: 4,
            }}
          >
            {settings.whiteBalance}K
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)", fontSize: 12 }}>EV</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--golden-hour)" }}>
            {settings.exposureValue.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Focal Length</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--golden-hour)" }}>
            {settings.focalLengthSuggestion}
          </span>
        </div>
        {settings.hyperfocalDistance && (
          <div className="flex justify-between items-center">
            <span style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Hyperfocal</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--golden-hour)" }}>
              {settings.hyperfocalDistance.toFixed(1)}m
            </span>
          </div>
        )}
      </div>

      {settings.filterRecommendation.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--dark-600)" }}>
          <p
            className="flex items-center gap-1 mb-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--neutral-300)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Filters
          </p>
          <div className="flex flex-wrap gap-1">
            {settings.filterRecommendation.map((f) => (
              <span key={f} className="tag">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {settings.tips.length > 0 && (
        <div
          className="mt-3 px-3 py-2 rounded-lg"
          style={{
            background: "var(--golden-hour-subtle)",
          }}
        >
          <ul className="text-xs space-y-1" style={{ color: "var(--golden-hour-light)" }}>
            {settings.tips.map((tip, i) => (
              <li key={i} className="flex gap-1">
                <span style={{ color: "var(--golden-hour)" }}>&middot;</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
