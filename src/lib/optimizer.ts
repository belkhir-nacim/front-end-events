// Best-date optimizer: scan candidate dates in a range via the historical day-window
// odds and rank by combined rain + heat exposure (lower = calmer). Built on /api/v1/day-risk.
import "server-only";

import { climate } from "@/lib/climate";

export interface DateScore {
  date: string;
  rain_prob: number | null;
  prob_heavy_rain_day: number | null;
  prob_hot_day_over_30c: number | null;
  prob_any_day_over_35c: number | null;
  expected_high_c: number | null;
  score: number; // lower is calmer
}

export async function bestDates(
  lat: number,
  lon: number,
  start: string,
  end: string,
  stepDays = 7,
  max = 30,
): Promise<DateScore[]> {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return [];

  const dates: string[] = [];
  for (const d = new Date(s); d <= e && dates.length < max; d.setUTCDate(d.getUTCDate() + stepDays)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  const scored = await Promise.all(
    dates.map(async (date): Promise<DateScore | null> => {
      try {
        const dr = await climate.dayRisk(lat, lon, date);
        if (dr.available === false) return null;
        const rain = dr.rain_prob ?? 0;
        const heavy = dr.prob_heavy_rain_day ?? 0;
        const hot = dr.prob_hot_day_over_30c ?? 0;
        const vhot = dr.prob_any_day_over_35c ?? 0;
        // Weight the severe ends (heavy rain, >35°C heat) more than ordinary rain/warmth.
        const score = rain + 2 * heavy + hot + 2 * vhot;
        return {
          date,
          rain_prob: dr.rain_prob,
          prob_heavy_rain_day: dr.prob_heavy_rain_day,
          prob_hot_day_over_30c: dr.prob_hot_day_over_30c,
          prob_any_day_over_35c: dr.prob_any_day_over_35c,
          expected_high_c: dr.expected_high_c,
          score: Math.round(score * 1000) / 1000,
        };
      } catch {
        return null;
      }
    }),
  );

  return scored.filter((r): r is DateScore => r != null).sort((a, b) => a.score - b.score);
}
