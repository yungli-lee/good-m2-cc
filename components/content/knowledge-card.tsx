import Link from "next/link";
import type { ContentItem } from "@/lib/content/types";

function formatKnowledgeDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" }).format(date);
}

export function KnowledgeCard({ item }: { item: ContentItem }) {
  const category = item.content_categories?.name || "不動產知識";
  const date = formatKnowledgeDate(item.published_at || item.updated_at);

  return (
    <article className="card knowledge-card">
      {item.cover_image_url ? (
        <img className="knowledge-card-image" src={item.cover_image_url} alt={item.title} loading="lazy" />
      ) : null}
      <div className="card-body">
        <p className="knowledge-meta">{category}{date ? ` · ${date}` : ""}</p>
        <h2>{item.title}</h2>
        {item.summary ? <p className="muted">{item.summary}</p> : null}
        <Link className="button" href={`/knowledge/${item.slug}`}>閱讀全文</Link>
      </div>
    </article>
  );
}
