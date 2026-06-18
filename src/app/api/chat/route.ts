import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { agentConfigured, buildAgent, buildVisionLLM, type AgentContext } from "@/lib/agent/agent";
import { extractAttachment } from "@/lib/extract";
import type { Attachment } from "@/lib/types";

export const runtime = "nodejs"; // langchain/langgraph + unpdf/mammoth need Node, not Edge
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
type LcMessage = { role: string; content: string };

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === "string" ? p : typeof p?.text === "string" ? p.text : ""))
      .join("");
  }
  return "";
}

// One-time image -> text transcription (cached by content hash). Images become text so the
// conversation can carry them forward without re-uploading or re-running a vision model each turn.
const imgCache = new Map<string, string>();
async function transcribeImage(dataUrl: string): Promise<string> {
  const key = createHash("sha256").update(dataUrl).digest("base64");
  const hit = imgCache.get(key);
  if (hit !== undefined) return hit;
  try {
    const llm = buildVisionLLM();
    const res = await llm.invoke([
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Transcribe everything visible in this image as plain text — all text, numbers, " +
              "tables, and labels — and briefly note key visual details (people, place, layout). " +
              "Be thorough and factual; do not advise or interpret.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ] as never);
    const text = textOf((res as { content?: unknown }).content);
    if (imgCache.size >= 40) imgCache.delete(imgCache.keys().next().value as string);
    imgCache.set(key, text);
    return text;
  } catch (e) {
    return `(image could not be read: ${e instanceof Error ? e.message : String(e)})`;
  }
}

export async function POST(req: NextRequest) {
  if (!agentConfigured()) {
    return Response.json(
      { error: "assistant not configured — set OPENROUTER_API_KEY" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    context?: AgentContext;
    attachments?: Attachment[];
  };
  const messages = (body.messages ?? []).filter((m) => m.content?.trim());
  const attachments = body.attachments ?? [];
  if (messages.length === 0 && attachments.length === 0) {
    return Response.json({ error: "no messages" }, { status: 400 });
  }

  // Extract attachments to text ONCE: docs are parsed, images are transcribed via a vision model.
  // The resulting text block is (a) folded into this turn's message for the agent and (b) streamed
  // back as a `context` event so the client can persist it in the conversation — no re-reading.
  const extracted = attachments.length
    ? await Promise.all(attachments.map(extractAttachment))
    : [];
  const blocks: string[] = [];
  for (const e of extracted) {
    if (e.kind === "text") {
      blocks.push(
        e.error
          ? `[Attached "${e.name}" could not be read: ${e.error}]`
          : `[Attached document: ${e.name}]\n${e.text ?? ""}`,
      );
    } else if (e.kind === "image" && e.dataUrl) {
      blocks.push(`[Attached image: ${e.name}]\n${await transcribeImage(e.dataUrl)}`);
    }
  }
  const attachmentText = blocks.join("\n\n");

  // Fold the attachment text into the last user message (text only — the agent runs on the
  // default model since everything, including images, is now text).
  const lcMessages: LcMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
  if (attachmentText) {
    const baseText = lcMessages.length
      ? textOf(lcMessages[lcMessages.length - 1].content)
      : "Please read the attached file(s).";
    const folded: LcMessage = { role: "user", content: `${baseText}\n\n${attachmentText}` };
    if (lcMessages.length && messages[messages.length - 1].role === "user") {
      lcMessages[lcMessages.length - 1] = folded;
    } else {
      lcMessages.push(folded);
    }
  }

  const agent = buildAgent(body.context ?? {});
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        // Hand the extracted text to the client first so it can persist it in the conversation.
        if (attachmentText) send({ type: "context", text: attachmentText });
        const events = agent.streamEvents(
          { messages: lcMessages } as never,
          { version: "v2" },
        );
        for await (const ev of events) {
          if (ev.event === "on_chat_model_stream") {
            const t = textOf((ev.data as { chunk?: { content?: unknown } })?.chunk?.content);
            if (t) send({ type: "token", text: t });
          } else if (ev.event === "on_tool_start") {
            send({ type: "tool", name: ev.name, status: "start" });
          } else if (ev.event === "on_tool_end") {
            send({ type: "tool", name: ev.name, status: "end" });
          }
        }
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
