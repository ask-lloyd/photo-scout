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

// ─── Wind data ───
export function useWind(lat: number | undefined, lng: number | undefined) {
  const [wind, setWind] = useState<WindConditions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWind = useCallback(async () => {
    if (lat === undefined || lng === undefined) return;
    try {
      const res = await fetch(`/api/wind?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Failed to fetch wind");
      const json = await res.json();
      setWind(json);
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

// ─── Geocoding via Open-Meteo (free, no key) ───
export async function geocodeSearch(q: string): Promise<PlanningLocation[]> {
  if (!q.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    q
  )}&count=5&language=en&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.results) return [];
    return json.results.map((r: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
      name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      lat: r.latitude,
      lng: r.longitude,
    }));
  } catch {
    return [];
  }
}
