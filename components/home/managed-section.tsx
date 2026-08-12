import { MarkdownContent } from "@/components/home/markdown-content";
import { MobileReminderAccordion } from "@/components/home/mobile-reminder-accordion";
import { DesktopReminders } from "@/components/home/desktop-reminders";
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
      <DesktopReminders pages={pages} />
      <MobileReminderAccordion pages={pages} />
    </section>
  );
}
