import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import mammoth from "mammoth";
import type { ParsedSection } from "../types.js";

export class SkippedDocumentError extends Error {
  constructor(public readonly reason: "encrypted" | "oversized" | "unsupported" | "scanned" | "malformed", message: string) { super(message); }
}

function parsePlainText(text: string): ParsedSection[] {
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return paragraphs.map((text, index) => ({ text, location: `paragraph ${index + 1}` }));
}

function parseMarkdown(text: string): ParsedSection[] {
  const lines = text.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let heading = "Document";
  let start = 1;
  let buffer: string[] = [];
  const flush = (end: number) => {
    const value = buffer.join("\n").trim();
    if (value) sections.push({ text: value, heading, location: `lines ${start}-${end}` });
    buffer = [];
  };
  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) {
      flush(index);
      heading = match[2]!.trim();
      start = index + 2;
    } else buffer.push(line);
  });
  flush(lines.length);
  return sections;
}

export async function parseDocument(path: string, maxBytes: number): Promise<ParsedSection[]> {
  const fileStat = await stat(path);
  if (fileStat.size > maxBytes) throw new SkippedDocumentError("oversized", `File exceeds ${maxBytes} bytes`);
  const extension = extname(path).toLowerCase();
  if ([".md", ".markdown", ".txt"].includes(extension)) {
    const text = await readFile(path, "utf8");
    if (text.includes("\u0000")) throw new SkippedDocumentError("malformed", "Text contains null bytes");
    return extension === ".txt" ? parsePlainText(text) : parseMarkdown(text);
  }
  if (extension === ".docx") {
    try {
      const result = await mammoth.extractRawText({ path });
      return parsePlainText(result.value);
    } catch (error) { throw new SkippedDocumentError("malformed", `DOCX parse failed: ${String(error)}`); }
  }
  if (extension === ".pdf") {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const bytes = new Uint8Array(await readFile(path));
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const sections: ParsedSection[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
        if (text) sections.push({ text, location: `page ${pageNumber}` });
      }
      if (!sections.length) throw new SkippedDocumentError("scanned", "PDF contains no extractable text; OCR is not enabled");
      return sections;
    } catch (error) {
      if (error instanceof SkippedDocumentError) throw error;
      const message = String(error);
      if (/password|encrypted/i.test(message)) throw new SkippedDocumentError("encrypted", message);
      throw new SkippedDocumentError("malformed", `PDF parse failed: ${message}`);
    }
  }
  throw new SkippedDocumentError("unsupported", `Unsupported extension: ${extension}`);
}
