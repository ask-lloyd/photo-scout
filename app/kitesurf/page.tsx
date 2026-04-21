"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { useGeolocation } from "@/lib/hooks";
import {
  useWind,
  useTides,
  useKitesurfGearProfile,
  usePlanningLocation,
  geocodeSearch,
  type PlanningLocation,
} from "@/lib/kitesurf-hooks";
import { scoreKitesurf } from "@/lib/kitesurf-scorer";
import type { TideData } from "@/lib/kitesurf-types";

const ACCENT = "#4cc9f0";

const cardStyle: React.CSSProperties = {
  background: "var(--dark-800)",
  border: "1px solid var(--dark-600)",
};

function verdictPill(verdict: "epic" | "good" | "marginal" | "skip") {
  switch (verdict) {
    case "epic":
      return { label: "EPIC", bg: "rgba(34,197,94,0.18)", fg: "#22c55e", border: "rgba(34,197,94,0.35)" };
    case "good":
      return { label: "GOOD", bg: "rgba(20,184,166,0.18)", fg: "#14b8a6", border: "rgba(20,184,166,0.35)" };
    case "marginal":
      return { label: "MARGINAL", bg: "rgba(234,179,8,0.18)", fg: "#eab308", border: "rgba(234,179,8,0.35)" };
    default:
      return { label: "SKIP", bg: "rgba(239,68,68,0.18)", fg: "#ef4444", border: "rgba(239,68,68,0.35)" };
  }
}

function formatTideTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function KitesurfDashboard() {
  const { coords: geoCoords, locationName: geoName, loading: geoLoading } = useGeolocation();
  const { location: planning, setLocation: setPlanning } = usePlanningLocation();
  const { gear } = useKitesurfGearProfile();

  const activeLat = planning?.lat ?? geoCoords?.lat;
  const activeLng = planning?.lng ?? geoCoords?.lng;
  const activeName = planning?.name ?? geoName;

  const { wind, loading: windLoading } = useWind(activeLat, activeLng);
  const { tides } = useTides(activeLat, activeLng);

  // ── Planning location search ──
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlanningLocation[]>([]);
  const [searching, setSearching] = useState(false);

  const onSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await geocodeSearch(query);
      setResults(r);
    } finally {
      setSearching(false);
    }
  };

  const pick = (r: PlanningLocation) => {
    setPlanning(r);
    setResults([]);
    setQuery("");
  };

  // ── Score ──
  const score = useMemo(() => {
    if (!wind) return null;
    return scoreKitesurf({
      wind,
      ownedKites: gear.kites,
      riderWeightKg: gear.weightKg,
    });
  }, [wind, gear]);

  const isLoading = geoLoading || windLoading || !wind;

  // Tides "available" flag (endpoint adds it; not in TideData type)
  const tidesAvailable = (tides as (TideData & { available?: boolean }) | null)?.available ?? false;

  return (
    <>
      <NavHeader locationName={activeName} />
      <main className="pt-14" style={{ background: "var(--dark-900)", minHeight: "100vh" }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* ── Location header / planning picker ── */}
          <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="section-label mb-1">Location</div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 22,
                    color: "var(--white)",
                  }}
                >
                  {activeName}
                </div>
                {planning && (
                  <div className="text-sm mt-1" style={{ color: "var(--neutral-300)" }}>
                    Planning mode ·{" "}
                    <button
                      onClick={() => setPlanning(null)}
                      className="underline"
                      style={{ color: ACCENT }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-[260px]">
                <label className="text-sm block mb-2" style={{ color: "var(--neutral-300)" }}>
                  Plan for another location
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSearch();
                  }}
                  placeholder="City, spot, or region…"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--dark-700)",
                    border: "1px solid var(--dark-600)",
                    color: "var(--white)",
                  }}
                />
                {searching && (
                  <div className="text-xs mt-2" style={{ color: "var(--neutral-300)" }}>
                    Searching…
                  </div>
                )}
                {results.length > 0 && (
                  <ul className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid var(--dark-600)" }}>
                    {results.map((r, i) => (
                      <li key={`${r.lat}-${r.lng}-${i}`}>
                        <button
                          onClick={() => pick(r)}
                          className="w-full text-left px-3 py-2 text-sm"
                          style={{ background: "var(--dark-700)", color: "var(--white)" }}
                        >
                          {r.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="py-10 text-center" style={{ color: "var(--neutral-300)" }}>
              Checking conditions…
            </p>
          ) : (
            <>
              {/* ── Wind Now ── */}
              <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
                <div className="section-label mb-4">Wind Now</div>
                <div className="flex items-center gap-6 flex-wrap">
                  {/* Direction arrow */}
                  <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
                    <circle cx="48" cy="48" r="44" fill="none" stroke="var(--dark-600)" strokeWidth="1" />
                    <text x="48" y="12" textAnchor="middle" fill="var(--neutral-300)" fontSize="9" fontWeight="bold">N</text>
                    <g transform={`rotate(${wind!.direction_deg} 48 48)`}>
                      <line x1="48" y1="78" x2="48" y2="22" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
                      <polygon points="48,14 42,28 54,28" fill={ACCENT} />
                    </g>
                  </svg>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: 56,
                          color: ACCENT,
                          lineHeight: 1,
                        }}
                      >
                        {Math.round(wind!.speed_knots)}
                      </span>
                      <span className="text-sm" style={{ color: "var(--neutral-300)" }}>kt</span>
                    </div>
                    <div className="text-sm mt-2" style={{ color: "var(--neutral-200)", fontFamily: "var(--font-mono)" }}>
                      Gust {Math.round(wind!.gust_knots)} kt
                    </div>
                    <div className="text-sm mt-1" style={{ color: "var(--neutral-200)", fontFamily: "var(--font-mono)" }}>
                      {wind!.direction_label} · {Math.round(wind!.direction_deg)}°
                    </div>
                    {wind!.confidence && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{
                            background:
                              wind!.confidence === "high"
                                ? "rgba(34,197,94,0.15)"
                                : wind!.confidence === "moderate"
                                ? "rgba(234,179,8,0.15)"
                                : "rgba(239,68,68,0.15)",
                            color:
                              wind!.confidence === "high"
                                ? "#4ade80"
                                : wind!.confidence === "moderate"
                                ? "#facc15"
                                : "#f87171",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {wind!.confidence.toUpperCase()} CONFIDENCE
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--neutral-300)", fontFamily: "var(--font-mono)" }}>
                          ± {wind!.spread_knots} kt across {wind!.models?.length ?? 0} models
                        </span>
                      </div>
                    )}
                    {wind!.models && wind!.models.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-[11px] cursor-pointer" style={{ color: "var(--neutral-300)" }}>
                          View individual models
                        </summary>
                        <div className="mt-2 space-y-1">
                          {wind!.models.map((m) => (
                            <div
                              key={m.id}
                              className="flex justify-between text-[12px] font-mono"
                              style={{ color: "var(--neutral-200)" }}
                            >
                              <span>{m.label}</span>
                              <span>
                                {m.speed_knots}kt / G{m.gust_knots}kt · {m.direction_label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Session Score ── */}
              {score && (
                <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
                  <div className="section-label mb-4">Session Score</div>
                  <div className="flex items-center gap-5 flex-wrap mb-4">
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 56,
                        color: "var(--white)",
                        lineHeight: 1,
                      }}
                    >
                      {score.score}
                    </div>
                    {(() => {
                      const p = verdictPill(score.verdict);
                      return (
                        <span
                          className="px-3 py-1 rounded-full text-sm font-semibold"
                          style={{ background: p.bg, color: p.fg, border: `1px solid ${p.border}` }}
                        >
                          {p.label}
                        </span>
                      );
                    })()}
                  </div>
                  <ul className="space-y-1.5 text-sm" style={{ color: "var(--neutral-200)" }}>
                    {score.reasons.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span style={{ color: ACCENT }}>•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Recommended Kite ── */}
              <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
                <div className="section-label mb-4">Recommended Kite</div>
                {score?.recommendedKiteSize !== undefined ? (
                  <div className="flex items-baseline gap-2">
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 56,
                        color: ACCENT,
                        lineHeight: 1,
                      }}
                    >
                      {score.recommendedKiteSize}
                    </span>
                    <span className="text-sm" style={{ color: "var(--neutral-300)" }}>m²</span>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--neutral-200)" }}>
                    Add kites to your profile to get size recommendations —{" "}
                    <Link href="/kitesurf/gear" className="underline" style={{ color: ACCENT }}>
                      go to gear
                    </Link>
                    .
                  </p>
                )}
              </div>

              {/* ── Tides ── */}
              <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
                <div className="section-label mb-4">Tides</div>
                {tidesAvailable && tides ? (
                  <>
                    {tides.current_height_m != null && (
                      <div className="mb-4">
                        <div className="text-sm" style={{ color: "var(--neutral-300)" }}>Current height</div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 36,
                            color: "var(--white)",
                            lineHeight: 1.1,
                          }}
                        >
                          {tides.current_height_m.toFixed(2)} m
                        </div>
                      </div>
                    )}
                    <ul className="space-y-2 text-sm" style={{ color: "var(--neutral-200)", fontFamily: "var(--font-mono)" }}>
                      {tides.extremes.slice(0, 4).map((e, i) => (
                        <li key={i} className="flex gap-2">
                          <span
                            className="font-semibold"
                            style={{ color: e.type === "high" ? ACCENT : "var(--neutral-300)", minWidth: 48 }}
                          >
                            {e.type === "high" ? "High" : "Low"}
                          </span>
                          <span>·</span>
                          <span>{formatTideTime(e.time)}</span>
                          <span>·</span>
                          <span>{e.height_m.toFixed(2)}m</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: "var(--neutral-200)" }}>
                    Tides: inland location — not applicable
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
