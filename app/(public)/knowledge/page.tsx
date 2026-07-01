import { KnowledgeCard } from "@/components/content/knowledge-card";
import { listPublicKnowledgeItems } from "@/lib/content/queries";
import type { ContentItem } from "@/lib/content/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "不動產知識庫｜阿勇不動產顧問",
  description: "整理買屋、賣屋、稅務、貸款、農地農舍與法規等不動產知識。"
};

export default async function KnowledgeIndexPage() {
  const { data: items, error } = await listPublicKnowledgeItems(48);

  return (
    <main>
      <section className="hero-lite">
        <div className="container">
          <h1>不動產知識庫</h1>
          <p>把買屋、賣屋、貸款、稅務與法規重點整理成可長期查閱的知識內容。</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {error ? <div className="notice">目前知識內容讀取失敗，請稍後再試。</div> : null}
          {!error && items.length === 0 ? (
            <div className="notice">知識內容整理中，歡迎先透過 Line 詢問阿勇。</div>
          ) : null}
          <div className="grid knowledge-grid">
            {(items as ContentItem[]).map((item) => (
              <KnowledgeCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
