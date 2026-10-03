import { spawn } from "node:child_process";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createCredential } from "../src/engine/credentials.js";
import { runEngine } from "../src/engine/lifecycle.js";
import { fixture, waitFor } from "./helpers.js";

type Host = "codex" | "claude-code";
function invoke(host: Host, config: string, credential: string, cwd: string, prompt: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult, reject) => {
    const child = spawn(process.execPath, [
      resolve(`../../integrations/${host}/dist/src/user-prompt-submit.js`),
      "--cli", resolve("dist/src/cli.js"), "--config", config, "--bridge", host, "--credential-file", credential,
      "--max-tokens", "500", "--deadline-ms", "5000", "--diagnostics-json",
    ], { stdio: "pipe" });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("hook invocation did not exit")); }, 8000);
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.stdin.on("error", () => {});
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => { clearTimeout(timer); resolveResult({ code, stdout, stderr }); });
    child.stdin.end(JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd, prompt, transcript_path: "PRIVATE_TRANSCRIPT", session_id: "PRIVATE_SESSION" }));
  });
}

describe("authenticated cross-host prompt delivery", () => {
  it("delivers eligible context, stays silent for irrelevant tasks, and respects deletion/restart and profile grants", async () => {
    const f = await fixture();
    const privateDocs = join(f.root, "private docs"), workspace = join(f.root, "workspace with spaces");
    await mkdir(privateDocs); await mkdir(workspace);
    f.config.ingestion.watch_enabled = true;
    f.config.profiles.company!.providers.embeddings = [];
    f.config.profiles.company!.providers.extraction = [];
    f.config.profiles.private = { ...f.config.profiles.company!, sources: [{ root: privateDocs, role: "reference", authority_priority: 50, retrieval_weight: 1, global_rule_documents: [] }] };
    await writeFile(f.configPath, JSON.stringify(f.config));
    const source = join(f.docs, "support.md");
    await writeFile(source, "Canary support policy requires replies within four hours.");
    await writeFile(join(privateDocs, "support.md"), "Canary support policy requires PRIVATE_OTHER_PROFILE_SECRET.");
    const files = new Map<Host, string>();
    for (const host of ["codex", "claude-code"] as const) {
      const token = await createCredential(f.config.credentials_file!, host, ["company"], "company");
      const file = join(f.data, `${host}.credential`);
      await writeFile(file, token, { mode: 0o600 }); files.set(host, file);
    }
    let running: Awaited<ReturnType<typeof runEngine>> | undefined;
    try {
      running = await runEngine(f.config);
      await waitFor(() => running!.engine.store.listActiveChunks("company").length > 0 && running!.engine.store.listActiveChunks("private").length > 0);
      const outputs: string[] = [];
      for (const host of ["codex", "claude-code"] as const) {
        // Point cwd at the unauthorized profile: metadata cannot expand grants.
        const result = await invoke(host, f.configPath, files.get(host)!, privateDocs, "canary support policy");
        expect(result.code).toBe(0);
        const output = JSON.parse(result.stdout);
        outputs.push(output.hookSpecificOutput.additionalContext);
        expect(output.hookSpecificOutput.additionalContext).toContain("four hours");
        expect(output.hookSpecificOutput.additionalContext).toContain('source="s1/support.md"');
        expect(result.stdout).not.toContain("PRIVATE_OTHER_PROFILE_SECRET");
        expect(result.stderr).not.toMatch(/PRIVATE|support|company|credential|session|workspace|s1\//);
        expect(JSON.parse(result.stderr)).toMatchObject({ host, outcome: "injected", mode: "fallback" });
        expect(JSON.parse(result.stderr).token_count).toBeLessThanOrEqual(500);
        const empty = await invoke(host, f.configPath, files.get(host)!, workspace, "refactor javascript sorting comparator");
        expect(empty.code).toBe(0); expect(empty.stdout).toBe("");
        expect(JSON.parse(empty.stderr)).toMatchObject({ host, outcome: "empty", mode: "empty" });
      }
      expect(outputs[0]).toBe(outputs[1]);

      await unlink(source);
      await waitFor(() => running!.engine.store.getDocument(source, "company")?.status === "revoked");
      for (const host of ["codex", "claude-code"] as const) {
        const revoked = await invoke(host, f.configPath, files.get(host)!, workspace, "canary support policy");
        expect(revoked.code).toBe(0); expect(revoked.stdout).toBe("");
        expect(JSON.parse(revoked.stderr).outcome).toBe("empty");
      }
      await running.close(); running = undefined;
      await writeFile(source, "Canary support policy requires replies within eight hours.");
      running = await runEngine(f.config);
      await waitFor(() => running!.engine.store.getDocument(source, "company")?.status === "active");
      for (const host of ["codex", "claude-code"] as const) {
        const restarted = await invoke(host, f.configPath, files.get(host)!, workspace, "canary support policy");
        expect(restarted.code).toBe(0);
        expect(restarted.stdout).toContain("eight hours"); expect(restarted.stdout).not.toContain("four hours");
        await writeFile(files.get(host)!, "PRIVATE_INVALID_CREDENTIAL");
        const denied = await invoke(host, f.configPath, files.get(host)!, privateDocs, "canary support policy");
        expect(denied.code).toBe(0); expect(denied.stdout).toBe("");
        expect(JSON.parse(denied.stderr)).toMatchObject({ host, outcome: "context_unavailable" });
        expect(denied.stderr).not.toMatch(/PRIVATE|support|company|credential/);
      }
    } finally { await running?.close(); await rm(f.root, { recursive: true, force: true }); }
  }, 30_000);
});
