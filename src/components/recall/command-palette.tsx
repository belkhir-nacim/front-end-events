"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Compass, MapPin, Search, Bookmark } from "lucide-react";
import { getRecent, type RecentEntry } from "@/lib/recent";
import { MONTHS_SHORT } from "@/lib/format";
import { segmentLabel, toSegment } from "@/lib/segments";

interface SavedItem {
  id: string;
  name: string;
  segment: string | null;
  month: number;
}
interface PlaceItem {
  id: string;
  name: string;
  lat: number;
  lon: number;
  month: number;
}

const dl = (lat: number, lon: number, month: number, name: string, date?: string | null) =>
  `/dashboard?lat=${lat}&lon=${lon}&month=${month}&name=${encodeURIComponent(name)}${date ? `&date=${date}` : ""}`;

function Row({ icon, title, meta, onClick }: { icon: React.ReactNode; title: string; meta?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface focus:bg-surface focus:outline-none"
    >
      <span className="text-subtle">{icon}</span>
      <span className="flex-1 truncate">{title}</span>
      {meta && <span className="shrink-0 text-xs text-subtle">{meta}</span>}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 eyebrow text-subtle">{label}</p>
      {children}
    </div>
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setRecent(getRecent());
    setTimeout(() => inputRef.current?.focus(), 0);
    fetch("/api/assessments")
      .then((r) => r.json())
      .then((j) =>
        setSaved(
          (j.assessments ?? []).map((a: { id: string; name: string; segment: string | null; month: number }) => ({
            id: a.id,
            name: a.name,
            segment: a.segment,
            month: a.month,
          })),
        ),
      )
      .catch(() => {});
    fetch("/api/assets")
      .then((r) => r.json())
      .then((j) =>
        setPlaces(
          (j.assets ?? []).map((a: { id: string; name: string; lat: number; lon: number; event_date: string | null }) => ({
            id: a.id,
            name: a.name,
            lat: a.lat,
            lon: a.lon,
            month: a.event_date ? Number(a.event_date.slice(5, 7)) : 6,
          })),
        ),
      )
      .catch(() => {});
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const ql = q.trim().toLowerCase();
  const match = (s: string) => !ql || s.toLowerCase().includes(ql);
  const fRecent = recent.filter((r) => match(r.name));
  const fSaved = saved.filter((s) => match(s.name));
  const fPlaces = places.filter((p) => match(p.name));
  const nothing = fRecent.length + fSaved.length + fPlaces.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Recall a place or saved assessment"
        className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs text-subtle transition-colors hover:border-ink hover:text-ink"
      >
        <Search size={13} />
        <span className="hidden sm:inline">Recall</span>
        <kbd className="tnum rounded border border-line bg-surface px-1 text-[0.65rem]">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Recall"
            className="relative mx-auto mt-[12vh] w-[92%] max-w-2xl overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2 shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Search size={16} className="text-subtle" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Jump to a place, date, or saved assessment…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
              />
              <span className="text-xs text-subtle">esc</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {fRecent.length > 0 && (
                <Group label="recent">
                  {fRecent.map((r, i) => (
                    <Row
                      key={`r${i}`}
                      icon={<Clock size={15} />}
                      title={r.name}
                      meta={`${MONTHS_SHORT[r.month]}${r.date ? ` · ${r.date}` : ""}`}
                      onClick={() => go(dl(r.lat, r.lon, r.month, r.name, r.date))}
                    />
                  ))}
                </Group>
              )}
              {fSaved.length > 0 && (
                <Group label="saved">
                  {fSaved.map((s) => (
                    <Row
                      key={s.id}
                      icon={<Bookmark size={15} />}
                      title={s.name}
                      meta={`${segmentLabel(toSegment(s.segment))} · ${MONTHS_SHORT[s.month]}`}
                      onClick={() => go(`/dashboard/library/${s.id}`)}
                    />
                  ))}
                </Group>
              )}
              {fPlaces.length > 0 && (
                <Group label="places">
                  {fPlaces.map((p) => (
                    <Row
                      key={p.id}
                      icon={<MapPin size={15} />}
                      title={p.name}
                      onClick={() => go(dl(p.lat, p.lon, p.month, p.name))}
                    />
                  ))}
                </Group>
              )}
              <Group label="actions">
                <Row icon={<Compass size={15} />} title="Open the climate explorer" onClick={() => go("/dashboard/explore")} />
                <Row icon={<Search size={15} />} title="New assessment" onClick={() => go("/dashboard")} />
              </Group>
              {nothing && (
                <p className="px-3 py-6 text-center text-sm text-subtle">
                  Your recent lookups and saved assessments will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
