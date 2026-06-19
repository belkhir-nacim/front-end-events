import Link from "next/link";
import { ArrowLeft, CloudRain, Sun } from "lucide-react";
import { riskColor } from "@/lib/colors";
import { days, deg, mm, pct } from "@/lib/format";
import { segmentLabel, toSegment } from "@/lib/segments";
import type { AssessmentSnapshot } from "@/lib/snapshot";

interface Item {
  id: string;
  name: string;
  snapshot: AssessmentSnapshot;
}

function Badge({ label }: { label: string | null | undefined }) {
  if (!label) return null;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[0.7rem] font-medium text-white"
      style={{ backgroundColor: riskColor(label) }}
    >
      {label}
    </span>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-t border-line py-1.5 text-sm">
      <span className="text-subtle">{label}</span>
      <span className="tnum text-ink">{value}</span>
    </div>
  );
}

/** Side-by-side comparison of saved assessments, rendered from frozen snapshots (zero recompute). */
export function CompareView({ items }: { items: Item[] }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Link href="/dashboard/library" className="inline-flex items-center gap-1 text-sm text-subtle hover:text-ink">
        <ArrowLeft size={15} /> Library
      </Link>
      <p className="mt-3 eyebrow text-subtle">compare · {items.length} assessments · historical odds</p>

      <div
        className="mt-4 grid gap-4 overflow-x-auto pb-2"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(240px, 1fr))` }}
      >
        {items.map(({ id, name, snapshot: s }) => {
          const seg = toSegment(s.segment);
          return (
            <div key={id} className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-4">
              <p className="eyebrow text-subtle">{segmentLabel(seg)} · {s.month_name}</p>
              <h2 className="mt-1 truncate font-sans text-lg font-medium tracking-tight text-ink">{name}</h2>
              <p className="mt-0.5 text-xs text-subtle">{s.event?.start ?? `${s.month_name} · any year`}</p>

              <div className="mt-4" style={{ borderLeft: "3px solid var(--color-rain)", paddingLeft: 10 }}>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                    <CloudRain size={15} className="text-rain" /> Rain
                  </span>
                  <Badge label={s.rain?.risk_label_heavy_rain} />
                </div>
                <Line label="Rainy days" value={days(s.rain?.expected_rainy_days)} />
                <Line label="Heavy-rain day" value={pct(s.rain?.prob_heavy_rain_day)} />
                <Line label="Month total" value={mm(s.rain?.expected_precip_mm)} />
              </div>

              <div className="mt-4" style={{ borderLeft: "3px solid var(--color-heat)", paddingLeft: 10 }}>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                    <Sun size={15} className="text-heat" /> Heat
                  </span>
                  <Badge label={s.heat?.risk_label_extreme_heat} />
                </div>
                <Line label="Days over 30°" value={days(s.heat?.expected_hot_days)} />
                <Line label="Day over 35°" value={pct(s.heat?.prob_any_day_over_35c)} />
                <Line label="Typical hottest" value={deg(s.heat?.expected_hottest_day_c)} />
              </div>

              <Link
                href={`/dashboard/library/${id}`}
                className="mt-4 inline-block text-xs text-brand-ink underline-offset-2 hover:underline"
              >
                Open full assessment →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
