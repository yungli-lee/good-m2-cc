# good-m2-cc CMS baseline — 2026-08-03

## Baseline identity

| Item | Value | Result |
|---|---|---|
| Worktree | `/Users/yung/Documents/Codex/worktrees/good-m2-cms-baseline` | PASS |
| Branch | `chore/cms-baseline-20260803` | PASS |
| Baseline HEAD | `ffe51a27753907a420a6a0506c6e4859ff22ec86` | PASS |
| External Git metadata | `.git/worktrees/good-m2-cms-baseline` | PASS — create/delete probe succeeded |
| Database mutation | None | PASS |
| Product-code mutation | None | PASS |

This is a repository and local-build baseline. It does not replace a fresh
Preview/Production schema catalog, authenticated browser acceptance, RLS probe,
or Cloudflare deployment record.

## Status vocabulary

- **PASS**: the current repository contains the complete path required by the
  check and the relevant local automated gate passed.
- **PARTIAL**: implementation exists, but a known architectural risk remains or
  environment/runtime evidence is not part of this baseline.
- **FAIL**: a required path is absent/broken, a required gate fails, or evidence
  contradicts the intended contract.

Product findings may be committed as truthful baseline evidence even when they
are PARTIAL or FAIL. The baseline itself may be labelled PASS only when the
worktree/HEAD are correct, all five documents exist, required commands pass,
and every PARTIAL/FAIL has explicit evidence and a next action. A code release
must not use a baseline-document commit to waive a product FAIL.

## Current repository inventory

| Area | Count / evidence | Result |
|---|---:|---|
| App Router pages | 55 | PASS |
| Route Handlers | 44 | PASS |
| Layouts | 5 | PASS |
| Admin pages | 43 | PASS |
| Public route pages under `(public)` | 6 | PASS |
| Public APIs | 5 | PASS |
| Admin APIs | 30 | PASS |
| Server Action modules | 11 | PARTIAL — Cloudflare action-manifest risk remains on these surfaces |
| Formal migrations | 54 | PASS as repository inventory; runtime application not rechecked |
| Test scripts | 16 | PASS |
| Next build manifest | 100 Edge function routes plus static assets | PASS |

## CMS capability baseline

| Capability | Repository state | Result |
|---|---|---|
| Homepage campaigns | Admin CRUD, active query, image/video renderer, timers and lightbox | PASS |
| Static/custom pages | Admin CRUD, published/non-archived public slug, SEO and sitemap | PASS |
| Navigation | Admin CRUD Route Handlers, header/mobile/footer resolution | PASS |
| Company identity | Centralized settings consumed by public layout, contact and homepage adapter | PASS |
| Knowledge | Admin lifecycle, public listing/detail/API, sitemap reuse | PASS |
| Media library | Image plus MP4/WebM video, poster metadata, reference protection | PASS |
| Homepage architecture | legacy HTML + regex adapter + `dangerouslySetInnerHTML` | PARTIAL |
| Cache invalidation | explicit page/slug/sitemap paths for CMS mutations | PASS |
| Runtime schema/RLS parity | not queried during this repository-only task | PARTIAL |

## CRM Phase 1A baseline

People create/detail/update, address, activities, People–Property relations,
customer requirements, requirement/property-category mapping and property-price
matching are present. Their dedicated local regressions pass. Tasks, attachment
support on People/activity records, and full browser/RLS role-matrix automation
are not part of the current Phase 1A protection and remain PARTIAL or future
scope; see the dedicated CRM document.

## Gates executed

| Gate | Result |
|---|---|
| `pnpm run typecheck` | PASS |
| `pnpm run lint` | PASS |
| `pnpm run test` | PASS |
| `pnpm run test:people-update` | PASS |
| `pnpm run test:people-create-detail` | PASS |
| `pnpm run test:people-activity` | PASS |
| `pnpm run test:people-property-relation` | PASS |
| `pnpm run build` | PASS with existing Supabase Edge warning |
| `git diff --check` | PASS |

The build warning says the installed Supabase bundle references
`process.version`, which Next identifies as unsupported in Edge Runtime. The
build completed and route generation passed; until the dependency/runtime path
is upgraded or verified warning-free, this item remains PARTIAL.

## Five-file delivery set

1. `good-m2-cc-cms-baseline-20260803.md`
2. `good-m2-cc-route-baseline-20260803.md`
3. `good-m2-cc-cms-data-flow-baseline-20260803.md`
4. `good-m2-cc-high-risk-regression-baseline-20260803.md`
5. `good-m2-cc-crm-phase1a-regression-baseline-20260803.md`

## Overall result

**PASS_WITH_DOCUMENTED_PARTIALS**

No FAIL was found in the requested local gates. The PARTIAL findings are the
legacy homepage adapter, remaining Server Action surfaces, the Supabase Edge
warning, and runtime schema/RLS/browser evidence that was not re-executed here.
