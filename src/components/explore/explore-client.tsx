"use client";

import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { LocationSearch } from "@/components/dashboard/location";
import { ClimateDial, type DialDatum } from "@/components/climate-dial";
import { YearByYearChart } from "@/components/dashboard/charts";
import { LowestRiskStrip } from "@/components/dashboard/lowest-risk-strip";
import { MONTHS_LONG, MONTHS_SHORT, days, deg } from "@/lib/format";
import type { Climatology, PlaceSelection, Timeseries } from "@/lib/types";

const toNum = (v: unknown): number | null =>
  v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(path);
  const ct = r.headers.get("content-type") ?? "";
  const body = ct.includes("json") ? await r.json() : await r.text();
  if (!r.ok) throw Object.assign(new Error(r.statusText), { status: r.status });
  return body as T;
}

function Normal({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <span className="eyebrow text-subtle">{label}</span>
      </div>
      <p className="mt-1 tnum text-2xl text-ink">{value}</p>
    </div>
  );
}

export function ExploreClient() {
  const [place, setPlace] = useState<PlaceSelection | null>(null);
  const [month, setMonth] = useState(6);
  const [tsMetric, setTsMetric] = useState("rainy_days");
  const [clim, setClim] = useState<Climatology | null>(null);
  const [series, setSeries] = useState<Timeseries | null>(null);
  const [err, setErr] = useState<"offline" | "out_of_domain" | null>(null);

  useEffect(() => {
    if (!place) return;
    let active = true;
    setClim(null);
    setErr(null);
    jget<Climatology>(`/api/climate/climatology?lat=${place.lat}&lon=${place.lng}`)
      .then((c) => active && setClim(c))
      .catch((e) => active && setErr((e as { status?: number }).status === 502 ? "offline" : "out_of_domain"));
    return () => {
      active = false;
    };
  }, [place]);

  useEffect(() => {
    if (!place || err) return;
    let active = true;
    jget<Timeseries>(`/api/climate/timeseries?lat=${place.lat}&lon=${place.lng}&month=${month}&metric=${tsMetric}`)
      .then((s) => active && setSeries(s))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [place, month, tsMetric, err]);

  const dialData: DialDatum[] =
    clim?.months.map((m) => ({ month: m.month, heat: toNum(m.tmax_mean_c), rain: toNum(m.rainy_days) })) ?? [];
  const sel = clim?.months.find((m) => m.month === month);
  const monthName = MONTHS_LONG[month];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <p className="eyebrow text-subtle">explore · france · 2014–2023 · area-level (~28 km)</p>
      <div className="mt-3 max-w-xl">
        <LocationSearch onSelect={setPlace} />
      </div>

      {!place && (
        <div className="mt-16 flex flex-col items-center text-center">
          <Compass size={28} className="text-subtle" />
          <p className="mt-4 font-sans text-2xl font-medium tracking-tight text-ink">
            Browse the precomputed climate.
          </p>
          <p className="mt-2 max-w-md text-sm text-subtle">
            Pick a place to see every month&apos;s typical odds and any month across 2014–2023 — all
            from the precomputed record, no waiting.
          </p>
        </div>
      )}

      {place && err && (
        <p className="mt-10 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm text-subtle">
          {err === "offline"
            ? "Climate service offline — start the FastAPI service on :8000."
            : "Historical odds currently cover France. Pick a French city."}
        </p>
      )}

      {place && !err && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-5">
            <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-5">
              {dialData.length > 0 ? (
                <ClimateDial
                  data={dialData}
                  selected={month}
                  onSelect={setMonth}
                  size={300}
                  centerTop="tap a month"
                  centerMain={MONTHS_SHORT[month]}
                  centerSub={sel ? `${deg(toNum(sel.tmax_mean_c))} typical high` : undefined}
                />
              ) : (
                <div className="mx-auto h-[300px] w-[300px] animate-pulse rounded-full bg-surface" />
              )}
            </div>
            <LowestRiskStrip climatology={clim} selected={month} onPick={setMonth} />
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap gap-1">
              {MONTHS_SHORT.slice(1).map((mn, i) => {
                const m = i + 1;
                return (
                  <button
                    key={m}
                    onClick={() => setMonth(m)}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      m === month ? "bg-ink text-paper" : "border border-line text-subtle hover:text-ink"
                    }`}
                  >
                    {mn}
                  </button>
                );
              })}
            </div>

            <div>
              <p className="eyebrow text-subtle">{monthName} normals · {place.address}</p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <Normal label="rainy days" value={days(toNum(sel?.rainy_days))} accent="var(--color-rain)" />
                <Normal label="typical high" value={deg(toNum(sel?.tmax_mean_c))} accent="var(--color-heat)" />
                <Normal label="days >30°" value={days(toNum(sel?.hot_days))} accent="var(--color-heat)" />
              </div>
            </div>

            <YearByYearChart
              timeseries={series}
              metric={tsMetric}
              onMetricChange={setTsMetric}
              monthName={monthName}
            />
          </div>
        </div>
      )}
    </div>
  );
}
