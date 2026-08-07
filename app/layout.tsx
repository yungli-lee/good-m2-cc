import { HomeHashScroll } from "@/components/layout/home-hash-scroll";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import "./globals.css";

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
