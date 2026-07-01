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
const lineUrl = "https://line.me/ti/p/abQv5LYzzE";

type ArticleBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string; id: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "callout"; tone: "info" | "tip" | "warning"; title: string; text: string }
  | { type: "divider" };

type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

type TocHeadingBlock = Extract<ArticleBlock, { type: "heading" }> & { level: 2 | 3 };

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

function slugifyHeading(value: string, index: number) {
  const slug = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `section-${index + 1}`;
}

function readingTime(body?: string | null) {
  const text = String(body || "").replace(/\s+/g, "");
  if (!text) return "1 分鐘";
  return `${Math.max(1, Math.ceil(text.length / 500))} 分鐘`;
}

function parseTable(block: string) {
  const rows = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (rows.length < 2 || !rows.every((line) => line.includes("|"))) return null;
  const parsed = rows.map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean));
  if (parsed.some((row) => row.length < 2)) return null;
  return parsed.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function parseArticleBody(body?: string | null) {
  const blocks = String(body || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const parsed: ArticleBlock[] = [];
  const usedIds = new Map<string, number>();

  blocks.forEach((block, index) => {
    if (/^---+$/.test(block)) {
      parsed.push({ type: "divider" });
      return;
    }

    const heading = block.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3;
      const text = heading[2].trim();
      const baseId = slugifyHeading(text, index);
      const count = usedIds.get(baseId) || 0;
      usedIds.set(baseId, count + 1);
      parsed.push({ type: "heading", level, text, id: count ? `${baseId}-${count + 1}` : baseId });
      return;
    }

    const callout = block.match(/^\[!(INFO|TIP|WARNING)\]\s*(.*)\n?([\s\S]*)$/i);
    if (callout) {
      const tone = callout[1].toLowerCase() as "info" | "tip" | "warning";
      parsed.push({
        type: "callout",
        tone,
        title: callout[2].trim() || ({ info: "提醒", tip: "阿勇建議", warning: "注意事項" }[tone]),
        text: callout[3].trim()
      });
      return;
    }

    if (block.startsWith(">")) {
      parsed.push({ type: "quote", text: block.replace(/^>\s?/gm, "").trim() });
      return;
    }

    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line))) {
      parsed.push({ type: "list", ordered: false, items: lines.map((line) => line.replace(/^[-*]\s+/, "")) });
      return;
    }
    if (lines.length > 1 && lines.every((line) => /^\d+\.\s+/.test(line))) {
      parsed.push({ type: "list", ordered: true, items: lines.map((line) => line.replace(/^\d+\.\s+/, "")) });
      return;
    }

    const tableRows = parseTable(block);
    if (tableRows) {
      parsed.push({ type: "table", rows: tableRows });
      return;
    }

    parsed.push({ type: "paragraph", text: block });
  });

  return parsed;
}

function renderArticleBlocks(blocks: ArticleBlock[]) {
  if (!blocks.length) return <p className="muted">內容整理中。</p>;

  return blocks.map((block, index) => {
    if (block.type === "heading") {
      const Heading = `h${block.level}` as "h1" | "h2" | "h3";
      return <Heading key={index} id={block.id}>{block.text}</Heading>;
    }
    if (block.type === "list") {
      const List = block.ordered ? "ol" : "ul";
      return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</List>;
    }
    if (block.type === "quote") return <blockquote key={index}>{block.text}</blockquote>;
    if (block.type === "divider") return <hr key={index} />;
    if (block.type === "callout") {
      return (
        <aside key={index} className={`knowledge-callout is-${block.tone}`}>
          <strong>{block.title}</strong>
          {block.text ? <p>{block.text}</p> : null}
        </aside>
      );
    }
    if (block.type === "table") {
      const [head, ...rows] = block.rows;
      return (
        <div className="knowledge-table-wrap" key={index}>
          <table>
            <thead><tr>{head.map((cell, cellIndex) => <th key={cellIndex}>{cell}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <p key={index}>{block.text}</p>;
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
  const articleUrl = canonicalFor(item);
  const articleBlocks = parseArticleBody(item.body);
  const tocItems: TocItem[] = articleBlocks
    .filter((block): block is TocHeadingBlock => block.type === "heading" && (block.level === 2 || block.level === 3))
    .map((block) => ({ id: block.id, text: block.text, level: block.level }));
  const shareText = encodeURIComponent(item.title);
  const shareUrl = encodeURIComponent(articleUrl);

  return (
    <main>
      <article className="section">
        <div className="container knowledge-detail-shell">
          <div className="knowledge-article-layout">
            <div className="knowledge-main-column">
              <Link className="button ghost" href="/knowledge">返回知識庫</Link>
              <header className="knowledge-detail-header">
                <p className="knowledge-meta">{category}{publishedDate ? ` · ${publishedDate}` : ""} · 閱讀時間 {readingTime(item.body)}</p>
                <h1>{item.title}</h1>
                {item.summary ? <p className="knowledge-lead">{item.summary}</p> : null}
                <div className="knowledge-share-actions" aria-label="分享文章">
                  <a className="button" href={`${lineUrl}`} target="_blank" rel="noreferrer">LINE 諮詢</a>
                  <a className="button ghost" href={`https://social-plugins.line.me/lineit/share?url=${shareUrl}`} target="_blank" rel="noreferrer">LINE 分享</a>
                  <a className="button ghost" href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`} target="_blank" rel="noreferrer">Facebook 分享</a>
                </div>
                {item.cover_image_url ? <img className="knowledge-hero-image" src={item.cover_image_url} alt={item.title} /> : null}
              </header>
              <div className="knowledge-body">
                {renderArticleBlocks(articleBlocks)}
              </div>
              {(item.source_name || item.source_url || reviewedDate) ? (
                <aside className="knowledge-source">
                  <h2>資料來源與複查</h2>
                  {item.source_name ? <p>來源：{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_name}</a> : item.source_name}</p> : null}
                  {reviewedDate ? <p>最後複查：{reviewedDate}</p> : null}
                  {item.legal_status === "current" ? <p>法規狀態：現行有效</p> : null}
                </aside>
              ) : null}
              <aside className="knowledge-ayong-note">
                <h2>阿勇觀點</h2>
                <p>知識文章可以先幫你抓方向，但每一筆不動產的條件都不同。遇到稅務、貸款、農地或合約細節，建議把案況整理好，再一起確認比較穩。</p>
              </aside>
              <div className="knowledge-bottom-cta">
                <h2>想確認自己的情況？</h2>
                <p>把物件位置、預算、用途或目前遇到的問題傳給阿勇，我會協助你判斷下一步。</p>
                <a className="button" href={lineUrl} target="_blank" rel="noreferrer">LINE 阿勇諮詢</a>
              </div>
              <div className="notice">
                內容僅供參考，實際仍以主管機關、稅務機關、銀行、地政士或律師確認為準。
              </div>
            </div>
            <aside className="knowledge-toc" aria-label="文章目錄">
              <p>文章目錄</p>
              {tocItems.length ? (
                <nav>
                  {tocItems.map((heading) => (
                    <a key={heading.id} className={heading.level === 3 ? "is-nested" : ""} href={`#${heading.id}`}>{heading.text}</a>
                  ))}
                </nav>
              ) : (
                <span>本文篇幅較短，直接閱讀即可。</span>
              )}
            </aside>
          </div>
        </div>
      </article>
    </main>
  );
}
