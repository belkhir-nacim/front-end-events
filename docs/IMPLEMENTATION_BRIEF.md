I have everything I need to produce this brief. The findings are comprehensive and current; my job is to resolve contradictions, make hard architectural decisions, and shape it into something a senior team can build from. Let me write the markdown directly as my output.

# front-end-events — Implementation Brief

**Address-based historical climate-risk dashboard (rain + heat) with a tool-calling chat agent.**
Stack: Next.js (App Router, React 19) · OpenRouter LLMs · Google Maps Platform · Supabase (Auth/DB) · Stripe · Vercel · consumes a local FastAPI ERA5 climate API.
Date context: June 2026. Versions below verified via `npm view` in the research pass — pin them.

---

## 0. The one decision that frames everything

The product's defensible value is **historical climatology** (ERA5 1940–present, served by your FastAPI `/api/v1/*`), not forecasting. Raw weather data is commoditized (Visual Crossing $0.0001/record, Weatherbit free tier). You sell the **decision layer**: a risk verdict + recommendation plan + branded report + a grounded chat agent. Every architectural choice below protects that seam: the agent must never invent a risk number; forecast (Open-Meteo, ≤16 days) and historical-probability must be visually distinct in the UI.

---

## 1. RECOMMENDED ARCHITECTURE

### 1.1 Agent runtime decision: **LangGraph.js `createAgent` for the agent core; Vercel AI SDK only at the UI boundary.**

This resolves the central contradiction in the findings (Researcher 1 favors LangGraph; Researcher 4 proposes a dual AI-SDK + LangGraph setup). **Decision and rationale:**

- **Use `createAgent` from the `langchain` v1 package** (NOT the deprecated `createReactAgent` from `@langchain/langgraph/prebuilt`) as the agent. Rationale: you need (a) durable per-conversation memory via a Postgres checkpointer on stateless Vercel functions, (b) explicit tool-step surfacing for the "show the agent's reasoning" UX, and (c) a clean upgrade path to a supervisor StateGraph if you later split rain/heat/planner specialists. The LangChain chat-model + tool abstraction is the native fit for this; LangGraph gives checkpointing the bare AI SDK does not.
- **OpenRouter plugs in via `@langchain/openai`'s `ChatOpenAI`**, NOT a dedicated provider. Set `configuration.baseURL = 'https://openrouter.ai/api/v1'` and `apiKey = OPENROUTER_API_KEY`. The newer `@langchain/openrouter` (`ChatOpenRouter` v0.4.0) is less battle-tested — skip for production. The OpenRouter-specific `@openrouter/ai-sdk-provider` is for the *AI SDK path*, which we are not using for the agent core — **do not install both stacks for the LLM**; one OpenRouter key, one model-wiring approach.
- **Vercel AI SDK is used ONLY as the streaming transport to the React UI**, via `@ai-sdk/langchain`'s `toUIMessageStream` + `createUIMessageStreamResponse`, consumed by `useChat`. This gives tool-step UI parts for free. **Flagged risk (medium confidence):** `toUIMessageStream` has a reported "content is not iterable" error on some full-agent streams (vercel/ai #7932). **Mitigation:** build the manual `ReadableStream`/SSE fallback (Researcher 1, snippet B) first as the reference path; adopt the AI SDK bridge only after verifying it against your actual agent stream in a spike. Keep the fallback in the repo.

Net: **one** LLM wiring (`ChatOpenAI` → OpenRouter), **one** agent framework (LangGraph `createAgent`), and the AI SDK strictly at the HTTP/React seam.

### 1.2 App Router structure

```
app/
  (marketing)/
    page.tsx                      # landing — Server Component, static
    pricing/page.tsx
  (auth)/
    login/page.tsx
    auth/callback/route.ts        # exchangeCodeForSession (OAuth/magic-link)
  (app)/                          # authenticated shell; layout gates via getClaims()
    dashboard/page.tsx            # map + verdict + charts (server-rendered shell)
    locations/page.tsx           # saved venues/portfolio (v1)
    reports/[id]/page.tsx
    settings/billing/page.tsx     # Stripe portal link
  api/
    chat/route.ts                 # LangGraph agent, runtime='nodejs'
    climate/[...path]/route.ts    # server-side PROXY to FastAPI + Open-Meteo (cache here)
    checkout/route.ts             # Stripe Checkout Session (server action also fine)
    webhooks/stripe/route.ts      # runtime='nodejs', raw body, service-role client
    cron/alerts/route.ts          # Vercel cron — date-window alerts (v1)
components/
  map/MapWidget.tsx               # 'use client' — APIProvider + Map + autocomplete
  chat/Chat.tsx                   # 'use client' — useChat
  charts/RiskChart.tsx            # 'use client' — Recharts/visx
lib/
  supabase/{client,server,middleware}.ts
  climate.ts                      # typed server-side client for FastAPI + Open-Meteo
  agent/{agent.ts,tools.ts}       # createAgent + the 8 tools
  entitlements.ts                 # plan/quota gating
middleware.ts                     # updateSession (token refresh) + matcher
```

### 1.3 How Next.js reaches the Python climate API

- **Env base URL, server-side only.** `CLIMATE_API_URL` (e.g. `http://localhost:8000` in dev, an internal/Vercel-reachable URL in prod). Never `NEXT_PUBLIC_`.
- **Always proxy through a Route Handler** (`app/api/climate/[...path]/route.ts`), never call FastAPI or Open-Meteo from the browser. This is where you: cache (historical/climatology effectively forever, forecast 30–60 min), inject Open-Meteo attribution/commercial key, normalize errors, and enforce that lat/lon precision is communicated as *grid-cell-level* (~0.25° / ~28 km — never imply street precision).
- The **agent tools also call FastAPI/Open-Meteo server-side** (they run in the Node route), so both the deterministic dashboard fetch and the agent share `lib/climate.ts`.

### 1.4 Data flow: address → geocode → risk → charts → chat

1. **Address** entered in `MapWidget` → Google **Places API (New)** autocomplete → on `gmp-select`, `place.fetchFields(['location','formattedAddress'])` yields `{lat, lng}` directly (no extra Geocoding call). Map pans via `useMap().panTo()`.
2. **Risk** — the dashboard's RSC/client fetch hits `/api/climate/...` → FastAPI `/api/v1/rain-risk` + `/heat-risk` + `/climatology` for the chosen month/period. Future date ≤16 days also pulls Open-Meteo `forecast`.
3. **Charts** — `timeseries`/`climatology` distributions render in `RiskChart` (per-month rain-day probability, temperature distribution, heat-stress-day counts).
4. **Chat** — `Chat.tsx` `useChat` → POST `/api/chat` with `{messages, threadId}`. Agent routes to the right tool(s), streams tokens + tool steps back, and composes a recommendation plan. Selected `{lat,lng}` is passed as context so the user can say "is this date risky here?" without re-stating the address.

---

## 2. EXTERNAL INTEGRATION CHEATSHEET

### 2.1 Packages + versions (pin these)

```bash
# Agent core (LangGraph) + OpenRouter wiring
npm i langchain@1.4.6 @langchain/langgraph@1.4.4 @langchain/core@1.2.0 \
      @langchain/openai@1.5.0 zod \
      @langchain/langgraph-checkpoint-postgres@1.0.3

# UI streaming bridge (transport only)
npm i ai@6 @ai-sdk/langchain@2 @ai-sdk/react@3

# Maps
npm i @vis.gl/react-google-maps@^1.8       # 1.8.3 — React 19 OK; NOT @react-google-maps/api

# Supabase + Stripe
npm i @supabase/ssr@^0.12 @supabase/supabase-js@^2 stripe   # stripe SDK v17+
```

Do **not** install `@openrouter/ai-sdk-provider` or `@langchain/anthropic` (we go through OpenRouter's OpenAI-compatible endpoint). Add `@langchain/anthropic` only if you ever call Claude directly.

### 2.2 Open-Meteo endpoints (each has its OWN subdomain — configure separately)

| Use | Base URL | Key params |
|---|---|---|
| Forecast (≤16 d future, recent past via `past_days`) | `https://api.open-meteo.com/v1/forecast` | `latitude,longitude,daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,apparent_temperature_max,forecast_days=16,timezone=auto` |
| Historical / ERA5 archive (past dates) | `https://archive-api.open-meteo.com/v1/archive` | `latitude,longitude,start_date,end_date,daily=...,timezone=auto` |
| CMIP6 climate projection (v2 only) | `https://climate-api.open-meteo.com/v1/climate` | `...,models=EC_Earth3P_HR,MRI_AGCM3_2_S,daily=...` (NO RCP/SSP param; ends 2050) |
| Air Quality (UV for heat plan, optional) | `https://air-quality-api.open-meteo.com/v1/air-quality` | `hourly=uv_index,pm2_5,forecast_days=5` |

Critical facts: `precipitation_probability` exists **only** on the Forecast API. ERA5 archive has a **~5-day delay** — bridge with `forecast?past_days=92&forecast_days=0`. Always send `timezone=auto`. **Free tier is non-commercial only** (CC-BY 4.0, 10k calls/day) — a paid SaaS needs an API Standard/Professional plan routing to `customer-api.open-meteo.com` with `&apikey=`; keep Open-Meteo attribution in the footer regardless. **Prefer your local FastAPI for "typical month/season" risk** — it precomputes the probabilities the archive makes you compute yourself, and saves Open-Meteo quota.

### 2.3 Google Maps

- **Library:** `@vis.gl/react-google-maps@^1.8` (Google-endorsed, React 19). Wrap map UI in a `'use client'` component:
  ```tsx
  <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places','geocoding','marker']}>
    <Map mapId="DEMO_MAP_ID" defaultZoom={4} defaultCenter={{lat:46.6,lng:2.5}} gestureHandling="greedy">…</Map>
  </APIProvider>
  ```
- **Autocomplete:** use **Places API (New)** — legacy `google.maps.places.Autocomplete`/`AutocompleteService` are blocked for new customers since 2025-03-01. Use `PlaceAutocompleteElement` (event is `gmp-select`, NOT `gmp-placeselect`) or the programmatic `AutocompleteSuggestion.fetchAutocompleteSuggestions`. **Flagged (medium):** the vis.gl maintainer notes `PlaceAutocompleteElement` web-component support is still maturing — you may need a `// @ts-ignore` on the listener, or fall back to the custom `AutocompleteSuggestion` UI. Do NOT copy Google's own `rgm-autocomplete` vis.gl example — it still uses the legacy class.
  ```tsx
  const el = new places.PlaceAutocompleteElement({ includedRegionCodes: ['fr'] });
  el.addEventListener('gmp-select', async ({placePrediction}) => {
    const place = placePrediction.toPlace();
    await place.fetchFields({ fields: ['displayName','formattedAddress','location'] });
    onSelect({ lat: place.location.lat(), lng: place.location.lng(), address: place.formattedAddress });
  });
  ```
- **Cloud setup:** enable **Maps JavaScript API + Places API (New) + Geocoding API**, billing on, create a real **Map ID** (AdvancedMarker requires it; classic Marker deprecated).
- **Keys:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (browser) restricted by **HTTP referrer** (your domain + `*.vercel.app` previews + localhost) + API list. If you ever geocode server-side, use a **separate IP-restricted** key (never `NEXT_PUBLIC_`). You usually won't need a separate Geocoding call — autocomplete `fetchFields` already returns `location`.

### 2.4 OpenRouter wiring (single source for the agent)

```ts
const model = new ChatOpenAI({
  model: 'openai/gpt-4o-mini',     // cheap, tool-capable router default; escalate to anthropic/claude-sonnet-4.6 for planning
  apiKey: process.env.OPENROUTER_API_KEY,
  temperature: 0,
  configuration: {                  // MUST be nested under `configuration`
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: { 'HTTP-Referer': 'https://front-end-events.app', 'X-Title': 'front-end-events' },
  },
});
```
Model ids are `vendor/model` (a bare `gpt-4o-mini` 404s against OpenRouter). `OPENROUTER_API_KEY` is server-only.

### 2.5 Supabase auth + clients (use `@supabase/ssr`, not deprecated `auth-helpers-*`)

Three factories, **only `getAll`/`setAll` cookie methods**:
```ts
// lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies();   // async in Next 15+
  return createServerClient(URL, ANON, { cookies: {
    getAll: () => cookieStore.getAll(),
    setAll: (list) => { try { list.forEach(({name,value,options}) => cookieStore.set(name,value,options)); } catch {} },
  }});
}
```
`middleware.ts` calls `updateSession` which does `await supabase.auth.getUser()` (refreshes token) and **returns the exact `supabaseResponse`** — nothing between `createServerClient` and `getUser()`, or users get random logouts. Authorize pages with `getClaims()` (local JWT verify, fast) or `getUser()` (network revalidate); **never** `getSession()` server-side. Google OAuth reuses your existing Google Cloud project; add an `/auth/callback/route.ts` calling `exchangeCodeForSession`.

---

## 3. AGENT DESIGN

### 3.1 Topology: single `createAgent`, LLM tool-calling loop = the router

For this app you do **not** need an explicit supervisor StateGraph. One `createAgent` with all tools; clear tool names + descriptions are the routing signal. Reserve a `@langchain/langgraph-supervisor` StateGraph for a later split into rain-analyst / heat-analyst / planner sub-agents.

### 3.2 Tool set (one tool per endpoint + Open-Meteo)

| Tool | Backs | When the agent calls it |
|---|---|---|
| `geocode_address` | (skip — UI passes lat/lng) | Only if the user types a raw address in chat with no map selection |
| `climate_rain_risk` | FastAPI `/api/v1/rain-risk` | "typical" rain risk for a month/season at lat/lon — **the default for historical probability** |
| `climate_heat_risk` | FastAPI `/api/v1/heat-risk` | typical heat-stress risk for a month/season |
| `climate_climatology` | FastAPI `/api/v1/climatology` | monthly normals / distributions for charts narrative |
| `climate_timeseries` | FastAPI `/api/v1/timeseries` | year-over-year trend at a location |
| `climate_risk` / `climate_point` | FastAPI `/risk`, `/point` | combined risk verdict / single-point lookup |
| `openmeteo_forecast` | `api.open-meteo.com/v1/forecast` | requested date **≤ today+16d** (gives real `precipitation_probability`) |
| `openmeteo_archive` | `archive-api.../v1/archive` | a specific **past** date not covered by precomputed stats |

### 3.3 Routing rule (bake into the system prompt + tool descriptions)

1. Date ≤ today+16d → `openmeteo_forecast`.
2. Specific past date → `openmeteo_archive`.
3. "Typical for this month/season" or far-future date → **local FastAPI** (`rain-risk`/`heat-risk`/`climatology`) — preferred, cheaper, precomputed.
4. Long-term trend (v2) → CMIP6 climate API.

### 3.4 Grounding (non-negotiable — trust + legal)

System prompt: *"You are a climate-risk assistant. NEVER state a risk percentage, probability, or temperature you did not obtain from a tool call. Use the climate tools for historical ERA5 stats and Open-Meteo for forecasts within 16 days. Always cite lat/lon, month, and which source (historical climatology vs forecast) each number came from. Distinguish 'historical probability' from 'forecast' explicitly."* Force a tool call for every numeric claim.

### 3.5 Route handler config + streaming

```ts
// app/api/chat/route.ts
export const runtime = 'nodejs';          // Edge breaks the Postgres checkpointer
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
```
Stream with `agent.streamEvents({messages}, { version: 'v2', configurable: { thread_id } })` (use `'v2'` — `'v3'` varies by docs). UI path: bridge to AI SDK (`toUIMessageStream` + `createUIMessageStreamResponse`) → `useChat`. Surface `on_tool_start`/`on_tool_end` events so the dashboard shows *which API the agent hit* in real time — this is a differentiator. **Keep the manual SSE fallback** (Researcher 1 snippet B) for the #7932 risk.

### 3.6 Memory

Pass a `PostgresSaver.fromConnString(SUPABASE_DB_URL)` checkpointer (run `.setup()` once at deploy) + a stable `thread_id` per conversation. `MemorySaver` is dev-only — it loses state across Vercel invocations.

### 3.7 Recommendation-plan generation

After tool calls return numbers, the agent composes a plan: rain-date suggestion, tent/shade/heat-mitigation guidance, "drier alternative date/venue" if asked. This is the paywalled artifact — it's what the buyer pays for, not the raw numbers.

---

## 4. FEATURE ROADMAP

| Tier | Feature | One-line business rationale |
|---|---|---|
| **MVP (free + 1 paid Pro seat)** | Landing page (segment-led: planners, production, ops) | Lead-gen; positions historical-probability vs forecast tools |
| MVP | Supabase auth (email + Google OAuth) | Gate paid features; reuse existing Google Cloud project |
| MVP | Address autocomplete → map pin (Places New + vis.gl) | Address-first UX is the gap vs station/city tools (Pix, WeatherRecall) |
| MVP | Single-location, single-date/period **rain + heat verdict + charts** | Core JTBD "is this date risky here?"; ships on data you already have |
| MVP | LangGraph chat agent (free message cap) | Differentiator no historical-weather competitor offers |
| MVP | Recommendation/mitigation plan (agent-generated) | Sells the decision, not commoditized data |
| MVP | One free **watermarked, shareable** report (link) | Built-in virality / lead source |
| **v1 (paid "Pro", flat low transparent seat)** | **"Best date" optimizer + multi-venue/date comparison** | Highest-value, lowest-build differentiator; proven demand (WhereWeather, Visual Crossing) — hero feature |
| v1 | Branded/white-label PDF report (no watermark) | The artifact planners hand to clients/insurers |
| v1 | Saved venues/clients/portfolio + report history (Supabase) | Turns one-shot lookups into a system-of-record (stickiness) |
| v1 | Date-window **alerts** (historical baseline → Open-Meteo forecast as event nears; Vercel cron) | Recurring reason to return; ClimateAI retention pattern |
| v1 | Unlimited chat + template reports (Wedding/Festival/Shoot/Construction) | Template onboarding raises perceived per-segment value |
| **v2** | Team seats + shared libraries + roles ("Studio/Agency" tier) | Expands ACV into film production & agencies; matches hybrid-pricing shift |
| v2 | Metered **API tier** (interpreted risk indices, not raw data) + embeddable "Weather Risk Score" widget | Opens construction/ag/tourism; Sensible-style partner distribution flywheel |
| v2 | Parametric / weather-guarantee **enablement** (your climatology as pricing index; partner with MGA/insurer) | Highest-margin layer — partnership, not a solo build; you are not an insurer |
| v2 | CMIP6/SSP forward projection overlay (same index engine) | Future-proofs for multi-year capex decisions; enterprise up-sell |

**Pricing shape (medium confidence):** hybrid — sticky free tier (one shareable report) + flat low Pro seat + usage-metered reports/API. Pure per-seat is declining (21%→15% in 2025) and event planners are seasonal users, so a seat alone churns.

---

## 5. DATA MODEL (Supabase)

Adopt the **Vercel `nextjs-subscription-payments` reference schema** as the billing baseline, extend with product tables. Every public-schema table: `alter table … enable row level security;` + policy `to authenticated using ((select auth.uid()) = user_id)` + a btree index on `user_id`/`org_id`. Wrap `auth.uid()` in `(select …)` (per-statement, not per-row).

**Billing core (reference schema, verbatim shape):**
- `users` (id uuid PK → auth.users, full_name, avatar_url, billing_address jsonb, payment_method jsonb) — select/update own. + `handle_new_user()` SECURITY DEFINER trigger on `auth.users` insert.
- `customers` (id uuid PK → auth.users, stripe_customer_id text) — **RLS on, NO policies** (service-role only).
- `products` (id text PK, active, name, description, image, metadata jsonb) — public read.
- `prices` (id text PK, product_id→products, active, unit_amount bigint, currency, type `pricing_type`, interval `pricing_plan_interval`, interval_count, trial_period_days, metadata) — public read.
- `subscriptions` (id text PK = Stripe sub id, user_id→auth.users, status `subscription_status`, price_id→prices, quantity, cancel_at_period_end, current_period_start/end, ended_at, cancel_at, canceled_at, trial_start, trial_end) — select-own; writes service-role via webhook.

**Product tables (front-end-events):**
- `profiles` (1:1 users — display_name, locale, default_units).
- `saved_locations` (id uuid PK, user_id→auth.users, label, formatted_address, **lat double precision, lon double precision**, google_place_id text, created_at) — **store geocoded coords** so the agent/FastAPI are callable without re-geocoding. RLS `for all` own + index on user_id.
- `saved_queries` (id, user_id, location_id→saved_locations, date | month int, period, risk_type enum `rain`/`heat`, params jsonb).
- `generated_reports` (id, user_id, query_id, status, storage_path | content jsonb, created_at) — PDFs in a Supabase Storage bucket with matching RLS.
- `usage_events` (id, user_id, kind enum `llm_chat`/`report`/`api_call`, tokens int, cost numeric, created_at) — metering.
- **v2 teams:** `organizations` (id, name, owner_id) + `org_members` (org_id, user_id, role enum owner/admin/member). For org-scoped policies, use a **SECURITY DEFINER** helper to avoid RLS recursion:
  ```sql
  create function public.user_org_ids() returns setof uuid
    language sql security definer stable set search_path = '' as $$
      select org_id from public.org_members where user_id = (select auth.uid()) $$;
  -- policy: using (org_id in (select public.user_org_ids()))
  ```
- **Entitlement:** derive from `subscriptions` → `prices` → `products.metadata` (feature limits); enforce quotas in app code (sum `usage_events` vs plan limit before invoking LLM/report). RLS protects rows, not rate limits.
- The LangGraph **Postgres checkpointer** lives in this same Supabase DB (its own tables via `PostgresSaver.setup()`).

---

## 6. PITFALLS & SECURITY

**Keys (server-only):**
- `OPENROUTER_API_KEY`, `CLIMATE_API_URL`, `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_*`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Open-Meteo commercial key, server geocoding key — **never `NEXT_PUBLIC_`, never in a client bundle.** Service-role bypasses RLS = full DB access.
- Only `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` reach the browser. `NEXT_PUBLIC_` vars are **build-time baked** on Vercel → redeploy after changes.

**RLS:**
- Forgetting `enable row level security` on any new table exposes it world-readable via PostgREST with the anon key. Make it a PR checklist item.
- `to authenticated` + `(select auth.uid())` + index on the compared column = >100x faster on large tables. Org-membership policies that self-reference cause infinite recursion → SECURITY DEFINER helper with `set search_path = ''`.
- Authorize server-side with `getClaims()`/`getUser()`, never `getSession()`.

**Rate limits & cost:**
- **Open-Meteo:** free tier is non-commercial + 10k/day — buy a paid plan for production; proxy + cache server-side (forecast 30–60 min, historical forever). Keep CC-BY attribution.
- **Google Maps billing** is per-request and spikes with autocomplete keystrokes → **debounce + use Places session tokens** (the New Places element handles session billing automatically; preserve that). Restrict keys by referrer + API. Include `*.vercel.app` previews or previews break.
- **LLM cost:** default the router to a cheap tool-capable slug (`openai/gpt-4o-mini`); escalate only for plan composition. Enable OpenRouter `usage:{include:true}` and log to `usage_events`. Gate chat with message caps on free, unlimited on Pro — both a cost control and an upgrade driver. `temperature: 0` for routing.

**Stripe:**
- Webhook at `app/api/webhooks/stripe/route.ts` with `export const runtime = 'nodejs'`; read **raw body** via `await req.text()` before `stripe.webhooks.constructEvent` (the old `bodyParser:false` trick doesn't apply in App Router). Pin `apiVersion: '2026-05-27.dahlia'`.
- Webhooks arrive out-of-order / retried → handlers **idempotent** (upsert keyed by Stripe id). Use the **service-role** supabase-js client (not the SSR cookie client) to write `customers`/`subscriptions`.

**Product/trust pitfalls (resolve in UI):**
- Label **historical probability vs forecast** explicitly; only show forecast inside ~16 days. Conflating them invites churn + liability.
- ERA5 is ~0.25°/~28 km — communicate "climate for this **area**," never street-level precision (two nearby addresses returning identical numbers otherwise reads as a bug).
- Agent must **never** invent numbers — force tool calls, cite the source endpoint. Hallucinated risk on a date decision is a trust- and legal-killer.
- Don't sell raw data; sell the verdict + plan + report + agent.
- Any payout/guarantee feature: you provide the climatological **index**, not underwriting — partner with a licensed MGA/insurer.

**Runtime gotchas:**
- `app/api/chat/route.ts` and the Stripe webhook **must** be `runtime='nodejs'` (Edge breaks the Postgres checkpointer and Stripe's Node crypto). Ensure Vercel Fluid Compute / Node serverless so SSE isn't buffered.
- Don't copy the `langchain-nextjs-template` route — it uses `runtime='edge'` + deprecated `createReactAgent`.
- Verify the `@ai-sdk/langchain` bridge against your real agent stream early (#7932); ship the manual SSE fallback regardless.