"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MONTHS_SHORT } from "@/lib/format";
import type { Climatology, Timeseries } from "@/lib/types";

const C = {
  rain: "#1f6fb2",
  heat: "#e0853a",
  ink: "#14211d",
  line: "#d7ddda",
  subtle: "#5c6c66",
};

const AXIS = { fontSize: 11, fill: C.subtle, fontFamily: "var(--font-mono)" };

const num = (v: unknown): number | null =>
  v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface-2 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {sub && <span className="eyebrow text-subtle">{sub}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function ClimatologyChart({ climatology }: { climatology: Climatology | null }) {
  if (!climatology) return null;
  const data = climatology.months.map((m) => ({
    name: MONTHS_SHORT[m.month],
    rain: num(m.rainy_days),
    heat: num(m.tmax_mean_c),
  }));
  return (
    <Panel title="Across the year" sub="rain days · typical high">
      <div className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={{ stroke: C.line }} />
          <YAxis yAxisId="rain" tick={AXIS} tickLine={false} axisLine={false} width={34} />
          <YAxis yAxisId="heat" orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={30} unit="°" />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12 }}
            labelStyle={{ color: C.ink, fontWeight: 600 }}
            formatter={(v, n) =>
              n === "rain" ? [`${v} days`, "rainy days"] : [`${v}°`, "typical high"]
            }
          />
          <Bar yAxisId="rain" dataKey="rain" fill={C.rain} radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Line yAxisId="heat" dataKey="heat" stroke={C.heat} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </Panel>
  );
}

const TS_METRICS: { key: string; label: string; color: string; unit: string }[] = [
  { key: "rainy_days", label: "Rainy days", color: C.rain, unit: "d" },
  { key: "precip_mm", label: "Total rain", color: C.rain, unit: "mm" },
  { key: "rx1day_mm", label: "Wettest day", color: C.rain, unit: "mm" },
  { key: "tmax_abs_c", label: "Hottest day", color: C.heat, unit: "°" },
  { key: "hot_days", label: "Days >30°", color: C.heat, unit: "d" },
];

export function YearByYearChart({
  timeseries,
  metric,
  onMetricChange,
  monthName,
}: {
  timeseries: Timeseries | null;
  metric: string;
  onMetricChange: (m: string) => void;
  monthName: string;
}) {
  const active = TS_METRICS.find((m) => m.key === metric) ?? TS_METRICS[0];
  const data = (timeseries?.series ?? []).map((p) => ({ year: p.year, value: p.value }));
  const mean = timeseries?.summary?.mean ?? null;

  return (
    <Panel title={`Every ${monthName} on record`}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TS_METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => onMetricChange(m.key)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              m.key === metric
                ? "bg-ink text-paper"
                : "border border-line text-subtle hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {!timeseries ? (
        <div className="h-[210px] w-full animate-pulse rounded-lg bg-surface" />
      ) : (
      <div className="h-[210px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={{ stroke: C.line }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={34} unit={active.unit === "°" ? "°" : ""} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12 }}
            formatter={(v) => [`${v} ${active.unit}`, active.label]}
          />
          {mean != null && (
            <ReferenceLine
              y={mean}
              stroke={C.subtle}
              strokeDasharray="4 3"
              label={{ value: `avg ${mean}`, position: "right", fontSize: 10, fill: C.subtle }}
            />
          )}
          <Bar dataKey="value" fill={active.color} radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
      </div>
      )}
    </Panel>
  );
}
