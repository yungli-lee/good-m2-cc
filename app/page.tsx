import type { Metadata } from "next";
import { HomeCmsClient } from "@/components/home-cms-client";
import { getPublicCompanySettings } from "@/lib/company-settings";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanySettings();
  return {
    title: company.brand_name,
    applicationName: company.brand_name,
    description: "買屋、賣屋、貸款、稅務、簽約到交屋，每一步都清楚說明。",
    openGraph: {
      title: company.brand_name,
      siteName: company.brand_name,
      description: "買屋、賣屋、貸款、稅務、簽約到交屋，每一步都清楚說明。"
    }
  };
}

export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/legacy-static/styles.css" />
      <HomeCmsClient />
    </>
  );
}
