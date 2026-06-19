"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Columns3, Compass } from "lucide-react";
import { ClimateDial, type DialDatum } from "@/components/climate-dial";
import { MONTHS_SHORT } from "@/lib/format";
import { riskColor } from "@/lib/colors";
import { SEGMENTS, segmentLabel, toSegment, type Segment } from "@/lib/segments";
import type { RiskLabel } from "@/lib/types";

export interface LibraryCard {
  id: string;
  name: string;
  segment: string;
  month: number;
  eventDate: string | null;
  createdAt: string;
  rainLabel: RiskLabel | null;
  heatLabel: RiskLabel | null;
}

type Sort = "saved" | "name" | "month";

function ago(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const d = Math.floor((Date.now() - t) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "1d";
  if (d < 7) return `${d}d`;
  if (d < 30) return `${Math.floor(d / 7)}w`;
  return `${Math.floor(d / 30)}mo`;
}

function Chip({ kind, label }: { kind: "rain" | "heat"; label: RiskLabel | null }) {
  if (!label) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium text-white"
      style={{ backgroundColor: riskColor(label) }}
    >
      {kind} {label}
    </span>
  );
}

export function LibraryGrid({ cards }: { cards: LibraryCard[] }) {
  const [query, setQuery] = useState("");
  const [seg, setSeg] = useState<Segment | "all">("all");
  const [sort, setSort] = useState<Sort>("saved");
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function togglePick(id: string) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else if (n.size < 4) n.add(id);
      return n;
    });
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: cards.length };
    for (const card of cards) c[toSegment(card.segment)] = (c[toSegment(card.segment)] ?? 0) + 1;
    return c;
  }, [cards]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = cards.filter((c) => (seg === "all" ? true : toSegment(c.segment) === seg));
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "month") return a.month - b.month;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [cards, query, seg, sort]);

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <p className="eyebrow text-subtle">library · your assessments</p>
        <div className="mt-16 flex flex-col items-center text-center">
          <Compass size={28} className="text-subtle" />
          <p className="mt-4 font-sans text-2xl font-medium tracking-tight text-ink">
            No saved assessments yet.
          </p>
          <p className="mt-2 max-w-md text-sm text-subtle">
            Run an assessment on Assess, then Save it to re-open the verdict any time without
            re-computing.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-ink"
          >
            Go to Assess
          </Link>
          <div className="mt-10 opacity-60">
            <ClimateDial data={SAMPLE} selected={7} size={240} centerTop="example" centerMain="Jul" />
          </div>
        </div>
      </div>
    );
  }

  const SEG_TABS: ({ value: Segment | "all"; label: string })[] = [
    { value: "all", label: "All" },
    ...SEGMENTS.map((s) => ({ value: s.value, label: s.label })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <p className="eyebrow text-subtle">library · your assessments</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saved assessments…"
          className="w-full max-w-xs rounded-full border border-line-strong bg-surface-2 px-4 py-1.5 text-sm text-ink outline-none placeholder:text-subtle focus:border-brand"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort"
          className="rounded-md border border-line-strong bg-surface-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="saved">Recently saved</option>
          <option value="name">Name</option>
          <option value="month">Month</option>
        </select>
        <button
          onClick={() => {
            setCompareMode((m) => !m);
            setPicked(new Set());
          }}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
            compareMode ? "border-brand text-brand-ink" : "border-line-strong text-subtle hover:text-ink"
          }`}
        >
          <Columns3 size={14} /> Compare
        </button>
      </div>

      {compareMode && (
        <div className="mt-3 flex items-center justify-between rounded-[var(--radius-card)] border border-brand/40 bg-brand/5 px-4 py-2 text-sm">
          <span className="text-subtle">
            {picked.size === 0 ? "Select 2–4 assessments to compare." : `${picked.size} selected`}
          </span>
          <Link
            href={`/dashboard/library/compare?ids=${[...picked].join(",")}`}
            aria-disabled={picked.size < 2}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              picked.size >= 2
                ? "bg-brand text-white hover:bg-brand-ink"
                : "pointer-events-none bg-surface text-subtle"
            }`}
          >
            Compare ({picked.size})
          </Link>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SEG_TABS.filter((t) => t.value === "all" || (counts[t.value] ?? 0) > 0).map((t) => (
          <button
            key={t.value}
            onClick={() => setSeg(t.value)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              seg === t.value ? "bg-ink text-paper" : "border border-line text-subtle hover:text-ink"
            }`}
          >
            {t.label} {counts[t.value] ? `(${counts[t.value]})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => {
          const accent = riskColor((c.heatLabel ?? c.rainLabel) ?? "very low");
          const isPicked = picked.has(c.id);
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="eyebrow text-subtle">{segmentLabel(toSegment(c.segment))}</p>
                {compareMode && (
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isPicked ? "border-brand bg-brand text-white" : "border-line-strong"
                    }`}
                  >
                    {isPicked && <Check size={11} />}
                  </span>
                )}
              </div>
              <p className="mt-1 font-sans text-lg font-medium tracking-tight text-ink">{c.name}</p>
              <p className="mt-0.5 text-xs text-subtle">
                {c.eventDate ?? `${MONTHS_SHORT[c.month]} · any year`}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip kind="rain" label={c.rainLabel} />
                <Chip kind="heat" label={c.heatLabel} />
              </div>
              <p className="mt-3 text-[0.7rem] text-subtle">saved {ago(c.createdAt)}</p>
            </>
          );
          const cls = "block w-full rounded-[var(--radius-card)] border bg-surface-2 p-5 text-left transition-colors";
          const style = { borderLeft: `3px solid ${accent}` };
          return compareMode ? (
            <button
              key={c.id}
              onClick={() => togglePick(c.id)}
              className={`${cls} ${isPicked ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-brand"}`}
              style={style}
            >
              {body}
            </button>
          ) : (
            <Link
              key={c.id}
              href={`/dashboard/library/${c.id}`}
              className={`${cls} border-line hover:border-brand`}
              style={style}
            >
              {body}
            </Link>
          );
        })}
      </div>
      {shown.length === 0 && (
        <p className="mt-10 text-center text-sm text-subtle">No assessments match those filters.</p>
      )}
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
