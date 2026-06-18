import type { NextRequest } from "next/server";

// Server-side proxy: browser -> /api/climate/<endpoint> -> FastAPI /api/v1/<endpoint>.
// Keeps CLIMATE_API_URL server-only, normalizes errors, and caches (historical
// data is static). e.g. GET /api/climate/rain-risk?lat=48.85&lon=2.35&month=8
const BASE = process.env.CLIMATE_API_URL ?? "http://localhost:8000";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const target = `${BASE}/api/v1/${path.join("/")}${req.nextUrl.search}`;
  try {
    const upstream = await fetch(target, { next: { revalidate: 3600 } });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return Response.json(
      {
        error: "climate_api_unreachable",
        detail: e instanceof Error ? e.message : String(e),
        hint: `Is the FastAPI climate service running at ${BASE}? Start it from ../service.`,
      },
      { status: 502 },
    );
  }
}
