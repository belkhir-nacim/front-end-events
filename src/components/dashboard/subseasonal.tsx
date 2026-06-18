"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, CloudRain, Sun } from "lucide-react";
import type { Subseasonal } from "@/lib/types";

const C = { rain: "#1f6fb2", heat: "#e0853a", hot: "#cc2e3c", ink: "#14211d", line: "#d7ddda", subtle: "#5c6c66" };
const AXIS = { fontSize: 10, fill: C.subtle, fontFamily: "var(--font-mono)" };

const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m]} ${+d}`;
};

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <p className="tnum text-lg text-ink">{value}</p>
      <p className="text-xs text-subtle">{label}</p>
    </div>
  );
}

export function SubseasonalPanel({ data, loading }: { data: Subseasonal | null; loading: boolean }) {
  const [view, setView] = useState<"rain" | "heat">("rain");
  if (loading && !data) {
    return <div className="h-72 animate-pulse rounded-[var(--radius-card)] border border-line bg-surface" />;
  }
  if (!data) return null;

  const chartData = data.days.map((d) => ({ date: shortDate(d.date), precip: d.precip, tmax: d.tmax }));

  return (
    <section
      className="rounded-[var(--radius-card)] border border-line bg-surface p-5"
      style={{ borderTop: "3px solid var(--color-heat-soft)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange size={18} className="text-subtle" />
          <h3 className="text-sm font-medium text-ink">Next {data.forecast_days} days</h3>
          <span className="rounded-full bg-heat/15 px-2 py-0.5 font-pixel text-[0.62rem] uppercase tracking-wide text-heat">
            forecast
          </span>
        </div>
        <div className="flex gap-1.5">
          {(["rain", "heat"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
                view === v ? "bg-ink text-paper" : "border border-line text-subtle hover:text-ink"
              }`}
            >
              {v === "rain" ? <CloudRain size={13} /> : <Sun size={13} />}
              {v === "rain" ? "Rain" : "Heat"}
            </button>
          ))}
        </div>
      </div>

      {/* summary chips */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {view === "rain" ? (
          <>
            <Chip label="wet days (≥1mm)" value={String(data.rain.wet_days)} />
            <Chip label="heavy days (≥20mm)" value={String(data.rain.heavy_days)} />
            <Chip label="total rain" value={`${data.rain.total_mm} mm`} />
          </>
        ) : (
          <>
            <Chip label="hot days (>30°)" value={String(data.heat.hot_days)} />
            <Chip label="very hot (>35°)" value={String(data.heat.very_hot_days)} />
            <Chip label="peak" value={data.heat.peak ? `${data.heat.peak.c.toFixed(0)}°` : "—"} />
          </>
        )}
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={220}>
          {view === "rain" ? (
            <BarChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: C.line }} interval={6} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} unit="mm" />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12 }} formatter={(v) => [`${v} mm`, "rain"]} />
              <ReferenceLine y={20} stroke={C.rain} strokeDasharray="4 3" label={{ value: "heavy", position: "right", fontSize: 9, fill: C.rain }} />
              <Bar dataKey="precip" fill={C.rain} radius={[2, 2, 0, 0]} maxBarSize={10} />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: C.line }} interval={6} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={30} unit="°" />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12 }} formatter={(v) => [`${v}°`, "daily high"]} />
              <ReferenceLine y={30} stroke={C.heat} strokeDasharray="4 3" />
              <ReferenceLine y={35} stroke={C.hot} strokeDasharray="4 3" label={{ value: "35°", position: "right", fontSize: 9, fill: C.hot }} />
              <Line dataKey="tmax" stroke={C.heat} strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="mt-2 font-pixel text-[0.6rem] uppercase tracking-wide text-subtle">
        Open-Meteo CFS v2 · indicative outlook, updates daily · not the historical odds
      </p>
    </section>
  );
}
