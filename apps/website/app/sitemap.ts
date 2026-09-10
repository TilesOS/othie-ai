import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  return ["/", "/pricing", "/download", "/privacy", "/docs/setup"].map((path) => ({
    url: new URL(path, origin).toString(),
    lastModified: new Date("2026-09-10"),
    changeFrequency: path === "/download" ? "weekly" as const : "monthly" as const,
    priority: path === "/" ? 1 : path === "/download" ? 0.9 : 0.7,
  }));
}
