# CMS Phase 1 change report

## Outcome

**READY_FOR_PREVIEW_DEPLOY**

This phase repairs application-level CMS data flow without changing the
Production database, existing migrations, or the legacy homepage architecture.

## Implemented changes

### Public custom/static pages

- Added `/(public)/[slug]` as an independent public route.
- Reads `site_pages.page_key` and only returns rows with `status=published` and
  `archived_at IS NULL`.
- Reserved slugs are rejected by admin validation and return `notFound()` in
  the catch-all route.
- Custom pages are no longer appended to the homepage.
- Reminder cards now link to their independent public page.

### SEO

- Added CMS-driven `generateMetadata()` for independent site pages.
- Connected SEO title, description, cover/media image, canonical, Open Graph,
  `published_at`, and `updated_at`.
- Missing/unpublished pages return noindex metadata and 404 rendering.
- Added CMS-driven metadata for `/contact`.

### Sitemap and robots

- Added `/sitemap.xml` with homepage, property listing/published properties,
  knowledge listing/published articles, `/calculator`, `/contact`, and
  published non-reserved site pages.
- Added `/robots.txt`; `/admin` and `/api` are disallowed.
- Draft, archived, deleted, noindex, and reserved custom pages are excluded by
  the underlying public queries and route filters.

### Company settings

- Header, Footer, contact CTA, `/contact`, calculator layout, homepage legacy
  contact links, and existing property detail now share `company_settings`.
- Existing hardcoded public contact values were moved into one centralized
  fallback object.
- Company save now revalidates `/`, `/contact`, `/properties`, and
  `/sitemap.xml`.

### Homepage renderer

- Kept the existing legacy HTML + React + CMS adapter architecture.
- Existing supported homepage sections continue to replace matching legacy
  sections.
- Unknown sections now emit `home_cms_unsupported_section` and are skipped
  instead of being silently appended.
- Company settings are applied through the existing homepage CMS payload.

### 阿勇生活小提醒

- Existing repeatable CRUD, status, sort order, cover, summary/body, delete, and
  publish controls are retained.
- Public homepage query continues to include only published, non-archived rows
  ordered by `sort_order`.
- Added independent reminder pages, SEO, sitemap inclusion, and full-content
  links.
- Public/admin naming remains consistently「阿勇生活小提醒」.

### Cache invalidation

- Site page create/update/delete now revalidates `/`, the old/new public slug,
  `/contact`, and `/sitemap.xml`.
- `router.refresh()` remains only a client/admin UX refresh and is no longer
  relied upon as public cache invalidation.

## Modified product files

- `app/(public)/[slug]/page.tsx`
- `app/(public)/contact/page.tsx`
- `app/(public)/layout.tsx`
- `app/calculator/layout.tsx`
- `app/sitemap.ts`
- `app/robots.ts`
- `app/api/public/home-cms/route.ts`
- `app/api/admin/site-pages/route.ts`
- `app/api/admin/site-pages/[id]/route.ts`
- `app/admin/site-pages/actions.ts`
- `app/admin/settings/company/actions.ts`
- `app/admin/settings/company/page.tsx`
- `app/admin/pending/page.tsx`
- `components/admin/site-page-form.tsx`
- `components/home-cms-client.tsx`
- `components/layout/site-header.tsx`
- `components/layout/site-footer.tsx`
- `lib/company-settings.ts`
- `lib/home-cms/queries.ts`
- `lib/home-cms/render.ts`
- `lib/home-cms/revalidation.ts`
- `lib/home-cms/routing.ts`
- `lib/home-cms/schema.ts`
- `app/globals.css`
- `scripts/test-cms-phase1.ts`
- `package.json`

## Database and release safety

- New schema/migration required: NO
- Existing migration modified: NO
- Production database modified: NO
- Ledger repaired: NO
- `db push` / `migration up`: NOT RUN
- Preview or Production deployed: NO
- Main merged: NO
