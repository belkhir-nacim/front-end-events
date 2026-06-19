"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, BellRing, Check, RotateCw, Share2, Trash2 } from "lucide-react";
import { ClimateDial, type DialDatum } from "@/components/climate-dial";
import { RiskCards } from "@/components/dashboard/risk-cards";
import { ClimatologyChart, YearByYearChart } from "@/components/dashboard/charts";
import { ProjectionPanel } from "@/components/dashboard/projection-panel";
import { EventDateCard } from "@/components/dashboard/event-date-card";
import { Recommendation } from "@/components/dashboard/recommendation";
import { MapPanel } from "@/components/dashboard/location";
import { MONTHS_SHORT } from "@/lib/format";
import { toSegment, segmentLabel } from "@/lib/segments";
import type { AssessmentSnapshot } from "@/lib/snapshot";

const toNum = (v: unknown): number | null =>
  v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

function fmtStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const noop = () => {};

/**
 * Renders a saved assessment entirely from its frozen snapshot — ZERO /api/climate calls,
 * so it loads instantly and works even with the climate service offline. Reused by the
 * public watermarked report (showActions=false, watermark=true).
 */
export function ReadOnlyAssessment({
  snap,
  name,
  id,
  showActions = true,
  watermark = false,
}: {
  snap: AssessmentSnapshot;
  name: string;
  id?: string;
  showActions?: boolean;
  watermark?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [alert, setAlert] = useState<{ active: boolean; last_message: string | null } | null>(null);
  const [alertBusy, setAlertBusy] = useState(false);
  const hasEvent = Boolean(snap.event?.start);

  useEffect(() => {
    if (!id || !showActions || !hasEvent) return;
    let live = true;
    fetch(`/api/assessments/${id}/alert`)
      .then((r) => r.json())
      .then((j) => live && setAlert({ active: !!j.alert?.active, last_message: j.alert?.last_message ?? null }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id, showActions, hasEvent]);

  async function toggleAlert() {
    if (!id || alertBusy) return;
    const turnOn = !alert?.active;
    setAlertBusy(true);
    try {
      const res = await fetch(`/api/assessments/${id}/alert`, { method: turnOn ? "POST" : "DELETE" });
      if (res.ok) setAlert((a) => ({ active: turnOn, last_message: a?.last_message ?? null }));
    } finally {
      setAlertBusy(false);
    }
  }

  const seg = toSegment(snap.segment);
  const monthName = snap.month_name || MONTHS_SHORT[snap.month] || "";
  const dialData: DialDatum[] =
    snap.climatology?.months.map((m) => ({
      month: m.month,
      heat: toNum(m.tmax_mean_c),
      rain: toNum(m.rainy_days),
    })) ?? [];
  const selClim = snap.climatology?.months.find((m) => m.month === snap.month);
  const selTmax = toNum(selClim?.tmax_mean_c);
  const place = { lat: snap.location.lat, lng: snap.location.lon, address: snap.location.name };
  const deepLink = `/dashboard?lat=${snap.location.lat}&lon=${snap.location.lon}&month=${snap.month}&name=${encodeURIComponent(snap.location.name)}${snap.event?.start ? `&date=${snap.event.start}` : ""}`;

  async function onDelete() {
    if (!id || deleting) return;
    if (!confirm("Delete this saved assessment?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/assessments/${id}`, { method: "DELETE" });
      router.push("/dashboard/library");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function onShare() {
    if (!id || sharing) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/assessments/${id}/share`, { method: "POST" });
      if (res.ok) {
        const { token } = await res.json();
        const url = `${window.location.origin}/report/${token}`;
        setShareUrl(url);
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          /* clipboard blocked — the link still shows below */
        }
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {showActions && (
            <Link
              href="/dashboard/library"
              className="inline-flex items-center gap-1 text-sm text-subtle hover:text-ink"
            >
              <ArrowLeft size={15} /> Library
            </Link>
          )}
          <h1 className="font-sans text-xl font-medium tracking-tight text-ink">{name}</h1>
          {seg !== "other" && <span className="eyebrow text-subtle">{segmentLabel(seg)}</span>}
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            <Link
              href={deepLink}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink hover:border-brand hover:text-brand-ink"
            >
              <RotateCw size={14} /> Re-run live
            </Link>
            {id && (
              <button
                onClick={onShare}
                disabled={sharing}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink hover:border-brand hover:text-brand-ink disabled:opacity-50"
              >
                {shareUrl ? <Check size={14} /> : <Share2 size={14} />}
                {shareUrl ? "Link copied" : sharing ? "Sharing…" : "Share"}
              </button>
            )}
            {id && hasEvent && (
              <button
                onClick={toggleAlert}
                disabled={alertBusy}
                title="Get notified if the forecast for your date turns worse than typical"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm disabled:opacity-50 ${
                  alert?.active
                    ? "border-brand text-brand-ink"
                    : "border-line-strong text-ink hover:border-brand hover:text-brand-ink"
                }`}
              >
                {alert?.active ? <BellRing size={14} /> : <Bell size={14} />}
                {alert?.active ? "Alerts on" : "Alert me"}
              </button>
            )}
            {id && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-subtle hover:border-heat-hot hover:text-heat-hot disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Frozen-snapshot banner */}
      <p className="mt-3 font-pixel text-[0.62rem] uppercase tracking-wide text-subtle">
        saved · computed {fmtStamp(snap.computed_at)} · read-only · no live calls
      </p>
      {shareUrl && (
        <p className="mt-1 break-all text-xs text-subtle">
          Public link:{" "}
          <a href={shareUrl} className="text-brand-ink underline">
            {shareUrl}
          </a>
        </p>
      )}
      {alert?.last_message && (
        <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink">
          <BellRing size={13} className="mt-0.5 shrink-0 text-heat" /> {alert.last_message}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left: dial + map */}
        <div className="space-y-5">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-5">
            {dialData.length > 0 ? (
              <ClimateDial
                data={dialData}
                selected={snap.month}
                size={300}
                centerTop={monthName}
                centerMain={MONTHS_SHORT[snap.month]}
                centerSub={selTmax != null ? `${selTmax.toFixed(0)}° typical high` : undefined}
              />
            ) : (
              <div className="mx-auto h-[300px] w-[300px] rounded-full bg-surface" />
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
          <MapPanel place={place} />
          {snap.point && (
            <p className="px-1 font-pixel text-[0.65rem] uppercase leading-relaxed tracking-wide text-subtle">
              grid cell {snap.point.grid_cell.lat.toFixed(2)}, {snap.point.grid_cell.lon.toFixed(2)} ·{" "}
              {snap.point.years[0]}–{snap.point.years[1]} · area-level (~28 km)
            </p>
          )}
        </div>

        {/* Right */}
        <div className="space-y-6">
          <div>
            <p className="eyebrow text-subtle">{monthName} · historical odds</p>
            <h2 className="mt-2 font-sans text-2xl font-medium tracking-tight text-ink">
              {snap.location.name}
            </h2>
          </div>

          {snap.event?.start && (
            <EventDateCard
              date={snap.event.start}
              end={snap.event.end}
              subseasonal={snap.subseasonal}
              rain={snap.rain}
              heat={snap.heat}
              monthName={monthName}
              dayRisk={snap.day_risk ?? null}
              readOnly
              computedAt={snap.computed_at}
            />
          )}

          <RiskCards rain={snap.rain} heat={snap.heat} monthName={monthName} loading={false} />

          <div className="grid gap-4 xl:grid-cols-2">
            <ClimatologyChart climatology={snap.climatology} />
            <YearByYearChart
              timeseries={snap.series}
              metric={snap.ts_metric}
              onMetricChange={noop}
              monthName={monthName}
            />
          </div>

          <ProjectionPanel
            projection={snap.projection}
            loading={false}
            model={snap.projection?.model ?? ""}
            onModelChange={noop}
            monthName={monthName}
          />

          <Recommendation rain={snap.rain} heat={snap.heat} monthName={monthName} segment={seg} />
        </div>
      </div>

      {watermark && (
        <div className="mt-10 flex items-center justify-center border-t border-line pt-5">
          <Link href="/" className="eyebrow text-subtle hover:text-ink">
            powered by Serenia · climate risk for events
          </Link>
        </div>
      )}
    </div>
  );
}
