import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { loadConfig } from "../src/config.js";

const execute = promisify(execFile);

test("compiled CLI initializes usable sample paths outside its workspace and preserves existing config", async () => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "othie-layout-")));
  const cli = resolve("dist/src/cli.js");
  const configPath = join(directory, "config.json");
  try {
    await execute(process.execPath, [cli, "init"], { cwd: directory });
    const config = await loadConfig(configPath);
    expect(config.data_dir).toBe(join(directory, ".othie"));
    for (const source of config.profiles.company!.sources) {
      expect((await stat(source.root)).isDirectory()).toBe(true);
    }
    const original = await readFile(configPath, "utf8");
    await expect(execute(process.execPath, [cli, "init"], { cwd: directory })).rejects.toThrow();
    expect(await readFile(configPath, "utf8")).toBe(original);

    const { stdout } = await execute(process.execPath, [cli, "host-config", "--host", "claude", "--bridge", "claude", "--credential-file", "bridge.credential"], { cwd: directory });
    const host = JSON.parse(stdout).mcpServers.othie;
    expect(await realpath(host.args[0])).toBe(await realpath(resolve("dist/src/mcp/bridge.js")));
    expect(host.env.OTHIE_CONFIG).toBe(configPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
