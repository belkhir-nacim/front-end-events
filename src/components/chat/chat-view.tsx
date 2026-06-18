"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import type { ChatMsg } from "./use-chat-stream";
import type { Attachment } from "@/lib/types";

const MAX_FILES = 4;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(",") + 1)); // strip the data: prefix
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function ChatView({
  messages,
  streaming,
  activeTool,
  onSend,
  emptyHint,
  suggestions = [],
}: {
  messages: ChatMsg[];
  streaming: boolean;
  activeTool: string | null;
  onSend: (t: string, attachments?: Attachment[]) => void;
  emptyHint?: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activeTool]);

  async function onFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).slice(0, MAX_FILES - files.length);
    const next: Attachment[] = [];
    for (const f of picked) {
      if (f.size > MAX_BYTES) continue;
      next.push({
        name: f.name,
        type: f.type || "application/octet-stream",
        data: await fileToBase64(f),
      });
    }
    setFiles((cur) => [...cur, ...next].slice(0, MAX_FILES));
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;
    onSend(input, files);
    setInput("");
    setFiles([]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-paper px-3.5 py-2.5 text-sm text-ink">
              {emptyHint ?? "Ask me about the climate risk for your event."}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="rounded-full border border-line px-3 py-1 text-xs text-subtle hover:border-brand hover:text-brand-ink transition-colors"
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
              <span className="whitespace-pre-wrap">
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
              </span>
            </div>
          ))
        )}
        {activeTool && (
          <p className="inline-flex items-center gap-1.5 font-pixel text-[0.62rem] uppercase tracking-wide text-subtle">
            <Loader2 size={11} className="animate-spin" /> checking {activeTool.replace(/_/g, " ")}…
          </p>
        )}
      </div>

      <form onSubmit={submit} className="mt-2 border-t border-line pt-3">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-subtle"
              >
                <Paperclip size={11} /> {f.name}
                <button
                  type="button"
                  onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                  className="hover:text-heat-hot"
                  aria-label={`Remove ${f.name}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,image/*,.docx,.txt,.csv,.xlsx,.xls,.ods,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-subtle transition-colors hover:border-ink hover:text-ink"
            aria-label="Attach a brief, contract, or image"
            title="Attach a PDF, image, or document"
          >
            <Paperclip size={16} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about rain, heat, a date — or attach a brief…"
            className="w-full rounded-full border border-line-strong bg-paper px-4 py-2 text-sm text-ink outline-none placeholder:text-subtle focus:border-brand"
          />
          <button
            type="submit"
            disabled={streaming || (!input.trim() && files.length === 0)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-ink disabled:opacity-50"
            aria-label="Send"
          >
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </form>
    </div>
  );
}
