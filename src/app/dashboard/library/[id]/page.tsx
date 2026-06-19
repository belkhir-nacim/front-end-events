import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssessment } from "@/lib/db/assessments";
import { parseSnapshot } from "@/lib/snapshot";
import { ReadOnlyAssessment } from "@/components/library/read-only-assessment";

export const metadata = { title: "Assessment · Serenia" };

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getAssessment(id).catch(() => null);
  if (!row) notFound();

  const snap = parseSnapshot(row.snapshot);
  if (!snap) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="font-sans text-xl font-medium text-ink">This saved assessment can&apos;t be displayed.</p>
        <p className="mt-2 text-sm text-subtle">
          It was saved in an older format. Re-run it live to refresh the verdict.
        </p>
        <Link
          href="/dashboard/library"
          className="mt-6 inline-block rounded-full border border-line-strong px-4 py-2 text-sm text-ink hover:border-brand"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  return <ReadOnlyAssessment snap={snap} name={row.name} id={row.id} />;
}
