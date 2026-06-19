"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import type { ExtremesProjection } from "@/lib/types";

const SSP_LABEL: Record<string, string> = {
  ssp2_4_5: "SSP2-4.5 · middle path",
  ssp5_8_5: "SSP5-8.5 · high emissions",
};
const ORDER = [
  "txx_c",
  "summer_days",
  "tropical_nights",
  "rainy_days",
  "r10mm_days",
  "r20mm_days",
  "rx1day_mm",
  "cwd_days",
  "cdd_days",
];

function fmtVal(v: number | null | undefined, unit: string): string {
  if (v == null) return "—";
  if (unit === "degC") return `${v.toFixed(1)}°`;
  if (unit === "mm") return `${Math.round(v)} mm`;
  return `${Math.round(v)} d`;
}
function fmtDelta(v: number | null | undefined, unit: string): string {
  if (v == null) return "";
  const s = v > 0 ? "+" : "";
  if (unit === "degC") return `${s}${v.toFixed(1)}°`;
  if (unit === "mm") return `${s}${Math.round(v)} mm`;
  return `${s}${Math.round(v)} d`;
}

/** CMIP6 future climate-EXTREMES (baseline → 2050s, per SSP). Hides itself when the
 * region has no extremes data. A modelled projection — clearly labelled, never odds/forecast. */
export function FutureExtremesPanel({ lat, lon }: { lat: number; lon: number }) {
  const [data, setData] = useState<ExtremesProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ssp, setSsp] = useState("ssp2_4_5");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setHidden(false);
    setData(null);
    fetch(`/api/climate/extremes?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => active && setData(d))
      .catch(() => active && setHidden(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [lat, lon]);

  if (hidden) return null;

  const indices = data?.indices ?? {};
  const baseline = data?.baseline ?? {};
  const future = data?.scenarios?.[ssp]?.["2050s"] ?? {};
  const deltas = data?.delta_2050s?.[ssp] ?? {};
  const sspKeys = data ? Object.keys(data.scenarios) : [];
  const cols = ORDER.filter((c) => c in indices);

  return (
    <section
      className="rounded-[var(--radius-card)] border border-line bg-surface p-5"
      style={{ borderTop: "3px solid var(--color-heat)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-heat" />
          <h3 className="text-sm font-medium text-ink">Future extremes → 2050s</h3>
          <span className="rounded-full bg-heat/15 px-2 py-0.5 font-pixel text-[0.62rem] uppercase tracking-wide text-heat">
            projection
          </span>
        </div>
        {sspKeys.length > 0 && (
          <select
            value={ssp}
            onChange={(e) => setSsp(e.target.value)}
            aria-label="Emissions scenario"
            className="tnum rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-xs text-ink outline-none focus:border-brand"
          >
            {sspKeys.map((k) => (
              <option key={k} value={k}>
                {SSP_LABEL[k] ?? k}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-lg bg-surface-2" />
      ) : (
        <>
          <div className="mt-4 space-y-1.5">
            {cols.map((c) => {
              const unit = indices[c]?.unit ?? "";
              const dl = deltas[c];
              return (
                <div
                  key={c}
                  className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 text-sm"
                >
                  <span className="text-subtle">{indices[c]?.label ?? c}</span>
                  <span className="flex items-baseline gap-2 text-right">
                    <span className="tnum text-subtle">{fmtVal(baseline[c], unit)}</span>
                    <span className="text-subtle">→</span>
                    <span className="tnum text-ink">{fmtVal(future[c], unit)}</span>
                    {dl != null && (
                      <span
                        className="tnum text-xs font-medium"
                        style={{ color: dl > 0 ? "var(--color-heat)" : "var(--color-good)" }}
                      >
                        {fmtDelta(dl, unit)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 font-pixel text-[0.6rem] uppercase leading-relaxed tracking-wide text-subtle">
            {data?.model} · CMIP6 · baseline {data?.baseline_period} → 2040–2059 · modelled projection,
            coarse · not a forecast
          </p>
        </>
      )}
    </section>
  );
}
