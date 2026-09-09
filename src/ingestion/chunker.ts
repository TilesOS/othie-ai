import { createHash } from "node:crypto";
import type { KithConfig, KithProfile, KithSource } from "../config.js";
import { countTokens } from "../tokenizer.js";
import type { ChunkRecord, ParsedSection } from "../types.js";

export function sha256(value: string | Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }

function sentencePieces(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])|\n+/).map((part) => part.trim()).filter(Boolean);
}

export function chunkSections(input: {
  sections: ParsedSection[];
  documentId: string;
  revisionId: string;
  profileName: string;
  profile: KithProfile;
  source: KithSource;
  sourcePath: string;
  config: KithConfig;
}): ChunkRecord[] {
  const tokenizer = input.profile.token_budget.tokenizer;
  const max = input.config.ingestion.chunk_tokens;
  const overlap = Math.min(input.config.ingestion.overlap_tokens, Math.floor(max / 2));
  const result: ChunkRecord[] = [];
  for (const section of input.sections) {
    const heading = section.heading ?? "Document";
    const prefix = `${heading}\n`;
    const sentences = sentencePieces(section.text);
    let window: string[] = [];
    const emit = () => {
      if (!window.length) return;
      const text = `${prefix}${window.join(" ")}`.trim();
      const ordinal = result.length;
      result.push({
        id: sha256(`${input.revisionId}:${ordinal}:${text}`), documentId: input.documentId, revisionId: input.revisionId,
        profile: input.profileName, sourcePath: input.sourcePath, sourceRole: input.source.role,
        authorityPriority: input.source.authority_priority, retrievalWeight: input.source.retrieval_weight,
        heading, location: section.location, text, contentHash: sha256(text), tokenCount: countTokens(text, tokenizer),
      });
    };
    for (const sentence of sentences) {
      if (window.length && countTokens(`${prefix}${window.join(" ")} ${sentence}`, tokenizer) > max) {
        emit();
        const retained: string[] = [];
        for (let i = window.length - 1; i >= 0; i--) {
          const candidate = [window[i]!, ...retained];
          if (countTokens(candidate.join(" "), tokenizer) > overlap) break;
          retained.unshift(window[i]!);
        }
        window = retained;
      }
      window.push(sentence);
    }
    emit();
  }
  return result;
}
