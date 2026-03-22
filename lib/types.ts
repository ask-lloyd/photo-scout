// ─── Camera ───
export interface Camera {
  id: string;
  make: string;
  model: string;
  sensor_size: "full_frame" | "apsc" | "micro43";
  megapixels: number;
  base_iso: number;
  max_usable_iso: number;
  dynamic_range_ev: number;
  has_ibis: boolean;
  ibis_stops: number;
  burst_fps: number;
  mount: string;
  tags: string[];
  body_html?: string;
}

// ─── Lens ───
export interface Lens {
  id: string;
  make: string;
  model: string;
  mount: string[];
  focal_length_min: number;
  focal_length_max: number;
  max_aperture: number;
  min_aperture: number;
  has_is: boolean;
  is_stops: number;
  weight_g: number;
  filter_size_mm: number;
  tags: string[];
  body_html?: string;
}

// ─── Spot ───
export interface Spot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_ft: number;
  facing_direction: number;
  best_time: string[];
  best_season: string[];
  tags: string[];
  parking: string;
  body_html?: string;
}

// ─── Shooting Guide ───
export interface ShootingGuide {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  tags: string[];
  body_html?: string;
}

// ─── Settings Rule ───
export interface SettingsRule {
  id: string;
  title: string;
  category: string;
  tags: string[];
  body_html?: string;
}

// ─── Light Engine ───
export interface LightConditions {
  score: number;
  character: string[];
  colorTemperature: { min: number; max: number; label: string };
  directionToFace: { bearing: number; label: string };
  sunAltitude: number;
  sunAzimuth: number;
  lightPhase: string;
  components: {
    sunAltitude: number;
    cloud: number;
    atmospheric: number;
    special: number;
  };
}

export interface LightWindow {
  name: string;
  start: Date;
  end: Date;
  score: number;
  character: string[];
  phase: string;
}

export interface WeatherData {
  cloudCoverTotal: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  humidity: number;
  visibility: number;
  temperature: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
}

// ─── Settings Advisor ───
export interface SettingsRecommendation {
  aperture: number;
  shutterSpeed: string;
  iso: number;
  whiteBalance: number;
  focalLengthSuggestion: string;
  filterRecommendation: string[];
  exposureValue: number;
  hyperfocalDistance: number | null;
  style: string;
  tips: string[];
}

export interface GearProfile {
  camera: Camera | null;
  lenses: Lens[];
  hasTripod: boolean;
  shootingStyles: string[];
  primaryStyle?: string;
  tripodAvailability?: string;
  scanRadius?: string;
  notificationPreference?: string;
}
