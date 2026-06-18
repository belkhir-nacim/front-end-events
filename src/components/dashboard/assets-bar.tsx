"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, Plus, X } from "lucide-react";
import type { Asset } from "@/lib/db/assets";
import type { PlaceSelection } from "@/lib/types";

export function AssetsBar({
  current,
  onPick,
  activeAssetId,
}: {
  current: PlaceSelection | null;
  onPick: (p: PlaceSelection, assetId: string, eventDate: string | null) => void;
  activeAssetId: string | null;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [configured, setConfigured] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/assets");
      const j = await r.json();
      setConfigured(j.configured !== false);
      setAssets(j.assets ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = () => {
    setName(current?.address?.split(",")[0] ?? "");
    setEventType("");
    setEventDate("");
    setFormOpen(true);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setSaving(true);
    try {
      const r = await fetch("/api/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || current.address,
          address: current.address,
          lat: current.lat,
          lon: current.lng,
          event_type: eventType.trim() || null,
          event_date: eventDate || null,
        }),
      });
      if (r.ok) {
        setFormOpen(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, ev: React.MouseEvent) {
    ev.stopPropagation();
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    await load();
  }

  if (!configured) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow inline-flex items-center gap-1 text-subtle">
        <Bookmark size={12} /> assets
      </span>

      {assets.map((a) => (
        <button
          key={a.id}
          onClick={() => onPick({ lat: a.lat, lng: a.lon, address: a.name }, a.id, a.event_date ?? null)}
          className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
            activeAssetId === a.id
              ? "border-brand bg-brand/10 text-brand-ink"
              : "border-line text-subtle hover:border-ink hover:text-ink"
          }`}
        >
          {a.name}
          <X
            size={12}
            onClick={(e) => remove(a.id, e)}
            className="opacity-0 transition-opacity hover:text-heat-hot group-hover:opacity-60"
          />
        </button>
      ))}

      {current && (
        <button
          onClick={openForm}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1 text-xs text-subtle hover:border-brand hover:text-brand-ink transition-colors"
        >
          <Plus size={12} /> Save this place
        </button>
      )}

      {formOpen && current && (
        <form
          onSubmit={save}
          className="mt-2 flex w-full flex-wrap items-end gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-3"
        >
          <label className="flex flex-col text-xs text-subtle">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-48 rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col text-xs text-subtle">
            Event type
            <input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="wedding, festival…"
              className="mt-1 w-40 rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col text-xs text-subtle">
            Date
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1 rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-ink disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save asset"}
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(false)}
            className="rounded-full px-3 py-1.5 text-sm text-subtle hover:text-ink"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
