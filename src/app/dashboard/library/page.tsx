import { listAssessments } from "@/lib/db/assessments";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { parseSnapshot } from "@/lib/snapshot";
import { LibraryGrid, type LibraryCard } from "@/components/library/library-grid";

export const metadata = { title: "Library · Serenia" };

export default async function LibraryPage() {
  let cards: LibraryCard[] = [];
  if (isSupabaseConfigured()) {
    try {
      const rows = await listAssessments();
      cards = rows.map((r) => {
        const snap = parseSnapshot(r.snapshot);
        return {
          id: r.id,
          name: r.name,
          segment: r.segment ?? "other",
          month: r.month,
          eventDate: r.event_date,
          createdAt: r.created_at,
          rainLabel: snap?.rain?.risk_label_heavy_rain ?? null,
          heatLabel: snap?.heat?.risk_label_extreme_heat ?? null,
        };
      });
    } catch {
      /* render empty on read error */
    }
  }
  return <LibraryGrid cards={cards} />;
}
