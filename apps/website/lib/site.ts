export const siteConfig = {
  companyName: "Othie AI",
  productName: "Othie",
  title: "Othie — Local context for the AI tools you use",
  description:
    "Othie brings selected documents, preferences, and working rules into compatible AI tools with local processing and control over what you share.",
  repository: "https://github.com/TilesOS/othie-ai",
  releaseStage: "Desktop preview in development",
  availability: "Installers are not published yet",
  nav: [
    { label: "Product", href: "/#product" },
    { label: "Pricing", href: "/pricing" },
    { label: "Download", href: "/download" },
  ],
} as const;

export function getSiteOrigin(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // A malformed deployment value must not leak into metadata.
    }
  }
  return new URL("http://localhost:3000");
}
