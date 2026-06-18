"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { MONTHS_LONG } from "@/lib/format";
import { useChatStream, type ChatContext } from "./use-chat-stream";

export function ChatDock({
  context,
  open,
  onOpenChange,
}: {
  context: ChatContext;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { messages, streaming, activeTool, send } = useChatStream(context);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activeTool]);

  const monthName = context.month ? MONTHS_LONG[context.month] : null;
  const where = context.name ?? "this place";
  const suggestions = [
    monthName ? `Will it rain in ${monthName} at ${where}?` : "What are the rain odds here?",
    monthName ? `How hot does ${monthName} usually get?` : "How hot does it get?",
    "What does the 45-day outlook look like?",
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
    setInput("");
  };

  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-medium text-white shadow-[var(--shadow-card)] hover:bg-brand-ink transition-colors"
      >
        <Sparkles size={16} /> Ask the assistant
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(70vh,560px)] w-[min(92vw,400px)] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2 shadow-[var(--shadow-card)]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <Sparkles size={16} className="text-brand" /> Climate assistant
        </span>
        <button onClick={() => onOpenChange(false)} aria-label="Close" className="text-subtle hover:text-ink">
          <X size={17} />
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-paper px-3.5 py-2.5 text-sm text-ink">
              Ask me about the climate risk for {where}
              {monthName ? ` in ${monthName}` : ""}. I pull historical odds and the 45-day outlook,
              and only quote numbers I look up.
            </div>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="self-start rounded-full border border-line px-3 py-1 text-xs text-subtle hover:border-brand hover:text-brand-ink transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5 text-sm text-white"
                  : "max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-paper px-3.5 py-2.5 text-sm text-ink"
              }
            >
              <span className="whitespace-pre-wrap">{m.content || (streaming && i === messages.length - 1 ? "…" : "")}</span>
            </div>
          ))
        )}
        {activeTool && (
          <p className="inline-flex items-center gap-1.5 font-pixel text-[0.62rem] uppercase tracking-wide text-subtle">
            <Loader2 size={11} className="animate-spin" /> checking {activeTool.replace(/_/g, " ")}…
          </p>
        )}
      </div>

      {/* input */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about rain, heat, a date…"
          className="w-full rounded-full border border-line-strong bg-paper px-4 py-2 text-sm text-ink outline-none placeholder:text-subtle focus:border-brand"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-ink disabled:opacity-50 transition-colors"
          aria-label="Send"
        >
          {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
    </div>
  );
}
