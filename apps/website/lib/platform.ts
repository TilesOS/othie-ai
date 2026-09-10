import type { ReleasePlatform } from "./releases";

export type DeviceFamily = "macos" | "windows" | "ios" | "ipados" | "android" | "linux" | "chromeos" | "unknown";
export type CpuArchitecture = "apple-silicon" | "x64" | "unknown";
export type Detection = { device: DeviceFamily; architecture: CpuArchitecture; source: "user-agent" | "high-entropy" | "unknown" };

export function detectDevice(userAgent: string, platform = "", maxTouchPoints = 0): DeviceFamily {
  const ua = userAgent.toLowerCase();
  const reportedPlatform = platform.toLowerCase();
  if (/iphone|ipod/.test(ua)) return "ios";
  if (/ipad/.test(ua) || (reportedPlatform === "macintel" && maxTouchPoints > 1)) return "ipados";
  if (/android/.test(ua)) return "android";
  if (/cros/.test(ua)) return "chromeos";
  if (/windows|win32|win64/.test(ua) || reportedPlatform.startsWith("win")) return "windows";
  if (/macintosh|mac os x/.test(ua) || reportedPlatform.startsWith("mac")) return "macos";
  if (/linux/.test(ua) || reportedPlatform.includes("linux")) return "linux";
  return "unknown";
}

export function architectureFromHint(hint?: string): CpuArchitecture {
  const value = hint?.toLowerCase();
  if (!value) return "unknown";
  if (["arm", "arm64", "aarch64"].includes(value)) return "apple-silicon";
  if (["x86", "x86_64", "amd64", "x64"].includes(value)) return "x64";
  return "unknown";
}

export function recommendPlatform(detection: Detection): ReleasePlatform | null {
  if (detection.device === "macos" && detection.architecture === "apple-silicon") return "macos-apple-silicon";
  if (detection.device === "windows" && detection.architecture === "x64") return "windows-x64";
  return null;
}

export function deviceLabel(device: DeviceFamily): string {
  return {
    macos: "macOS device",
    windows: "Windows device",
    ios: "iPhone",
    ipados: "iPad",
    android: "Android device",
    linux: "Linux device",
    chromeos: "ChromeOS device",
    unknown: "device",
  }[device];
}
