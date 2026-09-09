import { homedir, platform } from "node:os";
import { join } from "node:path";

export function defaultDataDir(): string {
  if (platform() === "win32") return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "KithAI");
  return join(homedir(), "Library", "Application Support", "KithAI");
}

export function defaultIpcPath(dataDir: string): string {
  if (platform() === "win32") return "\\\\.\\pipe\\kith-ai-context-compiler";
  return join(dataDir, "engine.sock");
}
