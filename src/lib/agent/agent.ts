import "server-only";

import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { climateTools } from "./tools";

export interface AgentContext {
  name?: string;
  lat?: number;
  lon?: number;
  month?: number;
  eventDate?: string;
  eventEnd?: string;
  snapshot?: unknown;
}

export function agentConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function systemPrompt(ctx: AgentContext): string {
  const here =
    ctx.lat != null && ctx.lon != null
      ? `The user is currently looking at "${ctx.name ?? "a location"}" at latitude ${ctx.lat}, longitude ${ctx.lon}${
          ctx.month ? `, focused on month ${ctx.month}` : ""
        }.${
          ctx.eventDate
            ? ` Their event is ${
                ctx.eventEnd ? `from ${ctx.eventDate} to ${ctx.eventEnd}` : `on ${ctx.eventDate}`
              } — within ~45 days use subseasonal_outlook/forecast_16day, otherwise use historical odds for the month(s).`
            : ""
        } Use these coordinates when calling tools unless the user names a different place.`
      : "If the user hasn't picked a place yet, ask for the address or city.";

  const snap = ctx.snapshot
    ? `\n\nDATA ALREADY LOADED on the dashboard for this place/month (you MAY cite these numbers directly; still call tools for other places, months, dates, or the 2050 projection):\n${JSON.stringify(ctx.snapshot)}`
    : "";

  return `You are Serenia's climate-risk assistant for event planning (outdoor weddings, festivals, film shoots, field ops).
${here}${snap}

TOOLS
- climate_rain_risk / climate_heat_risk / climate_climatology / climate_timeseries → HISTORICAL odds from 80+ years of ERA5 reanalysis (the "typical" risk for a month). Historical coverage is currently France; if a tool returns an "error" about coverage, tell the user plainly.
- subseasonal_outlook → a 45-day FORWARD FORECAST of rain & heat. forecast_16day → a 16-day forecast.

RULES
- NEVER state a probability, count, or temperature you did not get from a tool call. Call a tool for every number.
- Always make clear whether a figure is HISTORICAL ("typically ~2 rainy days", "in 1 of 10 years") or a FORECAST ("the 45-day outlook shows…").
- Be concise and decision-oriented. To plan, ask about the event (type, indoor/outdoor, headcount, date flexibility) when it helps, then give a short recommendation to reduce risk (cover, backup date, timing, shade/water).
- When the user attaches documents or images, their extracted text is included in the conversation (images are transcribed to text). These files stay available on later turns — never ask the user to re-upload a file they already shared. Read them, pull out the relevant details (venue, address, date, headcount, constraints), and cite the file name. If a file names a place or date, you may use the climate tools for it.`;
}

function buildLLM(model?: string) {
  // Cap output tokens. Without this, ChatOpenAI requests the model's full output
  // window (e.g. 65k for Claude), which both wastes budget and 402s on a low OpenRouter
  // balance. ~1500 tokens is plenty for a concise, decision-oriented answer.
  const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS ?? 1500) || 1500;
  return new ChatOpenAI({
    model: model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
    apiKey: process.env.OPENROUTER_API_KEY,
    temperature: 0,
    maxTokens,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Serenia",
      },
    },
  });
}

/** Vision-capable model (Claude via OpenRouter) used once to transcribe an uploaded image to text. */
export function buildVisionLLM() {
  return buildLLM(process.env.OPENROUTER_VISION_MODEL ?? "anthropic/claude-sonnet-4.6");
}

export function buildAgent(ctx: AgentContext = {}, opts: { model?: string } = {}) {
  return createAgent({ model: buildLLM(opts.model), tools: climateTools, systemPrompt: systemPrompt(ctx) });
}
