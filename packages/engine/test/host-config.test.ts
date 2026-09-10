import { join, isAbsolute } from "node:path";
import { describe, expect, it } from "vitest";
import { hostConfiguration } from "../src/mcp/host-config.js";

describe("host configuration", () => {
  for (const host of ["claude", "cursor", "vscode"] as const) it(`generates ${host} configuration without shell interpolation`, () => {
    const config = hostConfiguration(host, { configPath: "my workspace/config.json", bridgeId: host, credentialFile: "private/bridge.credential", bridgePath: "my workspace/dist/src/mcp/bridge.js" });
    const roundTrip = JSON.parse(JSON.stringify(config));
    const server = host === "vscode" ? roundTrip.servers.othie : roundTrip.mcpServers.othie;
    expect(server.command).toBe(process.execPath);
    expect(server.args).toEqual([join(process.cwd(), "my workspace/dist/src/mcp/bridge.js")]);
    expect(isAbsolute(server.env.OTHIE_CONFIG)).toBe(true);
    expect(server.env.OTHIE_BRIDGE_CREDENTIAL_FILE).toContain("bridge.credential");
    expect(server.env.OTHIE_BRIDGE_CREDENTIAL).toBeUndefined();
    if (host === "vscode") expect(server.type).toBe("stdio");
  });
});
