import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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

type StorySection = { heading: string; body: string };
function splitAyongStory(markdown: string) {
  const sections: StorySection[] = [];
  const intro: string[] = [];
  let current: StorySection | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      current = { heading: match[1], body: "" };
      sections.push(current);
    } else if (current) {
      current.body += line + "\n";
    } else {
      intro.push(line);
    }
  }
  return { intro: intro.join("\n").replace(/^#\s+[^\n]+\n/, "").trim(), sections };
}

export default async function PublicSitePage({ params }: Props) {
  const { slug } = await params;
  if (isReservedSitePageSlug(slug)) notFound();

  const { data: page, error } = await getPublishedSitePageBySlug(slug);
  if (error || !page) notFound();
  if (page.page_type === "reminder") redirect(`/reminders/${page.page_key}`);

  const image = pageImage(page);

  return (
    <main>
      <article className="section">
        <div className={`container cms-public-page${slug === "about-ayong" ? " cms-about-ayong" : ""}`}>
          <header className="cms-public-page-header">
            {page.eyebrow ? <p className="eyebrow">{page.eyebrow}</p> : null}
            <h1>{page.title}</h1>
            {page.subtitle ? <p>{page.subtitle}</p> : null}
            {image ? <img src={image} alt={page.media_assets?.alt_text || page.title} /> : null}
          </header>
          {slug === "about-ayong" && page.markdown_content ? (() => {
            const story = splitAyongStory(page.markdown_content);
            if (story.sections.length < 5) return <MarkdownContent value={page.markdown_content} />;
            const chapters = story.sections.slice(0, 5);
            const extras = story.sections.slice(5);
            return (
              <div className="ayong-story-layout">
                {story.intro ? <div className="ayong-story-intro"><MarkdownContent value={story.intro} /></div> : null}
                <div className="ayong-story-columns">
                  <div className="ayong-story-timeline" aria-label="人生經歷">
                    {chapters.map((section, index) => (
                      <section className={`ayong-story-chapter ayong-story-chapter-${index + 1}`} key={index}>
                        <h2>{section.heading}</h2>
                        <MarkdownContent value={section.body} />
                      </section>
                    ))}
                  </div>
                  {extras.length ? <aside className="ayong-story-sidebar">
                    {extras.map((section, index) => (
                      <section className="ayong-story-extra" key={index}>
                        <h2>{section.heading}</h2>
                        <MarkdownContent value={section.body} />
                      </section>
                    ))}
                  </aside> : null}
                </div>
              </div>
            );
          })() : <MarkdownContent value={page.markdown_content} />}
        </div>
      </article>
    </main>
  );
}
