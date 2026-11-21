import type { Metadata } from "next";
import RealPriceMapSelection from "@/components/real-price/real-price-map-selection";
export const runtime = "edge";
export const metadata: Metadata={title:"地圖式成交行情｜圈選測試",robots:{index:false,follow:false}};
export default function RealPriceMapPage(){return <RealPriceMapSelection/>;}
