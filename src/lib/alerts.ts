// Date-window alert evaluation. A daily cron (service-role client) compares the live
// 45-day outlook for each active alert's saved assessment against its historical baseline
// and fires when the forecast is materially worse. 7-day cooldown prevents noise.
// Pattern adapted from platform/src/lib/alerts/evaluate.ts (org-scoped → own-row here).
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSubseasonal } from "@/lib/subseasonal";
import { parseSnapshot } from "@/lib/snapshot";

const COOLDOWN_MS = 7 * 86_400_000;

interface AlertRow {
  id: string;
  user_id: string;
  assessment_id: string;
  last_triggered_at: string | null;
}

export async function evaluateAlerts(supabase: SupabaseClient): Promise<{ checked: number; fired: number }> {
  const { data } = await supabase
    .from("event_alerts")
    .select("id, user_id, assessment_id, last_triggered_at")
    .eq("active", true);
  const alerts = (data ?? []) as AlertRow[];
  let fired = 0;

  for (const a of alerts) {
    if (a.last_triggered_at && Date.now() - new Date(a.last_triggered_at).getTime() < COOLDOWN_MS) continue;

    const { data: row } = await supabase
      .from("event_assessments")
      .select("snapshot, lat, lon, name")
      .eq("id", a.assessment_id)
      .maybeSingle();
    if (!row) continue;

    const snap = parseSnapshot((row as { snapshot: unknown }).snapshot);
    if (!snap?.event?.start) continue;

    const days = (new Date(`${snap.event.start}T00:00:00`).getTime() - Date.now()) / 86_400_000;
    if (days < 0 || days > 45) continue; // only evaluable inside the forecast horizon

    let sub;
    try {
      sub = await fetchSubseasonal((row as { lat: number }).lat, (row as { lon: number }).lon);
    } catch {
      continue;
    }
    const last = snap.event.end || snap.event.start;
    const win = (sub.days ?? []).filter((d) => d.date >= snap.event!.start && d.date <= last);
    if (win.length === 0) continue;

    const heavy = win.some((d) => (d.precip ?? 0) >= 10); // a heavy-rain day in the window
    const peakHigh = Math.max(...win.map((d) => d.tmax ?? -99));
    const typicalHigh = Number(
      snap.climatology?.months.find((m) => m.month === snap.month)?.tmax_mean_c ?? NaN,
    );
    const hotSpike = Number.isFinite(typicalHigh) ? peakHigh >= typicalHigh + 5 || peakHigh >= 34 : peakHigh >= 34;
    if (!heavy && !hotSpike) continue;

    const parts: string[] = [];
    if (heavy) parts.push("a heavy-rain day");
    if (hotSpike) parts.push(`a high near ${Math.round(peakHigh)}°`);
    const msg = `${(row as { name: string }).name}: the ~${Math.round(days)}-day outlook shows ${parts.join(
      " and ",
    )} around your date — worse than a typical ${snap.month_name}.`;

    await supabase
      .from("event_alerts")
      .update({ last_triggered_at: new Date().toISOString(), last_message: msg })
      .eq("id", a.id);
    await sendAlertEmail(supabase, a.user_id, msg).catch(() => {});
    fired++;
  }

  return { checked: alerts.length, fired };
}

/** Best-effort email via Resend (no-op without RESEND_API_KEY). Email comes from auth.users. */
async function sendAlertEmail(supabase: SupabaseClient, userId: string, message: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const { data } = await supabase.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (!email) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.ALERTS_FROM_EMAIL ?? "Serenia <onboarding@resend.dev>",
      to: email,
      subject: "Weather watch for your event",
      text: `${message}\n\nManage alerts in your Serenia library.`,
    }),
  });
}
