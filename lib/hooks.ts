import { useState, useEffect, useCallback } from "react";
import type { Camera, Lens, Filter, GearProfile, LightConditions, WeatherData, LightWindow, Spot } from "./types";

// ─── Geolocation ───
// Reverse geocode coords → "City, Region/CC" using BigDataCloud's free,
// no-key client endpoint. Falls back to a coords string on failure.
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (!res.ok) throw new Error("reverse geocode failed");
    const j = await res.json();
    const city =
      j.city ||
      j.locality ||
      j.localityInfo?.administrative?.[3]?.name ||
      j.localityInfo?.administrative?.[2]?.name ||
      "";
    const region =
      j.principalSubdivisionCode?.split("-")[1] ||
      j.principalSubdivision ||
      j.countryCode ||
      "";
    if (city && region) return `${city}, ${region}`;
    if (city) return city;
    if (region) return region;
  } catch {
    // fall through
  }
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Locating…");
  const [usingFallback, setUsingFallback] = useState(false);
  const [manualOverride, setManualOverride] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // Allow manual override (persisted)
  const setManualLocation = useCallback((lat: number, lng: number, name: string) => {
    const next = { lat, lng, name };
    setManualOverride(next);
    setCoords({ lat, lng });
    setLocationName(name);
    setUsingFallback(false);
    setError(null);
    setLoading(false);
    try {
      localStorage.setItem("ps_manual_location", JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const clearManualLocation = useCallback(() => {
    setManualOverride(null);
    try {
      localStorage.removeItem("ps_manual_location");
    } catch {
      // ignore
    }
    // Re-trigger geolocation
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setUsingFallback(false);
          setLoading(false);
          reverseGeocode(pos.coords.latitude, pos.coords.longitude).then((name) => {
            setLocationName(name);
          });
        },
        () => {
          setCoords({ lat: 30.628, lng: -97.6781 });
          setLocationName("Georgetown, TX (fallback — location denied)");
          setUsingFallback(true);
          setError("Geolocation denied");
          setLoading(false);
        },
        { timeout: 8000, enableHighAccuracy: false, maximumAge: 5 * 60 * 1000 }
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Check for manual override first
    try {
      const stored = localStorage.getItem("ps_manual_location");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          setManualOverride(parsed);
          setCoords({ lat: parsed.lat, lng: parsed.lng });
          setLocationName(parsed.name || "Manual location");
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    const apply = (lat: number, lng: number, fallbackName: string, isFallback: boolean) => {
      if (cancelled) return;
      setCoords({ lat, lng });
      setLocationName(fallbackName);
      setUsingFallback(isFallback);
      setLoading(false);
      reverseGeocode(lat, lng).then((name) => {
        if (!cancelled) {
          setLocationName(isFallback ? `${name} (fallback — location denied)` : name);
        }
      });
    };

    if (!navigator.geolocation) {
      apply(30.628, -97.6781, "Georgetown, TX", true);
      setError("Geolocation unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => apply(pos.coords.latitude, pos.coords.longitude, "Current Location", false),
      () => {
        apply(30.628, -97.6781, "Georgetown, TX", true);
        setError("Geolocation denied");
      },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 5 * 60 * 1000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, error, loading, locationName, usingFallback, manualOverride, setManualLocation, clearManualLocation };
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

// Ryan's filters: 67mm CPL fits the Sigma 100-400 DGDN; 82mm Variable ND
// fits the FE 24-70 f/2.8 GM II.
const DEFAULT_FILTERS: Filter[] = [
  {
    id: "promaster-67mm-cpl",
    make: "Promaster",
    model: "67mm CPL",
    type: "cpl",
    filter_size_mm: 67,
    tags: ["polarizer"],
  },
  {
    id: "promaster-82mm-variable-nd",
    make: "Promaster",
    model: "82mm Variable ND",
    type: "variable_nd",
    filter_size_mm: 82,
    nd_stops_min: 1,
    nd_stops_max: 9,
    tags: ["nd"],
  },
];

export function useGearProfile() {
  const [gear, setGear] = useState<GearProfile>({
    camera: DEFAULT_CAMERA,
    lenses: [DEFAULT_LENS],
    filters: DEFAULT_FILTERS,
    hasTripod: false,
    shootingStyles: ["landscape"],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GEAR_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Backfill fields added after earlier saves
        if (!parsed.filters || parsed.filters.length === 0) {
          parsed.filters = DEFAULT_FILTERS;
        }
        setGear(parsed);
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

export function useSpots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  useEffect(() => {
    fetch("/data/spots/index.json")
      .then((r) => r.json())
      .then(setSpots)
      .catch(() => setSpots([]));
  }, []);
  return spots;
}

export function useFilters() {
  const [filters, setFilters] = useState<Filter[]>([]);
  useEffect(() => {
    fetch("/data/filters/index.json")
      .then((r) => r.json())
      .then(setFilters)
      .catch(() => setFilters([]));
  }, []);
  return filters;
}
