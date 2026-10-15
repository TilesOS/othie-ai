import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it.each(["codex", "claude-code"])("counts startup against the compiled %s hook deadline before launching the CLI", async (host) => {
  const root = await mkdtemp(join(tmpdir(), "othie-hook-startup-"));
  const preload = join(root, "startup.mjs"), cli = join(root, "cli.mjs"), marker = join(root, "queried");
  try {
    await writeFile(preload, "await new Promise(done => setTimeout(done, 400));\n");
    await writeFile(cli, `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'queried');\n`);
    const adapter = fileURLToPath(new URL(`../../../integrations/${host}/dist/src/user-prompt-submit.js`, import.meta.url));
    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
      const child = spawn(process.execPath, ["--import", preload, adapter, "--cli", cli, "--deadline-ms", "300", "--diagnostics-json"], { stdio: "pipe" });
      let stdout = "", stderr = "";
      const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Hook did not exit")); }, 5_000);
      child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
      child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
      child.stdin.on("error", () => {});
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("close", (code) => { clearTimeout(timer); done({ code, stdout, stderr }); });
      child.stdin.end(JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd: root, prompt: "PRIVATE_PROMPT" }));
    });
    expect(result.code).toBe(0); expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({ host, outcome: "context_timeout", elapsed_ms: expect.any(Number) });
    expect(JSON.parse(result.stderr).elapsed_ms).toBeGreaterThanOrEqual(400);
    expect(result.stderr).not.toContain("PRIVATE_PROMPT");
    await expect(readFile(marker)).rejects.toMatchObject({ code: "ENOENT" });
  } finally { await rm(root, { recursive: true, force: true }); }
});
