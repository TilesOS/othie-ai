import { realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, platform, tmpdir } from "node:os";
import { join, resolve } from "node:path";

export function defaultDataDir(): string {
  if (platform() === "win32") return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Othie");
  return join(homedir(), "Library", "Application Support", "Othie");
}

export function defaultIpcPath(dataDir: string, os: NodeJS.Platform = platform()): string {
  let canonical = resolve(dataDir);
  try { canonical = realpathSync.native(canonical); } catch {}
  const identity = createHash("sha256").update(`${homedir()}:${canonical}`).digest("hex").slice(0, 24);
  if (os === "win32") return `\\\\.\\pipe\\othie-${identity}`;
  // Unix sockets have short path limits, independent of the state directory's length.
  return join(tmpdir(), `othie-${identity}.sock`);
}
