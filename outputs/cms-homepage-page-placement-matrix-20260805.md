# CMS Homepage / Page Placement Matrix — 2026-08-05

## Sources and current contracts

- Preview project: `niorteztdbuyusemsgwa` (read-only SQL inventory)
- Production project: `rlbuadkmylulieoryzal` (read-only SQL inventory)
- Public dynamic route: `app/(public)/[slug]/page.tsx`
- Special contact route: `app/(public)/contact/page.tsx`
- Homepage registry: `lib/home-cms/registry.ts`
- Navigation resolver: `lib/navigation-core.ts`
- Sitemap: `app/sitemap.ts`

Current behavior before the placement migration:

- A non-reserved slug has an independent route only when its row is `published` and not archived.
- `contact` uses the special `/contact` route and the first published `page_type=contact` row.
- A row appears on the homepage when it is published, not archived, and resolves to one of `philosophy`, `services`, `process`, `reminders`, or `team`.
- Fixed navigation links (`page_id is null`) are not coupled to page publication. They can point to a missing homepage anchor.
- Page-linked navigation is hidden when the linked row is draft or archived.
- The current sitemap includes every published, non-archived, non-reserved `site_pages` slug plus `/contact` when a published contact row exists.

## Preview matrix

| id | title | page_key | page_type | status / archived_at | sort | current independent route | current homepage | current navigation href | recommended show_as_page | recommended show_on_homepage | reason |
|---|---|---|---|---|---:|---|---|---|---|---|---|
| `408e1e18-b9c0-4e68-8453-e0e263c7238a` | Home CMS 驗收｜服務理念 | philosophy | philosophy | archived / 2026-08-03 | 10 | No | No | `/#philosophy` configured in header/mobile/footer despite archive | true | true | Managed singleton historically supports both placements; status still blocks public display. |
| `3a7d0d3d-b877-4817-8e02-4eb1218eefac` | Home CMS 驗收｜服務項目 | services | services | archived / 2026-08-03 | 20 | No | No | `/#services` header/mobile visible; footer hidden | true | true | Managed singleton intended for full page and homepage section. |
| `0f3baca1-5bde-44cd-bb68-f0b527c0eea1` | Home CMS 驗收｜買屋流程 Draft | process | custom | draft | 30 | No | No | `/#process` configured in all locations | true | true | Explicit known `process` contract; draft continues to block both placements. |
| `03863c37-dbfb-4fbe-ba57-0bedf22351bd` | 看懂雞蛋編碼 | reminders | reminder | archived / 2026-08-03 | 40 | No | No | `/#reminders` configured but hidden in all locations | true | true | Reminder content historically has a detail route and homepage collection. |
| `4cfa5f14-45fe-4c55-ad6f-7cfc4c2971ad` | Home CMS 驗收｜聯絡我們 | team | contact | archived / 2026-08-03 | 50 | No | No | `/contact` configured in all locations | true | true | Contact singleton backs both the homepage contact section and special `/contact` route. |
| `629546a0-0241-45c5-8b1b-40aa06d3c441` | Preview 自訂頁面驗收 | codex-preview-life-notes-20260718 | custom | archived / 2026-08-03 | 987 | No | No | None | false | false | Unknown custom page has no placement evidence; remain fail-closed. |
| `be8f50b7-da6c-406e-850a-53a7e1f90162` | CMS Preview 測試頁 | cms-preview-test | custom | archived / 2026-08-03 | 1000 | No | No | None | false | false | Unknown custom page has no placement evidence; remain fail-closed. |
| `fd009d2c-8b8d-4bde-ae1c-0bf2724b2239` | 美好生活 | goodnice | custom | archived / 2026-08-03 | 1000 | No | No | None | false | false | Unknown custom page has no placement evidence; remain fail-closed. |
| `3852c31d-0b60-44ee-9f9f-d9abbaaa6420` | 運動保健康 | new-life | custom | archived / 2026-07-24 | 1000 | No | No | Page-linked header item would resolve to `/new-life`, but archive currently hides it | true | false | Existing page-linked navigation is explicit evidence for an independent page only. |
| `a4cbff1d-f998-4620-b57c-66533df2f013` | 不動產訊息報你知 | new-page | custom | archived / 2026-08-03 | 1000 | No | No | None | false | false | Unknown custom page has no placement evidence; remain fail-closed. |

## Production matrix

| id | title | page_key | page_type | status / archived_at | sort | current independent route | current homepage | current navigation href | recommended show_as_page | recommended show_on_homepage | reason |
|---|---|---|---|---|---:|---|---|---|---|---|---|
| `ce3dccc1-1323-40b7-a1af-99c5caca2042` | 誠摯服務 | contact | contact | published | 600 | Yes: special `/contact` | Yes: registry key `team` | `/contact` in header/mobile/footer | true | true | Currently powers both placements; preserve explicitly. |
| `23a6337e-a054-4393-b624-c83cc91b7603` | 喝水不是等口渴，身體早就在提醒你了！ | new-page | reminder | archived / 2026-08-05 | 800 | No | No | Fixed `/#reminders` exists but is not row-linked | true | true | Reminder contract supports detail page and homepage collection; archive still blocks both. |
| `158740a8-6ae1-4efd-abec-23b060c967ca` | Codex Production 診斷頁 | codex-prod-diagnostic-20260719 | custom | draft | 1000 | No | No | None | false | false | Diagnostic custom row has no public placement evidence. |
| `90a6233d-a7d3-4d53-b720-49319f5424ca` | QA Production 靜態頁面（已編輯） | qa-prod-site-page-20260719 | custom | archived / 2026-07-19 | 1000 | No | No | None | false | false | QA custom row has no placement evidence. |
| `a0ed385a-24b4-47ef-b867-40bafb8c07a8` | 看懂雞蛋編碼 | reminders | reminder | archived / 2026-08-05 | 1000 | No | No | `/#reminders` fixed and visible in all locations | true | true | Explicit reminder singleton/anchor contract; archive still blocks both. |
| `4a25cff0-d9e7-44f1-9202-29d081d9bab0` | 一起分析討論 | services | services | published | 1000 | Yes: `/services` | Yes: `#services` | `/#services` in header/mobile/footer | true | true | Currently powers both placements; preserve explicitly. |

## Backfill policy

The migration starts every row as `false / false`. It then enables placement only when existing schema contains explicit intent:

1. Managed singleton types (`philosophy`, `services`, `contact`) → page and homepage.
2. Reminder rows → page and homepage.
3. Known legacy homepage key `process` → page and homepage.
4. A custom row linked by `site_navigation_items.page_id` → independent page only.
5. Every other custom or unknown row remains `false / false`.

`status`, `archived_at`, and placement are independent controls. Draft and archived rows remain invisible even when a backfilled placement flag is true.

## Roll-forward and rollback

- Roll-forward: run the idempotent migration, deploy code that reads both flags, then let editors adjust placement explicitly in Preview.
- Application rollback: old code ignores the new columns, so reverting application code does not require dropping columns.
- Schema rollback (only after application rollback): drop the placement index and the two columns. This loses placement choices and should not be used as the first rollback action.
- Re-running the migration is safe: backfill runs only when the placement schema is first introduced; later runs preserve editor choices and only confirm columns/indexes/comments exist.
