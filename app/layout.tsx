import type { Metadata } from "next";
import { HomeHashScroll } from "@/components/layout/home-hash-scroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "阿勇不動產顧問",
  description: "買屋、賣屋、貸款、稅務、簽約到交屋，每一步都清楚說明。"
};

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
