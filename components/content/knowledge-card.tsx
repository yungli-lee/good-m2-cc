import Link from "next/link";
import { DeliveredImage } from "@/components/media/delivered-image";
import { formatKnowledgeReadingTime } from "@/lib/content/reading-time";
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
  const readingTime = formatKnowledgeReadingTime(item.body);
  const imageFit = item.image_fit === "contain" ? "contain" : "cover";

  return (
    <article className="card knowledge-card">
      {item.cover_image_url ? (
        <DeliveredImage
          className={`knowledge-card-image is-${imageFit}`}
          sourceUrl={item.cover_image_url}
          tier="card"
          sizes="(max-width: 760px) calc(100vw - 36px), (max-width: 1040px) calc((100vw - 54px) / 2), 360px"
          width={16}
          height={9}
          alt={item.title}
          loading="lazy"
        />
      ) : null}
      <div className="card-body">
        <p className="knowledge-meta">
          <span>{category}</span>
          {date ? <span>{date}</span> : null}
          <span>閱讀時間 {readingTime}</span>
        </p>
        <h2>{item.title}</h2>
        <p className="muted knowledge-card-summary">{item.summary || "點選閱讀全文，掌握這篇不動產知識的完整重點。"}</p>
        <Link className="button" href={`/knowledge/${item.slug}`}>閱讀全文</Link>
      </div>
    </article>
  );
}
