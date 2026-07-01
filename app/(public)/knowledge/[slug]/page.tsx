import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicKnowledgeBySlug } from "@/lib/content/queries";
import type { ContentItem } from "@/lib/content/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

const siteOrigin = "https://good.m2.cc";

function textExcerpt(value?: string | null, maxLength = 150) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" }).format(date);
}

function canonicalFor(item: Pick<ContentItem, "slug" | "canonical_url">) {
  if (item.canonical_url?.startsWith("https://")) return item.canonical_url;
  return `${siteOrigin}/knowledge/${item.slug}`;
}

function knowledgeDescription(item: ContentItem) {
  return item.meta_description?.trim() || textExcerpt(item.summary || item.body, 150) || "不動產知識整理，協助您理解買賣、貸款、稅務與法規重點。";
}

function renderPlainBody(body?: string | null) {
  const blocks = String(body || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return <p className="muted">內容整理中。</p>;

  return blocks.map((block, index) => {
    if (/^#{2,3}\s+/.test(block)) {
      return <h2 key={index}>{block.replace(/^#{2,3}\s+/, "")}</h2>;
    }
    return <p key={index}>{block}</p>;
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getPublicKnowledgeBySlug(slug);
  const item = data as ContentItem | null;
  if (!item) return { title: "知識內容不存在｜阿勇不動產顧問" };

  const title = item.seo_title?.trim() || `${item.title}｜不動產知識庫｜阿勇不動產顧問`;
  const description = knowledgeDescription(item);
  const canonical = canonicalFor(item);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: item.og_image_url || item.cover_image_url ? [item.og_image_url || item.cover_image_url || ""] : undefined,
      type: "article"
    },
    alternates: { canonical }
  };
}

export default async function KnowledgeDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data, error } = await getPublicKnowledgeBySlug(slug);
  if (error || !data) notFound();

  const item = data as ContentItem;
  const category = item.content_categories?.name || "不動產知識";
  const publishedDate = formatDate(item.published_at);
  const reviewedDate = formatDate(item.last_reviewed_at);

  return (
    <main>
      <article className="section">
        <div className="container knowledge-detail">
          <Link className="button ghost" href="/knowledge">返回知識庫</Link>
          <header className="knowledge-detail-header">
            <p className="knowledge-meta">{category}{publishedDate ? ` · ${publishedDate}` : ""}</p>
            <h1>{item.title}</h1>
            {item.summary ? <p className="muted">{item.summary}</p> : null}
            {item.cover_image_url ? <img className="knowledge-hero-image" src={item.cover_image_url} alt={item.title} /> : null}
          </header>
          <div className="knowledge-body">
            {renderPlainBody(item.body)}
          </div>
          {(item.source_name || item.source_url || reviewedDate) ? (
            <aside className="knowledge-source">
              <h2>資料來源與複查</h2>
              {item.source_name ? <p>來源：{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_name}</a> : item.source_name}</p> : null}
              {reviewedDate ? <p>最後複查：{reviewedDate}</p> : null}
              {item.legal_status === "current" ? <p>法規狀態：現行有效</p> : null}
            </aside>
          ) : null}
          <div className="notice">
            內容僅供參考，實際仍以主管機關、稅務機關、銀行、地政士或律師確認為準。
          </div>
        </div>
      </article>
    </main>
  );
}
