// Client-only "most recently viewed" list (localStorage), so even UNSAVED ad-hoc
// lookups are recoverable from the Cmd-K palette. Written whenever the dashboard
// assembles a snapshot.
export interface RecentEntry {
  lat: number;
  lon: number;
  name: string;
  month: number;
  date?: string | null;
  segment?: string;
  ts: number;
}

const KEY = "serenia.recent.v1";
const MAX = 12;

export function getRecent(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(arr) ? (arr as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

export function addRecent(e: Omit<RecentEntry, "ts">): void {
  if (typeof window === "undefined") return;
  const same = (x: RecentEntry) =>
    x.lat === e.lat && x.lon === e.lon && x.month === e.month && (x.date ?? null) === (e.date ?? null);
  const next = [{ ...e, ts: Date.now() }, ...getRecent().filter((x) => !same(x))].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — ignore */
  }
}
