# good-m2-cc CMS data-flow baseline — 2026-08-03

## Homepage

```text
home_campaigns + site_pages + company_settings + site_navigation_items
  -> server queries
  -> GET /api/public/home-cms
  -> HomeCmsClient (no-store fetch)
  + /legacy-static/home-body.html
  -> renderHomeCmsHtml regex/HTML adapter
  -> browser DOM + legacy script + video lifecycle
```

| Layer | Evidence | Result |
|---|---|---|
| Data | published/non-archived campaigns and pages; active date window | PASS |
| Media | public Storage URLs; image/video metadata and poster | PASS |
| API | one Edge JSON payload for campaign/page/company/navigation | PASS |
| Renderer | escapes text/attributes, skips unsupported sections with warning | PASS |
| Architecture | client fetch + legacy HTML + regex + injected markup/script | PARTIAL |
| Failure mode | failed source fetch can result in empty or partially rendered homepage | PARTIAL |

## Site pages and reminders

```text
/admin/site-pages form
  -> Server Action for create/update OR admin Route Handler for update/delete
  -> site_pages + media_assets
  -> revalidate /, /contact, /sitemap.xml and old/new slug
  -> /<slug> query (published + archived_at null)
  -> metadata + public renderer
```

Reserved slugs are rejected. Draft/archived rows do not render publicly.
Reminder rows are repeatable, ordered by `sort_order`, linked from the homepage,
and have independent public pages.

Result: **PASS**, with Server Action portability recorded separately.

## Navigation

```text
/admin/navigation
  -> /api/admin/navigation[/id]
  -> site_navigation_items
  -> getAllPublicNavigationItems
  -> resolve fixed/custom/external href
  -> React public layout + legacy homepage header/mobile/footer
```

Only visible items are public. Custom-page links must point to published,
non-archived pages. Unsafe URL schemes and invalid targets are rejected.

Result: **PASS**.

## Company identity

```text
/admin/settings/company
  -> updateCompanySettingsAction
  -> company_settings / media upload
  -> revalidate public surfaces + company-settings tag
  -> public layout, contact, calculators, property detail and home CMS payload
```

Brand logo/name/tagline and company/franchise/contact/social values are
separated and share centralized fallbacks. Result: **PASS**.

## Knowledge

```text
/admin/knowledge lifecycle actions and APIs
  -> knowledge tables/media
  -> /api/public/knowledge
  -> /knowledge + /knowledge/[slug]
  -> sitemap
```

Publish/archive/delete/restore actions explicitly revalidate listing/detail
paths. Result: **PASS**.

## Media library and property media

```text
/admin/media -> /api/admin/media[/id] -> media_assets + Storage
property edit -> upload/property-media routes -> property_media + Storage
home campaigns/site pages/properties -> media references -> public renderers
```

Images plus uploaded MP4/WebM are supported. Video poster metadata is required
for homepage/property use; MOV is rejected; application limits distinguish
image, homepage video and property video. Reference checks protect in-use media.
Result: **PASS** by local media regression; live Storage/RLS was not re-probed,
so runtime parity is **PARTIAL**.

## Inquiries

Public submission and admin lifecycle are separate API/action paths. Inquiry
code was not changed by this baseline. Result: **PASS** by build presence;
email-provider delivery is outside this baseline and therefore **PARTIAL**.

## Cache and consistency

| Mutation | Revalidation | Result |
|---|---|---|
| Site page | homepage, contact, sitemap, old/new slug | PASS |
| Company settings | public pages, calculators/knowledge, sitemap, tag | PASS |
| Home campaign | homepage and admin campaign list | PASS |
| Knowledge | admin/public listing and affected slug | PASS |
| Property lifecycle | public listing/detail and affected admin paths | PASS |

## Data-flow conclusion

**PASS_WITH_LEGACY_HOMEPAGE_AND_RUNTIME_PARTIALS**

The data paths are connected and regression-tested. The highest remaining CMS
design risk is not a missing DB/API link; it is the homepage's dual-fetch,
regex-rendered legacy adapter and its broad client-side lifecycle.
