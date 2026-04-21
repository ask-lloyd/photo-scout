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

// ─── Filter (CPL, ND, etc.) ───
export interface Filter {
  id: string;
  make: string;
  model: string;
  type: "cpl" | "nd" | "variable_nd" | "gnd" | "uv" | "diffusion" | "mist";
  filter_size_mm: number;
  nd_stops?: number;
  nd_stops_min?: number;
  nd_stops_max?: number;
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
  visibility: number;           // km (both fetchWeather and fetchForecast normalize to km)
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

export interface UserFilter extends Filter {
  attachedLensId?: string | null; // which lens this filter is mounted on
}

export interface GearProfile {
  camera: Camera | null;
  lenses: Lens[];
  filters: UserFilter[];
  hasTripod: boolean;
  shootingStyles: string[];
  primaryStyle?: string;
  tripodAvailability?: string;
  scanRadius?: string;
  notificationPreference?: string;
}

// ─── User Profile (R2-backed markdown) ───

export interface UserLocation {
  name: string;
  lat: number;
  lng: number;
  timezone: string;
}

export interface UserGearRef {
  ref: string;       // links to content/cameras/{ref}.md or content/lenses/{ref}.md
  primary?: boolean;
}

export interface UserAccessory {
  type: string;
  name: string;
}

export interface UserActivity {
  tier: "hot" | "warm" | "cold";
  last_active: string;          // ISO 8601
  last_agent_update: string;    // ISO 8601
  next_scheduled_update: string;// ISO 8601
  total_sessions: number;
}

export interface UserSubscription {
  plan: "free" | "pro";
  since?: string;               // ISO 8601
}

export interface UserPreferences {
  styles: string[];
  preferred_times: string[];
  experience: "beginner" | "intermediate" | "advanced" | "professional";
}

export interface UserProfileFrontmatter {
  id: string;
  name: string;
  email: string;
  image?: string;               // avatar URL from OAuth
  created: string;              // ISO 8601
  updated: string;              // ISO 8601

  location: {
    primary: UserLocation;
    saved: UserLocation[];
  };

  gear: {
    cameras: UserGearRef[];
    lenses: UserGearRef[];
    accessories: UserAccessory[];
  };

  preferences: UserPreferences;
  activity: UserActivity;
  subscription: UserSubscription;
}

export interface SessionLogEntry {
  date: string;
  title: string;
  body: string;
}

export interface UserProfile {
  frontmatter: UserProfileFrontmatter;
  aiContext: string;             // freeform markdown the agent reads/writes
  sessionLog: SessionLogEntry[];// parsed from markdown session log section
  raw: string;                  // full raw markdown for passthrough
}

// ─── Opportunity ───
export interface Opportunity {
  id: string;
  ruleId: string;
  type: string;
  title: string;
  description: string;
  score: number;
  confidence: "high" | "moderate" | "low";
  timing: {
    start: string;
    end: string;
    label: string;
    daysOut: number;
  };
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  conditions: {
    cloudCover: number;
    windSpeed: number;
    humidity: number;
    visibility: number;
    temperature: number;
  };
  settings?: {
    faceDirection: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
  };
}

export interface OpportunityRule {
  id: string;
  name: string;
  type: string;
  description: string;
  conditions: OpportunityCondition[];
  score_weight: number;
  time_windows: string[];
  min_score: number;
  body_html?: string;
}

export interface OpportunityCondition {
  field: string;
  operator: "gt" | "lt" | "between" | "eq";
  value: number | [number, number];
  weight: number;
}

export interface HourlyForecast {
  time: string[];             // ISO timestamps
  cloudCover: number[];
  cloudCoverHigh: number[];
  cloudCoverMid: number[];
  cloudCoverLow: number[];
  humidity: number[];
  visibility: number[];       // in km (converted from meters)
  temperature: number[];      // °C
  windSpeed: number[];        // km/h
  precipitation: number[];    // mm
  weatherCode: number[];
}
