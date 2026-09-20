# Knowledge category restructure

## Scope and audit

Only taxonomy, category selectors/filtering and nine exact-slug article assignments change. No articles are created or published. Article slugs, canonical URLs, bodies, titles, summaries, images, SEO fields and publication dates are protected by the migration assertion. Production migration is **pending human Preview acceptance**, not executed.

Audit: Production public API shows 39 public articles. An authenticated read-only SQL query also includes archived/soft-deleted records: 64 total, 39 active/public, no drafts. RLS hides nonpublic records from anonymous callers; anonymous counts alone were not used to retire categories.

Categories are `public.content_categories`, keyed by UUID, unique `(content_type, slug)`, with a text slug check, sort_order and deleted_at. `content_items.category_id` is a nullable FK (`ON DELETE SET NULL`); category identity is not an enum. Uncategorized is SQL NULL. No new enum, constraint, permission or RLS policy is needed.

Admin create/edit both use `listKnowledgeCategories` and the shared KnowledgeForm dropdown; the null/未分類 option stays. The admin list uses category slug filters. Public `/knowledge` uses `q`, `category`, `page`; searches title/summary/body, category names/slugs and tags. Public visibility retains status=published, noindex=false, published_at present, no deleted_at, legal_status null/current even for authenticated staff.

`/api/public/knowledge` is a latest-items endpoint with limit only, not a category-search endpoint; its contract stays unchanged. Article metadata derives canonical from canonical_url or article slug, and is unchanged. Sitemap emits article paths rather than category-query URLs. Category updates can change updated_at via the existing trigger (and sitemap lastModified); publication dates remain protected. There is a content_relations table but no category-based related-article renderer/query in the current article page. No related article logic is changed.

## Counts

Production **before → projected after migration**; these are not claims that Production was modified. Total includes soft-deleted records; public excludes them.

| Category | Public before | Public after | Total before | Total after |
|---|---:|---:|---:|---:|
| 買屋指南 buying | 18 | 10 | 29 | 21 |
| 賣屋指南 selling | 6 | 5 | 16 | 15 |
| 貸款 mortgage | 0 | 2 | 0 | 2 |
| 稅務 tax | 2 | 2 | 2 | 2 |
| 交易安全 transaction-safety | 0 | 3 | 0 | 3 |
| 土地建地 land-building | 0 | 4 | 0 | 4 |
| 農地 farmland | 7 | 7 | 8 | 8 |
| 農舍 farmhouse | 1 | 1 | 1 | 1 |
| 工業地廠房 industrial-property | 0 | 0 | 0 | 0 |
| 繼承贈與 inheritance-gift | 5 | 5 | 5 | 5 |
| 法規 legal | 0 | 0 | 0 | 0 |
| 彰化市場 changhua-market | 0 | 0 | 0 | 0 |
| 常見問題 faq | 0 | 0 | 0 | 0 |
| 未分類 NULL | 0 | 0 | 3 | 3 |
| Total | 39 | 39 | 64 | 64 |

No articles need migration recommendations from legal/changhua-market/faq: all are empty, including deleted records. Their rows remain available to historical query links; unused legacy categories disappear from selectors. If any legacy category gains references before deployment, admin keeps it visible. Uncategorized's three deleted article references remain untouched.

## Exact article identities

The migration matches the existing unique `(content_type=knowledge, slug)` key, never fuzzy titles. These Production IDs were verified during the audit:

| ID | Existing slug | Target |
|---|---|---|
| 207dc0f1-265c-4cd5-ac02-8f1a531dbaee | bank-appraisal-vs-purchase-price | mortgage |
| 8c540ed5-7429-4163-8be9-348bccb04a91 | land-road-access-rights | land-building |
| 035a64d1-c89e-4d75-ab6a-db88868e8ada | building-land-before-buying | land-building |
| 4e701882-24a2-4e65-985b-3092c2e8eacb | before-making-property-offer | transaction-safety |
| 725e09cc-f10b-4a7d-9dd3-4b566e9c12f1 | youth-home-loan-3 | mortgage |
| 275a0ba4-3109-4e3e-a63d-79b876fa63af | property-disclosure-checklist | transaction-safety |
| e16eb856-6bd2-4c22-9f4c-ddef045ed721 | building-land-types | land-building |
| 19c5acdb-6407-4995-b5fb-ef25adcc6a5c | seller-disclose-leaks-and-defects | transaction-safety |
| e5eb4773-4693-4537-a9eb-1c6daf1426fc | townhouse-land-share-private-road-check | land-building |

## Compatibility and rollout

- buying-guide → buying, selling-guide → selling, loan → mortgage: public index issues a permanent redirect retaining normalized q/page. Admin and public queries accept either key during migration rollout.
- Existing category IDs are retained on rename. If canonical and legacy rows already coexist, references move to canonical and only the now-unreferenced legacy row is soft-retired. No category row is deleted.
- legal/changhua-market/faq links retain a valid empty filtered response rather than changing to unrelated content. Unknown categories continue to show an empty result. Article URLs remain unchanged.
- Frontend selector only shows the ten target categories with eligible public articles. Uncategorized never appears. Industrial property is created for admin and automatically becomes visible after an eligible article is assigned/published in future work.
- Mobile tabs are a single nonshrinking, horizontally scrollable row contained within the viewport.

Run `supabase/migrations/202609160101_knowledge_category_restructure.sql` on staging first. It is transactional, locks the two relevant tables, upserts only taxonomy, updates only category_id for exact-slug moves, then compares all article fields except category_id/updated_at. Any protected-field difference aborts the transaction. Missing staging articles remain missing; the script never seeds production content into staging. Re-running is safe. Take an external category_id mapping backup before the eventual Production release; no Production execution is authorized before human Preview approval.

Staging baseline has 8 active/public test articles: buying-guide 3, selling-guide 1, Uncategorized 4; other categories 0. These differ from Production. Empty new categories must stay absent from the Preview public menu and remain available in admin; do not publish test articles just to fill menus.

## Automated validation

PASS: frozen install, full TypeScript, ESLint, pnpm test (including taxonomy/query behavior), Next production build, git diff --check, unchanged lockfile. No dependency upgrades. SQL executed in isolated PGlite outside repository dependencies: 39-article fixture, all 9 moves, repeatability, existing-target collision and protected-field rejection PASS. Fixture contains synthetic protected body/canonical fields; Production bodies were not copied or changed.

## Human Preview checklist

- Admin new/edit: ten categories in requested order, plus 未分類; current selection retained; no save or new publication needed for inspection.
- Public: 全部 then populated target categories in order; no 未分類 or empty industrial category.
- Filters + search + pagination work together; clearing filters works.
- Legacy buying-guide/selling-guide/loan query links resolve to canonical categories retaining search/page.
- Mobile tabs scroll horizontally without wrapping, squeezing or page overflow.
- Existing article URLs, content and image behavior stay unchanged.
- Approve Preview before merging or any Production migration/deployment.
