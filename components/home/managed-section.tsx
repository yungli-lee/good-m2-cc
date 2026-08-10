import Link from "next/link";
import { MarkdownContent } from "@/components/home/markdown-content";
import type { SitePage } from "@/lib/home-cms/types";

type PageForRender = SitePage & { media_public_url?: string | null };

export function ManagedSection({ page, sectionId }: { page: PageForRender; sectionId: string }) {
  return (
    <section className="intro-band cms-managed-section" id={sectionId}>
      <div className="section-heading">
        {page.eyebrow ? <p className="eyebrow">{page.eyebrow}</p> : null}
        <h2>{page.title}</h2>
        {page.subtitle ? <p>{page.subtitle}</p> : null}
      </div>
      {page.media_public_url ? <figure className="cms-section-cover"><img src={page.media_public_url} alt={page.title} loading="lazy" /></figure> : null}
      <MarkdownContent value={page.markdown_content} />
    </section>
  );
}

export function ManagedReminders({ pages }: { pages: PageForRender[] }) {
  return (
    <section className="life cms-reminders-section" id="reminders">
      <div className="section-heading"><p className="eyebrow">Life Notes</p><h2>阿勇生活小提醒</h2><p>生活中，很多問題不是不懂，而是沒有人提醒。這裡整理一些日常生活智慧，逐漸增加中。</p></div>
      <div className="life-note-desktop-grid">
        {pages.map((page) => <article className="life-note-card" key={page.id}>
          <Link className="life-note-card-link" href={`/${page.page_key}`} aria-label={`閱讀全文：${page.title}`}>
            {page.media_public_url
              ? <img className="life-note-card-image" src={page.media_public_url} alt={page.title} loading="lazy" />
              : <div className="life-note-card-image life-note-card-placeholder" aria-hidden="true"><span>Life Notes</span></div>}
            <div className="life-note-card-content">
              <h3>{page.title}</h3>
              <p>{page.subtitle || "生活中值得留意的小提醒，點選閱讀完整內容。"}</p>
              <span className="button">閱讀全文</span>
            </div>
          </Link>
        </article>)}
      </div>
      <div className="article-grid life-note-mobile-grid">
        {pages.map((page, index) => <article className={`article-card${index === 0 ? " is-open" : ""}`} data-reminder-slug={page.page_key} key={page.id}>
          <button type="button" className="article-toggle"><span><strong>{page.title}</strong>{page.subtitle ? <small>{page.subtitle}</small> : null}</span><b>{index === 0 ? "收合" : "展開"}</b></button>
          <div className="article-body">
            {page.media_public_url ? <figure className="cms-reminder-cover"><img src={page.media_public_url} alt={page.title} loading="lazy" /></figure> : null}
            <MarkdownContent value={page.markdown_content} />
            <p><Link href={`/${page.page_key}`}>閱讀完整內容</Link></p>
          </div>
        </article>)}
      </div>
    </section>
  );
}
