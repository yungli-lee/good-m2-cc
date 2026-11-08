import { requireRole } from "@/lib/auth";
import RealPriceReportBuilder from "@/components/real-price/real-price-report-builder";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function RealPriceReportsPage() {
  await requireRole(["editor", "admin", "owner"]);
  return <main><RealPriceReportBuilder /></main>;
}
