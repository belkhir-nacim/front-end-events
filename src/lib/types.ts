// Shared types for the climate API (mirrors ../service API.md) + UI helpers.

export interface LocationRef {
  requested: { lat: number; lon: number };
  grid_cell: { lat: number; lon: number };
  distance_km: number;
}

export type RiskLabel = "very low" | "low" | "moderate" | "high";

export interface RainRisk {
  location: LocationRef;
  month: number;
  month_name: string;
  n_years: number;
  available?: boolean;
  expected_rainy_days: number | null;
  rainy_days_p10_p90: [number, number] | null;
  expected_precip_mm: number | null;
  precip_p10_p90_mm: [number, number] | null;
  wettest_month: { year: number; precip_mm: number } | null;
  driest_month: { year: number; precip_mm: number } | null;
  prob_wetter_than_median: number | null;
  prob_heavy_rain_day: number | null;
  risk_label_heavy_rain: RiskLabel | null;
  expected_wettest_day_mm: number | null;
  record_wettest_day: { year: number; rx1day_mm: number } | null;
  prob_extreme_day_40mm: number | null;
}

export interface HeatRisk {
  location: LocationRef;
  month: number;
  month_name: string;
  n_years: number;
  available?: boolean;
  expected_hottest_day_c: number | null;
  record_hottest_day_c: { year: number; value: number } | null;
  expected_hot_days: number | null;
  record_hot_days: { year: number; value: number } | null;
  expected_heat_stress_days: number | null;
  record_heat_stress_days: { year: number; value: number } | null;
  prob_any_day_over_35c: number | null;
  risk_label_extreme_heat: RiskLabel | null;
  expected_tropical_nights: number | null;
}

export interface MonthClimatology {
  month: number;
  month_name: string;
  n_years: number;
  [metric: string]: number | string;
}
export interface Climatology {
  location: LocationRef;
  months: MonthClimatology[];
}

export interface TimeseriesPoint {
  year: number;
  value: number | null;
}
export interface TimeseriesSummary {
  n: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  p10?: number;
  p25?: number;
  p75?: number;
  p90?: number;
}
export interface Timeseries {
  location: LocationRef;
  month: number;
  month_name: string;
  metric: string;
  unit: string;
  label: string;
  series: TimeseriesPoint[];
  summary: TimeseriesSummary;
}

// Historical odds for a specific calendar date (±7-day window) — /api/v1/day-risk.
export interface DayRisk {
  location: LocationRef;
  day_of_year: number;
  window_days: number;
  available?: boolean;
  rain_prob: number | null;
  prob_heavy_rain_day: number | null;
  expected_precip_mm: number | null;
  risk_label_rain: RiskLabel | null;
  prob_hot_day_over_30c: number | null;
  prob_any_day_over_35c: number | null;
  expected_high_c: number | null;
  risk_label_heat: RiskLabel | null;
  prob_heat_stress_day: number | null;
  n_samples: number;
}

// CMIP6 future climate-extreme indices — /api/v1/extremes (modelled projection).
export interface ExtremesProjection {
  location: LocationRef;
  model: string;
  note: string;
  indices: Record<string, { unit: string; label: string }>;
  baseline_period: string;
  baseline: Record<string, number | null> | null;
  scenarios: Record<string, Record<string, Record<string, number | null>>>; // ssp → window → index → value
  delta_2050s: Record<string, Record<string, number | null>>; // ssp → index → delta
}

export interface PointInfo {
  requested: { lat: number; lon: number };
  grid_cell: { lat: number; lon: number };
  distance_km: number;
  n_months: number;
  years: [number, number];
}

export interface Coverage {
  years: [number, number];
  n_years: number;
  n_cells: number;
  bbox: { south: number; north: number; west: number; east: number };
  grid_step_deg: number | null;
  metrics: Record<string, { unit: string; label: string }>;
}

// --- Chat attachments (uploaded for the agent to read) ---
export interface Attachment {
  name: string;
  type: string; // MIME
  data: string; // base64 (no data: prefix)
}

// --- UI / geocoding ---
export interface PlaceSelection {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

// Open-Meteo forecast (≤16d) shape we use.
export interface ForecastDay {
  date: string;
  precipitation_sum: number | null;
  precipitation_probability_max: number | null;
  temperature_2m_max: number | null;
  apparent_temperature_max: number | null;
}

// --- Subseasonal (~45-day) outlook (Open-Meteo seasonal) ---
export interface SubDay {
  date: string;
  tmax: number | null;
  tmean: number | null;
  precip: number | null;
}
export interface Subseasonal {
  issued_at: string;
  lat: number;
  lon: number;
  forecast_days: number;
  days: SubDay[];
  rain: {
    wet_days: number;
    heavy_days: number;
    total_mm: number;
    wettest: { date: string; mm: number } | null;
    longest_dry_run: number;
  };
  heat: {
    hot_days: number;
    very_hot_days: number;
    mean_tmax: number | null;
    peak: { date: string; c: number } | null;
  };
}

// --- Climate projection (CMIP6 → 2050, Open-Meteo climate API) ---
export const CLIMATE_MODELS = [
  "MRI_AGCM3_2_S",
  "EC_Earth3P_HR",
  "CMCC_CM2_VHR4",
  "MPI_ESM1_2_XR",
] as const;
export type ClimateModel = (typeof CLIMATE_MODELS)[number];

export interface ProjectionWindow {
  period: string;
  tmax_mean: number | null;
  hot_days: number | null;
  precip_mm: number | null;
}
export interface Projection {
  model: string;
  month: number;
  baseline: ProjectionWindow;
  future: ProjectionWindow;
  delta: { tmax: number | null; hot_days: number | null; precip_mm: number | null };
  decades: { decade: string; tmax_mean: number | null }[];
}
