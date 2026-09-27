import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/home/markdown-content";
import { ContentRetention } from "@/components/content/content-retention";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { listKnowledgeRecommendations } from "@/lib/content/queries";
import { getPublishedReminderBySlug, listRelatedPublishedReminderPages } from "@/lib/home-cms/queries";
import { siteOrigin } from "@/lib/home-cms/routing";
import { listRetentionPublishedProperties } from "@/lib/properties/queries";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function pageImage(page: Awaited<ReturnType<typeof getPublishedReminderBySlug>>["data"]) {
  return page?.media_public_url || page?.fallback_cover_url || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ data: page }, company] = await Promise.all([
    getPublishedReminderBySlug(slug),
    getPublicCompanySettings()
  ]);

  if (!page) {
    return {
      title: `提醒內容不存在｜${company.brand_name}`,
      robots: { index: false, follow: false }
    };
  }

  const title = page.seo_title?.trim() || `${page.title}｜阿勇生活小提醒｜${company.brand_name}`;
  const description = page.seo_description?.trim() || page.subtitle?.trim() || page.title;
  const image = pageImage(page);
  const canonical = `${siteOrigin()}/reminders/${page.page_key}`;

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

export default async function ReminderDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data: page, error } = await getPublishedReminderBySlug(slug);
  if (error || !page) notFound();

  const image = pageImage(page);
  const [reminders, knowledge, properties] = await Promise.all([
    listRelatedPublishedReminderPages(page.page_key, 3),
    listKnowledgeRecommendations(3),
    listRetentionPublishedProperties(3)
  ]);

  return (
    <main>
      <article className="section">
        <div className="container cms-public-page">
          <Link className="button ghost" href="/#reminders">返回阿勇生活小提醒</Link>
          <header className="cms-public-page-header reminder-detail-header">
            {page.eyebrow ? <p className="eyebrow">{page.eyebrow}</p> : null}
            <h1>{page.title}</h1>
            {page.subtitle ? <p>{page.subtitle}</p> : null}
            {image ? <img src={image} alt={page.media_assets?.alt_text || page.title} /> : null}
          </header>
          <MarkdownContent value={page.markdown_content} />
        </div>
      </article>

      <ContentRetention
        knowledge={knowledge}
        reminders={reminders}
        properties={properties}
        knowledgeTitle="延伸閱讀"
        reminderTitle="更多阿勇生活小提醒"
        propertyTitle="順便看看目前精選物件"
      />
    </main>
  );
}
