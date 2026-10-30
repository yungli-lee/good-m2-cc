import type { Metadata } from "next";
import { RealPriceSearch } from "@/components/real-price/real-price-search";
export const runtime = "edge";
export const metadata: Metadata = {
  title: "彰化縣實價登錄查詢｜勇美房屋",
  description: "查詢彰化縣買賣及預售屋實價登錄，依鄉鎮市區、標的、道路、地段、價格、坪數和屋齡篩選。",
  robots: { index: false, follow: false }
};
export default function RealPricePage() { return <RealPriceSearch />; }
