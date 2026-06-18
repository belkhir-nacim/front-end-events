"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm({ redirect = "/dashboard" }: { redirect?: string }) {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage(`We sent a sign-in link to ${email}.`);
    }
  }

  async function googleSignIn() {
    if (!configured) return;
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
  }

  if (!configured) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm text-subtle">
        <p className="font-medium text-ink">Sign-in isn&apos;t connected yet.</p>
        <p className="mt-2 leading-relaxed">
          Add your Supabase keys to <code className="tnum">.env.local</code>{" "}
          (<span className="tnum">NEXT_PUBLIC_SUPABASE_URL</span>,{" "}
          <span className="tnum">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>) to enable email and Google
          sign-in. The dashboard still opens for previewing.
        </p>
        <a
          href="/dashboard"
          className="mt-4 inline-flex rounded-full bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-ink transition-colors"
        >
          Continue to dashboard
        </a>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="rounded-[var(--radius-card)] border border-brand/30 bg-surface p-6 text-center">
        <Mail className="mx-auto text-brand" size={26} />
        <p className="mt-3 font-display text-lg font-semibold text-ink">Check your inbox</p>
        <p className="mt-1.5 text-sm text-subtle">{message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={googleSignIn}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-line-strong bg-surface-2 px-5 py-3 text-sm font-medium text-ink hover:border-ink transition-colors"
      >
        <GoogleGlyph /> Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-subtle">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studio.com"
          className="w-full rounded-full border border-line-strong bg-surface-2 px-5 py-3 text-sm text-ink outline-none placeholder:text-subtle focus:border-brand"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-full bg-brand px-5 py-3 text-sm font-medium text-white hover:bg-brand-ink disabled:opacity-60 transition-colors"
        >
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>

      {status === "error" && <p className="text-sm text-heat-hot">{message}</p>}
      <p className="text-center text-xs text-subtle">No password. We email you a one-time link.</p>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.3 13.3 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.9-9.8 6.9-17.4z" />
      <path fill="#FBBC05" d="M10.5 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.4l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.6l-7.3-5.7c-2 1.4-4.7 2.3-7.9 2.3-6.3 0-11.7-3.8-13.5-9.1l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
