import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile, rename, rmdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

const credentialsSchema = z.object({ version: z.literal(1), bridges: z.record(z.string(), z.object({ credential_sha256: z.string().regex(/^[a-f0-9]{64}$/), profiles: z.array(z.string()).min(1), default_profile: z.string().optional(), admin: z.boolean().default(false) })) });
export type CredentialsFile = z.infer<typeof credentialsSchema>;
export interface CredentialSummary { bridge: string; profiles: string[]; default_profile?: string; admin: boolean }

export function credentialHash(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export async function loadCredentials(path: string): Promise<CredentialsFile> {
  const raw = await readFile(path, "utf8");
  try { return credentialsSchema.parse(JSON.parse(raw) as unknown); }
  catch { throw new Error("Credential store is invalid"); }
}

export function authorizeCredential(credentials: CredentialsFile, bridgeId: string, secret: string): { profiles: string[]; defaultProfile?: string; admin: boolean } | undefined {
  if (!Object.hasOwn(credentials.bridges, bridgeId)) return undefined;
  const bridge = credentials.bridges[bridgeId]!;
  const expected = Buffer.from(bridge.credential_sha256, "hex"), actual = Buffer.from(credentialHash(secret), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined;
  return { profiles: bridge.profiles, admin: bridge.admin, ...(bridge.default_profile ? { defaultProfile: bridge.default_profile } : {}) };
}

async function existingOrEmpty(path: string): Promise<CredentialsFile> {
  try { return await loadCredentials(path); }
  catch (error) {
    // Corrupt or unreadable stores must never be replaced with an empty grant set.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { version: 1, bridges: {} };
  }
}

async function updateCredentials<T>(path: string, change: (current: CredentialsFile) => { result: T; changed: boolean }): Promise<T> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const lockPath = `${path}.update-lock`;
  try { await mkdir(lockPath, { mode: 0o700 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Another credential update is in progress; retry after it completes. If it crashed, inspect the credential update-lock directory.");
    throw error;
  }
  const temporaryPath = `${path}.${randomBytes(12).toString("hex")}.tmp`;
  try {
    const current = await existingOrEmpty(path);
    const { result, changed } = change(current);
    if (changed) {
      const validated = credentialsSchema.parse(current);
      const file = await open(temporaryPath, "wx", 0o600);
      try { await file.writeFile(`${JSON.stringify(validated, null, 2)}\n`); await file.sync(); }
      finally { await file.close(); }
      // Readers see the old complete store or the new complete store.
      await rename(temporaryPath, path);
    }
    return result;
  } finally {
    try { await unlink(temporaryPath).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; }); }
    finally { await rmdir(lockPath); }
  }
}

export async function createCredential(path: string, bridgeId: string, profiles: string[], defaultProfile?: string, admin = false): Promise<string> {
  if (!bridgeId.trim() || !profiles.length || profiles.some((profile) => !profile.trim())) throw new Error("A bridge ID and non-empty profiles are required");
  if (defaultProfile !== undefined && !profiles.includes(defaultProfile)) throw new Error("Default profile must be authorized");
  const token = randomBytes(32).toString("base64url");
  return updateCredentials(path, (current) => {
    current.bridges = { ...current.bridges, [bridgeId]: { credential_sha256: credentialHash(token), profiles: [...new Set(profiles)], admin, ...(defaultProfile ? { default_profile: defaultProfile } : {}) } };
    return { result: token, changed: true };
  });
}

export async function listCredentials(path: string): Promise<CredentialSummary[]> {
  const current = await existingOrEmpty(path);
  return Object.entries(current.bridges).sort(([a], [b]) => a.localeCompare(b)).map(([bridge, grant]) => ({
    bridge, profiles: [...grant.profiles], admin: grant.admin, ...(grant.default_profile ? { default_profile: grant.default_profile } : {}),
  }));
}

export async function revokeCredential(path: string, bridgeId: string): Promise<boolean> {
  if (!bridgeId.trim()) throw new Error("A bridge ID is required");
  return updateCredentials(path, (current) => {
    const existed = Object.hasOwn(current.bridges, bridgeId);
    if (existed) delete current.bridges[bridgeId];
    return { result: existed, changed: existed };
  });
}
