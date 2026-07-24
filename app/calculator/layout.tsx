import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { getAllPublicNavigationItems } from "@/lib/navigation";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function CalculatorLayout({ children }: { children: React.ReactNode }) {
  const [settings, navigation] = await Promise.all([getPublicCompanySettings(), getAllPublicNavigationItems()]);
  return (
    <>
      <SiteHeader settings={settings} navigation={navigation} />
      {children}
      <SiteFooter settings={settings} navigation={navigation} />
    </>
  );
}
