import { notFound } from "next/navigation";
import { resolveShareToken } from "@/lib/db/share";
import { ReadOnlyAssessment } from "@/components/library/read-only-assessment";

export const metadata = {
  title: "Climate report · Serenia",
  robots: { index: false }, // unguessable share link — don't index
};

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await resolveShareToken(token).catch(() => null);
  if (!report) notFound();
  return (
    <ReadOnlyAssessment snap={report.snapshot} name={report.name} showActions={false} watermark />
  );
}
