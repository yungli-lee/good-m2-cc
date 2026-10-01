# Website operations corrections and implementation — 2026-10-01

Baseline: main 496f508 (PR #25). This is a source review and tested implementation, not a completed production performance measurement.

## Corrections to the earlier audit

- Archived/expired property URLs already render an unavailability reason, through the existing limited public availability RPC. They are not ordinary missing-property 404s.
- Responsive image delivery already exists for property cards, Hero and detail/fullscreen galleries. Do not describe those as unimplemented.
- robots.ts and sitemap.ts already exist.
- Conversion collection, UTM/session attribution and the admin analytics dashboard already exist. Extend these rather than creating a second event system.

## Implemented

1. Media: main property images have high fetch priority; retain current responsive sizes, deferred gallery slots, on-demand fullscreen and original preservation.
2. SEO: metadataBase, property/list/knowledge canonicals and social metadata, CMS property OG override, Article/Breadcrumb JSON-LD, homepage business JSON-LD, reminder and calculator sitemap entries. JSON-LD escapes '<'. Unavailable pages stay noindex/follow.
3. CMS: homepage brand metadata, property SEO brand, knowledge/property LINE, and Hero fallback CTA use existing settings. React request caching avoids repeated company queries within one server render. Explicit editorial campaign CTAs remain intact.
4. Conversion: FB click identifiers can supply missing source; explicit UTM wins. LINE sharing is excluded from contact clicks. Failed fetch responses are not treated as successful deduplicated delivery. Actual city/district are populated on property views; unavailable CTA gets its own location label.
5. Unavailable landing page: '已成交' gets '啊！本件已經配對成功 ❤️'. Other reasons remain neutral. Render three public property recommendations before three buying/safety/financing knowledge items, plus LINE and browsing actions. These are current listings, not claimed precise matches: existing availability RPC intentionally returns no original type/price/area.

## Validation

- Frozen-lockfile install; no dependency/lockfile changes.
- TypeScript and ESLint pass.
- next build passes. Existing Supabase SDK process.version Edge warning remains.
- Media delivery, cards/Hero, detail visibility, gallery, mobile detail order, public copy, company identity, homepage social metadata, conversion analytics regressions pass.
- Existing source assertions demanding hardcoded home branding were updated to require CMS branding. JPEG dimensions/size, social fallback/timeout, provider URL rules remain covered.
- Homepage production browsing succeeded. Shell HTTP measurement timed out; no measured production bytes/LCP or end-to-end event insertion is claimed.

## Production verification remaining

- Preview/production deployment must be identified and smoke tested before calling this live.
- Measure initial requests/bytes and rendered srcset on mobile property pages; verify no distant gallery originals are fetched.
- Check HTML canonicals, OG/Twitter and parse rendered JSON-LD; verify sitemap/robots HTTP responses.
- Visit an actual archived/sold URL and a genuinely nonexistent URL; verify recommendations, reason preservation and 404 distinction.
- Use a distinct test UTM link, navigate to a property, open gallery and click LINE; verify attributed rows in analytics dashboard. A LINE click measures intent, not a completed chat.
- CMS team biography content and contacts embedded in editorial body/images remain editorial content. This PR centralizes system-generated identity/contact outputs; it does not automatically rewrite CMS body copy or redesign the settings schema.
