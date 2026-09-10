import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { platform } from "node:os";
import { describe, expect, it } from "vitest";
import { runEngine } from "../src/engine/lifecycle.js";
import { defaultIpcPath } from "../src/paths.js";
import { fixture, waitFor } from "./helpers.js";

function startCli(configPath: string) {
  const child = spawn(process.execPath, ["dist/src/cli.js", "engine", "foreground", "--config", configPath], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
  let stderr = ""; child.stderr.on("data", (data) => { stderr += String(data); });
  return { child, stderr: () => stderr };
}
async function stopChild(child: ReturnType<typeof startCli>["child"]) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGKILL"); await exited;
}

describe("engine lifecycle", () => {
  it("rejects a second process before starting workers and exits cleanly", async () => {
    const f = await fixture(); const running = await runEngine(f.config);
    const other = startCli(f.configPath);
    try {
      await waitFor(() => other.child.exitCode !== null, 5_000);
      expect(other.child.exitCode).toBe(1); expect(other.stderr()).toContain("already running");
      expect((await readFile(join(f.data, "engine.lock"), "utf8")).trim()).toBe(String(process.pid));
    } finally { await stopChild(other.child); await running.close(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("cleans up the lock and workers after a failed bind, then permits restart", async () => {
    const f = await fixture();
    const original = f.config.ipc_path;
    f.config.ipc_path = platform() === "win32" ? "C:\\missing-othie-parent\\invalid.sock" : join(f.data, "missing-parent", "invalid.sock");
    await writeFile(f.configPath, JSON.stringify(f.config));
    const failed = startCli(f.configPath);
    try {
      await waitFor(() => failed.child.exitCode !== null, 5_000);
      expect(failed.child.exitCode).toBe(1);
      await expect(readFile(join(f.data, "engine.lock"))).rejects.toMatchObject({ code: "ENOENT" });
      f.config.ipc_path = original!;
      const running = await runEngine(f.config); await running.close();
    } finally { await stopChild(failed.child); await rm(f.root, { recursive: true, force: true }); }
  });

  it("recovers a lock left by a terminated engine", async () => {
    const f = await fixture(); const crashed = startCli(f.configPath);
    try {
      await waitFor(() => crashed.stderr().includes("engine listening"), 5_000);
      await stopChild(crashed.child);
      const running = await runEngine(f.config);
      await running.close();
      await expect(readFile(join(f.data, "engine.lock"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await stopChild(crashed.child); await rm(f.root, { recursive: true, force: true }); }
  });

  it("names Windows pipes per data directory and keeps Unix socket paths short", () => {
    const longPath = join(process.cwd(), "very-long-state-directory".repeat(15));
    const pipe = defaultIpcPath(longPath, "win32");
    expect(pipe.startsWith("\\\\.\\pipe\\othie-")).toBe(true);
    expect(pipe).not.toBe(defaultIpcPath(`${longPath}-another`, "win32"));
    expect(Buffer.byteLength(defaultIpcPath(longPath, "darwin"))).toBeLessThan(104);
  });
});
