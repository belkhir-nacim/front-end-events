import { CloudRain, Sun } from "lucide-react";
import { riskColor } from "@/lib/colors";
import { days, deg, mm, pct, returnPeriod } from "@/lib/format";
import type { HeatRisk, RainRisk } from "@/lib/types";

function Badge({ label }: { label: string | null | undefined }) {
  if (!label) return null;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: riskColor(label) }}
    >
      {label} risk
    </span>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line py-2">
      <span className="text-sm text-subtle">{label}</span>
      <span className="text-right">
        <span className="tnum text-sm text-ink">{value}</span>
        {sub && <span className="ml-1.5 tnum text-xs text-subtle">{sub}</span>}
      </span>
    </div>
  );
}

function Card({
  accent,
  icon,
  title,
  badge,
  leadValue,
  leadUnit,
  children,
}: {
  accent: string;
  icon: React.ReactNode;
  title: string;
  badge: string | null | undefined;
  leadValue: string;
  leadUnit: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-5"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <span style={{ color: accent }}>{icon}</span>
          {title}
        </span>
        <Badge label={badge} />
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-sans text-5xl font-medium tracking-tight text-ink">{leadValue}</span>
        <span className="text-sm text-subtle">{leadUnit}</span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-[var(--radius-card)] border border-line bg-surface" />
      ))}
    </div>
  );
}

export function RiskCards({
  rain,
  heat,
  monthName,
  loading,
}: {
  rain: RainRisk | null;
  heat: HeatRisk | null;
  monthName: string;
  loading: boolean;
}) {
  if (loading && !rain && !heat) return <Skeleton />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card
        accent="var(--color-rain)"
        icon={<CloudRain size={18} />}
        title="Rain risk"
        badge={rain?.risk_label_heavy_rain}
        leadValue={days(rain?.expected_rainy_days)}
        leadUnit={`rainy days in ${monthName}`}
      >
        <Row
          label="Heavy-rain day (≥20 mm)"
          value={pct(rain?.prob_heavy_rain_day)}
          sub={returnPeriod(rain?.prob_heavy_rain_day)}
        />
        <Row label="Typical month total" value={mm(rain?.expected_precip_mm)} />
        <Row
          label="Wettest day on record"
          value={mm(rain?.record_wettest_day?.rx1day_mm)}
          sub={rain?.record_wettest_day ? `’${String(rain.record_wettest_day.year).slice(2)}` : undefined}
        />
      </Card>

      <Card
        accent="var(--color-heat)"
        icon={<Sun size={18} />}
        title="Heat risk"
        badge={heat?.risk_label_extreme_heat}
        leadValue={days(heat?.expected_hot_days)}
        leadUnit={`days over 30° in ${monthName}`}
      >
        <Row
          label="Day over 35°"
          value={pct(heat?.prob_any_day_over_35c)}
          sub={returnPeriod(heat?.prob_any_day_over_35c)}
        />
        <Row label="Typical hottest day" value={deg(heat?.expected_hottest_day_c)} />
        <Row
          label="Hottest on record"
          value={deg(heat?.record_hottest_day_c?.value)}
          sub={heat?.record_hottest_day_c ? `’${String(heat.record_hottest_day_c.year).slice(2)}` : undefined}
        />
      </Card>
    </div>
  );
}
