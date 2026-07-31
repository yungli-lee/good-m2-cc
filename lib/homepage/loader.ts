import { getPublicCompanySettings } from "@/lib/company-settings";
import { listActiveHomeCampaigns, listPublishedSitePages } from "@/lib/home-cms/queries";
import { getAllPublicNavigationItems } from "@/lib/navigation";
import { buildHomepageViewModel } from "./view-model";
export async function loadHomepageViewModel(){const [company,campaigns,pages,navigation]=await Promise.all([getPublicCompanySettings(),listActiveHomeCampaigns(),listPublishedSitePages(),getAllPublicNavigationItems()]);return buildHomepageViewModel({company,campaigns,pages,navigation});}
