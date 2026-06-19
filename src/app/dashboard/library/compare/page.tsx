import Link from "next/link";
import { getAssessment } from "@/lib/db/assessments";
import { parseSnapshot, type AssessmentSnapshot } from "@/lib/snapshot";
import { CompareView } from "@/components/library/compare-view";

export const metadata = { title: "Compare · Serenia" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);

  const rows = await Promise.all(idList.map((id) => getAssessment(id).catch(() => null)));
  const items = rows
    .map((r) => (r ? { id: r.id, name: r.name, snapshot: parseSnapshot(r.snapshot) } : null))
    .filter((x): x is { id: string; name: string; snapshot: AssessmentSnapshot } => Boolean(x && x.snapshot));

  if (items.length < 2) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="font-sans text-xl font-medium text-ink">Pick at least two assessments to compare.</p>
        <Link
          href="/dashboard/library"
          className="mt-6 inline-block rounded-full border border-line-strong px-4 py-2 text-sm text-ink hover:border-brand"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  return <CompareView items={items} />;
}
