import { resolve } from "node:path";

export type HostName = "claude" | "cursor" | "vscode";

/** Generate configuration only; never overwrite the user's host settings. */
export function hostConfiguration(host: HostName, options: { configPath: string; bridgeId: string; credentialFile: string; bridgePath: string; nodePath?: string }): Record<string, unknown> {
  const server = {
    command: options.nodePath ?? process.execPath,
    args: [resolve(options.bridgePath)],
    env: {
      OTHIE_CONFIG: resolve(options.configPath),
      OTHIE_BRIDGE_ID: options.bridgeId,
      OTHIE_BRIDGE_CREDENTIAL_FILE: resolve(options.credentialFile),
    },
  };
  if (host === "vscode") return { servers: { othie: { type: "stdio", ...server } } };
  return { mcpServers: { othie: server } };
}
