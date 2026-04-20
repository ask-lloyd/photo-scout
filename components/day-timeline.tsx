"use client";

import { Clock, Star, Sunrise, Sunset, Sun, Moon, Camera } from "lucide-react";
import type { LightWindow } from "@/lib/types";
import { format } from "date-fns";

interface TimelineWindow extends Omit<LightWindow, "start" | "end"> {
  start: string;
  end: string;
}

function getPhaseColor(phase: string): { bg: string; border: string; text: string } {
  switch (phase) {
    case "golden_hour":
      return { bg: "var(--golden-hour-subtle)", border: "rgba(212, 135, 45, 0.3)", text: "var(--golden-hour-light)" };
    case "blue_hour":
      return { bg: "var(--blue-hour-subtle)", border: "rgba(59, 111, 212, 0.3)", text: "var(--blue-hour-light)" };
    case "daylight":
      return { bg: "var(--golden-hour-subtle)", border: "rgba(212, 135, 45, 0.2)", text: "var(--golden-hour-light)" };
    case "midday":
      return { bg: "var(--coral-subtle)", border: "rgba(224, 104, 72, 0.2)", text: "var(--coral)" };
    case "twilight":
      return { bg: "var(--violet-subtle)", border: "rgba(139, 108, 193, 0.3)", text: "var(--violet)" };
    case "night":
      return { bg: "var(--dark-700)", border: "var(--dark-600)", text: "var(--neutral-300)" };
    default:
      return { bg: "var(--dark-700)", border: "var(--dark-600)", text: "var(--neutral-200)" };
  }
}

function PhaseIcon({ phase }: { phase: string }) {
  switch (phase) {
    case "golden_hour":
      return <Sunrise className="w-5 h-5" style={{ color: "var(--golden-hour)" }} strokeWidth={1.5} />;
    case "blue_hour":
      return <Sunset className="w-5 h-5" style={{ color: "var(--blue-hour)" }} strokeWidth={1.5} />;
    case "daylight":
      return <Sun className="w-5 h-5" style={{ color: "var(--golden-hour-light)" }} strokeWidth={1.5} />;
    case "midday":
      return <Sun className="w-5 h-5" style={{ color: "var(--coral)" }} strokeWidth={1.5} />;
    case "twilight":
      return <Moon className="w-5 h-5" style={{ color: "var(--violet)" }} strokeWidth={1.5} />;
    case "night":
      return <Moon className="w-5 h-5" style={{ color: "var(--neutral-300)" }} strokeWidth={1.5} />;
    default:
      return <Camera className="w-5 h-5" style={{ color: "var(--neutral-200)" }} strokeWidth={1.5} />;
  }
}

function ScoreDots({ score }: { score: number }) {
  const stars = Math.round(score / 20);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3 h-3"
          style={{
            color: i <= stars ? "var(--golden-hour)" : "var(--dark-500)",
            fill: i <= stars ? "var(--golden-hour)" : "none",
          }}
        />
      ))}
    </div>
  );
}

export function DayTimeline({ windows }: { windows: TimelineWindow[] }) {
  const now = new Date();

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: "var(--dark-800)",
        border: "1px solid var(--dark-600)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4" style={{ color: "var(--golden-hour)" }} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--golden-hour)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          Today&apos;s Light Windows
        </span>
      </div>

      {windows.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--neutral-200)" }}>
          No light window data available.
        </p>
      ) : (
        <div className="space-y-2">
          {windows.map((w, i) => {
            const start = new Date(w.start);
            const end = new Date(w.end);
            const isActive = now >= start && now <= end;
            const isPast = now > end;
            const colors = getPhaseColor(w.phase);

            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg transition-all"
                style={{
                  background: isActive ? colors.bg : isPast ? "var(--dark-700)" : "var(--dark-700)",
                  border: isActive
                    ? `1px solid ${colors.border}`
                    : `1px solid var(--dark-600)`,
                  opacity: isPast ? 0.5 : 1,
                  boxShadow: isActive ? "0 0 12px var(--golden-hour-subtle)" : undefined,
                }}
              >
                <div className="w-8 flex items-center justify-center"><PhaseIcon phase={w.phase} /></div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm"
                      style={{
                        fontWeight: 600,
                        color: isActive ? colors.text : "var(--white)",
                      }}
                    >
                      {w.name}
                    </span>
                    {isActive && (
                      <span
                        className="text-[13px] px-1.5 py-0 rounded-full font-semibold"
                        style={{
                          background: "var(--golden-hour)",
                          color: "var(--dark-900)",
                        }}
                      >
                        NOW
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[13px]s"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--neutral-300)",
                    }}
                  >
                    {format(start, "h:mm a")} — {format(end, "h:mm a")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <ScoreDots score={w.score} />
                  <span
                    className="w-8 text-right"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      color: "var(--golden-hour)",
                    }}
                  >
                    {w.score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
