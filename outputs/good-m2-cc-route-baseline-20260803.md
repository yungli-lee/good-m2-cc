# good-m2-cc route baseline — 2026-08-03

Baseline commit: `ffe51a27753907a420a6a0506c6e4859ff22ec86`.

## Manifest summary

- 55 `page.tsx` files.
- 44 `route.ts` files.
- 5 layouts.
- Production build generated 100 Edge function routes.
- `/robots.txt` is prerendered; sitemap is dynamic.

## Public and utility pages

| Routes | Source family | Result |
|---|---|---|
| `/` | `app/page.tsx` | PASS |
| `/<custom-slug>` | `app/(public)/[slug]/page.tsx` | PASS |
| `/contact` | `app/(public)/contact/page.tsx` | PASS |
| `/knowledge`, `/knowledge/[slug]` | `app/(public)/knowledge/**` | PASS |
| `/properties`, `/properties/[slug]` | `app/(public)/properties/**` | PASS |
| `/calculator`, `/calculator/mortgage`, `/calculator/purchase-cost` | `app/calculator/**` | PASS |
| `/calculators`, `/calculators/owner-net-all-in` | `app/calculators/**` | PASS |
| `/robots.txt`, `/sitemap.xml` | metadata routes | PASS |

The catch-all custom page route rejects reserved slugs and only renders
published, non-archived `site_pages` rows.

## Admin pages

| Area | Routes | Result |
|---|---|---|
| Shell/auth | `/admin`, `/admin/login`, `/admin/account`, `/admin/pending`, `/admin/debug/env` | PASS |
| Properties | `/admin/properties`, `/new`, `/[id]`, `/[id]/edit` | PASS |
| People | `/admin/people`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/requirements/new` | PASS |
| Requirements | `/admin/crm/requirements`, `/new`, `/[id]`, `/[id]/edit` | PASS |
| CMS campaigns | `/admin/home-campaigns`, `/new`, `/[id]/edit` | PASS |
| CMS pages | `/admin/site-pages`, `/new`, `/[id]/edit` | PASS |
| Navigation | `/admin/navigation`, `/new`, `/[id]/edit` | PASS |
| Media | `/admin/media` | PASS |
| Knowledge | `/admin/knowledge`, `/new`, `/[id]/edit` | PASS |
| Inquiries | `/admin/inquiries`, `/[id]` | PASS |
| Operations | `/admin/audit`, `/admin/users`, `/admin/settings/company`, `/admin/system/email` | PASS |
| Tools | `/admin/tools`, buyer budget, expiry, owner net, brokerage extra, seller net | PASS |

## Public APIs

| Route | Contract | Result |
|---|---|---|
| `/api/public/home-cms` | campaigns + pages + company + navigation | PASS |
| `/api/public/properties` | published property collection | PASS |
| `/api/public/featured-properties` | featured published properties | PASS |
| `/api/public/knowledge` | published knowledge collection | PASS |
| `/api/public/inquiries` | public inquiry submission | PASS |

## Admin Route Handlers

| Area | Routes | Result |
|---|---|---|
| Requirements | collection, `[id]`, duplicate, status | PASS |
| Home campaigns | collection, `[id]` | PASS |
| Site pages | collection, `[id]` | PASS |
| Navigation | collection, `[id]` | PASS |
| Media | collection, `[id]` | PASS |
| Knowledge | collection, `[id]` | PASS |
| People | `[id]` PATCH, activities, property relations, archive relation | PASS |
| Properties | collection, `[id]`, publish, property-media, cover, image upload | PASS |
| Inquiries | collection, `[id]`, status, notes, spam | PASS |

## Direct admin POST Route Handlers

Property edit save/upload/cover/media delete/timeline CRUD/export and the
expired-listing runner remain under `/admin/**/route.ts`. They are intentionally
normal HTTP form/Route Handler flows, not App Router pages.

## Route risks

| Finding | Result | Reason / action |
|---|---|---|
| `docs/ROUTE_MAP.md` is stale | PARTIAL | It still marks implemented calculator routes as planned and omits current CMS/CRM routes; this dated baseline is authoritative for `ffe51a2`. |
| Dynamic catch-all collision | PASS | reserved slug helper covers admin/api/fixed public routes. |
| Cloudflare Server Action portability | PARTIAL | several admin surfaces still use Server Actions; new high-risk edit flows should prefer Route Handlers. |
| Route build integrity | PASS | Next production build emitted all expected route families. |

## Result

**PASS_WITH_ROUTE_DOCUMENTATION_DEBT**
