// Agent tools — historical climate (ERA5 service) + forecasts (Open-Meteo).
// Server-only: invoked inside the /api/chat Node route. Each returns a JSON
// string the model reads; errors are returned (not thrown) so the agent can
// explain them (e.g. "outside coverage").
import "server-only";

import { tool } from "langchain";
import { z } from "zod";
import { climate, openMeteoForecast } from "@/lib/climate";
import { fetchSubseasonal } from "@/lib/subseasonal";
import { bestDates } from "@/lib/optimizer";

const latlon = {
  lat: z.number().describe("latitude in decimal degrees"),
  lon: z.number().describe("longitude in decimal degrees"),
};

async function safe(fn: () => Promise<unknown>): Promise<string> {
  try {
    return JSON.stringify(await fn());
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
  }
}

export const climateTools = [
  tool(async ({ lat, lon, month }) => safe(() => climate.rainRisk(lat, lon, month)), {
    name: "climate_rain_risk",
    description:
      "HISTORICAL rain & heavy-rain odds (ERA5, 80+ yrs) for a calendar month at a location — the 'typical' risk. month is 1-12. Historical coverage is currently France.",
    schema: z.object({ ...latlon, month: z.number().int().min(1).max(12) }),
  }),
  tool(async ({ lat, lon, month }) => safe(() => climate.heatRisk(lat, lon, month)), {
    name: "climate_heat_risk",
    description:
      "HISTORICAL heat & heat-stress odds (ERA5) for a calendar month at a location. month is 1-12.",
    schema: z.object({ ...latlon, month: z.number().int().min(1).max(12) }),
  }),
  tool(async ({ lat, lon }) => safe(() => climate.climatology(lat, lon)), {
    name: "climate_climatology",
    description:
      "HISTORICAL 12-month normals (rainy days, typical highs, sunny days, etc.) for a location.",
    schema: z.object({ ...latlon }),
  }),
  tool(
    async ({ lat, lon, month, metric }) => safe(() => climate.timeseries(lat, lon, month, metric)),
    {
      name: "climate_timeseries",
      description:
        "HISTORICAL year-by-year values for one month + metric (e.g. rainy_days each August). metrics: rainy_days, precip_mm, rx1day_mm, tmax_abs_c, hot_days.",
      schema: z.object({
        ...latlon,
        month: z.number().int().min(1).max(12),
        metric: z.string().describe("one of rainy_days, precip_mm, rx1day_mm, tmax_abs_c, hot_days"),
      }),
    },
  ),
  tool(async ({ lat, lon, date }) => safe(() => climate.dayRisk(lat, lon, date)), {
    name: "climate_day_risk",
    description:
      "HISTORICAL odds for a SPECIFIC calendar date (e.g. 'will it rain on June 15?') — pooled over a ±7-day window across the ERA5 record. date is YYYY-MM-DD. Prefer this over climate_rain_risk/climate_heat_risk when the user asks about a specific date that is too far out for a forecast. France coverage.",
    schema: z.object({ ...latlon, date: z.string().describe("event date, YYYY-MM-DD") }),
  }),
  tool(async ({ lat, lon }) => safe(() => climate.extremes(lat, lon)), {
    name: "climate_extremes",
    description:
      "CMIP6 PROJECTION of future climate EXTREMES at a location — hottest day (TXx), summer days, tropical nights, heavy-rain extremes (Rx1day, R20mm), dry spells (CDD) — baseline (1995-2014) vs the 2050s/2090s under SSP2-4.5 and SSP5-8.5. A MODELLED, coarse, scenario-dependent projection: clearly distinguish it from historical odds and from short-range forecasts. France coverage.",
    schema: z.object({ ...latlon }),
  }),
  tool(async ({ lat, lon }) => safe(() => fetchSubseasonal(lat, lon)), {
    name: "subseasonal_outlook",
    description:
      "45-day forward FORECAST (Open-Meteo seasonal) of rain & heat for a location — the near-future outlook, NOT historical odds.",
    schema: z.object({ ...latlon }),
  }),
  tool(async ({ lat, lon, start, end }) => safe(() => bestDates(lat, lon, start, end)), {
    name: "best_date",
    description:
      "Find the LOWEST historical-risk dates in a range for an outdoor event. Scans candidate dates (weekly) and ranks by combined rain + heat odds (lower = calmer), using the ±7-day historical window. start/end are YYYY-MM-DD. Returns dates sorted best-first. France coverage. Use when the user asks for the 'best' or 'driest'/'coolest' date/window.",
    schema: z.object({ ...latlon, start: z.string().describe("range start YYYY-MM-DD"), end: z.string().describe("range end YYYY-MM-DD") }),
  }),
  tool(async ({ lat, lon }) => safe(() => openMeteoForecast(lat, lon)), {
    name: "forecast_16day",
    description:
      "16-day daily weather FORECAST (precipitation, rain probability, max temperature) for a location.",
    schema: z.object({ ...latlon }),
  }),
];
