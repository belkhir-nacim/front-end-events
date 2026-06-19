"use client";

import type { Climatology } from "@/lib/types";
import { MONTHS_SHORT } from "@/lib/format";

const num = (v: unknown): number => (v == null || Number.isNaN(Number(v)) ? 0 : Number(v));

/**
 * Ranks the 12 months already loaded in `climatology` by a rain+heat composite
 * (typical rainy days + hot days, each min-max normalized across the year) and
 * surfaces the 3 historically calmest. Pure client-side — no extra fetch.
 * Framed strictly as "lowest historical risk", never "safe".
 */
export function LowestRiskStrip({
  climatology,
  selected,
  onPick,
}: {
  climatology: Climatology | null;
  selected: number;
  onPick: (month: number) => void;
}) {
  const months = climatology?.months ?? [];
  if (months.length < 6) return null;

  const rows = months.map((m) => ({ month: m.month, rain: num(m.rainy_days), heat: num(m.hot_days) }));
  const norm = (key: "rain" | "heat") => {
    const xs = rows.map((r) => r[key]);
    const lo = Math.min(...xs);
    const span = Math.max(...xs) - lo || 1;
    return (x: number) => (x - lo) / span;
  };
  const nr = norm("rain");
  const nh = norm("heat");
  const ranked = rows
    .map((r) => ({ month: r.month, score: nr(r.rain) + nh(r.heat) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
      <p className="eyebrow text-subtle">historically calmest months</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ranked.map((r) => (
          <button
            key={r.month}
            onClick={() => onPick(r.month)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              r.month === selected
                ? "border-brand bg-brand text-white"
                : "border-line text-ink hover:border-brand hover:text-brand-ink"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-good)" }} />
            {MONTHS_SHORT[r.month]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[0.7rem] leading-snug text-subtle">
        Lowest historical rain + heat exposure. Not a guarantee — odds, not a forecast.
      </p>
    </div>
  );
}
