// Fresh-process observation of the installed parser dependency. Wrappers forward
// unchanged arguments/results; never use this instrumentation in website code.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const website = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = resolve(website, "../..");
const require = createRequire(join(website, "package.json"));
const estree = createRequire(require.resolve("@typescript-eslint/typescript-estree/package.json"));
const minimatchId = estree.resolve("minimatch");
const minimatch = estree("minimatch");
let trace;
const freshTrace = () => ({ matches: [], preprocess: [], first_phase: [], second_phase: [] });

// Capture both the public options and the effective branch taken by Minimatch.
// The positive control below proves that level-two calls are observable.
const originals = new Map();
for (const [method, key] of [["preprocess", "preprocess"], ["firstPhasePreProcess", "first_phase"], ["secondPhasePreProcess", "second_phase"]]) {
  const original = minimatch.Minimatch.prototype[method];
  originals.set(method, original);
  minimatch.Minimatch.prototype[method] = function (parts) {
    const observation = { optimization_level: this.options.optimizationLevel ?? 1, input_parts: parts.length };
    trace?.[key].push(observation);
    const result = original.call(this, parts);
    observation.output_parts = result.length;
    return result;
  };
}
require.cache[minimatchId].exports = {
  ...minimatch,
  minimatch(file, pattern, options) {
    // File paths may contain temporary host directories; publish only patterns
    // supplied by these fixed synthetic fixtures and plain options.
    trace?.matches.push({ pattern, options: { ...options } });
    return minimatch.minimatch(file, pattern, options);
  },
};

try {
  const { ESLint } = require("eslint");
  const eslint = new ESLint({ cwd: website, overrideConfigFile: join(website, "eslint.config.mjs") });
  const websiteChecks = [];
  for (const file of ["lib/reachability-fixture.tsx", "lib/reachability-fixture.js"]) {
    trace = freshTrace();
    const config = await eslint.calculateConfigForFile(file);
    const [result] = await eslint.lintText("export const value = 1;", { filePath: file });
    websiteChecks.push({ file, project: config.languageOptions.parserOptions.project ?? null,
      project_service: config.languageOptions.parserOptions.projectService ?? null,
      fatal_errors: result.fatalErrorCount, messages: result.messages.map(({ ruleId, severity }) => ({ ruleId, severity })), trace });
  }

  const { parserGlobCases } = await import("./lint-parser-fixtures.ts");
  const { probeParserGlobCase } = await import("./lint-parser-harness.ts");
  const parserChecks = [];
  const globstarGuards = ["root/**/../nested/file.ts", "{src,**}/../nested/file.ts", "tools/**/../nested/file.ts"]
    .map((pattern, index) => ({ id: `amplification-pattern-${index}`, pattern, file: "allowed.ts", expected: "invalid-pattern" }));
  for (const item of [...parserGlobCases, ...globstarGuards]) {
    trace = freshTrace();
    const observed = await probeParserGlobCase(item);
    parserChecks.push({ id: item.id, expected: item.expected, ...observed, trace });
  }

  // One globstar/parent pair is sufficient to exercise both vulnerable phases.
  // Keep the input fixed and tiny; this is branch coverage, not a stress test.
  const controls = [];
  for (const level of [null, 1, 2]) {
    trace = freshTrace();
    const matcher = new minimatch.Minimatch("root/**/../nested/file.ts", { dot: true, ...(level === null ? {} : { optimizationLevel: level }) });
    controls.push({ requested_level: level, resulting_parts: matcher.globParts.length, trace });
  }

  const sha = bytes => createHash("sha256").update(bytes).digest("hex");
  const sourcePaths = ["package-lock.json", "apps/website/eslint.config.mjs", "apps/website/lib/lint-parser-fixtures.ts",
    "apps/website/lib/lint-parser-harness.ts", "apps/website/lib/lint-parser-reachability-probe.mjs",
    "node_modules/@typescript-eslint/typescript-estree/dist/useProgramFromProjectService.js",
    "node_modules/@typescript-eslint/typescript-estree/dist/create-program/validateDefaultProjectForFilesGlob.js",
    relative(repository, minimatchId).replaceAll("\\", "/")];
  console.log(JSON.stringify({ protocol: "parser-minimatch-reachability-v1", recorded_at: new Date().toISOString(),
    node: process.version, platform: process.platform, parser_version: require("@typescript-eslint/parser/package.json").version,
    minimatch_version: estree("minimatch/package.json").version,
    source_hashes: Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, sha(await readFile(join(repository, path)))]))),
    website: websiteChecks, parser: parserChecks, controls,
    limits: "Installed CJS parser call path, current website config and fixed synthetic fixtures only. Instrumentation forwards arguments/results. Tiny level-two positive control, not a stress test. No package remediation, audit suppression, exhaustive reachability proof or native-host acceptance.",
  }, null, 2));
} finally {
  require.cache[minimatchId].exports = minimatch;
  for (const [method, original] of originals) minimatch.Minimatch.prototype[method] = original;
}
