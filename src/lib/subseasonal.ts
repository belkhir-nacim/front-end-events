// Subseasonal (~45-day) forward outlook for rain & heat — Open-Meteo Seasonal
// Forecast API (CFS v2). This is a FORECAST, distinct from the historical odds
// served by the ERA5 climate API. Server-only; cached ~6h.
import "server-only";

import type { SubDay, Subseasonal } from "./types";

const ENDPOINT = "https://seasonal-api.open-meteo.com/v1/seasonal";
const DAILY = [
  "temperature_2m_max",
  "temperature_2m_mean",
  "precipitation_sum",
].join(",");

const HOT_C = 30;
const VERY_HOT_C = 35;
const HEAVY_MM = 20;
const WET_MM = 1;

interface SeasonalResponse {
  latitude: number;
  longitude: number;
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_mean?: (number | null)[];
    precipitation_sum?: (number | null)[];
  };
}

export async function fetchSubseasonal(
  lat: number,
  lon: number,
  days = 45,
): Promise<Subseasonal> {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: DAILY,
    forecast_days: String(Math.min(45, Math.max(1, days))),
    timezone: "auto",
  });
  const res = await fetch(`${ENDPOINT}?${p}`, { next: { revalidate: 21_600 } });
  if (!res.ok) throw new Error(`open-meteo seasonal ${res.status}`);
  const j = (await res.json()) as SeasonalResponse;

  const t = j.daily?.time ?? [];
  const days_: SubDay[] = t.map((date, i) => ({
    date,
    tmax: j.daily?.temperature_2m_max?.[i] ?? null,
    tmean: j.daily?.temperature_2m_mean?.[i] ?? null,
    precip: j.daily?.precipitation_sum?.[i] ?? null,
  }));

  // --- rain summary ---
  let total = 0;
  let wet = 0;
  let heavy = 0;
  let wettest: { date: string; mm: number } | null = null;
  let dryRun = 0;
  let longestDry = 0;
  for (const d of days_) {
    const mm = d.precip ?? 0;
    total += mm;
    if (mm >= WET_MM) wet++;
    if (mm >= HEAVY_MM) heavy++;
    if (!wettest || mm > wettest.mm) wettest = { date: d.date, mm };
    if (mm < WET_MM) {
      dryRun++;
      longestDry = Math.max(longestDry, dryRun);
    } else dryRun = 0;
  }

  // --- heat summary ---
  let hot = 0;
  let veryHot = 0;
  let peak: { date: string; c: number } | null = null;
  const tmaxVals: number[] = [];
  for (const d of days_) {
    if (d.tmax == null) continue;
    tmaxVals.push(d.tmax);
    if (d.tmax > HOT_C) hot++;
    if (d.tmax > VERY_HOT_C) veryHot++;
    if (!peak || d.tmax > peak.c) peak = { date: d.date, c: d.tmax };
  }
  const meanTmax = tmaxVals.length
    ? Math.round((tmaxVals.reduce((a, b) => a + b, 0) / tmaxVals.length) * 10) / 10
    : null;

  return {
    issued_at: new Date().toISOString(),
    lat: j.latitude,
    lon: j.longitude,
    forecast_days: days_.length,
    days: days_,
    rain: {
      wet_days: wet,
      heavy_days: heavy,
      total_mm: Math.round(total),
      wettest: wettest && wettest.mm > 0 ? { date: wettest.date, mm: Math.round(wettest.mm * 10) / 10 } : null,
      longest_dry_run: longestDry,
    },
    heat: { hot_days: hot, very_hot_days: veryHot, mean_tmax: meanTmax, peak },
  };
}
