import type { Metadata } from "next";
import { RealPriceSearch } from "@/components/real-price/real-price-search";
export const runtime = "edge";
export const metadata: Metadata = {
  title: "彰化縣實價登錄查詢｜勇美房屋",
  description: "查詢彰化縣買賣及預售屋實價登錄，依鄉鎮市區、標的、道路、地段、價格、坪數和屋齡篩選。",
  robots: { index: false, follow: false }
};
export default function RealPricePage() { return <><p style={{maxWidth:1100,margin:"20px auto 0",padding:"10px 16px",color:"#7c2d12",background:"#fff7ed",border:"1px solid #fdba74",borderRadius:8}}>彰化縣實價登錄試行查詢：目前僅提供已匯入的成交資料，歷史資料仍持續補齊。查無紀錄不代表沒有交易。</p><RealPriceSearch /></>; }
