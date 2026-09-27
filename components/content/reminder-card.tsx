import Link from "next/link";
import { DeliveredImage } from "@/components/media/delivered-image";
import type { SitePage } from "@/lib/home-cms/types";

type Reminder = SitePage & { media_public_url?: string | null };

export function ReminderCard({ page }: { page: Reminder }) {
  const image = page.media_public_url || page.fallback_cover_url || null;

  return (
    <article className="card property-retention-reminder-card">
      {image ? (
        <DeliveredImage
          className="property-retention-reminder-image"
          sourceUrl={image}
          tier="card"
          sizes="(max-width: 760px) calc(100vw - 36px), (max-width: 1040px) calc((100vw - 54px) / 2), 360px"
          alt={page.media_assets?.alt_text || page.title}
          loading="lazy"
        />
      ) : null}
      <div className="card-body">
        <p className="eyebrow">阿勇生活小提醒</p>
        <h3>{page.title}</h3>
        {page.subtitle ? <p className="muted property-retention-reminder-summary">{page.subtitle}</p> : null}
        <Link className="button ghost" href={`/${page.page_key}`}>看小提醒</Link>
      </div>
    </article>
  );
}
