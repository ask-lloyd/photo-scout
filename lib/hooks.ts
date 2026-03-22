import { useState, useEffect, useCallback } from "react";
import type { Camera, Lens, GearProfile, LightConditions, WeatherData, LightWindow } from "./types";

// ─── Geolocation ───
export function useGeolocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Georgetown, TX");

  useEffect(() => {
    if (!navigator.geolocation) {
      // Default to Georgetown, TX
      setCoords({ lat: 30.6280, lng: -97.6781 });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationName("Current Location");
        setLoading(false);
      },
      () => {
        // Default to Georgetown, TX — seamless fallback
        setCoords({ lat: 30.6280, lng: -97.6781 });
        setLoading(false);
      },
      { timeout: 5000 }
    );
  }, []);

  return { coords, error, loading, locationName };
}

// ─── Light Data ───
export function useLightData(lat: number | undefined, lng: number | undefined) {
  const [data, setData] = useState<{
    conditions: LightConditions;
    weather: WeatherData;
    windows: (LightWindow & { start: string; end: string })[];
    sun: { altitude: number; azimuth: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (lat === undefined || lng === undefined) return;
    try {
      const res = await fetch(`/api/light?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Light data error:", e);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

// ─── Gear Profile (localStorage) ───
const GEAR_KEY = "photoscout-gear";

export function useGearProfile() {
  const [gear, setGear] = useState<GearProfile>({
    camera: null,
    lenses: [],
    hasTripod: false,
    shootingStyles: [],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GEAR_KEY);
      if (stored) {
        setGear(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const updateGear = useCallback((updates: Partial<GearProfile>) => {
    setGear((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(GEAR_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { gear, updateGear, loaded };
}

// ─── Camera/Lens Database ───
export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  useEffect(() => {
    fetch("/data/cameras/index.json")
      .then((r) => r.json())
      .then(setCameras)
      .catch(() => setCameras([]));
  }, []);
  return cameras;
}

export function useLenses() {
  const [lenses, setLenses] = useState<Lens[]>([]);
  useEffect(() => {
    fetch("/data/lenses/index.json")
      .then((r) => r.json())
      .then(setLenses)
      .catch(() => setLenses([]));
  }, []);
  return lenses;
}
