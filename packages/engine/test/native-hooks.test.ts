import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claudeSettingsConfiguration, codexHookConfiguration, createCodexProjectHome, nativeHookArguments, nativeHookDelivery, recordingWrapper, redactNativeTranscript } from "../src/evaluation/native-hooks.js";

describe("native hook acceptance recorder", () => {
  it("rejects ambiguous or incomplete CLI modes instead of silently running a different baseline", () => {
    const base = ["--host", "claude-code"];
    for (const args of [
      [...base, "--claude-settings"], [...base, "--claude-settings", "--out", "somewhere"],
      [...base, "--claude-setting", "local"], [...base, "--claude-settings", "local", "--claude-settings", "explicit"],
      [...base, "--launch-directory"], [...base, "local"],
    ]) expect(() => nativeHookArguments(args)).toThrow();
    expect(Object.fromEntries(nativeHookArguments([...base, "--claude-settings", "local", "--launch-directory", "nested", "--out", "path with spaces"])))
      .toEqual({ host: "claude-code", "claude-settings": "local", "launch-directory": "nested", out: "path with spaces" });
    expect(Object.fromEntries(nativeHookArguments(["--host", "codex", "--codex-hooks", "project", "--local-model", "local-model"])))
      .toEqual({ host: "codex", "codex-hooks": "project", "local-model": "local-model" });
  });

  it("redacts account telemetry, identifiers and encoded host paths while preserving synthetic evidence", () => {
    const transcript = [
      { type: "system", cwd: "/private/fixture/workspace", session_id: "PRIVATE_SESSION", memory_paths: { auto: "PRIVATE_ENCODED_PATH" }, messaging_socket_path: "PRIVATE_SOCKET" },
      { type: "rate_limit_event", rate_limit_info: { utilization: "PRIVATE_ACCOUNT_UTILIZATION" }, uuid: "PRIVATE_UUID" },
      { type: "thread.started", thread_id: "PRIVATE_THREAD", turn_id: "PRIVATE_TURN" },
      { type: "assistant", message: { content: [{ text: "11" }], request_id: "PRIVATE_REQUEST" } },
      { type: "system", hook_id: "PRIVATE_HOOK", stdout: '{"hookSpecificOutput":{"additionalContext":"synthetic cited context"}}', exit_code: 0 },
    ].map((event) => JSON.stringify(event)).join("\n") + "\nwarning at /private/fixture/file\n";
    const redacted = redactNativeTranscript(transcript, [["/private/fixture", "<temporary-fixture>"]]);
    expect(redacted).not.toMatch(/PRIVATE_|\/private\/fixture/);
    expect(redacted).toContain('"text":"11"');
    expect(redacted).toContain("synthetic cited context");
    expect(redacted).toContain('"exit_code":0');
    expect(redacted).toContain("warning at <temporary-fixture>/file");
    expect(redactNativeTranscript(redacted, [["/private/fixture", "<temporary-fixture>"]])).toBe(redacted);
  });

  it("requires the full cited policy and matching successful adapter event for native delivery", () => {
    const context = '<excerpt source="s1/canary.md">Canary enterprise support policy requires the first response within eleven hours on weekends. This is a first-response target, not a resolution deadline.</excerpt>';
    const receipt = { event: "UserPromptSubmit", code: 0, stderr: JSON.stringify({ schema_version: "1", event: "othie_prompt_hook", host: "claude-code", surface: "code", phase: "turn_start", outcome: "injected", elapsed_ms: 10, token_count: 50 }),
      stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: context } }) };
    expect(nativeHookDelivery("claude-code", "positive", receipt)).toBe(true);
    for (const change of [
      { code: 1 }, { event: "SessionStart" }, { stdout: "eleven hours" },
      { stdout: receipt.stdout.replace('source=\\"s1/canary.md\\"', 'source=\\"other.md\\"') },
      { stdout: receipt.stdout.replace("not a resolution deadline", "a resolution deadline") },
      { stderr: JSON.stringify({ host: "codex", outcome: "injected" }) },
    ]) expect(nativeHookDelivery("claude-code", "positive", { ...receipt, ...change })).toBe(false);
    expect(nativeHookDelivery("claude-code", "positive", null)).toBe(false);
    const empty = { ...receipt, stdout: "", stderr: JSON.stringify({ schema_version: "1", event: "othie_prompt_hook", host: "claude-code", surface: "code", phase: "turn_start", outcome: "empty", elapsed_ms: 10 }) };
    expect(nativeHookDelivery("claude-code", "irrelevant", empty)).toBe(true);
    expect(nativeHookDelivery("claude-code", "irrelevant", { ...empty, stdout: " " })).toBe(false);
    expect(nativeHookDelivery("claude-code", "revoked", empty)).toBe(false);
    const unavailable = { ...empty, stderr: empty.stderr.replace("empty", "context_unavailable") };
    expect(nativeHookDelivery("claude-code", "revoked", unavailable)).toBe(true);
    expect(nativeHookDelivery("claude-code", "unavailable", unavailable)).toBe(true);
    for (const [condition, valid] of [["positive", receipt], ["irrelevant", empty], ["revoked", unavailable], ["unavailable", unavailable]] as const) {
      const diagnostic = JSON.parse(valid.stderr);
      for (const change of [
        { prompt: "PRIVATE_PROMPT" }, { elapsed_ms: "PRIVATE_PATH" }, { mode: "PRIVATE_PROFILE" },
        { token_count: 501 }, { schema_version: "2" }, { event: "other" }, { elapsed_ms: -1 },
      ]) expect(nativeHookDelivery("claude-code", condition, { ...valid, stderr: JSON.stringify({ ...diagnostic, ...change }) })).toBe(false);
      expect(nativeHookDelivery("claude-code", condition, { ...valid, stderr: valid.stderr + "\nwarning PRIVATE_SECRET" })).toBe(false);
    }
  });

  it("does not mask project or local settings discovery with an explicit override", () => {
    const workspace = join(tmpdir(), "workspace with spaces"), override = join(tmpdir(), "explicit.json");
    for (const mode of ["project", "local"] as const) {
      const config = claudeSettingsConfiguration(mode, workspace, override);
      expect(config.path).toBe(join(workspace, ".claude", mode === "project" ? "settings.json" : "settings.local.json"));
      expect(config.args).toEqual(["--setting-sources", "project,local"]);
      expect(config.args).not.toContain(override);
      expect(config.location).toBe(`.claude/${mode === "project" ? "settings.json" : "settings.local.json"}`);
    }
    const explicit = claudeSettingsConfiguration("explicit", workspace, override);
    expect(explicit.path).toBe(override);
    expect(explicit.args).toEqual(["--setting-sources", "project,local", "--settings", override]);
  });

  it("uses persisted disposable project trust without session hook overrides or inherited user settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "othie-codex-project-home-"));
    const authenticationHome = join(root, "existing-home"), home = join(root, "isolated-home");
    const workspace = join(root, 'workspace with spaces and "quotes"');
    try {
      await mkdir(authenticationHome);
      await writeFile(join(authenticationHome, "auth.json"), "SYNTHETIC_LOGIN");
      await writeFile(join(authenticationHome, "config.toml"), "PRIVATE_USER_SETTINGS");
      await createCodexProjectHome(home, workspace, authenticationHome);
      const config = await readFile(join(home, "config.toml"), "utf8");
      expect(config).toBe(`[projects.${JSON.stringify(workspace)}]\ntrust_level = "trusted"\n`);
      expect(config).not.toMatch(/PRIVATE_|hooks|model/);
      expect(await readFile(join(home, "auth.json"), "utf8")).toBe("SYNTHETIC_LOGIN");
      await writeFile(join(home, "auth.json"), "SYNTHETIC_REFRESH");
      expect(await readFile(join(authenticationHome, "auth.json"), "utf8")).toBe("SYNTHETIC_LOGIN");
      expect(await readFile(join(authenticationHome, "config.toml"), "utf8")).toBe("PRIVATE_USER_SETTINGS");
      if (process.platform !== "win32") {
        expect((await stat(home)).mode & 0o777).toBe(0o700);
        for (const file of ["config.toml", "auth.json"]) expect((await stat(join(home, file))).mode & 0o777).toBe(0o600);
      }
      await expect(createCodexProjectHome(home, workspace, authenticationHome)).rejects.toThrow();
      const localHome = join(root, "local-home");
      await createCodexProjectHome(localHome, workspace);
      await expect(readFile(join(localHome, "auth.json"))).rejects.toThrow();
      const discovery = codexHookConfiguration("project", "GENERATED_COMMAND");
      expect(discovery.args).toEqual([]);
      expect(discovery.trust).toContain("disposable Codex home");
      const session = codexHookConfiguration("session", "GENERATED_COMMAND");
      expect(session.args).toContain("--ignore-user-config");
      expect(session.args.join(" ")).toContain("hooks.UserPromptSubmit");
      expect(session.args.join(" ")).toContain("GENERATED_COMMAND");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("forwards the host event and adapter output while excluding private event values from evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "othie-native-recorder-"));
    const nested = join(root, "fixture with spaces"); await mkdir(nested);
    const adapter = join(nested, "adapter.mjs"), wrapper = join(nested, "wrapper.mjs"), receipt = join(nested, "receipt.json");
    try {
      await writeFile(adapter, `let text = ''; for await (const chunk of process.stdin) text += chunk;
        const event = JSON.parse(text);
        process.stdout.write(JSON.stringify({prompt_received: event.prompt === 'synthetic prompt'}));
        process.stderr.write(JSON.stringify({outcome: 'injected'}));`);
      await writeFile(wrapper, recordingWrapper([adapter], receipt));
      const output = await new Promise<{ stdout: string; stderr: string; code: number | null }>((done, reject) => {
        const child = spawn(process.execPath, [wrapper], { stdio: "pipe" });
        let stdout = "", stderr = "";
        child.stdout.setEncoding("utf8").on("data", (chunk) => stdout += chunk);
        child.stderr.setEncoding("utf8").on("data", (chunk) => stderr += chunk);
        child.once("error", reject); child.once("close", (code) => done({ stdout, stderr, code }));
        child.stdin.end(JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: "synthetic prompt", model: "synthetic-model", session_id: "PRIVATE_SESSION", transcript_path: "PRIVATE_TRANSCRIPT", cwd: "PRIVATE_CWD" }));
      });
      const saved = await readFile(receipt, "utf8");
      expect(saved).not.toMatch(/PRIVATE_|synthetic prompt/);
      expect(JSON.parse(saved)).toMatchObject({ event: "UserPromptSubmit", model: "synthetic-model", code: 0, input_fields: ["cwd", "hook_event_name", "model", "prompt", "session_id", "transcript_path"] });
      expect(JSON.parse(output.stdout)).toEqual({ prompt_received: true });
      expect(JSON.parse(output.stderr)).toEqual({ outcome: "injected" }); expect(output.code).toBe(0);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
