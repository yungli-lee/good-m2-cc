import { HomeHashScroll } from "@/components/layout/home-hash-scroll";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import "./globals.css";
import "./collection.css";
import type { Metadata } from "next";
import { siteOrigin } from "@/lib/home-cms/routing";

export const metadata: Metadata = { metadataBase: new URL(siteOrigin()), twitter: { card: "summary_large_image" } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <HomeHashScroll />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
