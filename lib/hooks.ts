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

const DEFAULT_CAMERA: Camera = {
  id: "sony-a7rv", make: "Sony", model: "A7R V",
  sensor_size: "full_frame", megapixels: 61, base_iso: 100,
  max_usable_iso: 12800, dynamic_range_ev: 14.7, has_ibis: true,
  ibis_stops: 8, burst_fps: 10, mount: "sony_e",
  tags: ["landscape", "resolution"],
};

const DEFAULT_LENS: Lens = {
  id: "sony-fe-24-70-f28-gm-ii", make: "Sony", model: "FE 24-70mm f/2.8 GM II",
  mount: ["sony_e"], focal_length_min: 24, focal_length_max: 70,
  max_aperture: 2.8, min_aperture: 22, has_is: false, is_stops: 0,
  weight_g: 695, filter_size_mm: 82, tags: ["standard-zoom", "professional"],
};

export function useGearProfile() {
  const [gear, setGear] = useState<GearProfile>({
    camera: DEFAULT_CAMERA,
    lenses: [DEFAULT_LENS],
    hasTripod: false,
    shootingStyles: ["landscape"],
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

// ─── Opportunities (live from scanner) ───
import type { Opportunity } from "./types";

export function useOpportunities(lat: number | undefined, lng: number | undefined, locationName?: string) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpps = useCallback(async () => {
    if (lat === undefined || lng === undefined) return;
    try {
      const nameParam = locationName ? `&name=${encodeURIComponent(locationName)}` : "";
      const res = await fetch(`/api/opportunities?lat=${lat}&lng=${lng}&days=7${nameParam}`);
      if (!res.ok) throw new Error("Failed to fetch opportunities");
      const json = await res.json();
      setOpportunities(json.opportunities ?? []);
    } catch (e) {
      console.error("Opportunities fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, locationName]);

  useEffect(() => {
    fetchOpps();
    // Refresh every 15 min (opportunities don't change as fast as light)
    const interval = setInterval(fetchOpps, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchOpps]);

  return { opportunities, loading, refetch: fetchOpps };
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
