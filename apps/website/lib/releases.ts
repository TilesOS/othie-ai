export type ReleasePlatform = "macos-apple-silicon" | "windows-x64";
export type ReleaseStatus = "available" | "unavailable" | "withdrawn";

export type ReleaseRecord = {
  platform: ReleasePlatform;
  label: string;
  os: "macOS" | "Windows";
  architecture: "Apple Silicon" | "x64";
  status: ReleaseStatus;
  unavailableReason?: string;
  version?: string;
  releasedAt?: string;
  minimumOs?: string;
  artifactUrl?: string;
  byteSize?: number;
  sha256?: string;
  releaseNotesUrl?: string;
  signed?: boolean;
  notarized?: boolean;
};

export const releaseManifest: ReadonlyArray<ReleaseRecord> = [
  {
    platform: "macos-apple-silicon",
    label: "Othie for macOS",
    os: "macOS",
    architecture: "Apple Silicon",
    status: "unavailable",
    unavailableReason: "The signed and notarized macOS installer has not been published.",
  },
  {
    platform: "windows-x64",
    label: "Othie for Windows",
    os: "Windows",
    architecture: "x64",
    status: "unavailable",
    unavailableReason: "The signed Windows x64 installer has not been published.",
  },
];

const sha256Pattern = /^[a-f0-9]{64}$/i;

export function validateRelease(record: ReleaseRecord): { valid: boolean; errors: string[] } {
  if (record.status !== "available") return { valid: true, errors: [] };
  const errors: string[] = [];
  if (!record.version) errors.push("version");
  if (!record.releasedAt || Number.isNaN(Date.parse(record.releasedAt))) errors.push("release date");
  if (!record.minimumOs) errors.push("minimum OS");
  if (!record.artifactUrl || !/^https:\/\//.test(record.artifactUrl)) errors.push("HTTPS artifact URL");
  if (!record.byteSize || record.byteSize <= 0) errors.push("byte size");
  if (!record.sha256 || !sha256Pattern.test(record.sha256)) errors.push("SHA-256");
  if (!record.releaseNotesUrl || !/^https:\/\//.test(record.releaseNotesUrl)) errors.push("release notes URL");
  if (record.signed !== true) errors.push("verified signing status");
  if (record.os === "macOS" && record.notarized !== true) errors.push("verified notarization status");
  return { valid: errors.length === 0, errors };
}

export function getDownloadableRelease(record: ReleaseRecord): ReleaseRecord | null {
  return record.status === "available" && validateRelease(record).valid ? record : null;
}
