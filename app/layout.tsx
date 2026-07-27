import { HomeHashScroll } from "@/components/layout/home-hash-scroll";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <HomeHashScroll />
      </body>
    </html>
  );
}
