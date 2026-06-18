"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { CLIMATE_MODELS, type Projection } from "@/lib/types";

const C = { heat: "#e0853a", ink: "#14211d", line: "#d7ddda", subtle: "#5c6c66" };

function delta(n: number | null, unit: string): string {
  if (n == null) return "—";
  const s = n > 0 ? "+" : "";
  return `${s}${n}${unit}`;
}

export function ProjectionPanel({
  projection,
  loading,
  model,
  onModelChange,
  monthName,
}: {
  projection: Projection | null;
  loading: boolean;
  model: string;
  onModelChange: (m: string) => void;
  monthName: string;
}) {
  return (
    <section
      className="rounded-[var(--radius-card)] border border-line bg-surface p-5"
      style={{ borderTop: "3px solid var(--color-rain-deep)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-subtle" />
          <h3 className="text-sm font-medium text-ink">Climate outlook → 2050</h3>
          <span className="rounded-full bg-rain/15 px-2 py-0.5 font-pixel text-[0.62rem] uppercase tracking-wide text-rain-deep">
            projection
          </span>
        </div>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="tnum rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-xs text-ink outline-none focus:border-brand"
        >
          {CLIMATE_MODELS.map((m) => (
            <option key={m} value={m}>
              {m.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {loading && !projection ? (
        <div className="mt-4 h-40 animate-pulse rounded-lg bg-surface-2" />
      ) : !projection ? (
        <p className="mt-3 text-sm text-subtle">No projection available for this location.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="font-sans text-4xl font-medium tracking-tight text-heat">
                {delta(projection.delta.tmax, "°")}
              </p>
              <p className="mt-1 text-xs text-subtle">
                typical {monthName} high by the 2040s vs 1991–2010
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="tnum text-lg text-ink">{delta(projection.delta.hot_days, " d")}</p>
                <p className="text-xs text-subtle">hot days (&gt;30°)</p>
              </div>
              <div>
                <p className="tnum text-lg text-ink">{delta(projection.delta.precip_mm, " mm")}</p>
                <p className="text-xs text-subtle">monthly rain</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={projection.decades} margin={{ top: 6, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="decade" tick={{ fontSize: 10, fill: C.subtle, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: C.line }} />
                <YAxis tick={{ fontSize: 10, fill: C.subtle, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} width={32} unit="°" domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12 }} formatter={(v) => [`${v}°`, "typical high"]} />
                <Line dataKey="tmax_mean" stroke={C.heat} strokeWidth={2} dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 font-pixel text-[0.6rem] uppercase tracking-wide text-subtle">
            {projection.model.replace(/_/g, " ")} · CMIP6 high-resolution · indicative, to 2050
          </p>
        </>
      )}
    </section>
  );
}
