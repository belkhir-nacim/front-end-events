"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LocationSearch } from "@/components/dashboard/location";
import { RiskCards } from "@/components/dashboard/risk-cards";
import { MONTHS_LONG } from "@/lib/format";
import { addRecent } from "@/lib/recent";
import type { HeatRisk, PlaceSelection, RainRisk } from "@/lib/types";

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(path);
  const ct = r.headers.get("content-type") ?? "";
  const body = ct.includes("json") ? await r.json() : await r.text();
  if (!r.ok) throw Object.assign(new Error(r.statusText), { status: r.status });
  return body as T;
}

export function InstantVerdict() {
  const [place, setPlace] = useState<PlaceSelection | null>(null);
  const [month, setMonth] = useState(6);
  const [rain, setRain] = useState<RainRisk | null>(null);
  const [heat, setHeat] = useState<HeatRisk | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<"offline" | "out_of_domain" | null>(null);

  useEffect(() => {
    if (!place) return;
    let active = true;
    setLoading(true);
    setErr(null);
    Promise.all([
      jget<RainRisk>(`/api/climate/rain-risk?lat=${place.lat}&lon=${place.lng}&month=${month}`),
      jget<HeatRisk>(`/api/climate/heat-risk?lat=${place.lat}&lon=${place.lng}&month=${month}`),
    ])
      .then(([r, h]) => {
        if (!active) return;
        setRain(r);
        setHeat(h);
        addRecent({ lat: place.lat, lon: place.lng, name: place.address, month });
      })
      .catch((e) => active && setErr((e as { status?: number }).status === 502 ? "offline" : "out_of_domain"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [place, month]);

  const deepLink = place
    ? `/dashboard?lat=${place.lat}&lon=${place.lng}&month=${month}&name=${encodeURIComponent(place.address)}`
    : "/dashboard";
  const cta = `/login?redirect=${encodeURIComponent(deepLink)}`;

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-6">
      <p className="eyebrow text-subtle">try it · no sign-in needed</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <LocationSearch onSelect={setPlace} />
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          aria-label="Month"
          className="rounded-full border border-line-strong bg-paper px-4 py-2 text-sm text-ink outline-none focus:border-brand"
        >
          {MONTHS_LONG.slice(1).map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {!place && (
        <p className="mt-4 text-sm text-subtle">
          Type a French address to see the historical rain and heat odds for that month — instantly.
        </p>
      )}

      {place && err && (
        <p className="mt-4 text-sm text-subtle">
          {err === "offline"
            ? "Climate service is starting up — try again in a moment."
            : "Historical odds currently cover France. Pick a French city to see the odds."}
        </p>
      )}

      {place && !err && (
        <>
          <div className="mt-4">
            <RiskCards rain={rain} heat={heat} monthName={MONTHS_LONG[month]} loading={loading} />
          </div>
          {(rain || heat) && (
            <Link
              href={cta}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-ink"
            >
              Save this &amp; explore the full picture <ArrowRight size={15} />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
