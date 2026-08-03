# good-m2-cc high-risk regression baseline — 2026-08-03

## Recheck matrix

| ID | Historical risk | Current evidence | Result |
|---|---|---|---|
| HR-01 | Custom CMS page had no public route | `/(public)/[slug]`, published/non-archived query, metadata | PASS |
| HR-02 | Reserved custom slug could shadow fixed routes | centralized reserved slug schema and route guard | PASS |
| HR-03 | Unknown CMS sections appended to homepage | renderer logs `home_cms_unsupported_section` and skips | PASS |
| HR-04 | Site-page save failed to invalidate slug/sitemap | explicit old/new slug + sitemap revalidation | PASS |
| HR-05 | Company values duplicated/hardcoded | centralized settings/fallbacks feed public surfaces | PASS |
| HR-06 | Navigation CRUD failed through Cloudflare action routing | client uses admin Route Handlers; navigation routing tests pass | PASS |
| HR-07 | People edit used `next-action` and returned Production 404 | edit uses `PATCH /api/admin/people/[id]`; test passes | PASS |
| HR-08 | Homepage video did not replay on later carousel rounds | explicit activate/deactivate lifecycle; media regression passes | PASS |
| HR-09 | Mobile homepage video framing cropped heavily | current CSS/renderer hotfix is in baseline; no local visual E2E | PARTIAL |
| HR-10 | MOV/browser compatibility | allowlist is MP4/WebM only; MOV rejected | PASS |
| HR-11 | Video without poster / eager downloads | poster/preload tests in media suite | PASS |
| HR-12 | Requirement/property enum mismatch | shared mapping plus schema validation tests | PASS |
| HR-13 | Requirement price filter used range-overlap semantics | single price contained-by-budget filter and pagination test | PASS |
| HR-14 | People Activities and People–Property relation absent | schema/routes/UI/tests exist | PASS |
| HR-15 | CMS homepage is a brittle legacy adapter | regex replacement and injected legacy script remain | PARTIAL |
| HR-16 | Remaining Server Actions may repeat Cloudflare manifest failures | 11 action modules remain on other admin surfaces | PARTIAL |
| HR-17 | Supabase JS Edge bundle warning | production build succeeds but warns on `process.version` | PARTIAL |
| HR-18 | Production/Preview schema or RLS drift | no catalog/ledger/policy query in this task | PARTIAL |

## Required protection before future CMS releases

1. Run typecheck, lint, CMS/media/navigation regressions and production build.
2. For any flow previously affected by `next-action`, prove the browser request
   is a normal Route Handler request with no `next-action` header.
3. For schema-dependent changes, require Preview precheck/migration/verify and a
   separate read-only Production precheck before merge.
4. For homepage changes, test first load, fallback, navigation, video replay,
   mobile framing, lightbox pause/resume, console and network errors.
5. Do not classify a build warning or missing live evidence as PASS.

## PASS / PARTIAL / FAIL release rule

- A **FAIL** in typecheck, lint, tests, build, route manifest, destructive SQL
  review, or an affected critical browser path blocks commit/release.
- A **PARTIAL** can accompany a documentation-only commit when evidence and
  next action are recorded. It blocks a product release if the changed feature
  depends on that unverified behavior.
- A **PASS** requires evidence from the correct layer: source for wiring,
  automated test for logic, Preview for browser/runtime behavior, and catalog
  queries for schema/RLS state.

## Result

**PASS_WITH_FOUR_ACTIVE_RISK_GROUPS**: legacy homepage architecture, remaining
Server Actions, Edge dependency warning, and runtime schema/RLS parity.
