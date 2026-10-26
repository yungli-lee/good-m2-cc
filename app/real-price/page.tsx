import type { Metadata } from "next";
import { RealPriceSearch } from "@/components/real-price/real-price-search";
export const runtime = "edge";
export const metadata: Metadata = {
  title: "全國實價登錄查詢｜勇美房屋",
  description: "查詢全國買賣、預售屋及租賃實價登錄，依縣市、行政區、標的、道路、地段、價格、坪數和屋齡篩選。",
  robots: { index: false, follow: false }
};
export default function RealPricePage() { return <RealPriceSearch />; }
