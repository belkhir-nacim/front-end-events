// Server-side client for the local ERA5 climate API (../service) and Open-Meteo.
// Never import this into a client component — it reads server-only env and is
// reached from the browser only through /api/climate proxy + /api/chat agent.
import "server-only";

import type {
  Climatology,
  ForecastDay,
  HeatRisk,
  PointInfo,
  RainRisk,
  Timeseries,
} from "./types";

const BASE = process.env.CLIMATE_API_URL ?? "http://localhost:8000";

export class ClimateApiError extends Error {
  status: number;
  body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function get<T>(
  path: string,
  params: Record<string, string | number>,
  revalidate = 86_400, // historical data is static → cache a day
): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const res = await fetch(`${BASE}/api/v1/${path}?${qs}`, {
    next: { revalidate },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ClimateApiError(`climate api ${path} -> ${res.status}`, res.status, body);
  }
  return (await res.json()) as T;
}

export const climate = {
  base: BASE,
  point: (lat: number, lon: number) => get<PointInfo>("point", { lat, lon }),
  rainRisk: (lat: number, lon: number, month: number) =>
    get<RainRisk>("rain-risk", { lat, lon, month }),
  heatRisk: (lat: number, lon: number, month: number) =>
    get<HeatRisk>("heat-risk", { lat, lon, month }),
  climatology: (lat: number, lon: number) =>
    get<Climatology>("climatology", { lat, lon }),
  timeseries: (lat: number, lon: number, month: number, metric: string) =>
    get<Timeseries>("timeseries", { lat, lon, month, metric }),
};

// --- Open-Meteo (forecast ≤16 days; archive for specific past dates) ---------
const OM_KEY = process.env.OPENMETEO_API_KEY;
const OM_FORECAST = OM_KEY
  ? "https://customer-api.open-meteo.com/v1/forecast"
  : "https://api.open-meteo.com/v1/forecast";
const OM_ARCHIVE = OM_KEY
  ? "https://customer-archive-api.open-meteo.com/v1/archive"
  : "https://archive-api.open-meteo.com/v1/archive";

const DAILY = [
  "precipitation_sum",
  "precipitation_probability_max",
  "temperature_2m_max",
  "apparent_temperature_max",
].join(",");

function rows(json: {
  daily?: Record<string, (number | null)[] | string[]>;
}): ForecastDay[] {
  const d = json.daily;
  if (!d || !d.time) return [];
  const time = d.time as string[];
  return time.map((date, i) => ({
    date,
    precipitation_sum: (d.precipitation_sum as (number | null)[])?.[i] ?? null,
    precipitation_probability_max:
      (d.precipitation_probability_max as (number | null)[])?.[i] ?? null,
    temperature_2m_max: (d.temperature_2m_max as (number | null)[])?.[i] ?? null,
    apparent_temperature_max:
      (d.apparent_temperature_max as (number | null)[])?.[i] ?? null,
  }));
}

export async function openMeteoForecast(
  lat: number,
  lon: number,
  forecastDays = 16,
): Promise<ForecastDay[]> {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: DAILY,
    forecast_days: String(forecastDays),
    timezone: "auto",
  });
  if (OM_KEY) p.set("apikey", OM_KEY);
  const res = await fetch(`${OM_FORECAST}?${p}`, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`open-meteo forecast -> ${res.status}`);
  return rows(await res.json());
}

export async function openMeteoArchive(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<ForecastDay[]> {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startDate,
    end_date: endDate,
    daily: "precipitation_sum,temperature_2m_max,apparent_temperature_max",
    timezone: "auto",
  });
  if (OM_KEY) p.set("apikey", OM_KEY);
  const res = await fetch(`${OM_ARCHIVE}?${p}`, { next: { revalidate: 86_400 } });
  if (!res.ok) throw new Error(`open-meteo archive -> ${res.status}`);
  return rows(await res.json());
}
