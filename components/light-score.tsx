"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Score color logic (shared across all variants) ───

export function lightScoreColor(score: number): string {
  if (score >= 70) return "var(--golden-hour)";
  if (score >= 50) return "var(--blue-hour)";
  return "var(--neutral-300)";
}

export function lightScoreColorClass(score: number): string {
  if (score >= 70) return "text-orange-400";
  if (score >= 50) return "text-blue-400";
  return "text-[var(--neutral-200)]";
}

// ─── Props ───

interface LightScoreProps {
  score: number;
  /** Display variant */
  variant?: "ring" | "badge" | "inline" | "compact";
  /** Ring size in px (only for ring variant) */
  size?: number;
  /** Show "LIGHT SCORE" label (default: true for ring & compact, false for others) */
  showLabel?: boolean;
  /** Show the info popover on click (default: false) */
  showInfo?: boolean;
  className?: string;
}

// ─── Info Popover (extracted for reuse) ───

export function LightScoreInfo() {
  return (
    <Popover>
      <PopoverTrigger
        className="text-[var(--neutral-300)] hover:text-[var(--neutral-200)] transition-colors cursor-pointer"
      >
        <Info className="w-3.5 h-3.5" />
      </PopoverTrigger>
      <PopoverContent
        className="w-72 text-sm"
        style={{
          background: "var(--dark-700)",
          border: "1px solid var(--dark-600)",
          color: "var(--neutral-200)",
        }}
      >
        <p className="font-semibold mb-2" style={{ color: "var(--white)" }}>
          Light Score
        </p>
        <p className="mb-2">
          The <strong style={{ color: "var(--golden-hour)" }}>Light Score</strong> (0–100)
          is a photography-specific rating based on cloud cover, golden hour clarity,
          sunset potential, and astro conditions.
        </p>
        <div className="space-y-1 text-[13px]s">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />
            <span><strong>70+</strong> — Excellent shooting conditions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
            <span><strong>50–69</strong> — Decent, worth going out</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-neutral-400 inline-block" />
            <span><strong>&lt;50</strong> — Poor light for photography</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Score Label ───

function ScoreLabel({ className }: { className?: string }) {
  return (
    <span
      className={`text-[8px] uppercase tracking-wider text-[var(--neutral-300)] ${className ?? ""}`}
    >
      Light Score
    </span>
  );
}

// ─── Main Component ───

export function LightScore({
  score,
  variant = "inline",
  size = 96,
  showLabel,
  showInfo = false,
  className,
}: LightScoreProps) {
  const color = lightScoreColor(score);
  const colorClass = lightScoreColorClass(score);

  // Default showLabel based on variant
  const label = showLabel ?? (variant === "ring" || variant === "compact");

  if (variant === "ring") {
    const innerSize = Math.round(size * 0.79);
    const fontSize = Math.round(size * 0.23);
    return (
      <div className={`flex flex-col items-center gap-0.5 ${className ?? ""}`}>
        <div
          className="score-ring rounded-full flex items-center justify-center shrink-0"
          style={{
            "--pct": `${score}%`,
            width: size,
            height: size,
          } as React.CSSProperties}
        >
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: innerSize,
              height: innerSize,
              background: "var(--dark-700)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize,
                color,
              }}
            >
              {score}
            </span>
          </div>
        </div>
        {label && <ScoreLabel />}
        {showInfo && <LightScoreInfo />}
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[13px]s font-bold shrink-0 ${className ?? ""}`}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          background: "var(--golden-hour-subtle)",
          color,
        }}
      >
        {score}
        {label && <ScoreLabel className="ml-0.5" />}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex flex-col items-center ${className ?? ""}`}>
        <span className={`text-[13px]l font-bold ${colorClass}`}>{score}</span>
        {label && <ScoreLabel className="-mt-0.5" />}
      </div>
    );
  }

  // inline (default)
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 18,
        color,
      }}
    >
      {score}
      {label && (
        <>
          {" "}
          <ScoreLabel />
        </>
      )}
    </span>
  );
}

export default LightScore;
