"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { NavHeader } from "@/components/nav-header";
import { useGeolocation } from "@/lib/hooks";
import { usePlanningLocation, useKitesurfGearProfile } from "@/lib/kitesurf-hooks";
import { scoreKitesurf } from "@/lib/kitesurf-scorer";

interface NearbySpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  source: "seed" | "osm";
  preferredBearing?: number;
  country?: string;
  notes?: string;
  wind_season?: string;
  best_wind_kts?: string;
  difficulty?: string;
}

interface SpotWindData {
  speed_knots: number;
  gust_knots: number;
  direction_deg: number;
  direction_label: string;
  confidence: "high" | "moderate" | "low";
  spread_knots: number;
}

const ACCENT = "#4cc9f0";

function verdictColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#4cc9f0";
  if (score >= 40) return "#facc15";
  return "#ef4444";
}

function verdictLabel(score: number): string {
  if (score >= 80) return "EPIC";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "MARGINAL";
  return "SKIP";
}

export default function KitesurfSpotsPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const { coords, locationName } = useGeolocation();
  const { location: planningLoc } = usePlanningLocation();
  const { gear } = useKitesurfGearProfile();

  const activeLat = planningLoc?.lat ?? coords?.lat;
  const activeLng = planningLoc?.lng ?? coords?.lng;
  const activeName = planningLoc?.name ?? locationName;

  const [spots, setSpots] = useState<NearbySpot[]>([]);
  const [spotConditions, setSpotConditions] = useState<Record<string, { wind: SpotWindData; score: number }>>({});
  const [selected, setSelected] = useState<NearbySpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(200);

  // Fetch nearby spots
  useEffect(() => {
    if (activeLat === undefined || activeLng === undefined) return;
    setLoading(true);
    fetch(`/api/kitesurf-spots?lat=${activeLat}&lng=${activeLng}&radiusKm=${radiusKm}`)
      .then((r) => r.json())
      .then((data) => {
        setSpots(data.spots ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeLat, activeLng, radiusKm]);

  // Fetch wind per spot (limited parallel)
  useEffect(() => {
    if (!spots.length) return;
    let cancelled = false;
    const top = spots.slice(0, 12); // keep to a sensible number
    Promise.all(
      top.map(async (s) => {
        try {
          const r = await fetch(`/api/wind?lat=${s.lat}&lng=${s.lng}`);
          if (!r.ok) return null;
          const j = await r.json();
          if (!j.consensus) return null;
          const wind = {
            speed_knots: j.consensus.speed_knots,
            gust_knots: j.consensus.gust_knots,
            direction_deg: j.consensus.direction_deg,
            direction_label: j.consensus.direction_label,
            confidence: j.confidence,
            spread_knots: j.spread_knots,
          };
          const score = scoreKitesurf({
            wind,
            preferredBearing: s.preferredBearing,
            ownedKites: gear.kites,
            riderWeightKg: gear.weightKg,
          });
          return { id: s.id, wind, score: score.score };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, { wind: SpotWindData; score: number }> = {};
      for (const r of results) {
        if (r) next[r.id] = { wind: r.wind, score: r.score };
      }
      setSpotConditions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [spots, gear.kites, gear.weightKg]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (activeLat === undefined || activeLng === undefined) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [activeLng, activeLat],
      zoom: 7,
    });
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [activeLat, activeLng]);

  // Re-center when location changes
  useEffect(() => {
    if (!mapRef.current || activeLat === undefined || activeLng === undefined) return;
    mapRef.current.flyTo({ center: [activeLng, activeLat], zoom: 7, duration: 800 });
  }, [activeLat, activeLng]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // User pin
    if (activeLat !== undefined && activeLng !== undefined) {
      const el = document.createElement("div");
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${ACCENT};border:2px solid white;box-shadow:0 0 0 4px rgba(76,201,240,0.25);`;
      const userMarker = new maplibregl.Marker({ element: el })
        .setLngLat([activeLng, activeLat])
        .addTo(mapRef.current);
      markersRef.current.push(userMarker);
    }

    spots.forEach((s) => {
      const cond = spotConditions[s.id];
      const score = cond?.score;
      const color = score !== undefined ? verdictColor(score) : "#888";
      const el = document.createElement("div");
      el.style.cssText = `width:26px;height:26px;border-radius:50%;background:${color};border:2px solid rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font-mono);`;
      el.textContent = score !== undefined ? String(score) : "·";
      el.onclick = () => setSelected(s);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([s.lng, s.lat])
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  }, [spots, spotConditions, activeLat, activeLng]);

  const close = useCallback(() => setSelected(null), []);

  return (
    <>
      <NavHeader locationName={activeName ?? "Unknown"} />
      <main className="pt-14">
        <div className="relative" style={{ height: "calc(100vh - 3.5rem)" }}>
          <div ref={mapContainerRef} className="absolute inset-0" />

          {/* Top overlay: header + radius */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 pointer-events-none">
            <div
              className="rounded-2xl px-4 py-3 pointer-events-auto overlay-panel"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.08)",
                maxWidth: 360,
              }}
            >
              <div className="section-label mb-1">Kitesurf Spots</div>
              <div className="text-sm" style={{ color: "var(--neutral-200)" }}>
                {loading
                  ? "Finding nearby spots…"
                  : `${spots.length} spots within ${radiusKm} km of ${activeName}`}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-[11px]" style={{ color: "var(--neutral-300)" }}>
                  Radius
                </label>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={25}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span
                  className="text-[11px]"
                  style={{ color: "var(--neutral-200)", fontFamily: "var(--font-mono)", minWidth: 50, textAlign: "right" }}
                >
                  {radiusKm} km
                </span>
              </div>
            </div>

            {/* Legend */}
            <div
              className="rounded-2xl px-3 py-2 pointer-events-auto hidden sm:block overlay-panel"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--neutral-300)" }}>
                Session Score
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--neutral-200)" }}>
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#22c55e" }} /> 80+
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#4cc9f0" }} /> 60+
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#facc15" }} /> 40+
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#ef4444" }} /> skip
              </div>
            </div>
          </div>

          {/* Bottom flyout: selected spot details */}
          {selected && (
            <div
              className="absolute left-4 right-4 rounded-2xl p-5 pointer-events-auto overlay-panel-strong"
              style={{
                bottom: 16,
                maxWidth: 480,
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 20,
                      color: "var(--white)",
                    }}
                  >
                    {selected.name}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--neutral-300)" }}>
                    {selected.country ?? "—"} · {selected.distance_km.toFixed(0)} km away
                    {selected.source === "osm" ? " · from OpenStreetMap" : ""}
                  </div>
                </div>
                <button
                  onClick={close}
                  className="text-[var(--neutral-300)] hover:text-white cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {spotConditions[selected.id] ? (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-lg p-3 surface-subtle">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--neutral-300)" }}>
                      Wind Now
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: ACCENT }}>
                      {Math.round(spotConditions[selected.id].wind.speed_knots)} kt
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--neutral-200)" }}>
                      Gust {Math.round(spotConditions[selected.id].wind.gust_knots)} · {spotConditions[selected.id].wind.direction_label}
                    </div>
                  </div>
                  <div className="rounded-lg p-3 surface-subtle">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--neutral-300)" }}>
                      Session Score
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: verdictColor(spotConditions[selected.id].score),
                      }}
                    >
                      {spotConditions[selected.id].score}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--neutral-200)" }}>
                      {verdictLabel(spotConditions[selected.id].score)} · {spotConditions[selected.id].wind.confidence} conf.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] mt-2" style={{ color: "var(--neutral-300)" }}>
                  Loading live wind…
                </div>
              )}

              {selected.source === "seed" && (selected.wind_season || selected.best_wind_kts) && (
                <div
                  className="mt-3 text-[12px] space-y-1"
                  style={{ color: "var(--neutral-200)", fontFamily: "var(--font-mono)" }}
                >
                  {selected.wind_season && <div>Season: {selected.wind_season}</div>}
                  {selected.best_wind_kts && <div>Typical wind: {selected.best_wind_kts} kt</div>}
                  {selected.difficulty && <div>Difficulty: {selected.difficulty}</div>}
                  {selected.preferredBearing !== undefined && (
                    <div>Shore faces: {selected.preferredBearing}°</div>
                  )}
                </div>
              )}
              {selected.notes && (
                <div className="mt-3 text-[12px]" style={{ color: "var(--neutral-200)" }}>
                  {selected.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
