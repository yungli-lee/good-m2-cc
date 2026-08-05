import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/home/markdown-content";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { getPublishedSitePageBySlug } from "@/lib/home-cms/queries";
import { isReservedSitePageSlug, siteOrigin } from "@/lib/home-cms/routing";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function pageImage(page: Awaited<ReturnType<typeof getPublishedSitePageBySlug>>["data"]) {
  return page?.media_public_url || page?.fallback_cover_url || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (isReservedSitePageSlug(slug)) return { robots: { index: false, follow: false } };

  const [{ data: page }, company] = await Promise.all([
    getPublishedSitePageBySlug(slug),
    getPublicCompanySettings()
  ]);
  if (!page) {
    return {
      title: `頁面不存在｜${company.brand_name}`,
      robots: { index: false, follow: false }
    };
  }

  const title = page.seo_title?.trim() || `${page.title}｜${company.brand_name}`;
  const description = page.seo_description?.trim() || page.subtitle?.trim() || page.title;
  const image = pageImage(page);
  const canonical = `${siteOrigin()}/${page.page_key}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      siteName: company.brand_name,
      description,
      url: canonical,
      images: image ? [image] : undefined,
      publishedTime: page.published_at || undefined,
      modifiedTime: page.updated_at
    },
    robots: { index: true, follow: true }
  };
}

export default async function PublicSitePage({ params }: Props) {
  const { slug } = await params;
  if (isReservedSitePageSlug(slug)) notFound();

  const { data: page, error } = await getPublishedSitePageBySlug(slug);
  if (error || !page) notFound();

  const image = pageImage(page);

  return (
    <main>
      <article className="section">
        <div className="container cms-public-page">
          <header className="cms-public-page-header">
            {page.eyebrow ? <p className="eyebrow">{page.eyebrow}</p> : null}
            <h1>{page.title}</h1>
            {page.subtitle ? <p>{page.subtitle}</p> : null}
            {image ? <img src={image} alt={page.media_assets?.alt_text || page.title} /> : null}
          </header>
          <MarkdownContent value={page.markdown_content} />
        </div>
      </article>
    </main>
  );
}
