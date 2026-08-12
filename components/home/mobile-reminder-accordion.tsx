"use client";

import { useState } from "react";
import { MarkdownContent } from "@/components/home/markdown-content";
import { toggleReminder } from "@/lib/home-cms/reminder-accordion";
import type { SitePage } from "@/lib/home-cms/types";

type ReminderPage = SitePage & { media_public_url?: string | null };

function contentId(page: ReminderPage) {
  return `life-note-${page.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function MobileReminderAccordion({ pages }: { pages: ReminderPage[] }) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set(pages[0] ? [pages[0].id] : []));
  const [visibleCount, setVisibleCount] = useState(4);

  return (
    <div className="article-grid life-note-mobile-grid">
      {pages.slice(0, visibleCount).map((page) => {
        const isOpen = openIds.has(page.id);
        const panelId = contentId(page);
        return (
          <article className={`article-card${isOpen ? " is-open" : ""}`} data-react-managed data-reminder-slug={page.page_key} key={page.id}>
            <button
              type="button"
              className="article-toggle"
              aria-controls={panelId}
              aria-expanded={isOpen}
              onClick={() => setOpenIds((current) => toggleReminder(current, page.id))}
            >
              <span><strong>{page.title}</strong>{page.subtitle ? <small>{page.subtitle}</small> : null}</span>
              <b>{isOpen ? "收合" : "展開"}</b>
            </button>
            <div className="article-body" id={panelId}>
              {page.media_public_url ? <figure className="cms-reminder-cover"><img src={page.media_public_url} alt={page.title} loading="lazy" /></figure> : null}
              <MarkdownContent value={page.markdown_content} />
            </div>
          </article>
        );
      })}
      {pages.length > 4 ? <div className="reminder-more-actions">{visibleCount < pages.length ? <button className="button" type="button" onClick={() => setVisibleCount((count) => Math.min(count + 4, pages.length))}>顯示更多</button> : <button className="button ghost" type="button" onClick={() => setVisibleCount(4)}>收合提醒</button>}</div> : null}
    </div>
  );
}
