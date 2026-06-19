"use client";

import { useState } from "react";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { riskColor } from "@/lib/colors";
import { deg, pct } from "@/lib/format";

interface DateScore {
  date: string;
  rain_prob: number | null;
  prob_heavy_rain_day: number | null;
  prob_hot_day_over_30c: number | null;
  prob_any_day_over_35c: number | null;
  expected_high_c: number | null;
  score: number;
}

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const scoreLabel = (s: number): "low" | "moderate" | "high" => (s < 0.35 ? "low" : s < 0.6 ? "moderate" : "high");

export function BestDatePanel({
  lat,
  lon,
  defaultStart,
  defaultEnd,
  onPick,
}: {
  lat: number;
  lon: number;
  defaultStart: string;
  defaultEnd: string;
  onPick: (date: string) => void;
}) {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [dates, setDates] = useState<DateScore[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  async function run() {
    setLoading(true);
    setErr(false);
    try {
      const r = await fetch(`/api/optimizer?lat=${lat}&lon=${lon}&start=${start}&end=${end}&step=7`);
      const j = await r.json();
      if (Array.isArray(j.dates)) setDates(j.dates);
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <CalendarCheck size={18} className="text-brand" />
        <h3 className="text-sm font-medium text-ink">Find the calmest date</h3>
      </div>
      <p className="mt-1 text-xs text-subtle">
        Ranks dates in a range by historical rain + heat odds — lowest-risk first. Odds, not a forecast.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="tnum rounded-md border border-line-strong bg-surface-2 px-2.5 py-1 text-ink outline-none focus:border-brand"
        />
        <span className="text-subtle">→</span>
        <input
          type="date"
          value={end}
          min={start}
          onChange={(e) => setEnd(e.target.value)}
          className="tnum rounded-md border border-line-strong bg-surface-2 px-2.5 py-1 text-ink outline-none focus:border-brand"
        />
        <button
          onClick={run}
          disabled={loading}
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-ink disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Find dates"}
        </button>
      </div>

      {err && (
        <p className="mt-3 text-sm text-subtle">
          Couldn&apos;t scan that range — date-level odds currently cover France.
        </p>
      )}

      {dates && dates.length > 0 && (
        <ol className="mt-4 space-y-1.5">
          {dates.slice(0, 6).map((d, i) => (
            <li key={d.date}>
              <button
                onClick={() => onPick(d.date)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-brand"
              >
                <span className="inline-flex items-center gap-2 text-ink">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: i === 0 ? "var(--color-good)" : riskColor(scoreLabel(d.score)) }}
                  />
                  {fmt(d.date)}
                  {i === 0 && <span className="eyebrow text-good">calmest</span>}
                </span>
                <span className="flex items-center gap-3 text-xs text-subtle">
                  <span>rain {pct(d.rain_prob)}</span>
                  <span>high {deg(d.expected_high_c)}</span>
                  <ArrowRight size={13} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {dates && dates.length === 0 && !err && (
        <p className="mt-3 text-sm text-subtle">No dates found in that range.</p>
      )}
    </section>
  );
}
