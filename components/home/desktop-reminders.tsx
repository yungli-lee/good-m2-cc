"use client";

import { useRef, useState } from "react";
import { MarkdownContent } from "@/components/home/markdown-content";
import type { SitePage } from "@/lib/home-cms/types";

type Reminder = SitePage & { media_public_url?: string | null };

export function DesktopReminders({ pages }: { pages: Reminder[] }) {
  const [visibleCount, setVisibleCount] = useState(4);
  const actionsRef = useRef<HTMLDivElement>(null);
  const visible = pages.slice(0, visibleCount);
  const collapseReminders = () => {
    setVisibleCount(4);
    requestAnimationFrame(() => {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      actionsRef.current?.scrollIntoView({ behavior, block: "center" });
    });
  };
  return <>
    <div className="life-note-desktop-grid">{visible.map((page) => <article className="life-note-card" key={page.id}>
      {page.media_public_url ? <img className="life-note-card-image" src={page.media_public_url} alt={page.title} loading="lazy" /> : <div className="life-note-card-image life-note-card-placeholder" aria-hidden="true"><span>Life Notes</span></div>}
      <div className="life-note-card-content"><h3>{page.title}</h3>{page.subtitle ? <p>{page.subtitle}</p> : null}<div className="life-note-card-body"><MarkdownContent value={page.markdown_content} /></div></div>
    </article>)}</div>
    {pages.length > 4 ? <div className="reminder-more-actions" ref={actionsRef}>{visibleCount < pages.length ? <button className="button" type="button" onClick={() => setVisibleCount((count) => Math.min(count + 4, pages.length))}>顯示更多</button> : <button className="button ghost" type="button" onClick={collapseReminders}>收合提醒</button>}</div> : null}
  </>;
}
