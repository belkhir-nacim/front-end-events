"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import type { GeoResult } from "@/lib/google";
import type { PlaceSelection } from "@/lib/types";

export const PRESETS: PlaceSelection[] = [
  { address: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { address: "Nice, France", lat: 43.7102, lng: 7.262 },
  { address: "Marseille, France", lat: 43.2965, lng: 5.3698 },
  { address: "Lyon, France", lat: 45.764, lng: 4.8357 },
  { address: "Bordeaux, France", lat: 44.8378, lng: -0.5792 },
  { address: "Toulouse, France", lat: 43.6047, lng: 1.4442 },
  { address: "Ajaccio, France", lat: 41.9192, lng: 8.7386 },
  { address: "Brest, France", lat: 48.3904, lng: -4.4861 },
];

const shortName = (a: string) => a.split(",")[0];

export function LocationSearch({
  onSelect,
}: {
  onSelect: (p: PlaceSelection) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/geo?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setConfigured(j.configured !== false);
        setResults(j.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (p: PlaceSelection) => {
    onSelect(p);
    setQ(p.address);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2.5 rounded-full border border-line-strong bg-surface-2 px-4 py-2.5 focus-within:border-brand">
        <Search size={17} className="text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search an address or place…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
        />
        {loading && <Loader2 size={15} className="animate-spin text-subtle" />}
      </div>

      {open && (results.length > 0 || (!configured && q.length >= 3)) && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-[var(--shadow-card)]">
          {!configured ? (
            <p className="px-4 py-3 text-xs text-subtle">
              Address search needs <span className="tnum">GOOGLE_MAPS_API_KEY</span> set on the
              server. Use a quick pick or coordinates below.
            </p>
          ) : (
            results.map((r) => (
              <button
                key={r.placeId ?? r.address}
                onClick={() => pick({ lat: r.lat, lng: r.lng, address: r.address, placeId: r.placeId })}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink hover:bg-paper"
              >
                <MapPin size={15} className="shrink-0 text-brand" />
                <span className="truncate">{r.address}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Quick picks */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="eyebrow self-center text-subtle">quick picks</span>
        {PRESETS.map((p) => (
          <button
            key={p.address}
            onClick={() => pick(p)}
            className="rounded-full border border-line px-3 py-1 text-xs text-subtle hover:border-ink hover:text-ink transition-colors"
          >
            {shortName(p.address)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MapPanel({ place }: { place: PlaceSelection | null }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [place?.lat, place?.lng]);

  if (!place) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-[var(--radius-card)] border border-line bg-surface text-sm text-subtle">
        Pick a location to see the map
      </div>
    );
  }
  if (broken) {
    return (
      <div className="flex aspect-[16/9] flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border border-line bg-surface">
        <MapPin size={20} className="text-brand" />
        <p className="tnum text-sm text-ink">
          {place.lat.toFixed(3)}, {place.lng.toFixed(3)}
        </p>
        <p className="text-xs text-subtle">map preview unavailable</p>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/geo/staticmap?lat=${place.lat}&lon=${place.lng}&zoom=11`}
      alt={`Map of ${place.address}`}
      onError={() => setBroken(true)}
      className="aspect-[16/9] w-full rounded-[var(--radius-card)] border border-line object-cover"
    />
  );
}
