export const meta = {
  name: 'serenia-full-implementation-plan',
  description: 'Full phased implementation plan for the Serenia SMB roadmap, centered on an extensive UX study for recovering & viewing already-computed data',
  phases: [
    { title: 'Map', detail: 'read-only mapping of the exact seams: data-flow/snapshot/caching, persistence+RLS, UI building blocks & IA, platform sibling reuse' },
    { title: 'UX', detail: 'three complete UX concepts for recovering & viewing already-computed data (assessments history + precomputed climatology explorer)' },
    { title: 'Judge', detail: 'score the UX concepts on SMB usability, learnability, recover-and-view fit, feasibility; recommend one' },
    { title: 'Plan', detail: 'synthesize the full phased implementation plan with the chosen UX baked in' },
  ],
}

const FE = '/home/nacim/workspace/serenia/event_historical/front-end-events'
const ROOT = '/home/nacim/workspace/serenia/event_historical'

const PRIMER = `PRODUCT: "Serenia" — address-level HISTORICAL climate-risk decision tool for outdoor events (weddings, festivals, film shoots, venues, field ops). Sells a verdict + mitigation plan + branded shareable report + grounded chat agent, NOT raw weather. Stack: Next.js 16 (App Router, React 19), Supabase (auth+DB, @supabase/ssr, RLS), OpenRouter LLM via LangGraph.js, Google Maps (proxied), recharts, Geist + Geist Pixel fonts, design tokens in ${FE}/src/app/globals.css (paper/ink/brand, rain/heat ramps, .eyebrow pixel accents). Package manager: bun. Build: env -u NODE_ENV bun run build.

DATA / BACKENDS:
- ERA5 service (FastAPI, ${ROOT}/service): read-only, serves a precomputed parquet. Endpoints /api/v1: point, climatology (12-month normals), timeseries (one month across years, e.g. "all Augusts"), summary, risk, rain-risk, heat-risk. MONTH-ONLY (keyed 1-12). VERIFIED current state: still ships SYNTHETIC sample (is_sample=true, 0.5deg, 73080 rows); the REAL France parquet (2014-2023, 0.25deg, 14MB) is built and staged at ${ROOT}/output/france/france_monthly_timeseries.parquet but NOT yet copied into service/api/data/. France-only coverage; ~28km grid (area-level, UI already labels it).
- Open-Meteo: 16-day forecast + 45-day subseasonal (CFS) + CMIP6 projections to 2050. Reached via ${FE}/src/lib/{climate,subseasonal,projection}.ts and /api/{climate,subseasonal,projection} proxies.

CURRENT FRONT-END (built): landing (${FE}/src/app/page.tsx), Supabase auth (email+Google), dashboard (${FE}/src/app/dashboard, ${FE}/src/components/dashboard/dashboard-client.tsx orchestrator) with address search (location.tsx + /api/geo), historical rain/heat RiskCards + recharts charts, ClimateDial, save "asset"/venue (assets-bar.tsx, ${FE}/src/lib/db/assets.ts, /api/assets[/id], migration ${FE}/supabase/migrations/0001_event_assets.sql, RLS own-row), 45-day subseasonal panel, CMIP6 projection panel, recommendation.tsx (deterministic tips), LangGraph chat agent (${FE}/src/lib/agent/agent.ts + tools.ts, /api/chat SSE) with doc/Excel/image upload persisted across turns. Dashboard assembles a chatContext.snapshot {name, lat, lon, month, eventDate/end, historical rain/heat, forecast_45d, projection_2050} then DISCARDS it on navigation. event_assets has an event_type column captured but unused.

SIBLING ${ROOT}/platform/src — proven patterns to PORT: reports/resolve-share-token, billing/plans+gating, alerts/evaluate + notifications/email, llm/usage, db/conversations.

KEY LIMITATIONS (SMB-impacting): (1) synthetic data still live [hours to fix]; (2) France-only [TAM ceiling]; (3) month-only [#1 JTBD is "rain on June 15?"]; (4) 28km area-grid [messaging]; (5) zero monetization, NO durable artifacts, ephemeral one-shot lookups, stateless chat [no retention].`

const ROADMAP = `APPROVED ROADMAP (from the business analysis; build the plan to cover ALL of it, sequenced by dependency):
QUICK WINS: (P0) deploy real France parquet + flip is_sample=false [XS, gates everything]; (Q1) segment-aware recommendation templates off event_type [S]; (Q2) precision-framing tooltip + "lowest-risk months" strip from the already-loaded 12-month climatology [S].
NEAR-TERM: (N1) Saved Assessments + read-only history — persist the snapshot the dashboard already builds (clone assets CRUD + RLS), re-hydrate with zero recompute [M] — THE RETENTION SPINE; (N2) shareable watermarked report at /report/[token] (HTML, public route, re-renders existing charts; white-label = first paid unlock) [M]; (N3) no-login instant verdict on landing [S-M]; (N4) usage-metering spine (usage_events + meter wrapper on /api/chat) before Stripe [M].
STRATEGIC: (S1) multi-region (US/UK/AU) via a Store registry in service _core.py [L]; (S2) day-of-year window climatology endpoint ("June 15?") from the daily dataset currently discarded in grid.py [M-L]; (S3) best-date optimizer + multi-venue compare (Pro hero, built on S2) [L]; (S4) Stripe checkout + seasonal-aware entitlements [L]; (S5) date-window alerts via Vercel cron (forecast crosses historical baseline) [M]; (S6) durable per-client chat memory (thread_id + Postgres checkpointer) [M].

SPECIAL EMPHASIS FROM THE USER: an EXTENSIVE, efficient, user-friendly UX so users can RECOVER ALREADY-COMPUTED DATA AND VIEW IT. Interpret "already-computed data" in BOTH senses: (a) the user's own past assessments/verdicts they computed before (the discarded snapshot -> persist + re-view without recompute), and (b) the precomputed ERA5 climatology the pipeline already produced (browse/view efficiently, cached, no recompute — e.g. month browsing, "all Augusts", grid/map). This recover-&-view experience is the centerpiece of the plan.`

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' }, description: 'precise facts: function names, fields, flow, caching, RLS pattern, component props' },
    reusable: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, what: { type: 'string' } }, required: ['path', 'what'] } },
    gotchas: { type: 'array', items: { type: 'string' } },
  },
  required: ['area', 'findings', 'reusable'],
}

const UX_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    one_liner: { type: 'string' },
    ia_model: { type: 'string', description: 'information architecture & where recover/view lives in the nav' },
    navigation: { type: 'string' },
    primary_screens: { type: 'array', items: { type: 'object', properties: { screen: { type: 'string' }, purpose: { type: 'string' }, wireframe: { type: 'string', description: 'ASCII wireframe' } }, required: ['screen', 'purpose', 'wireframe'] } },
    states: { type: 'object', properties: { empty: { type: 'string' }, loading: { type: 'string' }, compare: { type: 'string' }, error: { type: 'string' }, mobile: { type: 'string' } } },
    rehydration_caching: { type: 'string', description: 'how saved snapshots & precomputed climatology are recovered without recompute; cache strategy' },
    precomputed_explorer: { type: 'string', description: 'how the user browses/views the precomputed ERA5 climatology (month browse, all-Augusts, grid/map)' },
    integration: { type: 'string', description: 'ties to assets, segments, reports, chat' },
    pros: { type: 'array', items: { type: 'string' } },
    cons: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'one_liner', 'ia_model', 'primary_screens', 'rehydration_caching', 'pros', 'cons'],
}

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    concept: { type: 'string' },
    usability: { type: 'integer' }, learnability: { type: 'integer' },
    recover_view_fit: { type: 'integer' }, feasibility: { type: 'integer' },
    recommend: { type: 'boolean' },
    verdict: { type: 'string' },
    best_ideas_to_graft: { type: 'array', items: { type: 'string' } },
  },
  required: ['concept', 'usability', 'learnability', 'recover_view_fit', 'feasibility', 'recommend', 'verdict'],
}

const PHASE_ITEM = {
  type: 'object',
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, goal: { type: 'string' },
    addresses: { type: 'string' }, effort: { type: 'string' },
    data_model: { type: 'array', items: { type: 'string' } },
    api_routes: { type: 'array', items: { type: 'string' } },
    components: { type: 'array', items: { type: 'string' } },
    reuse: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, what: { type: 'string' } }, required: ['path', 'what'] } },
    depends_on: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'title', 'goal', 'addresses', 'effort'],
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    context: { type: 'string' },
    ux: {
      type: 'object',
      properties: {
        chosen: { type: 'string' },
        why: { type: 'string' },
        ia_summary: { type: 'string' },
        key_screens: { type: 'array', items: { type: 'object', properties: { screen: { type: 'string' }, wireframe: { type: 'string' }, notes: { type: 'string' } }, required: ['screen', 'wireframe'] } },
        states: { type: 'string' },
        rehydration_caching: { type: 'string' },
        precomputed_explorer: { type: 'string' },
        components_to_build: { type: 'array', items: { type: 'string' } },
        components_to_reuse: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, what: { type: 'string' } }, required: ['path', 'what'] } },
      },
      required: ['chosen', 'why', 'ia_summary', 'key_screens', 'rehydration_caching'],
    },
    phases: { type: 'array', items: PHASE_ITEM },
    cross_cutting: { type: 'array', items: { type: 'string' }, description: 'RLS checklist, caching, security, perf, a11y, design-token adherence' },
    verification: { type: 'array', items: { type: 'string' } },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['context', 'ux', 'phases', 'verification'],
}

// ---------- Phase 1: Map ----------
phase('Map')
const mapTargets = [
  { label: 'map:dataflow', prompt: `Read ${FE}/src/components/dashboard/dashboard-client.tsx, ${FE}/src/lib/climate.ts, ${FE}/src/lib/types.ts, ${FE}/src/components/chat/use-chat-stream.ts, ${FE}/src/app/api/climate/[...path]/route.ts, ${FE}/src/lib/{subseasonal,projection}.ts. Map PRECISELY: how the dashboard fetches data and assembles the chatContext.snapshot (exact fields & types), where/how it is discarded, what client/server caching exists (revalidate/cache headers), and what "already computed" data the app and the ERA5 service expose (climatology, timeseries/all-Augusts, risk). This feeds the re-hydration design. area="Data flow, snapshot & caching".` },
  { label: 'map:persist', prompt: `Read ${FE}/src/lib/db/assets.ts, ${FE}/src/app/api/assets/route.ts, ${FE}/src/app/api/assets/[id]/route.ts, ${FE}/supabase/migrations/0001_event_assets.sql, ${FE}/src/lib/supabase/{server,middleware,client}.ts, ${FE}/middleware.ts. Extract the EXACT reusable persistence + RLS + authenticated-route pattern to clone for a saved_assessments table (zod validation, own-row policies, service vs ssr client, middleware matcher for public routes). area="Persistence & RLS pattern".` },
  { label: 'map:ui', prompt: `Explore ${FE}/src/app/dashboard/{layout,page}.tsx, ${FE}/src/components/dashboard/* (charts.tsx, risk-cards.tsx, recommendation.tsx, climate-dial.tsx, location.tsx, assets-bar.tsx, event-date-card.tsx, subseasonal.tsx, projection-panel.tsx), ${FE}/src/components/brand.tsx, ${FE}/src/app/globals.css. Inventory the reusable UI building blocks, their props, the design tokens/typography (paper/ink/brand, Geist + Geist Pixel .eyebrow), and the current navigation/IA. Determine what can render a SAVED assessment read-only and a LIBRARY/history list. area="UI building blocks & IA".` },
  { label: 'map:platform', prompt: `Explore ${ROOT}/platform/src for: reports/resolve-share-token (public share-link pattern), billing/plans + gating/entitlements, alerts/evaluate + notifications/email, llm/usage (metering), db/conversations (chat threads). Report exact files/exports to port for the report, metering, Stripe, alerts, and durable-chat phases. If a path is absent, say so. area="Platform sibling reuse".` },
]
const maps = (await parallel(mapTargets.map((t) => () =>
  agent(t.prompt, { label: t.label, phase: 'Map', schema: MAP_SCHEMA, agentType: 'Explore' })))).filter(Boolean)
const mapJson = JSON.stringify(maps)
log(`mapped ${maps.length}/4 areas`)

// ---------- Phase 2: UX study (3 complete concepts) ----------
phase('UX')
const FD = `Apply senior frontend-design judgment: information architecture should ENCODE meaning (not decorate); make recover-&-view fast and obvious; respect the EXISTING visual identity (paper/ink/brand tokens, Geist + Geist Pixel .eyebrow accents in globals.css) rather than reinventing; design empty/loading/compare/error and MOBILE states; keep it accessible (keyboard, focus, reduced motion); restraint over ornament. Include ASCII wireframes for each primary screen.`
const CONCEPTS = [
  { key: 'asset-hub', brief: 'CONCEPT A — "Venue/Client hub": the saved asset (venue or client) is the home object; opening it shows a timeline of its saved assessments + a live "compute new" action. Recover = drill into the asset. Precomputed climatology is shown inline per asset (12-month dial + all-Augusts).' },
  { key: 'library-timeline', brief: 'CONCEPT B — "Assessments Library": a dedicated top-level Library/History page listing every saved assessment as cards (location, date/month, rain/heat verdict chips, segment), with search/filter/sort and a read-only assessment detail view that re-hydrates instantly from the stored snapshot. Precomputed climatology gets a separate "Explore climate" mode (month browser + map).' },
  { key: 'command-recall', brief: 'CONCEPT C — "Instant recall + map explorer": a command/recall bar (recent + saved, fuzzy search) to jump back to any computed assessment in one keystroke, plus a France map/grid explorer to browse the precomputed climatology spatially (click a cell -> cached climatology), with pinned/compare trays.' },
]
const uxResults = (await parallel(CONCEPTS.map((c) => () =>
  agent(`${PRIMER}\n\n${ROADMAP}\n\nMAP (authoritative, from the code):\n${mapJson}\n\n${FD}\n\n${c.brief}\n\nDesign this concept END-TO-END as a concrete, build-ready UX for SMB event planners, focused on RECOVERING already-computed data and VIEWING it efficiently (both the user's saved assessments AND the precomputed ERA5 climatology, re-hydrated with zero recompute). Fill every schema field; ASCII wireframes for each primary screen; be specific to the real components/tokens in the map.`,
    { label: `ux:${c.key}`, phase: 'UX', schema: UX_SCHEMA, agentType: 'Plan' })))).filter(Boolean)
const uxJson = JSON.stringify(uxResults)
log(`designed ${uxResults.length} UX concepts`)

// ---------- Phase 3: Judge ----------
phase('Judge')
const judged = (await parallel(uxResults.map((u) => () =>
  agent(`${PRIMER}\n\nMAP:\n${mapJson}\n\nUX CONCEPT under review:\n${JSON.stringify(u)}\n\nAll three concepts (for comparison):\n${uxJson}\n\nScore this concept for a non-technical SMB event planner: usability, learnability, recover_view_fit (how well it lets users recover & view already-computed data — both saved assessments and precomputed climatology), feasibility (1-5 given the real components/data; month-only, France-only, reuse-heavy preferred). recommend=true if it should be the basis. Name best_ideas_to_graft from the OTHER concepts. Be decisive.`,
    { label: `judge:${u.name?.slice(0, 24) || 'concept'}`, phase: 'Judge', schema: JUDGE_SCHEMA, agentType: 'Plan' })))).filter(Boolean)
const judgeJson = JSON.stringify(judged)
log(`judged ${judged.length} concepts`)

// ---------- Phase 4: Synthesize full plan ----------
phase('Plan')
const plan = await agent(
  `${PRIMER}\n\n${ROADMAP}\n\nMAP (seams & reuse):\n${mapJson}\n\nUX CONCEPTS:\n${uxJson}\n\nUX JUDGEMENTS (pick the winner, graft the best ideas):\n${judgeJson}\n\nProduce the FULL phased implementation plan to build the ENTIRE roadmap, with the chosen recover-&-view UX as the centerpiece. Requirements:\n- context: why, and the verified current state (synthetic data still live; real France parquet staged; ephemeral snapshot).\n- ux: choose ONE concept (or an explicit hybrid), justify it from the judgements, give ia_summary, key_screens with ASCII wireframes, states, rehydration_caching (recover saved snapshot AND browse precomputed climatology with zero recompute), precomputed_explorer, components_to_build, components_to_reuse (real paths).\n- phases: ordered P0..S6 covering every roadmap item; each with goal, addresses (which limitation), effort, data_model (tables/migrations), api_routes, components, reuse (real paths from the map), depends_on, risks. Put the Saved-Assessments + recover-&-view UX as the early centerpiece right after the P0 real-data deploy.\n- cross_cutting: RLS checklist, caching (historical immutable / forecast short), security (server-only keys, public report route), a11y, design-token adherence, build gotcha (env -u NODE_ENV bun run build).\n- verification: concrete end-to-end checks per phase.\n- open_questions: anything needing a user decision.\nBe concrete and grounded in the real files. No fluff.`,
  { label: 'synthesize-plan', phase: 'Plan', schema: PLAN_SCHEMA, agentType: 'Plan' })

return { ux_scores: judged.map((j) => ({ concept: j.concept, usability: j.usability, learnability: j.learnability, recover_view_fit: j.recover_view_fit, feasibility: j.feasibility, recommend: j.recommend })), plan }