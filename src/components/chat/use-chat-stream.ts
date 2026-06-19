"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Attachment } from "@/lib/types";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  // Full text sent to the server (e.g. the user message + extracted attachment text).
  // The UI renders `content`; the server history uses `serverContent ?? content`.
  serverContent?: string;
}
export interface ChatContext {
  name?: string;
  lat?: number;
  lon?: number;
  month?: number;
  segment?: string;
  eventDate?: string;
  eventEnd?: string;
  snapshot?: unknown;
}

export function useChatStream(context: ChatContext) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // keep latest values without re-creating send
  const messagesRef = useRef<ChatMsg[]>([]);
  messagesRef.current = messages;
  const ctxRef = useRef(context);
  ctxRef.current = context;

  // Durable thread: one conversation per place, persisted server-side so it survives reloads.
  const threadKey = useMemo(
    () => (context.lat != null && context.lon != null ? `pt:${context.lat.toFixed(2)},${context.lon.toFixed(2)}` : null),
    [context.lat, context.lon],
  );
  const threadKeyRef = useRef<string | null>(null);
  threadKeyRef.current = threadKey;

  useEffect(() => {
    if (!threadKey) return;
    let live = true;
    fetch(`/api/chat/thread?key=${encodeURIComponent(threadKey)}`)
      .then((r) => r.json())
      .then((j) => {
        if (live && Array.isArray(j.messages)) setMessages(j.messages as ChatMsg[]);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [threadKey]);

  const send = useCallback(async (text: string, attachments: Attachment[] = []) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || streaming) return;

    // History sent to the server carries each message's full text (extracted attachment
    // text persisted from earlier turns) so the agent never has to re-read a file.
    const base = trimmed || "Please read the attached file(s).";
    const history: ChatMsg[] = [
      ...messagesRef.current.map((m) => ({ role: m.role, content: m.serverContent ?? m.content })),
      { role: "user", content: base },
    ];
    const display = attachments.length
      ? `${trimmed}${trimmed ? "\n" : ""}📎 ${attachments.map((a) => a.name).join(", ")}`
      : trimmed;
    setMessages([
      ...messagesRef.current,
      { role: "user", content: display, serverContent: base },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    setActiveTool(null);

    const appendToAssistant = (chunk: string) =>
      setMessages((m) => {
        const c = [...m];
        const last = c[c.length - 1];
        if (last?.role === "assistant") c[c.length - 1] = { role: "assistant", content: last.content + chunk };
        return c;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, context: ctxRef.current, attachments }),
      });
      if (!res.ok || !res.body) {
        appendToAssistant(
          res.status === 503
            ? "The assistant isn't connected yet — set OPENROUTER_API_KEY."
            : res.status === 429
              ? "You've reached today's free chat limit. It resets tomorrow."
              : `Sorry — the assistant failed (${res.status}).`,
        );
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let obj: { type: string; text?: string; name?: string; status?: string; message?: string };
          try {
            obj = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (obj.type === "token" && obj.text) appendToAssistant(obj.text);
          else if (obj.type === "tool") setActiveTool(obj.status === "start" ? obj.name ?? null : null);
          else if (obj.type === "error") appendToAssistant(`\n\n_(error: ${obj.message})_`);
          else if (obj.type === "context" && obj.text) {
            // Persist the server-extracted attachment text on the last user message so
            // future turns carry it (no re-upload / re-read). Not shown in the UI.
            const ctx = obj.text;
            setMessages((m) => {
              const c = [...m];
              for (let i = c.length - 1; i >= 0; i--) {
                if (c[i].role === "user") {
                  c[i] = { ...c[i], serverContent: `${c[i].serverContent ?? c[i].content}\n\n${ctx}` };
                  break;
                }
              }
              return c;
            });
          }
        }
      }
    } catch {
      appendToAssistant("Sorry — I couldn't reach the assistant.");
    } finally {
      setStreaming(false);
      setActiveTool(null);
      const key = threadKeyRef.current;
      if (key) {
        void fetch("/api/chat/thread", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key, messages: messagesRef.current }),
        }).catch(() => {});
      }
    }
  }, [streaming]);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, streaming, activeTool, send, reset };
}
