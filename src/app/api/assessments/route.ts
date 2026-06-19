import type { NextRequest } from "next/server";
import {
  assessmentInput,
  createAssessment,
  listAssessments,
  Unauthenticated,
} from "@/lib/db/assessments";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ configured: false, assessments: [] });
  try {
    return Response.json({ configured: true, assessments: await listAssessments() });
  } catch (e) {
    return Response.json({ configured: true, assessments: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "auth not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const parsed = assessmentInput.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid input", issues: parsed.error.issues }, { status: 422 });
  }
  try {
    return Response.json({ assessment: await createAssessment(parsed.data) }, { status: 201 });
  } catch (e) {
    const status = e instanceof Unauthenticated ? 401 : 500;
    return Response.json({ error: String(e) }, { status });
  }
}
