export type SourceRole = "authoritative" | "reference";
export type ExportPolicy = "rules_only" | "rules_and_excerpts";
export type ProcessingStatus = "pending" | "processing" | "active" | "failed" | "skipped" | "revoked";

export interface ParsedSection {
  text: string;
  heading?: string;
  location: string;
}

export interface ChunkRecord {
  id: string;
  documentId: string;
  revisionId: string;
  profile: string;
  sourcePath: string;
  sourceRole: SourceRole;
  authorityPriority: number;
  retrievalWeight: number;
  heading: string;
  location: string;
  text: string;
  contentHash: string;
  tokenCount: number;
}

export interface RuleRecord {
  id: string;
  profile: string;
  documentId: string;
  revisionId: string;
  sourcePath: string;
  text: string;
  category: string;
  applicability: string;
  quotation: string;
  location: string;
  authorityPriority: number;
  global: boolean;
  modelIdentity: string;
  promptVersion: string;
}

export interface SearchHit {
  chunk: ChunkRecord;
  keywordRank?: number;
  vectorRank?: number;
  score: number;
}

export interface ContextRequest {
  query: string;
  profile?: string;
  max_tokens?: number;
  synthesize?: boolean;
}

export interface ContextStatus {
  profile: string;
  mode: "deterministic" | "synthesized" | "fallback" | "empty";
  tokenizer: string;
  tokenizerEstimate: boolean;
  tokenCount: number;
  omittedItems: number;
  conflicts: number;
  keywordAvailable: boolean;
  vectorAvailable: boolean;
  synthesisAttempted: boolean;
  synthesisReason?: string;
  corpusRevision: number;
  ruleRevision: number;
}

export interface ContextResult {
  text: string;
  status: ContextStatus;
}
