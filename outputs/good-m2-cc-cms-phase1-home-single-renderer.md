# CMS Phase 1 — Homepage Single Renderer

## Before

`app/page.tsx` mounted `HomeCmsClient`. The browser fetched both
`/legacy-static/home-body.html` and `/api/public/home-cms`, passed them through
`renderHomeCmsHtml`, injected a full HTML document fragment, then loaded the
legacy script. CMS replacement depended on section/header/footer regexes.

## After

`app/page.tsx` reads campaigns, pages, company settings and navigation on the
server. Each source has an independent safe fallback. `HomeRenderer` owns the
single React tree: one header, one ordered main section list, one footer, one
small compatibility enhancement loader. There is no runtime fetch of the
legacy homepage body and no regex homepage renderer.

Data flow:

`Supabase queries -> published/archive normalization -> section registry -> HomeRenderer -> React section component -> focused client enhancement`

## Modified implementation

- `app/page.tsx`: server entry, metadata fallback and independent CMS source fallback.
- `components/home/home-renderer.tsx`: sole homepage composition point.
- `components/home/home-header.tsx`, `home-footer.tsx`: single React header/footer.
- `components/home/home-campaign-carousel.tsx`: React carousel and explicit video lifecycle.
- `components/home/managed-section.tsx`: CMS page/reminder components.
- `components/home/home-legacy-enhancements.tsx`: temporary behavior-only boundary.
- `lib/home-cms/registry.ts`: normalization and deterministic ordering.
- `lib/home-cms/markdown.ts`: shared escaped markdown utility for non-home public pages.
- Removed `components/home-cms-client.tsx` and the regex renderer `lib/home-cms/render.ts`.

## Compatibility remaining

Sections not yet represented by a CMS row use the explicit, generated,
per-section content map in `legacy-section-content.ts`. It is bundled locally;
it is never fetched, appended as a full page, or regex-rewritten at runtime.
`legacy-static/script.js` temporarily remains for property discovery, mortgage
calculator, reminder accordion and inquiry submission. It is not responsible
for homepage structure, CMS selection, header/footer or video carousel.

Removal condition: migrate each compatibility section to a typed React
component, then replace the remaining script behaviors with focused client
components. The section IDs and visual copy are intentionally preserved until
that work is separately accepted.

## Rollback

Revert the Phase 1 commit. No database migration or data rewrite is involved.
The original legacy assets remain available during this phase.
