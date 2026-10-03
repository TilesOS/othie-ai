import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { authorizeCredential, createCredential, credentialHash, listCredentials, loadCredentials, revokeCredential, type CredentialsFile } from "../src/engine/credentials.js";
import { requestEngine } from "../src/engine/ipc.js";
import { runEngine } from "../src/engine/lifecycle.js";
import { fixture } from "./helpers.js";

const execute = promisify(execFile), cleanups: string[] = [];
afterEach(async () => { for (const path of cleanups.splice(0)) await rm(path, { recursive: true, force: true }); });
async function setup() { const f = await fixture(); cleanups.push(f.root); return { ...f, storePath: f.config.credentials_file! }; }

describe("credential administration", () => {
  it("rotates one bridge, preserves others, and lists grants without verifiers", async () => {
    const f = await setup();
    const first = await createCredential(f.storePath, "codex", ["company"], "company");
    const second = await createCredential(f.storePath, "claude-code", ["company"], "company");
    const rotated = await createCredential(f.storePath, "codex", ["company"], "company");
    const grants = await loadCredentials(f.storePath);
    expect(authorizeCredential(grants, "codex", first)).toBeUndefined();
    expect(authorizeCredential(grants, "codex", rotated)?.profiles).toEqual(["company"]);
    expect(authorizeCredential(grants, "claude-code", second)?.profiles).toEqual(["company"]);
    const summary = await listCredentials(f.storePath);
    expect(summary).toEqual([
      { bridge: "claude-code", profiles: ["company"], default_profile: "company", admin: false },
      { bridge: "codex", profiles: ["company"], default_profile: "company", admin: false },
    ]);
    expect(JSON.stringify(summary)).not.toContain(credentialHash(rotated));
    expect(JSON.stringify(summary)).not.toContain(rotated);
    if (process.platform !== "win32") expect((await stat(f.storePath)).mode & 0o777).toBe(0o600);
    expect(await readdir(f.data)).toEqual(["credentials.json"]);
  });

  it("preserves corrupt grant stores and reports no raw content", async () => {
    const f = await setup(), original = "PRIVATE_CREDENTIAL_MATERIAL invalid json";
    await writeFile(f.storePath, original);
    await expect(createCredential(f.storePath, "codex", ["company"])).rejects.toThrow("Credential store is invalid");
    await expect(revokeCredential(f.storePath, "codex")).rejects.toThrow("Credential store is invalid");
    expect(await readFile(f.storePath, "utf8")).toBe(original);
    expect(await readdir(f.data)).toEqual(["credentials.json"]);
    await writeFile(f.storePath, JSON.stringify({ version: 1, bridges: { codex: { credential_sha256: "PRIVATE_SECRET" } } }));
    await expect(listCredentials(f.storePath)).rejects.toThrow("Credential store is invalid");
  });

  it("fails closed on another writer's lock without modifying grants", async () => {
    const f = await setup();
    await createCredential(f.storePath, "codex", ["company"]);
    const original = await readFile(f.storePath, "utf8");
    await mkdir(`${f.storePath}.update-lock`);
    await expect(createCredential(f.storePath, "claude-code", ["company"])).rejects.toThrow("Another credential update");
    await expect(revokeCredential(f.storePath, "codex")).rejects.toThrow("Another credential update");
    expect(await readFile(f.storePath, "utf8")).toBe(original);
    await rm(`${f.storePath}.update-lock`, { recursive: true });
    await createCredential(f.storePath, "claude-code", ["company"]);
    expect(await listCredentials(f.storePath)).toHaveLength(2);
  });

  it("rejects inherited grants and invalid default-profile assignments", async () => {
    const inherited = Object.create({ fake: { credential_sha256: credentialHash("secret"), profiles: ["company"], admin: true } });
    expect(authorizeCredential({ version: 1, bridges: inherited } as CredentialsFile, "fake", "secret")).toBeUndefined();
    const f = await setup();
    await expect(createCredential(f.storePath, "codex", ["company"], "other")).rejects.toThrow("Default profile must be authorized");
    expect(await listCredentials(f.storePath)).toEqual([]);
  });

  it("revokes a grant through the compiled CLI while the engine remains live", async () => {
    const f = await setup();
    const codex = await createCredential(f.storePath, "codex", ["company"], "company");
    const claude = await createCredential(f.storePath, "claude-code", ["company"], "company");
    const running = await runEngine(f.config);
    const status = (bridgeId: string, credential: string) => requestEngine(running.ipcPath, { bridgeId, credential, method: "status" });
    const cli = resolve("dist/src/cli.js");
    try {
      await expect(status("codex", codex)).resolves.toBeDefined();
      const listed = await execute(process.execPath, [cli, "credential", "list", "--config", f.configPath]);
      expect(JSON.parse(listed.stdout)).toHaveLength(2);
      expect(listed.stdout).not.toContain(credentialHash(codex));
      const revoked = await execute(process.execPath, [cli, "credential", "revoke", "--config", f.configPath, "--bridge", "codex"]);
      expect(revoked.stdout).toBe("Bridge credential revoked\n");
      await expect(status("codex", codex)).rejects.toThrow("Unauthorized bridge credential");
      await expect(status("claude-code", claude)).resolves.toBeDefined();
      expect(await revokeCredential(f.storePath, "codex")).toBe(false);
      expect(await listCredentials(f.storePath)).toHaveLength(1);
    } finally { await running.close(); }
  });
});
