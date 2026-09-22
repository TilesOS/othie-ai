import { realpath, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path";
import type { OthieProfile, OthieSource } from "../config.js";

const blockedNames = new Set([".git", ".svn", ".hg", ".othie", ".kith", "node_modules", "dist", "build", "coverage"]);
const credentialPattern = /(^|[._-])(env|credential|credentials|secret|secrets|token|key|keys)([._-]|$)/i;
const supported = new Set([".md", ".markdown", ".txt", ".pdf", ".docx"]);

export interface AdmittedPath { path: string; source: OthieSource }

function inside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function matchesSimpleGlob(path: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*").replace(/\?/g, ".");
  return new RegExp(`(^|/)${escaped}($|/)`, "i").test(path.replaceAll("\\", "/"));
}

export async function admitPath(input: string, profile: OthieProfile, stateDir: string): Promise<AdmittedPath | undefined> {
  let actual: string;
  try {
    actual = await realpath(input);
    if (!(await stat(actual)).isFile()) return undefined;
  } catch { return undefined; }

  const state = await realpath(stateDir).catch(() => resolve(stateDir));
  if (inside(state, actual)) return undefined;
  const parts = actual.split(/[\\/]/).filter(Boolean);
  if (parts.some((part) => part.startsWith(".") || blockedNames.has(part))) return undefined;
  if (credentialPattern.test(basename(actual))) return undefined;
  if (!supported.has(extname(actual).toLowerCase())) return undefined;

  for (const source of profile.sources) {
    const root = await realpath(source.root).catch(() => resolve(source.root));
    if (!inside(root, actual)) continue;
    const rel = relative(root, actual).replaceAll("\\", "/");
    if (profile.exclusions.some((glob) => matchesSimpleGlob(rel, glob))) return undefined;
    return { path: actual, source: { ...source, root } };
  }
  return undefined;
}

export function isGlobalDocument(path: string, source: OthieSource): boolean {
  const rel = relative(source.root, path).replaceAll("\\", "/");
  return source.global_rule_documents.some((glob) => matchesSimpleGlob(rel, glob));
}
