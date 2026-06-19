"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Check } from "lucide-react";
import { SEGMENTS, type Segment } from "@/lib/segments";

export function SaveAssessment({
  defaultName,
  defaultSegment,
  defaultDate,
  onSave,
}: {
  defaultName: string;
  defaultSegment: Segment;
  defaultDate: string | null;
  onSave: (fields: { name: string; segment: Segment; eventDate: string | null }) => Promise<{ id: string } | null>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [segment, setSegment] = useState<Segment>(defaultSegment);
  const [date, setDate] = useState(defaultDate ?? "");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(false);
    try {
      const res = await onSave({ name: name.trim() || defaultName, segment, eventDate: date || null });
      if (res?.id) {
        setSavedId(res.id);
        setOpen(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (savedId) {
    return (
      <Link
        href={`/dashboard/library/${savedId}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand px-3 py-1.5 text-sm font-medium text-brand-ink hover:bg-brand/10"
      >
        <Check size={15} /> Saved · View
      </Link>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-ink"
      >
        <Bookmark size={15} /> Save
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-[var(--radius-card)] border border-line bg-surface-2 p-4 shadow-lg">
          <form onSubmit={submit} className="space-y-2.5">
            <p className="eyebrow text-subtle">save this assessment</p>
            <label className="block text-xs text-subtle">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="block text-xs text-subtle">
              Event type
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as Segment)}
                className="mt-1 w-full rounded-md border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-subtle">
              Date (optional)
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tnum mt-1 w-full rounded-md border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <p className="text-[0.7rem] leading-snug text-subtle">
              Captures this month&apos;s odds, the 45-day outlook, charts and the 2050 projection — re-open it any time without recomputing.
            </p>
            {error && <p className="text-xs text-heat-hot">Couldn&apos;t save — try again.</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1.5 text-sm text-subtle hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-brand px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-ink disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save to Library"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
