import { realpathSync } from "node:fs";
import { relative, isAbsolute, resolve } from "node:path";
import type { OthieProfile } from "../config.js";
import type { ChunkRecord, ContextBriefV1, ContextCitation, ContextRequest, ContextResult, RuleRecord } from "../types.js";
import { countTokens, tokenizerIsEstimate } from "../tokenizer.js";
import { conflictGroups } from "../rules/selection.js";
import { evidenceUnits } from "../ingestion/sentences.js";
import { escapeXml, xmlAttr } from "./xml.js";
import { sha256 } from "../ingestion/chunker.js";

interface Candidates {
  rules: RuleRecord[];
  excerpts: ChunkRecord[];
  keywordAvailable: boolean;
  vectorAvailable: boolean;
  synthesis?: { text: string; ids: string[] };
}
interface Item {
  sourceId: string;
  kind: "rule" | "excerpt" | "synthesis";
  xml: string;
  rule?: ContextBriefV1["applicable_rules"][number];
  excerpt?: ContextBriefV1["permitted_excerpts"][number];
  synthesis?: NonNullable<ContextBriefV1["synthesis"]>;
}

export function packContext(profileName: string, profile: OthieProfile, request: ContextRequest, set: Candidates, degraded: boolean, revisions: { corpus: number; rules: number }): ContextResult {
  const tokenizer = profile.token_budget.tokenizer;
  if (request.max_tokens !== undefined && (!Number.isSafeInteger(request.max_tokens) || request.max_tokens <= 0)) throw new Error("max_tokens must be a positive integer");
  const limit = Math.min(profile.token_budget.enabled ? profile.token_budget.max_tokens : Infinity, request.max_tokens ?? Infinity);
  const ruleIds = new Map(set.rules.map((rule, index) => [rule.id, `r${index + 1}`]));
  const sourceRoots = profile.sources.map((source) => {
    try { return realpathSync(source.root); } catch { return resolve(source.root); }
  });
  const citation = (path: string, location: string, quote?: string): ContextCitation => {
    let source = `unmapped/${sha256(path).slice(0, 12)}`;
    for (const [index, root] of sourceRoots.entries()) {
      const rel = relative(root, path);
      if (rel && !rel.startsWith("..") && !isAbsolute(rel)) { source = `s${index + 1}/${rel.replaceAll("\\", "/")}`; break; }
    }
    return { source, at: location, ...(quote ? { quote } : {}) };
  };
  const citationXml = ({ source, at }: ContextCitation) => `<citation source="${xmlAttr(source)}" at="${xmlAttr(at)}"/>`;
  const items: Item[] = [];
  const addRule = (rule: RuleRecord) => {
    const id = ruleIds.get(rule.id)!;
    const evidence = citation(rule.sourcePath, rule.location, rule.quotation);
    items.push({
      sourceId: rule.id,
      kind: "rule",
      xml: `<rule id="${id}" category="${xmlAttr(rule.category)}" scope="${xmlAttr(rule.applicability)}" authority="${rule.authorityPriority}"><text>${escapeXml(rule.text)}</text><quote>${escapeXml(rule.quotation)}</quote>${citationXml(evidence)}</rule>`,
      rule: { id, text: rule.text, category: rule.category, scope: rule.applicability, authority: rule.authorityPriority, citation: evidence },
    });
  };
  set.rules.filter((rule) => rule.global).forEach(addRule);
  if (set.synthesis) {
    const sources = new Map([...set.rules, ...set.excerpts].map((source) => [source.id, source]));
    const citations = [...new Map(set.synthesis.ids.map((id) => {
      const source = sources.get(id)!;
      const value = citation(source.sourcePath, source.location);
      return [`${value.source}\0${value.at}`, value] as const;
    })).values()];
    items.push({ sourceId: "synthesis", kind: "synthesis", xml: `<synthesis>${escapeXml(set.synthesis.text)}${citations.map(citationXml).join("")}</synthesis>`, synthesis: { text: set.synthesis.text, citations } });
  }
  set.rules.filter((rule) => !rule.global).forEach(addRule);
  const seen = new Set<string>();
  const queryTerms = request.query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const chunk of set.excerpts) {
    const text = chunk.text.startsWith(`${chunk.heading}\n`) ? chunk.text.slice(chunk.heading.length + 1) : chunk.text;
    const units = evidenceUnits(text).map((text, index) => ({ text, index, score: queryTerms.filter((term) => text.toLowerCase().includes(term)).length }))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    for (const unit of units) {
      const key = `${chunk.documentId}:${unit.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const evidence = citation(chunk.sourcePath, chunk.location);
      const id = `e${items.filter((item) => item.kind === "excerpt").length + 1}`;
      items.push({ sourceId: `${chunk.id}:${unit.index}`, kind: "excerpt", xml: `<excerpt>${escapeXml(unit.text)}${citationXml(evidence)}</excerpt>`, excerpt: { id, text: unit.text, citation: evidence } });
    }
  }
  const conflicts = conflictGroups(set.rules);
  const relevantConflicts = (selection: Item[]) => conflicts.filter((group) => group.some((id) => selection.some((item) => item.sourceId === id)));
  const mode = (selection: Item[]): ContextResult["status"]["mode"] => !selection.length ? "empty" : selection.some((item) => item.kind === "synthesis") ? "synthesized" : degraded ? "fallback" : "deterministic";
  const render = (selection: Item[], tokens: number) => {
    const detected = relevantConflicts(selection);
    const warnings = detected.map((group) => `<conflict rules="${group.map((id) => ruleIds.get(id)).join(" ")}" omitted="${group.some((id) => !selection.some((item) => item.sourceId === id))}"/>`).join("");
    return `<organization_context profile="${xmlAttr(profileName)}" mode="${mode(selection)}"><items>${selection.map((item) => item.xml).join("")}</items><conflicts count="${detected.length}" detection="explicit_opposition_only">${warnings}</conflicts><status tokenizer="${tokenizer}" tokenizer_estimate="${tokenizerIsEstimate(profile.token_budget.host_model, tokenizer)}" tokens="${tokens}" omitted="${items.length - selection.length}" keyword="${set.keywordAvailable}" vector="${set.vectorAvailable}" corpus_revision="${revisions.corpus}" rule_revision="${revisions.rules}"/></organization_context>`;
  };
  const measured = (selection: Item[]) => {
    let count = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      const text = render(selection, count), actual = countTokens(text, tokenizer);
      if (actual === count) return { text, count };
      count = actual;
    }
    throw new Error("Unable to stabilize response token count");
  };
  const fits = ({ text, count }: { text: string; count: number }) => count <= limit && text.length <= profile.safeguards.max_response_chars;
  const empty = measured([]);
  if (!fits(empty)) throw new Error(`max_tokens or response size is too small for the minimum response envelope (${empty.count} tokens)`);
  const selected: Item[] = [];
  for (const item of items) if (fits(measured([...selected, item]))) selected.push(item);
  const result = measured(selected);
  const status: ContextResult["status"] = {
      profile: profileName, mode: mode(selected), tokenizer, tokenizerEstimate: tokenizerIsEstimate(profile.token_budget.host_model, tokenizer), tokenCount: result.count,
      omittedItems: items.length - selected.length, conflicts: relevantConflicts(selected).length,
      keywordAvailable: set.keywordAvailable, vectorAvailable: set.vectorAvailable, synthesisAttempted: Boolean(request.synthesize),
      ...(degraded ? { synthesisReason: set.vectorAvailable ? "Synthesis unavailable or invalid" : "Query embeddings unavailable" } : {}),
      corpusRevision: revisions.corpus, ruleRevision: revisions.rules,
  };
  const detected = relevantConflicts(selected);
  const brief: ContextBriefV1 = {
    schema_version: "1",
    request: {
      surface: request.surface ?? "unknown",
      phase: request.phase ?? "on_demand",
      ...(request.host ? { host: request.host } : {}),
      ...(request.workspace_root ? { workspace_root: request.workspace_root } : {}),
      ...(request.active_paths ? { active_paths: [...request.active_paths] } : {}),
    },
    context_text: result.text,
    applicable_rules: selected.flatMap((item) => item.rule ? [item.rule] : []),
    permitted_excerpts: selected.flatMap((item) => item.excerpt ? [item.excerpt] : []),
    ...(selected.find((item) => item.synthesis)?.synthesis ? { synthesis: selected.find((item) => item.synthesis)!.synthesis! } : {}),
    external_facts: [],
    navigation_hints: [],
    verification_checks: [],
    conflicts: detected.map((group) => ({ rule_ids: group.map((id) => ruleIds.get(id)!), detection: "explicit_opposition_only" })),
    status,
  };
  return { text: result.text, status, brief };
}
