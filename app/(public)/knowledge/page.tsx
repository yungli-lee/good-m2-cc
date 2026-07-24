import type { Metadata } from "next";
import Link from "next/link";
import { KnowledgeCard } from "@/components/content/knowledge-card";
import { listKnowledgeCategories, listPublicKnowledgeItems } from "@/lib/content/queries";
import type { ContentItem } from "@/lib/content/types";
import { getPublicCompanySettings } from "@/lib/company-settings";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const pageSize = 12;

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanySettings();
  return {
    title: `不動產知識庫｜${company.brand_name}`,
    description: "整理買屋、賣屋、稅務、貸款、農地農舍與法規等不動產知識。",
    openGraph: { siteName: company.brand_name }
  };
}

type Props = {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};

function normalizePage(value?: string) {
  const page = Number(value || "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function knowledgeHref(input: { q?: string; category?: string; page?: number }) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.category) params.set("category", input.category);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  return `/knowledge${params.toString() ? `?${params.toString()}` : ""}`;
}

export default async function KnowledgeIndexPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = String(params.q || "").trim().slice(0, 80);
  const category = String(params.category || "").trim().toLowerCase();
  const page = normalizePage(params.page);
  const [
    { data: items, error, count, totalPages },
    categories
  ] = await Promise.all([
    listPublicKnowledgeItems({ q, category, page, pageSize }),
    listKnowledgeCategories()
  ]);
  const hasFilters = Boolean(q || category);
  const currentCategory = categories.find((item) => item.slug === category);
  const safeTotalPages = Math.max(totalPages || 0, 1);
  const previousHref = page > 1 ? knowledgeHref({ q, category, page: page - 1 }) : "";
  const nextHref = page < safeTotalPages ? knowledgeHref({ q, category, page: page + 1 }) : "";

  return (
    <main>
      <section className="hero-lite knowledge-index-hero">
        <div className="container">
          <h1>不動產知識庫</h1>
          <p>把買屋、賣屋、貸款、稅務與法規重點整理成可長期查閱的知識內容。</p>
        </div>
      </section>
      <section className="section knowledge-index-section">
        <div className="container">
          <form className="knowledge-listing-tools" action="/knowledge">
            <label className="field knowledge-search-field">
              <span>搜尋知識庫</span>
              <input className="input" type="search" name="q" defaultValue={q} placeholder="輸入關鍵字、分類或標籤" />
            </label>
            <label className="field">
              <span>分類</span>
              <select className="select" name="category" defaultValue={currentCategory?.slug || ""}>
                <option value="">全部分類</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>
            <div className="knowledge-listing-actions">
              <button className="button" type="submit">搜尋</button>
              {hasFilters ? <Link className="button ghost" href="/knowledge">清除</Link> : null}
            </div>
          </form>

          <div className="knowledge-category-tabs" aria-label="知識分類">
            <Link className={category ? "button ghost" : "button"} href={knowledgeHref({ q })}>全部</Link>
            {categories.map((item) => (
              <Link
                key={item.id}
                className={category === item.slug ? "button" : "button ghost"}
                href={knowledgeHref({ q, category: item.slug })}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {error ? <div className="notice">目前知識內容讀取失敗，請稍後再試。</div> : null}
          {!error && items.length === 0 ? (
            <div className="knowledge-empty-state">
              <h2>{hasFilters ? "找不到符合條件的文章" : "知識內容整理中"}</h2>
              <p>{hasFilters ? "請換個關鍵字或分類再試一次。" : "歡迎先透過 Line 詢問阿勇。"}</p>
              {hasFilters ? <Link className="button ghost" href="/knowledge">清除所有篩選</Link> : null}
            </div>
          ) : null}
          <div className="grid knowledge-grid">
            {(items as ContentItem[]).map((item) => (
              <KnowledgeCard key={item.id} item={item} />
            ))}
          </div>
          {!error && items.length > 0 ? (
            <nav className="knowledge-pagination" aria-label="知識庫分頁">
              {previousHref ? <Link className="button ghost" href={previousHref}>上一頁</Link> : <span className="button ghost is-disabled">上一頁</span>}
              <span className="knowledge-page-count">第 {page.toLocaleString("zh-TW")} / {safeTotalPages.toLocaleString("zh-TW")} 頁，共 {(count || 0).toLocaleString("zh-TW")} 篇</span>
              {nextHref ? <Link className="button ghost" href={nextHref}>下一頁</Link> : <span className="button ghost is-disabled">下一頁</span>}
            </nav>
          ) : null}
        </div>
      </section>
    </main>
  );
}
