# CMS Phase 1 test report

## Result

**PASS — ready for Preview deployment review**

## Automated verification

| Verification | Result | Evidence |
|---|---|---|
| Typecheck | PASS | `npm run typecheck` |
| Lint | PASS | `npm run lint` |
| Production build | PASS | Next.js 15.5.19 build completed |
| Route manifest | PASS | `/(public)/[slug]/page`, `/(public)/contact/page`, sitemap and robots routes generated |
| CMS Phase 1 regression | PASS | reserved slugs, independent custom page behavior, reminder order/link, company replacements, Markdown escaping |
| Property export | PASS | existing test |
| Property health | PASS | existing test |
| Property AI parser | PASS | existing test |
| Property timeline | PASS | existing test |
| SQL/migration safety | PASS | formal migration count remains 42; existing migrations unchanged |
| Git whitespace review | PASS | `git diff --check` |

## Acceptance-case coverage

| Case | Local verification |
|---|---|
| 1. Add custom page | Admin schema/API accept non-reserved slug; route queries published/non-archived row and renders independent URL |
| 2. Modify SEO | `generateMetadata()` reads CMS SEO/cover/date fields with field-level fallback |
| 3. Unpublish/archive | Public query excludes both states; route calls `notFound()` |
| 4. Company data | Header/Footer/contact/home API consume centralized company settings; company save revalidates public paths |
| 5. Multiple reminders | Existing CRUD/order/status/delete retained; renderer-order test passes; independent page and sitemap added |
| 6. Homepage save effective | Supported sections still replace legacy IDs; unknown sections warn and do not masquerade as homepage support |
| 7. Cache | Site-page APIs revalidate homepage, slug, contact, sitemap; company action revalidates all connected surfaces |

## Static checks

- Metadata inspection confirmed canonical, Open Graph title/description/image,
  published time, modified time, and noindex fallback.
- Sitemap inspection confirmed all sources use published public queries and
  reserved custom slugs are filtered.
- Robots inspection confirmed `/admin` and `/api` exclusions.
- Inquiry route was not modified.
- Knowledge routes/queries were not modified except read-only sitemap reuse.
- Property runtime code was not modified; all existing property tests pass.

## Not performed

- No Preview deployment or browser acceptance test.
- No staging CRUD data was created or modified.
- No Production smoke test.

Those are the next Preview-stage acceptance steps, not local build failures.
