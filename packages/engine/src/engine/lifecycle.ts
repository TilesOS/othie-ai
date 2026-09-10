import { join } from "node:path";
import { mkdir, realpath } from "node:fs/promises";
import type { OthieConfig } from "../config.js";
import { defaultDataDir, defaultIpcPath } from "../paths.js";
import { serveEngine } from "./ipc.js";
import { OthieEngine } from "./service.js";
import { EngineLock } from "./lock.js";

export async function runEngine(config: OthieConfig): Promise<{ engine: OthieEngine; ipcPath: string; close: () => Promise<void> }> {
  const configuredDir = config.data_dir ?? defaultDataDir();
  await mkdir(configuredDir, { recursive: true, mode: 0o700 });
  const dataDir = await realpath(configuredDir);
  const lock = new EngineLock(dataDir);
  await lock.acquire();
  let engine: OthieEngine | undefined;
  let server: Awaited<ReturnType<typeof serveEngine>> | undefined;
  try {
    engine = new OthieEngine(config, dataDir);
    await engine.start();
    server = await serveEngine(engine, config.credentials_file ?? join(dataDir, "credentials.json"), config.ipc_path ?? defaultIpcPath(dataDir));
  } catch (error) {
    try { await server?.close(); await engine?.stop(); } finally { lock.release(); }
    throw error;
  }
  const runningEngine = engine, runningServer = server;
  let closed = false;
  return {
    engine: runningEngine,
    ipcPath: runningServer.path,
    close: async () => {
      if (closed) return;
      closed = true;
      try { await runningServer.close(); await runningEngine.stop(); } finally { lock.release(); }
    },
  };
}
