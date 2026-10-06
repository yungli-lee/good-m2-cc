import { revalidatePath } from "next/cache";
import { isReservedSitePageSlug, publicSitePagePath } from "@/lib/home-cms/routing";

export function revalidateSitePageContent(...slugs: Array<string | null | undefined>) {
  revalidatePath("/");
  revalidatePath("/contact");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs.filter(Boolean) as string[])) {
    if (!isReservedSitePageSlug(slug)) revalidatePath(publicSitePagePath(slug));
  }
}
