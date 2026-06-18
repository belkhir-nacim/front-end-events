// Climate projection (CMIP6, downscaled, to 2050) via Open-Meteo Climate API.
// "Scenario" here = choice of CMIP6 high-resolution model (Open-Meteo's climate
// endpoint doesn't expose SSP/RCP selection). Server-only; cached ~1 week.
import "server-only";

import { CLIMATE_MODELS, type Projection } from "./types";

const CLIMATE_API = "https://climate-api.open-meteo.com/v1/climate";

type WindowStats = { tmax_mean: number | null; hot_days: number | null; precip_mm: number | null };

const r = (n: number | null, d = 1): number | null =>
  n == null ? null : Math.round(n * 10 ** d) / 10 ** d;
const sub = (a: number | null, b: number | null): number | null =>
  a == null || b == null ? null : r(a - b);

async function fetchSeries(lat: number, lon: number, model: string) {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: "1991-01-01",
    end_date: "2050-12-31",
    models: model,
    daily: "temperature_2m_max,precipitation_sum",
    timezone: "auto",
  });
  const res = await fetch(`${CLIMATE_API}?${p}`, { next: { revalidate: 604_800 } });
  if (!res.ok) throw new Error(`climate api ${res.status}`);
  const j = (await res.json()) as {
    daily?: { time?: string[]; temperature_2m_max?: (number | null)[]; precipitation_sum?: (number | null)[] };
  };
  return {
    time: j.daily?.time ?? [],
    tmax: j.daily?.temperature_2m_max ?? [],
    precip: j.daily?.precipitation_sum ?? [],
  };
}

export async function fetchProjection(
  lat: number,
  lon: number,
  month: number,
  model: string = CLIMATE_MODELS[0],
): Promise<Projection> {
  const s = await fetchSeries(lat, lon, model);

  // per-year stats for the requested calendar month
  const perYear = new Map<number, { tmax: number[]; precip: number }>();
  for (let i = 0; i < s.time.length; i++) {
    const date = s.time[i];
    if (Number(date.slice(5, 7)) !== month) continue;
    const yr = Number(date.slice(0, 4));
    const e = perYear.get(yr) ?? { tmax: [], precip: 0 };
    const tx = s.tmax[i];
    if (typeof tx === "number") e.tmax.push(tx);
    const pr = s.precip[i];
    if (typeof pr === "number") e.precip += pr;
    perYear.set(yr, e);
  }
  const yearStat = new Map<number, { tmax_mean: number | null; hot: number; precip: number }>();
  for (const [yr, e] of perYear) {
    const mean = e.tmax.length ? e.tmax.reduce((a, b) => a + b, 0) / e.tmax.length : null;
    yearStat.set(yr, { tmax_mean: mean, hot: e.tmax.filter((t) => t > 30).length, precip: e.precip });
  }

  const windowStats = (y0: number, y1: number): WindowStats => {
    const arr = [...yearStat.entries()].filter(([y]) => y >= y0 && y <= y1).map(([, v]) => v);
    const tm = arr.map((v) => v.tmax_mean).filter((x): x is number => x != null);
    return {
      tmax_mean: tm.length ? r(tm.reduce((a, b) => a + b, 0) / tm.length) : null,
      hot_days: arr.length ? r(arr.reduce((a, b) => a + b.hot, 0) / arr.length) : null,
      precip_mm: arr.length ? r(arr.reduce((a, b) => a + b.precip, 0) / arr.length, 0) : null,
    };
  };

  const baseline = windowStats(1991, 2010);
  const future = windowStats(2031, 2050);
  const decades = [1990, 2000, 2010, 2020, 2030, 2040].map((d) => ({
    decade: `${d}s`,
    tmax_mean: windowStats(d, d + 9).tmax_mean,
  }));

  return {
    model,
    month,
    baseline: { period: "1991–2010", ...baseline },
    future: { period: "2031–2050", ...future },
    delta: {
      tmax: sub(future.tmax_mean, baseline.tmax_mean),
      hot_days: sub(future.hot_days, baseline.hot_days),
      precip_mm: sub(future.precip_mm, baseline.precip_mm),
    },
    decades,
  };
}
