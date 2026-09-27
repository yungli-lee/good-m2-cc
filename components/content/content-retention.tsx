import Link from "next/link";
import { KnowledgeCard } from "@/components/content/knowledge-card";
import { ReminderCard } from "@/components/content/reminder-card";
import { PropertyCard } from "@/components/properties/property-card";
import type { ContentItem } from "@/lib/content/types";
import type { SitePage } from "@/lib/home-cms/types";
import type { Property } from "@/lib/properties/types";

type Reminder = SitePage & { media_public_url?: string | null };

export function ContentRetention({
  knowledge,
  reminders,
  properties,
  knowledgeTitle = "延伸閱讀",
  reminderTitle = "阿勇生活小提醒",
  propertyTitle = "你可能也會喜歡"
}: {
  knowledge: ContentItem[];
  reminders: Reminder[];
  properties: Property[];
  knowledgeTitle?: string;
  reminderTitle?: string;
  propertyTitle?: string;
}) {
  if (!knowledge.length && !reminders.length && !properties.length) return null;

  return (
    <section className="section content-retention-shell">
      <div className="container content-retention">
        {knowledge.length ? (
          <section className="property-retention-section">
            <div className="property-retention-heading">
              <p className="eyebrow">Knowledge</p>
              <h2>{knowledgeTitle}</h2>
              <p className="muted">看完這篇，再延伸看看其他實用內容。</p>
            </div>
            <div className="grid property-retention-grid">
              {knowledge.map((item) => <KnowledgeCard key={item.id} item={item} />)}
            </div>
            <div className="property-retention-more">
              <Link className="button ghost" href="/knowledge">前往知識庫</Link>
            </div>
          </section>
        ) : null}

        {reminders.length ? (
          <section className="property-retention-section">
            <div className="property-retention-heading">
              <p className="eyebrow">Life Notes</p>
              <h2>{reminderTitle}</h2>
              <p className="muted">居家、安全、生活習慣，再多看幾個實用小提醒。</p>
            </div>
            <div className="grid property-retention-grid">
              {reminders.map((page) => <ReminderCard key={page.id} page={page} />)}
            </div>
            <div className="property-retention-more">
              <Link className="button ghost" href="/#reminders">查看更多小提醒</Link>
            </div>
          </section>
        ) : null}

        {properties.length ? (
          <section className="property-retention-section">
            <div className="property-retention-heading">
              <p className="eyebrow">Properties</p>
              <h2>{propertyTitle}</h2>
              <p className="muted">如果正在找房，也可以繼續看看目前網站上的精選物件。</p>
            </div>
            <div className="grid property-retention-grid">
              {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
            </div>
            <div className="property-retention-more">
              <Link className="button ghost" href="/properties">看更多物件</Link>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
