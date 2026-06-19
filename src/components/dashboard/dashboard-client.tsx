"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, Compass, PlugZap, Sparkles } from "lucide-react";
import { ClimateDial, type DialDatum } from "@/components/climate-dial";
import { LocationSearch, MapPanel } from "@/components/dashboard/location";
import { AssetsBar } from "@/components/dashboard/assets-bar";
import { RiskCards } from "@/components/dashboard/risk-cards";
import { ClimatologyChart, YearByYearChart } from "@/components/dashboard/charts";
import { Recommendation } from "@/components/dashboard/recommendation";
import { LowestRiskStrip } from "@/components/dashboard/lowest-risk-strip";
import { SaveAssessment } from "@/components/dashboard/save-assessment";
import { BestDatePanel } from "@/components/dashboard/best-date-panel";
import { FutureExtremesPanel } from "@/components/dashboard/future-extremes-panel";
import { buildSnapshot, SNAPSHOT_VERSION } from "@/lib/snapshot";
import { addRecent } from "@/lib/recent";
import { SubseasonalPanel } from "@/components/dashboard/subseasonal";
import { ProjectionPanel } from "@/components/dashboard/projection-panel";
import { EventDateCard } from "@/components/dashboard/event-date-card";
import { ChatView } from "@/components/chat/chat-view";
import { useChatStream } from "@/components/chat/use-chat-stream";
import { MONTHS_LONG, MONTHS_SHORT } from "@/lib/format";
import { SEGMENTS, type Segment } from "@/lib/segments";
import {
  CLIMATE_MODELS,
  type Climatology,
  type DayRisk,
  type HeatRisk,
  type PlaceSelection,
  type PointInfo,
  type Projection,
  type RainRisk,
  type Subseasonal,
  type Timeseries,
} from "@/lib/types";

type ApiState = "ok" | "offline" | "out_of_domain";
type Tab = "dashboard" | "assistant";

interface FetchError {
  status?: number;
}
async function jget<T>(path: string): Promise<T> {
  const r = await fetch(path);
  const ct = r.headers.get("content-type") ?? "";
  const body = ct.includes("json") ? await r.json() : await r.text();
  if (!r.ok) {
    const msg =
      typeof body === "object" && body ? body.detail || body.error || r.statusText : r.statusText;
    throw Object.assign(new Error(String(msg)), { status: r.status });
  }
  return body as T;
}

const toNum = (v: unknown): number | null =>
  v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
const monthOf = (iso: string): number => Number(iso.slice(5, 7));

export function DashboardClient() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [place, setPlace] = useState<PlaceSelection | null>(null);
  const [month, setMonth] = useState(6);
  const [tsMetric, setTsMetric] = useState("rainy_days");
  const [segment, setSegment] = useState<Segment>("other");

  // event date / range
  const [rangeMode, setRangeMode] = useState(false);
  const [winStart, setWinStart] = useState<string | null>(null);
  const [winEnd, setWinEnd] = useState<string | null>(null);

  const [point, setPoint] = useState<PointInfo | null>(null);
  const [climatology, setClimatology] = useState<Climatology | null>(null);
  const [rain, setRain] = useState<RainRisk | null>(null);
  const [heat, setHeat] = useState<HeatRisk | null>(null);
  const [series, setSeries] = useState<Timeseries | null>(null);
  const [dayRisk, setDayRisk] = useState<DayRisk | null>(null);
  const [subseasonal, setSubseasonal] = useState<Subseasonal | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [projModel, setProjModel] = useState<string>(CLIMATE_MODELS[0]);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [loadingProj, setLoadingProj] = useState(false);

  const [apiState, setApiState] = useState<ApiState>("ok");
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  const applyPlace = useCallback(
    (p: PlaceSelection, assetId: string | null, evDate: string | null = null) => {
      setPlace(p);
      setActiveAssetId(assetId);
      setWinStart(evDate);
      setWinEnd(null);
      setRangeMode(false);
      if (evDate) {
        const m = monthOf(evDate);
        if (m >= 1 && m <= 12) setMonth(m);
      }
      setPoint(null);
      setClimatology(null);
      setRain(null);
      setHeat(null);
      setSeries(null);
      setDayRisk(null);
      setSubseasonal(null);
      setProjection(null);
      setApiState("ok");
    },
    [],
  );
  const onSelectPlace = useCallback((p: PlaceSelection) => applyPlace(p, null), [applyPlace]);

  // Deep-link: /dashboard?lat&lon&month&date&name → re-run a saved assessment, or carry a landing verdict.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const lat = Number(sp.get("lat"));
    const lon = Number(sp.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const nm = sp.get("name") || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const date = sp.get("date");
    const m = Number(sp.get("month"));
    applyPlace({ lat, lng: lon, address: nm }, null, date || null);
    if (!date && m >= 1 && m <= 12) setMonth(m);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickStart = useCallback((v: string) => {
    setWinStart(v || null);
    if (v) {
      const m = monthOf(v);
      if (m >= 1 && m <= 12) setMonth(m);
    }
  }, []);
  const clearDates = useCallback(() => {
    setWinStart(null);
    setWinEnd(null);
  }, []);

  // place → point + climatology
  useEffect(() => {
    if (!place) return;
    let active = true;
    const { lat, lng } = place;
    (async () => {
      try {
        const pt = await jget<PointInfo>(`/api/climate/point?lat=${lat}&lon=${lng}`);
        if (!active) return;
        setPoint(pt);
        setApiState("ok");
        const clim = await jget<Climatology>(`/api/climate/climatology?lat=${lat}&lon=${lng}`);
        if (active) setClimatology(clim);
      } catch (e) {
        if (!active) return;
        const status = (e as FetchError).status;
        setApiState(status === 502 ? "offline" : "out_of_domain");
      }
    })();
    return () => {
      active = false;
    };
  }, [place]);

  // place + month → rain + heat
  useEffect(() => {
    if (!place || apiState !== "ok") return;
    let active = true;
    const { lat, lng } = place;
    setLoadingRisk(true);
    (async () => {
      try {
        const [r, h] = await Promise.all([
          jget<RainRisk>(`/api/climate/rain-risk?lat=${lat}&lon=${lng}&month=${month}`),
          jget<HeatRisk>(`/api/climate/heat-risk?lat=${lat}&lon=${lng}&month=${month}`),
        ]);
        if (!active) return;
        setRain(r);
        setHeat(h);
      } catch {
        /* keep last */
      } finally {
        if (active) setLoadingRisk(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [place, month, apiState]);

  // place + month + metric → timeseries
  useEffect(() => {
    if (!place || apiState !== "ok") return;
    let active = true;
    const { lat, lng } = place;
    (async () => {
      try {
        const ts = await jget<Timeseries>(
          `/api/climate/timeseries?lat=${lat}&lon=${lng}&month=${month}&metric=${tsMetric}`,
        );
        if (active) setSeries(ts);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [place, month, tsMetric, apiState]);

  // single event date → historical day-window odds ("rain on June 15?")
  useEffect(() => {
    if (!place || apiState !== "ok" || !winStart || rangeMode) {
      setDayRisk(null);
      return;
    }
    let active = true;
    const { lat, lng } = place;
    jget<DayRisk>(`/api/climate/day-risk?lat=${lat}&lon=${lng}&date=${winStart}`)
      .then((d) => active && setDayRisk(d))
      .catch(() => active && setDayRisk(null));
    return () => {
      active = false;
    };
  }, [place, winStart, rangeMode, apiState]);

  // place → 45-day subseasonal outlook (Open-Meteo; global)
  useEffect(() => {
    if (!place) return;
    let active = true;
    const { lat, lng } = place;
    setLoadingSub(true);
    (async () => {
      try {
        const s = await jget<Subseasonal>(`/api/subseasonal?lat=${lat}&lon=${lng}`);
        if (active) setSubseasonal(s);
      } catch {
        if (active) setSubseasonal(null);
      } finally {
        if (active) setLoadingSub(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [place]);

  // place + month + model → CMIP6 climate projection (Open-Meteo; global)
  useEffect(() => {
    if (!place) return;
    let active = true;
    const { lat, lng } = place;
    setLoadingProj(true);
    (async () => {
      try {
        const p = await jget<Projection>(
          `/api/projection?lat=${lat}&lon=${lng}&month=${month}&model=${projModel}`,
        );
        if (active) setProjection(p);
      } catch {
        if (active) setProjection(null);
      } finally {
        if (active) setLoadingProj(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [place, month, projModel]);

  // Write a most-recently-viewed entry so unsaved lookups are recoverable (Cmd-K Recent).
  useEffect(() => {
    if (!place) return;
    addRecent({ lat: place.lat, lon: place.lng, name: place.address, month, date: winStart, segment });
  }, [place, month, winStart, segment]);

  const dialData: DialDatum[] =
    climatology?.months.map((m) => ({
      month: m.month,
      heat: toNum(m.tmax_mean_c),
      rain: toNum(m.rainy_days),
    })) ?? [];
  const selClim = climatology?.months.find((m) => m.month === month);
  const selTmax = toNum(selClim?.tmax_mean_c);
  const monthName = MONTHS_LONG[month];
  const eventEnd = rangeMode && winEnd ? winEnd : undefined;
  const bdStart = winStart ?? new Date().toISOString().slice(0, 10);
  const bdEnd = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);

  const saveAssessment = useCallback(
    async ({ name, segment: seg, eventDate }: { name: string; segment: Segment; eventDate: string | null }) => {
      if (!place) return null;
      const start = eventDate ?? winStart;
      const snapshot = buildSnapshot({
        location: { name: place.address, lat: place.lat, lon: place.lng },
        point,
        month,
        monthName,
        segment: seg,
        event: start ? { start, end: eventEnd ?? null } : null,
        rain,
        heat,
        climatology,
        series,
        tsMetric,
        subseasonal,
        projection,
        dayRisk,
        computedAt: new Date().toISOString(),
      });
      try {
        const res = await fetch("/api/assessments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            address: place.address,
            lat: place.lat,
            lon: place.lng,
            segment: seg,
            event_date: start,
            month,
            snapshot,
            snapshot_version: SNAPSHOT_VERSION,
          }),
        });
        if (!res.ok) return null;
        const j = await res.json();
        return j.assessment?.id ? { id: j.assessment.id as string } : null;
      } catch {
        return null;
      }
    },
    [place, point, month, monthName, eventEnd, winStart, rain, heat, climatology, series, tsMetric, subseasonal, projection, dayRisk],
  );

  // Everything the dashboard currently shows, passed to the assistant.
  const chatContext = useMemo(
    () => ({
      name: place?.address,
      lat: place?.lat,
      lon: place?.lng,
      month,
      segment,
      eventDate: winStart ?? undefined,
      eventEnd,
      snapshot: place
        ? {
            location: { name: place.address, lat: place.lat, lon: place.lng },
            month: monthName,
            segment,
            event: winStart ? (eventEnd ? { start: winStart, end: eventEnd } : { date: winStart }) : undefined,
            historical_rain: rain
              ? {
                  expected_rainy_days: rain.expected_rainy_days,
                  prob_heavy_rain_day: rain.prob_heavy_rain_day,
                  risk: rain.risk_label_heavy_rain,
                  expected_precip_mm: rain.expected_precip_mm,
                  wettest_day: rain.record_wettest_day,
                }
              : undefined,
            historical_heat: heat
              ? {
                  expected_hot_days: heat.expected_hot_days,
                  prob_over_35c: heat.prob_any_day_over_35c,
                  typical_hottest_c: heat.expected_hottest_day_c,
                  risk: heat.risk_label_extreme_heat,
                }
              : undefined,
            forecast_45d: subseasonal ? { rain: subseasonal.rain, heat: subseasonal.heat } : undefined,
            projection_2050: projection
              ? { model: projection.model, warming_c: projection.delta.tmax, hot_days_delta: projection.delta.hot_days }
              : undefined,
          }
        : undefined,
    }),
    [place, month, monthName, segment, winStart, eventEnd, rain, heat, subseasonal, projection],
  );

  const chat = useChatStream(chatContext);

  const suggestions = place
    ? [
        `Will it rain at ${place.address} in ${monthName}?`,
        winStart ? `What's the outlook for my event on ${winStart}?` : "What's the 45-day outlook here?",
        `How much hotter will ${monthName} get by 2050?`,
      ]
    : [
        "What's the rain risk for an address I give you?",
        "Compare two cities for an outdoor event",
        "Best month for a wedding in Provence?",
      ];
  const emptyHint = place
    ? `Ask me anything about ${place.address}${winStart ? ` around ${winStart}` : ""}. I can pull historical odds, the 45-day outlook, and projections to 2050 — and I only quote numbers I look up.`
    : "Tell me an address and a date, or pick a place on the Dashboard tab.";

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Search + assets */}
      <div className="mx-auto max-w-2xl space-y-3">
        <LocationSearch onSelect={onSelectPlace} />
        <AssetsBar current={place} onPick={applyPlace} activeAssetId={activeAssetId} />
      </div>

      {/* Tabs */}
      <div className="mx-auto mt-6 flex max-w-2xl gap-1 rounded-full border border-line bg-surface p-1">
        {(["dashboard", "assistant"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-ink text-paper" : "text-subtle hover:text-ink"
            }`}
          >
            {t === "dashboard" ? "Dashboard" : "Assistant"}
            {t === "assistant" && <Sparkles size={13} className="ml-1.5 inline" />}
          </button>
        ))}
      </div>

      {/* Assistant tab */}
      {tab === "assistant" && (
        <div className="mx-auto mt-6 max-w-3xl">
          {place && (
            <p className="mb-3 eyebrow text-subtle">
              context · {place.address} · {monthName}
              {winStart ? ` · ${winStart}${eventEnd ? `→${eventEnd}` : ""}` : ""}
            </p>
          )}
          <div className="h-[68vh] rounded-[var(--radius-card)] border border-line bg-surface-2 p-4">
            <ChatView
              messages={chat.messages}
              streaming={chat.streaming}
              activeTool={chat.activeTool}
              onSend={chat.send}
              emptyHint={emptyHint}
              suggestions={suggestions}
            />
          </div>
        </div>
      )}

      {/* Dashboard tab */}
      {tab === "dashboard" && (
        <>
          {!place && (
            <div className="mt-16 flex flex-col items-center text-center">
              <Compass size={28} className="text-subtle" />
              <p className="mt-4 font-sans text-2xl font-medium tracking-tight text-ink">
                Search a place to read its climate.
              </p>
              <p className="mt-2 max-w-md text-sm text-subtle">
                Type an address or pick one above — historical odds, a 45-day outlook, and a 2050
                projection for any month or date.
              </p>
              <div className="mt-10 opacity-60">
                <ClimateDial data={SAMPLE} selected={7} size={300} centerTop="example" centerMain="Jul" />
              </div>
            </div>
          )}

          {place && apiState !== "ok" && <Banner state={apiState} />}

          {place && apiState === "ok" && (
            <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
              {/* Left: dial + map */}
              <div className="space-y-5">
                <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-5">
                  {climatology ? (
                    <ClimateDial
                      data={dialData}
                      selected={month}
                      onSelect={setMonth}
                      size={300}
                      centerTop="tap a month"
                      centerMain={MONTHS_SHORT[month]}
                      centerSub={selTmax != null ? `${selTmax.toFixed(0)}° typical high` : undefined}
                    />
                  ) : (
                    <div className="mx-auto h-[300px] w-[300px] animate-pulse rounded-full bg-surface" />
                  )}
                  <div className="mt-3 flex items-center justify-center gap-5 text-xs text-subtle">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#e0853a" }} /> heat
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#1f6fb2" }} /> rain
                    </span>
                  </div>
                </div>
                {climatology && (
                  <LowestRiskStrip climatology={climatology} selected={month} onPick={setMonth} />
                )}
                <MapPanel place={place} />
                {point && (
                  <p className="px-1 font-pixel text-[0.65rem] uppercase leading-relaxed tracking-wide text-subtle">
                    grid cell {point.grid_cell.lat.toFixed(2)}, {point.grid_cell.lon.toFixed(2)} ·{" "}
                    {point.distance_km} km · {point.years[0]}–{point.years[1]} ·{" "}
                    <span
                      title="Reads the local climate ZONE (~28 km grid cell), not a single street. Two nearby addresses can return the same odds — that's expected, not a bug."
                      className="cursor-help underline decoration-dotted underline-offset-2"
                    >
                      area-level (~28 km)
                    </span>
                  </p>
                )}
              </div>

              {/* Right */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow text-subtle">{monthName} · historical odds</p>
                      <h1 className="mt-2 font-sans text-2xl font-medium tracking-tight text-ink">
                        {place.address}
                      </h1>
                    </div>
                    <SaveAssessment
                      key={`${place.lat}:${place.lng}:${month}:${winStart ?? ""}:${segment}`}
                      defaultName={place.address}
                      defaultSegment={segment}
                      defaultDate={winStart}
                      onSave={saveAssessment}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-subtle">
                      <CalendarCheck size={15} /> Event
                    </span>
                    <div className="flex rounded-full border border-line p-0.5 text-xs">
                      <button
                        onClick={() => {
                          setRangeMode(false);
                          setWinEnd(null);
                        }}
                        className={`rounded-full px-2.5 py-0.5 ${!rangeMode ? "bg-ink text-paper" : "text-subtle"}`}
                      >
                        Date
                      </button>
                      <button
                        onClick={() => setRangeMode(true)}
                        className={`rounded-full px-2.5 py-0.5 ${rangeMode ? "bg-ink text-paper" : "text-subtle"}`}
                      >
                        Range
                      </button>
                    </div>
                    <input
                      type="date"
                      value={winStart ?? ""}
                      onChange={(e) => onPickStart(e.target.value)}
                      className="tnum rounded-md border border-line-strong bg-surface-2 px-2.5 py-1 text-ink outline-none focus:border-brand"
                    />
                    {rangeMode && (
                      <>
                        <span className="text-subtle">→</span>
                        <input
                          type="date"
                          value={winEnd ?? ""}
                          min={winStart ?? undefined}
                          onChange={(e) => setWinEnd(e.target.value || null)}
                          className="tnum rounded-md border border-line-strong bg-surface-2 px-2.5 py-1 text-ink outline-none focus:border-brand"
                        />
                      </>
                    )}
                    {(winStart || winEnd) && (
                      <button onClick={clearDates} className="text-xs text-subtle hover:text-ink">
                        clear
                      </button>
                    )}
                    <span className="ml-1 text-subtle">for</span>
                    <select
                      value={segment}
                      onChange={(e) => setSegment(e.target.value as Segment)}
                      aria-label="Event type"
                      className="rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-ink outline-none focus:border-brand"
                    >
                      {SEGMENTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {winStart && (
                  <EventDateCard
                    date={winStart}
                    end={eventEnd}
                    subseasonal={subseasonal}
                    rain={rain}
                    heat={heat}
                    monthName={monthName}
                    dayRisk={dayRisk}
                  />
                )}

                <RiskCards rain={rain} heat={heat} monthName={monthName} loading={loadingRisk} />

                <div className="grid gap-4 xl:grid-cols-2">
                  <ClimatologyChart climatology={climatology} />
                  <YearByYearChart
                    timeseries={series}
                    metric={tsMetric}
                    onMetricChange={setTsMetric}
                    monthName={monthName}
                  />
                </div>

                <BestDatePanel
                  lat={place.lat}
                  lon={place.lng}
                  defaultStart={bdStart}
                  defaultEnd={bdEnd}
                  onPick={(d) => {
                    setRangeMode(false);
                    onPickStart(d);
                  }}
                />

                <SubseasonalPanel data={subseasonal} loading={loadingSub} />

                <ProjectionPanel
                  projection={projection}
                  loading={loadingProj}
                  model={projModel}
                  onModelChange={setProjModel}
                  monthName={monthName}
                />

                <FutureExtremesPanel lat={place.lat} lon={place.lng} />

                <Recommendation
                  rain={rain}
                  heat={heat}
                  monthName={monthName}
                  segment={segment}
                  onAsk={() => setTab("assistant")}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Banner({ state }: { state: ApiState }) {
  const offline = state === "offline";
  const Icon = offline ? PlugZap : AlertTriangle;
  return (
    <div className="mt-10 flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <Icon size={20} className="mt-0.5 shrink-0 text-heat" />
      <div className="text-sm">
        <p className="font-medium text-ink">{offline ? "Climate service offline" : "Outside the dataset"}</p>
        <p className="mt-1 text-subtle">
          {offline ? (
            <>
              Start the FastAPI climate service on <span className="tnum">:8000</span> (set{" "}
              <span className="tnum">CLIMATE_API_URL</span>). Historical odds are unavailable until
              then — the 45-day outlook, projection, and assistant still work.
            </>
          ) : (
            "Historical odds currently cover France. Pick a French city — the 45-day outlook and assistant work anywhere."
          )}
        </p>
      </div>
    </div>
  );
}

const SAMPLE: DialDatum[] = [
  { month: 1, heat: 7, rain: 11 }, { month: 2, heat: 8, rain: 9 },
  { month: 3, heat: 12, rain: 10 }, { month: 4, heat: 16, rain: 9 },
  { month: 5, heat: 20, rain: 10 }, { month: 6, heat: 23, rain: 8 },
  { month: 7, heat: 26, rain: 7 }, { month: 8, heat: 26, rain: 7 },
  { month: 9, heat: 22, rain: 7 }, { month: 10, heat: 16, rain: 9 },
  { month: 11, heat: 11, rain: 10 }, { month: 12, heat: 8, rain: 11 },
];
