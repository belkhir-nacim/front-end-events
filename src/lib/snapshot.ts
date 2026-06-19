// The widened, durable snapshot of a dashboard assessment. Assembled at save-time
// from state already held (no new fetch), persisted as jsonb, and re-hydrated into the
// read-only detail with ZERO /api/climate calls. Versioned so a future API-shape change
// can't silently break old rows (parseSnapshot falls back to null on mismatch).
import { z } from "zod";
import type {
  Climatology,
  DayRisk,
  HeatRisk,
  PointInfo,
  Projection,
  RainRisk,
  Subseasonal,
  Timeseries,
} from "./types";
import type { Segment } from "./segments";

export const SNAPSHOT_VERSION = 1;

export interface SnapshotPoint {
  grid_cell: { lat: number; lon: number };
  distance_km: number;
  years: [number, number];
}

export interface AssessmentSnapshot {
  version: number;
  computed_at: string;
  location: { name: string; lat: number; lon: number };
  point: SnapshotPoint | null;
  month: number;
  month_name: string;
  segment: Segment;
  event: { start: string; end?: string | null } | null;
  rain: RainRisk | null;
  heat: HeatRisk | null;
  climatology: Climatology | null;
  series: Timeseries | null;
  ts_metric: string;
  subseasonal: Subseasonal | null;
  projection: Projection | null;
  day_risk: DayRisk | null;
}

// Loose schema: validate the top-level shape + version; the heavy API sub-objects are
// stored verbatim and cast on read (the render components already tolerate nulls/partials).
const schema = z.object({
  version: z.number(),
  computed_at: z.string(),
  location: z.object({ name: z.string(), lat: z.number(), lon: z.number() }),
  point: z.any().nullable(),
  month: z.number().int().min(1).max(12),
  month_name: z.string(),
  segment: z.string(),
  event: z.any().nullable().optional(),
  rain: z.any().nullable(),
  heat: z.any().nullable(),
  climatology: z.any().nullable(),
  series: z.any().nullable(),
  ts_metric: z.string().optional(),
  subseasonal: z.any().nullable(),
  projection: z.any().nullable(),
  day_risk: z.any().nullable().optional(),
});

/** Validate + adapt a stored jsonb snapshot. Returns null on shape/version mismatch. */
export function parseSnapshot(raw: unknown): AssessmentSnapshot | null {
  const r = schema.safeParse(raw);
  if (!r.success) return null;
  // Only v1 is known; an unknown future version is treated as unreadable rather than
  // rendered with wrong assumptions.
  if (r.data.version !== SNAPSHOT_VERSION) return null;
  return r.data as unknown as AssessmentSnapshot;
}

export interface BuildSnapshotArgs {
  location: { name: string; lat: number; lon: number };
  point: PointInfo | null;
  month: number;
  monthName: string;
  segment: Segment;
  event: { start: string; end?: string | null } | null;
  rain: RainRisk | null;
  heat: HeatRisk | null;
  climatology: Climatology | null;
  series: Timeseries | null;
  tsMetric: string;
  subseasonal: Subseasonal | null;
  projection: Projection | null;
  dayRisk: DayRisk | null;
  computedAt: string;
}

/** Widen current dashboard state into a durable snapshot (no network). */
export function buildSnapshot(a: BuildSnapshotArgs): AssessmentSnapshot {
  // Prune subseasonal daily points to the event window (keeps the frozen "forecast as of
  // save" the read-only EventDateCard renders, without storing all 45 days).
  let subseasonal = a.subseasonal;
  if (subseasonal) {
    if (a.event) {
      const last = a.event.end || a.event.start;
      subseasonal = {
        ...subseasonal,
        days: subseasonal.days.filter((d) => d.date >= a.event!.start && d.date <= last),
      };
    } else {
      subseasonal = { ...subseasonal, days: [] };
    }
  }

  const point: SnapshotPoint | null = a.point
    ? { grid_cell: a.point.grid_cell, distance_km: a.point.distance_km, years: a.point.years }
    : null;

  return {
    version: SNAPSHOT_VERSION,
    computed_at: a.computedAt,
    location: a.location,
    point,
    month: a.month,
    month_name: a.monthName,
    segment: a.segment,
    event: a.event,
    rain: a.rain,
    heat: a.heat,
    climatology: a.climatology,
    series: a.series,
    ts_metric: a.tsMetric,
    subseasonal,
    projection: a.projection,
    day_risk: a.dayRisk,
  };
}

/** Dominant risk for a card accent / chip (rain vs heat, whichever is higher). */
export function dominantRisk(snap: { rain: RainRisk | null; heat: HeatRisk | null }): "rain" | "heat" | "calm" {
  const order: Record<string, number> = { "very low": 0, low: 1, moderate: 2, high: 3 };
  const r = order[snap.rain?.risk_label_heavy_rain ?? "very low"] ?? 0;
  const h = order[snap.heat?.risk_label_extreme_heat ?? "very low"] ?? 0;
  if (r === 0 && h === 0) return "calm";
  return h > r ? "heat" : "rain";
}
