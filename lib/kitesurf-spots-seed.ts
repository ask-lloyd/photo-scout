/**
 * Seed list of well-known kitesurfing spots worldwide.
 *
 * preferredBearing = direction the shore faces (degrees, 0=N).
 * Wind coming FROM that bearing = onshore (safest).
 */

import type { KitesurfSpot } from "@/lib/kitesurf-types";

export interface SeedSpot extends KitesurfSpot {
  country: string;
  wind_season: string;
  best_wind_kts: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const SEED_KITESURF_SPOTS: SeedSpot[] = [
  // North America — Texas / Gulf
  { id: "isla-blanca-tx", name: "Isla Blanca Park", country: "USA", lat: 26.0731, lng: -97.1528, preferredBearing: 135, notes: "Shallow flat-water paradise in South Padre Island.", wind_season: "Mar–Sep", best_wind_kts: "15-25", difficulty: "beginner" },
  { id: "bird-island-tx", name: "Bird Island Basin", country: "USA", lat: 27.4303, lng: -97.3017, notes: "Padre Island National Seashore — classic Texas flatwater.", preferredBearing: 135, wind_season: "Mar–Sep", best_wind_kts: "15-25", difficulty: "beginner" },
  { id: "corpus-oleander", name: "Oleander Point (Corpus Christi)", country: "USA", lat: 27.768, lng: -97.392, preferredBearing: 135, wind_season: "Mar–Sep", best_wind_kts: "15-22", difficulty: "intermediate" },
  // North America — East Coast
  { id: "cape-hatteras-nc", name: "Cape Hatteras (Canadian Hole)", country: "USA", lat: 35.3489, lng: -75.5006, preferredBearing: 90, notes: "Legendary East Coast spot.", wind_season: "Mar–Jun, Sep–Nov", best_wind_kts: "15-25", difficulty: "intermediate" },
  { id: "long-beach-ny", name: "Long Beach, NY", country: "USA", lat: 40.5884, lng: -73.6579, preferredBearing: 180, wind_season: "Apr–Nov", best_wind_kts: "12-22", difficulty: "intermediate" },
  // North America — West Coast / Hawaii
  { id: "crissy-field-ca", name: "Crissy Field, San Francisco", country: "USA", lat: 37.8056, lng: -122.4664, preferredBearing: 270, wind_season: "Apr–Sep", best_wind_kts: "18-28", difficulty: "advanced" },
  { id: "sherman-island-ca", name: "Sherman Island (Rio Vista)", country: "USA", lat: 38.054, lng: -121.798, preferredBearing: 240, wind_season: "May–Sep", best_wind_kts: "18-30", difficulty: "intermediate" },
  { id: "kanaha-maui", name: "Kanaha Beach Park, Maui", country: "USA", lat: 20.9, lng: -156.43, preferredBearing: 60, notes: "Trade-wind heaven.", wind_season: "Apr–Oct", best_wind_kts: "18-28", difficulty: "intermediate" },
  { id: "hookipa-maui", name: "Hoʻokipa, Maui", country: "USA", lat: 20.934, lng: -156.357, preferredBearing: 30, notes: "Wave-riding, experts only.", wind_season: "Apr–Oct", best_wind_kts: "18-30", difficulty: "advanced" },
  // Mexico / Caribbean
  { id: "la-ventana-mx", name: "La Ventana", country: "Mexico", lat: 24.048, lng: -109.993, preferredBearing: 0, notes: "El Norte winter winds, flat water.", wind_season: "Nov–Mar", best_wind_kts: "15-25", difficulty: "beginner" },
  { id: "cabarete-do", name: "Cabarete", country: "Dominican Republic", lat: 19.758, lng: -70.416, preferredBearing: 0, wind_season: "Jan–Aug", best_wind_kts: "15-25", difficulty: "intermediate" },
  { id: "tulum-mx", name: "Tulum", country: "Mexico", lat: 20.215, lng: -87.429, preferredBearing: 90, wind_season: "Nov–May", best_wind_kts: "12-22", difficulty: "beginner" },
  { id: "atins-br", name: "Atins, Lençóis Maranhenses", country: "Brazil", lat: -2.583, lng: -42.734, preferredBearing: 45, wind_season: "Jul–Dec", best_wind_kts: "18-28", difficulty: "intermediate" },
  // Europe
  { id: "tarifa-es", name: "Tarifa (Valdevaqueros)", country: "Spain", lat: 36.068, lng: -5.696, preferredBearing: 90, notes: "Levante/Poniente — Europe's capital.", wind_season: "Apr–Oct", best_wind_kts: "18-35", difficulty: "intermediate" },
  { id: "leucate-fr", name: "Leucate / La Franqui", country: "France", lat: 42.935, lng: 3.046, preferredBearing: 45, notes: "Tramontane winds.", wind_season: "Apr–Oct", best_wind_kts: "15-30", difficulty: "intermediate" },
  { id: "fuerteventura-es", name: "Fuerteventura (Sotavento)", country: "Spain", lat: 28.097, lng: -14.241, preferredBearing: 30, wind_season: "Apr–Oct", best_wind_kts: "18-30", difficulty: "intermediate" },
  { id: "dakhla-ma", name: "Dakhla Lagoon", country: "Morocco", lat: 23.72, lng: -15.94, preferredBearing: 45, wind_season: "Mar–Oct", best_wind_kts: "15-28", difficulty: "beginner" },
  { id: "essaouira-ma", name: "Essaouira", country: "Morocco", lat: 31.508, lng: -9.77, preferredBearing: 45, wind_season: "Apr–Sep", best_wind_kts: "18-30", difficulty: "intermediate" },
  // Asia / Pacific
  { id: "boracay-ph", name: "Bulabog Beach, Boracay", country: "Philippines", lat: 11.974, lng: 121.939, preferredBearing: 45, wind_season: "Nov–Apr", best_wind_kts: "12-22", difficulty: "beginner" },
  { id: "mui-ne-vn", name: "Mui Ne", country: "Vietnam", lat: 10.933, lng: 108.287, preferredBearing: 45, wind_season: "Nov–Apr", best_wind_kts: "15-25", difficulty: "beginner" },
  { id: "hayling-uk", name: "Hayling Island", country: "UK", lat: 50.782, lng: -0.994, preferredBearing: 180, wind_season: "All year", best_wind_kts: "12-22", difficulty: "intermediate" },
  { id: "st-peter-ording-de", name: "St. Peter-Ording", country: "Germany", lat: 54.31, lng: 8.633, preferredBearing: 270, wind_season: "Apr–Oct", best_wind_kts: "12-22", difficulty: "beginner" },
  // Australia / NZ
  { id: "st-kilda-au", name: "St Kilda, Melbourne", country: "Australia", lat: -37.867, lng: 144.975, preferredBearing: 225, wind_season: "Sep–Apr", best_wind_kts: "15-25", difficulty: "intermediate" },
  { id: "safety-bay-au", name: "Safety Bay, Perth", country: "Australia", lat: -32.297, lng: 115.73, preferredBearing: 225, wind_season: "Nov–Mar", best_wind_kts: "18-28", difficulty: "intermediate" },
];

export function nearestSpots(
  lat: number,
  lng: number,
  radiusKm = 200,
  limit = 10
): (SeedSpot & { distance_km: number })[] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  return SEED_KITESURF_SPOTS.map((s) => {
    const dLat = toRad(s.lat - lat);
    const dLng = toRad(s.lng - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(s.lat)) * Math.sin(dLng / 2) ** 2;
    const distance_km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { ...s, distance_km };
  })
    .filter((s) => s.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);
}
