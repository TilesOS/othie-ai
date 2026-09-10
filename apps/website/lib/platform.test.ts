import { describe, expect, it } from "vitest";
import { architectureFromHint, detectDevice, recommendPlatform } from "./platform";

describe("platform detection", () => {
  it.each([
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0, "macos"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 0, "windows"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone", 5, "ios"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5, "ipados"],
    ["Mozilla/5.0 (Linux; Android 15)", "Linux armv8l", 5, "android"],
    ["Mozilla/5.0 (X11; CrOS x86_64 16000.0.0)", "Linux x86_64", 0, "chromeos"],
    ["Mozilla/5.0 (X11; Linux x86_64)", "Linux x86_64", 0, "linux"],
    ["unusual-agent", "", 0, "unknown"],
  ])("classifies %s", (ua, platform, points, expected) => {
    expect(detectDevice(ua as string, platform as string, points as number)).toBe(expected);
  });

  it("never infers Mac architecture from the ordinary user agent", () => {
    expect(recommendPlatform({ device: "macos", architecture: "unknown", source: "user-agent" })).toBeNull();
  });

  it("recommends only exact OS and architecture matches", () => {
    expect(recommendPlatform({ device: "macos", architecture: architectureFromHint("arm64"), source: "high-entropy" })).toBe("macos-apple-silicon");
    expect(recommendPlatform({ device: "windows", architecture: architectureFromHint("x86"), source: "high-entropy" })).toBe("windows-x64");
  });
});
