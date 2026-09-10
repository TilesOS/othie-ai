import { describe, expect, it } from "vitest";
import { getDownloadableRelease, validateRelease, type ReleaseRecord } from "./releases";

const complete: ReleaseRecord = {
  platform: "macos-apple-silicon",
  label: "Othie for macOS",
  os: "macOS",
  architecture: "Apple Silicon",
  status: "available",
  version: "1.0.0",
  releasedAt: "2026-09-10",
  minimumOs: "macOS 15",
  artifactUrl: "https://downloads.example.test/othie.dmg",
  byteSize: 1024,
  sha256: "a".repeat(64),
  releaseNotesUrl: "https://example.test/releases/1.0.0",
  signed: true,
  notarized: true,
};

describe("release manifest validation", () => {
  it("accepts a complete available release", () => expect(validateRelease(complete).valid).toBe(true));
  it("fails closed when an available release is incomplete", () => {
    const incomplete = { ...complete, sha256: undefined };
    expect(validateRelease(incomplete).valid).toBe(false);
    expect(getDownloadableRelease(incomplete)).toBeNull();
  });
  it.each(["unavailable", "withdrawn"] as const)("never exposes a %s artifact", (status) => {
    expect(getDownloadableRelease({ ...complete, status })).toBeNull();
  });
});
