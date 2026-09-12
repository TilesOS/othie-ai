import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { getSiteOrigin, siteConfig } from "@/lib/site";
import "./globals.css";
import "./extended.css";
import "./pages.css";

export const metadata: Metadata = {
  metadataBase: getSiteOrigin(),
  title: { default: siteConfig.title, template: `%s — ${siteConfig.companyName}` },
  description: siteConfig.description,
  applicationName: siteConfig.companyName,
  category: "technology",
  openGraph: {
    type: "website",
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.companyName,
    images: [{ url: "/og.png", width: 1733, height: 907, alt: "Your AI, familiar with your work." }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#000000" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
