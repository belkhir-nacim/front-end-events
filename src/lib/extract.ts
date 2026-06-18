// Server-side document extraction for chat attachments.
// PDFs / Office docs / text -> plain text (model-agnostic); images -> data URL
// for a vision model. Runs only in the Node /api/chat route.
import "server-only";

import { createHash } from "node:crypto";
import type { Attachment } from "./types";

export interface Extracted {
  name: string;
  kind: "text" | "image";
  text?: string;
  dataUrl?: string;
  error?: string;
}

const MAX_TEXT = 200_000; // cap extracted text to keep prompts sane

// Content-hash cache: a given file is parsed at most once per server instance.
// Keyed by sha256(data); a re-upload of the same bytes reuses the result.
const CACHE_MAX = 40;
const cache = new Map<string, Extracted>();

export async function extractAttachment(a: Attachment): Promise<Extracted> {
  const key = createHash("sha256").update(a.data || "").digest("base64");
  const hit = cache.get(key);
  if (hit) return { ...hit, name: a.name || hit.name };

  const result = await parseAttachment(a);
  if (!result.error) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, result);
  }
  return result;
}

async function parseAttachment(a: Attachment): Promise<Extracted> {
  const type = (a.type || "").toLowerCase();
  const name = a.name || "file";

  if (type.startsWith("image/")) {
    return { name, kind: "image", dataUrl: `data:${a.type};base64,${a.data}` };
  }

  const buf = Buffer.from(a.data, "base64");
  try {
    if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
      // unpdf ships a worker-free pdfjs build that resolves cleanly inside Next/serverless,
      // unlike pdf-parse/pdfjs-dist which 500s on missing-worker when bundled.
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: true });
      return { name, kind: "text", text: (text || "").slice(0, MAX_TEXT) };
    }
    if (type.includes("wordprocessingml") || name.toLowerCase().endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      return { name, kind: "text", text: (r.value || "").slice(0, MAX_TEXT) };
    }
    // Excel / spreadsheets -> one CSV block per sheet (model-agnostic text path).
    if (/sheet|excel/.test(type) || /\.(xlsx|xls|ods)$/i.test(name)) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "buffer" });
      const text = wb.SheetNames.map(
        (n) => `# Sheet: ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`,
      ).join("\n\n");
      return { name, kind: "text", text: text.slice(0, MAX_TEXT) };
    }
    // text / csv / json / md / etc.
    return { name, kind: "text", text: buf.toString("utf8").slice(0, MAX_TEXT) };
  } catch (e) {
    return { name, kind: "text", error: e instanceof Error ? e.message : String(e) };
  }
}
