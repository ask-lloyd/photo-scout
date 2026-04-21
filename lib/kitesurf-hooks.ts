"use client";

import { useState, useEffect, useCallback } from "react";
import type { Kite, Board, KitesurfGearProfile, WindConditions, TideData } from "./kitesurf-types";

// ─── Kite & Board catalog (scraped data served statically) ───
export function useKiteCatalog() {
  const [kites, setKites] = useState<Kite[]>([]);
  useEffect(() => {
    fetch("/data/kitesurf-gear/kites.json")
      .then((r) => r.json())
      .then(setKites)
      .catch(() => setKites([]));
  }, []);
  return kites;
}

export function useBoardCatalog() {
  const [boards, setBoards] = useState<Board[]>([]);
  useEffect(() => {
    fetch("/data/kitesurf-gear/boards.json")
      .then((r) => r.json())
      .then(setBoards)
      .catch(() => setBoards([]));
  }, []);
  return boards;
}

// ─── Per-activity gear profile (localStorage) ───
const KITESURF_GEAR_KEY = "conditionsscout-gear:kitesurf";

const DEFAULT_KITESURF_GEAR: KitesurfGearProfile = {
  kites: [],
  boards: [],
  spots: [],
};

export function useKitesurfGearProfile() {
  const [gear, setGear] = useState<KitesurfGearProfile>(DEFAULT_KITESURF_GEAR);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KITESURF_GEAR_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.kites) parsed.kites = [];
        if (!parsed.boards) parsed.boards = [];
        if (!parsed.spots) parsed.spots = [];
        setGear(parsed);
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const updateGear = useCallback((updates: Partial<KitesurfGearProfile>) => {
    setGear((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(KITESURF_GEAR_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { gear, updateGear, loaded };
}

// ─── Wind data (multi-model consensus) ───
export interface WindModelReading {
  id: string;
  label: string;
  speed_knots: number;
  gust_knots: number;
  direction_deg: number;
  direction_label: string;
}

export interface WindResponse extends WindConditions {
  confidence: "high" | "moderate" | "low";
  spread_knots: number;
  models: WindModelReading[];
}

export function useWind(lat: number | undefined, lng: number | undefined) {
  const [wind, setWind] = useState<WindResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWind = useCallback(async () => {
    if (lat === undefined || lng === undefined) return;
    try {
      const res = await fetch(`/api/wind?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Failed to fetch wind");
      const json = await res.json();
      // API returns { consensus, confidence, spread_knots, models }
      if (json.consensus) {
        setWind({
          ...json.consensus,
          confidence: json.confidence,
          spread_knots: json.spread_knots,
          models: json.models ?? [],
        });
      } else {
        // Backward compat: old flat shape
        setWind(json);
      }
    } catch (e) {
      console.error("Wind fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchWind();
    const interval = setInterval(fetchWind, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWind]);

  return { wind, loading, refetch: fetchWind };
}

// ─── Tides (global via Stormglass or fallback) ───
export function useTides(lat: number | undefined, lng: number | undefined) {
  const [tides, setTides] = useState<TideData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTides = useCallback(async () => {
    if (lat === undefined || lng === undefined) return;
    try {
      const res = await fetch(`/api/tides?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Failed to fetch tides");
      const json = await res.json();
      setTides(json);
    } catch (e) {
      console.error("Tides fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchTides();
    const interval = setInterval(fetchTides, 60 * 60 * 1000); // hourly
    return () => clearInterval(interval);
  }, [fetchTides]);

  return { tides, loading, refetch: fetchTides };
}

// ─── Planning location (text search → geocoded override) ───
const PLANNING_LOCATION_KEY = "conditionsscout-planning-location";

export interface PlanningLocation {
  name: string;
  lat: number;
  lng: number;
}

export function usePlanningLocation() {
  const [loc, setLoc] = useState<PlanningLocation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PLANNING_LOCATION_KEY);
      if (stored) setLoc(JSON.parse(stored));
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const setLocation = useCallback((l: PlanningLocation | null) => {
    setLoc(l);
    try {
      if (l) localStorage.setItem(PLANNING_LOCATION_KEY, JSON.stringify(l));
      else localStorage.removeItem(PLANNING_LOCATION_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { location: loc, setLocation, loaded };
}

// ─── Geocoding (Open-Meteo primary, OSM Nominatim fallback for lakes/regions/comma queries) ───
export async function geocodeSearch(q: string): Promise<PlanningLocation[]> {
  const query = q.trim();
  if (!query) return [];

  const byKey = new Map<string, PlanningLocation>();
  const add = (loc: PlanningLocation) => {
    const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
    if (!byKey.has(key)) byKey.set(key, loc);
  };

  // 1. Try Open-Meteo with the raw query and (if it has a comma) the part before the comma.
  const omQueries = [query];
  if (query.includes(",")) omQueries.push(query.split(",")[0].trim());

  await Promise.all(
    omQueries.map(async (term) => {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          term
        )}&count=5&language=en&format=json`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        for (const r of json.results ?? []) {
          add({
            name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
            lat: r.latitude,
            lng: r.longitude,
          });
        }
      } catch {
        // ignore
      }
    })
  );

  // 2. Always hit Nominatim too — it handles lakes, regions, landmarks, comma queries.
  //    Free, no API key, but requires a User-Agent (browsers add one automatically).
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=8&accept-language=en`;
    const res = await fetch(nominatimUrl);
    if (res.ok) {
      const rows: Array<{
        display_name: string;
        lat: string;
        lon: string;
        type?: string;
        class?: string;
      }> = await res.json();
      for (const r of rows) {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        if (!isFinite(lat) || !isFinite(lng)) continue;
        // Shorten display name: take first 3 comma-parts
        const short = r.display_name.split(",").slice(0, 3).join(", ").trim();
        add({ name: short || r.display_name, lat, lng });
      }
    }
  } catch {
    // ignore
  }

  // Sort so Open-Meteo hits (admin areas) stay first; Nominatim fills the rest
  return Array.from(byKey.values()).slice(0, 8);
}
