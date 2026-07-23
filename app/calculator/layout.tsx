import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicCompanySettings } from "@/lib/company-settings";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function CalculatorLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicCompanySettings();
  return (
    <>
      <SiteHeader settings={settings} />
      {children}
      <SiteFooter settings={settings} />
    </>
  );
}
