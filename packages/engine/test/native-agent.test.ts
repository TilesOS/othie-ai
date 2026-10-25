import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { nativeAgentCases, nativeAgentDocuments } from "../src/evaluation/native-agent-cases.js";
import { nativeAgentContextComplete, nativeAgentDelivery, nativeAgentEvents, nativeAgentFiles, nativeAgentIntegrity, nativeAgentOptions, nativeAgentProcess } from "../src/evaluation/native-agent.js";
import { countTokens } from "../src/tokenizer.js";

it("rejects ambiguous native agent options before creating output state", () => {
  for (const args of [
    ["--wat", "1"], ["--out", "a", "--out", "b"], ["--repeats"], ["positional"],
    ["--repeats", "0"], ["--timeout-ms", "NaN"], ["--context-tokens", "501"],
    ["--cases", "unknown"], ["--cases", "support-targets,support-targets"], ["--cases", ""], ["--model", " "],
  ]) expect(() => nativeAgentOptions(args)).toThrow();
  expect(nativeAgentOptions(["--cases", "support-targets", "--repeats", "2"]).cases).toEqual(["support-targets"]);
});

it("requires complete strict diagnostic receipts and exactly the expected context", () => {
  const text = '<context source="s1/support.md">Complete policy with exception.</context>';
  const diagnostic = { schema_version: "1", event: "othie_prompt_hook", host: "codex", surface: "code", phase: "turn_start", outcome: "injected", elapsed_ms: 100, token_count: countTokens(text, "o200k_base") };
  const receipt = { event: "UserPromptSubmit", model: "test-model", code: 0, input_fields: ["prompt"],
    stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: `Othie context brief (source-backed; preserve the included citations):\n${text}` } }), stderr: JSON.stringify(diagnostic) };
  expect(nativeAgentDelivery(receipt, text, true, 500)).toBe(true);
  for (const invalid of [null, { ...receipt, code: 1 }, { ...receipt, stdout: receipt.stdout + "extra" },
    { ...receipt, stderr: JSON.stringify({ ...diagnostic, secret: "content" }) },
    { ...receipt, stderr: JSON.stringify({ ...diagnostic, token_count: undefined }) },
    { ...receipt, stdout: receipt.stdout.replace("with exception", "") },
  ]) expect(nativeAgentDelivery(invalid, text, true, 500)).toBe(false);
  expect(nativeAgentDelivery(receipt, text, true, 1)).toBe(false);
  const empty = { ...receipt, stdout: "", stderr: JSON.stringify({ ...diagnostic, outcome: "empty" }) };
  expect(nativeAgentDelivery(empty, text, false, 500)).toBe(true);
  expect(nativeAgentDelivery({ ...empty, stdout: "unexpected" }, text, false, 500)).toBe(false);
});

it("uses native completion and successful command events without treating warnings as terminal errors", () => {
  const lines = [
    { type: "item.completed", item: { type: "error", message: "hook trust warning" } },
    { type: "item.completed", item: { type: "command_execution", command: "node --test", exit_code: 0, aggregated_output: "ok 1 - public interface 0" } },
    { type: "turn.completed", usage: { input_tokens: 100, output_tokens: 10, cached_input_tokens: 20 } },
  ];
  const encoded = lines.map((line) => JSON.stringify(line)).join("\n");
  expect(nativeAgentEvents(encoded)).toEqual({ completed: true, command_calls: 1, ran_public_tests: true, input_tokens: 100, output_tokens: 10, cached_input_tokens: 20 });
  expect(nativeAgentEvents(encoded + '\n{"type":"turn.failed"}').completed).toBe(false);
  expect(nativeAgentEvents(encoded + "\nnot-json").completed).toBe(false);
  expect(nativeAgentEvents(encoded + "\n" + JSON.stringify(lines[2])).completed).toBe(false);
  expect(nativeAgentEvents('{"type":"turn.completed"}').input_tokens).toBeNull();
  expect(nativeAgentEvents('{"type":"item.completed","item":{"type":"agent_message","text":"all tests passed"}}').ran_public_tests).toBe(false);
  expect(nativeAgentEvents('{"type":"item.completed","item":{"type":"command_execution","command":"echo node --test","exit_code":0,"aggregated_output":"node --test"}}').ran_public_tests).toBe(false);
});

it("distinguishes delivery of unrelated excerpts from complete expected policy evidence", () => {
  const scenario = nativeAgentCases.find((item) => item.id === "support-targets")!;
  const policy = nativeAgentDocuments.find((item) => item.name === "support.md")!.text;
  const unrelated = nativeAgentDocuments.find((item) => item.name === "brand.md")!.text;
  expect(nativeAgentContextComplete(scenario, policy, true)).toBe(true);
  expect(nativeAgentContextComplete(scenario, policy.replace("Saturday and Sunday are weekends.", ""), true)).toBe(false);
  expect(nativeAgentContextComplete(scenario, unrelated, true)).toBe(false);
  const control = nativeAgentCases.find((item) => item.control)!;
  expect(nativeAgentContextComplete(control, unrelated, true)).toBe(false);
  expect(nativeAgentContextComplete(control, "<empty/>", false)).toBe(true);
});

it("runs actual public tests and detects changed tests, extra files and solution symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-native-agent-test-"));
  try {
    const files = nativeAgentFiles(nativeAgentCases.find((item) => item.control)!);
    for (const [name, content] of Object.entries(files)) await writeFile(join(root, name), content);
    await writeFile(join(root, "solution.js"), "function solve(values) { return [...new Set(values)].sort((a,b) => a-b); }");
    expect((await nativeAgentProcess(process.execPath, ["--test"], root, 5000)).code).toBe(0);
    expect((await nativeAgentIntegrity(root, files)).passed).toBe(true);
    await writeFile(join(root, "solution.test.cjs"), "// altered tests");
    await writeFile(join(root, "__proto__"), "unexpected");
    expect((await nativeAgentIntegrity(root, files)).changes.sort()).toEqual(["__proto__", "solution.test.cjs"]);
    await rm(join(root, "solution.js"));
    if (process.platform !== "win32") {
      await symlink(join(root, "README.md"), join(root, "solution.js"));
      expect((await nativeAgentIntegrity(root, files)).changes).toContain("solution.js");
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

it.skipIf(process.platform === "win32")("bounds native tool descendants and marks timed out sessions as failures", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-native-agent-timeout-"));
  try {
    const script = "const {spawn}=require('node:child_process'); spawn(process.execPath,['-e',`setTimeout(()=>require('node:fs').writeFileSync('late','bad'),600)`],{stdio:'ignore'}); setTimeout(()=>{},5000)";
    const result = await nativeAgentProcess(process.execPath, ["-e", script], root, 250);
    expect(result.timed_out).toBe(true); expect(result.code).not.toBe(0);
    await new Promise((done) => setTimeout(done, 700));
    await expect(readFile(join(root, "late"))).rejects.toMatchObject({ code: "ENOENT" });
  } finally { await rm(root, { recursive: true, force: true }); }
});
