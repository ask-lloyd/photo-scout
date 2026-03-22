"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { LightConditions } from "@/lib/types";

function ScoreRing({ score }: { score: number }) {
  const degrees = score * 3.6;

  const getLabel = (s: number) => {
    if (s >= 80) return "Exceptional";
    if (s >= 60) return "Great";
    if (s >= 40) return "Good";
    if (s >= 20) return "Fair";
    return "Poor";
  };

  return (
    <div className="relative mx-auto md:mx-0 shrink-0" style={{ width: 96, height: 96 }}>
      {/* Conic gradient ring */}
      <div
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(var(--golden-hour) 0deg ${degrees}deg, var(--dark-600) ${degrees}deg)`,
        }}
      >
        {/* Inner circle */}
        <div
          className="rounded-full flex flex-col items-center justify-center"
          style={{
            width: 76,
            height: 76,
            background: "var(--dark-700)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--golden-hour)",
            }}
          >
            {score}
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--neutral-200)" }}
          >
            {getLabel(score)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function LightScoreHero({ conditions }: { conditions: LightConditions }) {
  return (
    <Card
      style={{
        background: "var(--dark-800)",
        border: "1px solid var(--dark-600)",
      }}
    >
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={conditions.score} />

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h2
                className="text-2xl mb-1"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: "var(--white)",
                }}
              >
                Light Quality Score
              </h2>
              <p className="text-sm" style={{ color: "var(--neutral-200)" }}>
                {conditions.lightPhase} &middot;{" "}
                {conditions.colorTemperature.label} ({conditions.colorTemperature.min}-{conditions.colorTemperature.max}K)
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {conditions.character.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>

            {/* Score breakdown */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--neutral-200)" }}>Sun Position</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--golden-hour)" }}>
                  {conditions.components.sunAltitude}/25
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--neutral-200)" }}>Cloud Factor</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--golden-hour)" }}>
                  {conditions.components.cloud}/25
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--neutral-200)" }}>Atmosphere</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--golden-hour)" }}>
                  {conditions.components.atmospheric}/25
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--neutral-200)" }}>Special</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--golden-hour)" }}>
                  {conditions.components.special}/25
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
