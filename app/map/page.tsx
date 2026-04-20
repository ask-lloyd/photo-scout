"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import SunCalc from "suncalc";
import { Layers, X } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import type { Spot } from "@/lib/types";

// Georgetown, TX
const CENTER_LNG = -97.6781;
const CENTER_LAT = 30.6280;

interface SpotWithScore extends Spot {
  score: number;
  description: string;
}

function computeScore(spot: Spot): number {
  const highTags = ["sunset", "golden-hour", "sunrise", "panoramic", "iconic", "dramatic"];
  const midTags = ["overlook", "lake", "skyline", "canyon", "astro", "dark-sky"];
  let score = 45;
  for (const tag of spot.tags) {
    if (highTags.includes(tag)) score += 8;
    else if (midTags.includes(tag)) score += 5;
    else score += 2;
  }
  if (spot.best_time.includes("golden_evening") || spot.best_time.includes("sunset")) score += 5;
  return Math.min(score, 95);
}

import { LightScore, lightScoreColor } from "@/components/light-score";

function scoreColor(score: number): string {
  if (score >= 70) return "#f97316";
  if (score >= 50) return "#3b82f6";
  return "#333333";
}

function bearingToLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function minutesToTimeStr(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function buildShadowGeoJSON(timeMinutes: number): GeoJSON.FeatureCollection {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMinutes(timeMinutes);
  const pos = SunCalc.getPosition(d, CENTER_LAT, CENTER_LNG);

  if (pos.altitude <= 0) {
    // Sun below horizon — no shadow to show
    return { type: "FeatureCollection", features: [] };
  }

  // Shadow direction is opposite the sun azimuth
  const shadowAz = pos.azimuth + Math.PI;
  // Shadow length inversely proportional to sun altitude
  const shadowLen = 0.04 * (1 - pos.altitude / (Math.PI / 2)) + 0.005;
  const endLng = CENTER_LNG + shadowLen * Math.sin(shadowAz);
  const endLat = CENTER_LAT + shadowLen * Math.cos(shadowAz);

  // Build a narrow triangle for the shadow area
  const perpAz = shadowAz + Math.PI / 2;
  const spread = 0.008;
  const leftLng = endLng + spread * Math.sin(perpAz);
  const leftLat = endLat + spread * Math.cos(perpAz);
  const rightLng = endLng - spread * Math.sin(perpAz);
  const rightLat = endLat - spread * Math.cos(perpAz);

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [CENTER_LNG, CENTER_LAT],
            [endLng, endLat],
          ],
        },
      },
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [CENTER_LNG, CENTER_LAT],
              [leftLng, leftLat],
              [rightLng, rightLat],
              [CENTER_LNG, CENTER_LAT],
            ],
          ],
        },
      },
    ],
  };
}

function buildSunPathGeoJSON(date: Date): GeoJSON.FeatureCollection {
  const coords: [number, number][] = [];
  for (let h = 5; h <= 20; h += 0.25) {
    const t = new Date(date);
    t.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
    const pos = SunCalc.getPosition(t, CENTER_LAT, CENTER_LNG);
    if (pos.altitude < 0) continue;
    // Project sun position as offset from center for visualization
    const dist = 0.15 * (1 - pos.altitude / (Math.PI / 2));
    const az = pos.azimuth; // radians from south, clockwise
    const lng = CENTER_LNG + dist * Math.sin(az);
    const lat = CENTER_LAT + dist * Math.cos(az);
    coords.push([lng, lat]);
  }
  return {
    type: "FeatureCollection",
    features: coords.length > 1
      ? [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        ]
      : [],
  };
}

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [spots, setSpots] = useState<SpotWithScore[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SpotWithScore | null>(null);
  const [timeMinutes, setTimeMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  const [layers, setLayers] = useState({
    sunMoonPath: true,
    opportunitySpots: true,
    lightPollution: false,
    shadowOverlay: false,
    cloudRadar: false,
    terrain3d: false,
  });

  const toggleLayer = useCallback((key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Fetch spots
  useEffect(() => {
    fetch("/data/spots/index.json")
      .then((r) => r.json())
      .then((data: Spot[]) => {
        const withScores: SpotWithScore[] = data.map((s) => ({
          ...s,
          score: computeScore(s),
          description: `${s.tags.join(", ")} photography spot. Best visited during ${s.best_time.map((t) => t.replace(/_/g, " ")).join(", ")}.`,
        }));
        setSpots(withScores);
      })
      .catch(() => {});
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [CENTER_LNG, CENTER_LAT],
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    mapRef.current = map;

    map.on("load", () => {
      // Issue 1: Make basemap features visible against dark background
      try {
        map.setPaintProperty("background", "background-color", "#151821");
      } catch { /* layer may not exist */ }
      map.getStyle().layers.forEach((layer) => {
        try {
          if (layer.type === "line" && layer.id.includes("road")) {
            map.setPaintProperty(layer.id, "line-opacity", 0.8);
          }
          if (layer.type === "fill" && layer.id.includes("water")) {
            map.setPaintProperty(layer.id, "fill-color", "#1a2233");
          }
          if (layer.type === "symbol") {
            map.setPaintProperty(layer.id, "text-opacity", 0.9);
          }
        } catch { /* skip inaccessible layers */ }
      });

      // Sun path source and layer
      map.addSource("sun-path", {
        type: "geojson",
        data: buildSunPathGeoJSON(new Date()),
      });
      map.addLayer({
        id: "sun-path-line",
        type: "line",
        source: "sun-path",
        paint: {
          "line-color": "#f97316",
          "line-width": 2,
          "line-dasharray": [4, 4],
          "line-opacity": 0.7,
        },
      });

      // User location source
      map.addSource("user-location", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [CENTER_LNG, CENTER_LAT] },
            },
          ],
        },
      });
      // Outer pulse ring
      map.addLayer({
        id: "user-location-pulse",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 16,
          "circle-color": "#3b82f6",
          "circle-opacity": 0.2,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#3b82f6",
          "circle-stroke-opacity": 0.4,
        },
      });
      // Inner dot
      map.addLayer({
        id: "user-location-dot",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 6,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // ── Light Pollution (Bortle) source + layers ──
      const bortleZones = {
        type: "FeatureCollection" as const,
        features: [
          // Bortle 7-9: urban core (Georgetown, Round Rock, Austin)
          ...[
            [CENTER_LNG, CENTER_LAT],
            [-97.6789, 30.5083], // Round Rock
            [-97.7431, 30.2672], // Austin
          ].map((c) => ({
            type: "Feature" as const,
            properties: { bortle: 8, color: "#ef4444" },
            geometry: { type: "Point" as const, coordinates: c },
          })),
          // Bortle 5-6: suburban
          ...[
            [-97.82, 30.65],
            [-97.55, 30.60],
            [-97.60, 30.72],
            [-97.75, 30.50],
          ].map((c) => ({
            type: "Feature" as const,
            properties: { bortle: 5, color: "#f97316" },
            geometry: { type: "Point" as const, coordinates: c },
          })),
          // Bortle 3-4: rural
          ...[
            [-97.90, 30.75],
            [-97.40, 30.70],
            [-97.85, 30.45],
            [-97.45, 30.50],
          ].map((c) => ({
            type: "Feature" as const,
            properties: { bortle: 3, color: "#eab308" },
            geometry: { type: "Point" as const, coordinates: c },
          })),
          // Bortle 1-2: dark sky
          ...[
            [-98.05, 30.80],
            [-97.30, 30.75],
            [-98.00, 30.35],
            [-97.30, 30.45],
          ].map((c) => ({
            type: "Feature" as const,
            properties: { bortle: 1, color: "#22c55e" },
            geometry: { type: "Point" as const, coordinates: c },
          })),
        ],
      };
      map.addSource("bortle-zones", { type: "geojson", data: bortleZones });
      map.addLayer({
        id: "bortle-circles",
        type: "circle",
        source: "bortle-zones",
        paint: {
          "circle-radius": [
            "match", ["get", "bortle"],
            8, 60,
            5, 45,
            3, 35,
            1, 25,
            30,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.18,
          "circle-blur": 1,
        },
        layout: { visibility: "none" },
      });

      // ── Shadow Overlay source + layer ──
      map.addSource("shadow-overlay", {
        type: "geojson",
        data: buildShadowGeoJSON(timeMinutes),
      });
      map.addLayer({
        id: "shadow-direction",
        type: "line",
        source: "shadow-overlay",
        paint: {
          "line-color": "#6366f1",
          "line-width": 3,
          "line-opacity": 0.6,
        },
        layout: { visibility: "none" },
      });
      map.addLayer({
        id: "shadow-area",
        type: "fill",
        source: "shadow-overlay",
        paint: {
          "fill-color": "#1e1b4b",
          "fill-opacity": 0.25,
        },
        layout: { visibility: "none" },
      });

      // ── Cloud Radar source + layer ──
      const cloudFeatures = Array.from({ length: 12 }, (_, i) => ({
        type: "Feature" as const,
        properties: { radius: 20 + Math.random() * 40 },
        geometry: {
          type: "Point" as const,
          coordinates: [
            CENTER_LNG + (Math.random() - 0.5) * 0.5,
            CENTER_LAT + (Math.random() - 0.5) * 0.4,
          ],
        },
      }));
      map.addSource("cloud-radar", {
        type: "geojson",
        data: { type: "FeatureCollection", features: cloudFeatures },
      });
      map.addLayer({
        id: "cloud-circles",
        type: "circle",
        source: "cloud-radar",
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": "#94a3b8",
          "circle-opacity": 0.12,
          "circle-blur": 1.2,
        },
        layout: { visibility: "none" },
      });

    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update spot markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || spots.length === 0) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!layers.opportunitySpots) return;

    spots.forEach((spot) => {
      const color = scoreColor(spot.score);
      const el = document.createElement("div");
      el.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: ${color}; display: flex; align-items: center;
        justify-content: center; color: #fff; font-size: 11px;
        font-weight: 700; cursor: pointer;
        border: 2px solid rgba(255,255,255,0.2);
        box-shadow: 0 0 6px rgba(0,0,0,0.5), 0 0 2px rgba(212,135,45,0.3);
        transition: transform 0.15s;
      `;
      el.textContent = String(spot.score);
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedSpot(spot);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [spots, layers.opportunitySpots]);

  // Toggle sun path visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    try {
      map.setLayoutProperty(
        "sun-path-line",
        "visibility",
        layers.sunMoonPath ? "visible" : "none"
      );
    } catch {
      // layer might not exist yet
    }
  }, [layers.sunMoonPath]);

  // Update sun path + shadow when time scrubber changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    try {
      const sunSrc = map.getSource("sun-path") as maplibregl.GeoJSONSource | undefined;
      if (sunSrc) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        sunSrc.setData(buildSunPathGeoJSON(d));
      }
      const shadowSrc = map.getSource("shadow-overlay") as maplibregl.GeoJSONSource | undefined;
      if (shadowSrc) {
        shadowSrc.setData(buildShadowGeoJSON(timeMinutes));
      }
    } catch {
      // source might not exist yet
    }
  }, [timeMinutes]);

  // Toggle light pollution layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    try {
      map.setLayoutProperty(
        "bortle-circles",
        "visibility",
        layers.lightPollution ? "visible" : "none"
      );
    } catch { /* layer might not exist yet */ }
  }, [layers.lightPollution]);

  // Toggle shadow overlay layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    const vis = layers.shadowOverlay ? "visible" : "none";
    try {
      map.setLayoutProperty("shadow-direction", "visibility", vis);
      map.setLayoutProperty("shadow-area", "visibility", vis);
    } catch { /* layers might not exist yet */ }
  }, [layers.shadowOverlay]);

  // Toggle cloud radar layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    try {
      map.setLayoutProperty(
        "cloud-circles",
        "visibility",
        layers.cloudRadar ? "visible" : "none"
      );
    } catch { /* layer might not exist yet */ }
  }, [layers.cloudRadar]);

  // Toggle 3D terrain
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    try {
      if (layers.terrain3d) {
        if (!map.getSource("terrain-source")) {
          map.addSource("terrain-source", {
            type: "raster-dem",
            tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            encoding: "terrarium",
            tileSize: 256,
          });
        }
        const onSourceData = () => {
          try {
            map.setTerrain({ source: "terrain-source", exaggeration: 1.5 });
          } catch (e) {
            console.warn("Terrain not available:", e);
          }
          map.off("sourcedata", onSourceData);
        };
        map.on("sourcedata", onSourceData);
      } else {
        try { map.setTerrain(null); } catch {}
      }
    } catch {}
  }, [layers.terrain3d]);

  return (
    <>
      <NavHeader />
      <div className="flex flex-col h-[calc(100vh-56px)] pt-14 relative">
        {/* Map container */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* ─── Top-left: Time Scrubber (desktop only) ─── */}
        <div className="hidden md:block absolute top-18 left-4 z-10 glass rounded-xl p-4 w-72">
          <div className="text-[13px] font-semibold tracking-widest text-[var(--neutral-300)] mb-2">
            TIME SCRUBBER
          </div>
          <input
            type="range"
            min={0}
            max={1440}
            value={timeMinutes}
            onChange={(e) => setTimeMinutes(Number(e.target.value))}
            className="w-full accent-[#f97316] h-1.5 bg-neutral-700 rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[13px] text-[var(--neutral-300)] mt-1">
            <span>12 AM</span>
            <span className="text-[var(--neutral-200)] font-medium">
              {minutesToTimeStr(timeMinutes)}
            </span>
            <span>11:59 PM</span>
          </div>
        </div>

        {/* ─── Left below scrubber: Layers Panel (desktop only) ─── */}
        <div className="hidden md:block absolute top-44 left-4 z-10 glass rounded-xl p-4 w-72">
          <div className="text-[13px] font-semibold tracking-widest text-[var(--neutral-300)] mb-3">
            LAYERS
          </div>
          <div className="space-y-2">
            {([
              ["sunMoonPath", "Sun/Moon Path"],
              ["opportunitySpots", "Opportunity Spots"],
              ["lightPollution", "Light Pollution (Bortle)"],
              ["shadowOverlay", "Shadow Overlay"],
              ["cloudRadar", "Cloud Radar"],
              ["terrain3d", "3D Terrain"],
            ] as [keyof typeof layers, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => toggleLayer(key)}
                  className="accent-[#f97316]"
                />
                <span className="text-[var(--neutral-200)]">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ─── Bottom-left: Legend (desktop only) ─── */}
        <div className="hidden md:block absolute bottom-6 left-4 z-10 glass rounded-xl px-4 py-3">
          <div className="flex items-center gap-4 text-[13px]s">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f97316] inline-block" />
              <span className="text-[var(--neutral-200)]">High Score (70+)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block" />
              <span className="text-[var(--neutral-200)]">Moderate (50-69)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#333] inline-block" />
              <span className="text-[var(--neutral-200)]">Low (&lt;50)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block border-2 border-white" />
              <span className="text-[var(--neutral-200)]">You</span>
            </span>
          </div>
        </div>

        {/* ─── Mobile: Floating Layers Button ─── */}
        <button
          onClick={() => setMobileControlsOpen(true)}
          className="md:hidden absolute bottom-6 left-4 z-10 glass rounded-full p-3 text-[var(--neutral-200)] hover:text-[var(--white)] transition-colors cursor-pointer"
          aria-label="Open map controls"
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* ─── Mobile: Bottom Sheet Overlay ─── */}
        {mobileControlsOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 cursor-pointer"
              onClick={() => setMobileControlsOpen(false)}
            />
            {/* Bottom sheet */}
            <div className="absolute bottom-0 left-0 right-0 glass rounded-t-2xl p-4 pb-8 animate-slide-up">
              {/* Drag handle */}
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-neutral-600" />
              </div>
              {/* Close button */}
              <button
                onClick={() => setMobileControlsOpen(false)}
                className="absolute top-4 right-4 text-[var(--neutral-200)] hover:text-[var(--white)] transition-colors cursor-pointer"
                aria-label="Close controls"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Time Scrubber */}
              <div className="mb-5">
                <div className="text-[13px] font-semibold tracking-widest text-[var(--neutral-300)] mb-2">
                  TIME SCRUBBER
                </div>
                <input
                  type="range"
                  min={0}
                  max={1440}
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(Number(e.target.value))}
                  className="w-full accent-[#f97316] h-1.5 bg-neutral-700 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[13px] text-[var(--neutral-300)] mt-1">
                  <span>12 AM</span>
                  <span className="text-[var(--neutral-200)] font-medium">
                    {minutesToTimeStr(timeMinutes)}
                  </span>
                  <span>11:59 PM</span>
                </div>
              </div>

              {/* Layers */}
              <div>
                <div className="text-[13px] font-semibold tracking-widest text-[var(--neutral-300)] mb-3">
                  LAYERS
                </div>
                <div className="space-y-2">
                  {([
                    ["sunMoonPath", "Sun/Moon Path"],
                    ["opportunitySpots", "Opportunity Spots"],
                    ["lightPollution", "Light Pollution (Bortle)"],
                    ["shadowOverlay", "Shadow Overlay"],
                    ["cloudRadar", "Cloud Radar"],
                    ["terrain3d", "3D Terrain"],
                  ] as [keyof typeof layers, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layers[key]}
                        onChange={() => toggleLayer(key)}
                        className="accent-[#f97316]"
                      />
                      <span className="text-[var(--neutral-200)]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Right: Spot Detail Flyout ─── */}
        {selectedSpot && (
          <div className="absolute top-18 right-4 z-10 glass rounded-xl p-5 w-80">
            {/* Close button */}
            <button
              onClick={() => setSelectedSpot(null)}
              className="absolute top-3 right-3 text-[var(--neutral-300)] hover:text-[var(--neutral-200)] text-lg leading-none cursor-pointer"
              aria-label="Close"
            >
              &times;
            </button>

            {/* Name + location */}
            <h2 className="text-lg font-bold text-[var(--white)] pr-6">{selectedSpot.name}</h2>
            <p className="text-[13px]s text-[var(--neutral-300)] mt-0.5">
              {selectedSpot.latitude.toFixed(4)}, {selectedSpot.longitude.toFixed(4)}
              {" "}&middot;{" "}
              {Math.round(
                Math.sqrt(
                  Math.pow((selectedSpot.latitude - CENTER_LAT) * 69, 2) +
                  Math.pow((selectedSpot.longitude - CENTER_LNG) * 54.6, 2)
                )
              )}{" "}
              mi away
            </p>

            {/* Score badge */}
            <div className="mt-3">
              <LightScore score={selectedSpot.score} variant="badge" showLabel />
            </div>

            {/* Description */}
            <p className="text-sm text-[var(--neutral-200)] mt-3 leading-relaxed">
              {selectedSpot.description}
            </p>

            {/* Info rows */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--neutral-300)]">Best Time</span>
                <span className="text-[var(--neutral-200)]">
                  {selectedSpot.best_time.map((t) => t.replace(/_/g, " ")).join(", ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--neutral-300)]">Facing</span>
                <span className="text-[var(--neutral-200)]">
                  {bearingToLabel(selectedSpot.facing_direction)} ({selectedSpot.facing_direction}&deg;)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--neutral-300)]">Parking</span>
                <span className="text-[var(--neutral-200)] capitalize">{selectedSpot.parking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--neutral-300)]">Tags</span>
                <span className="text-[var(--neutral-200)]">{selectedSpot.tags.join(", ")}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-5 flex gap-2">
              <a
                href="/planner"
                className="flex-1 text-center px-4 py-2 rounded-lg bg-[#f97316] text-[#fff] text-sm font-semibold hover:bg-[#ea580c] transition-colors cursor-pointer"
              >
                Plan Shot &rarr;
              </a>
              <button className="px-4 py-2 rounded-lg bg-neutral-700 text-[var(--neutral-200)] text-sm font-semibold hover:bg-neutral-600 transition-colors cursor-pointer">
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
