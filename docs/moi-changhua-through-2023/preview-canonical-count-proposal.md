# Preview canonical count candidate — review only

2026-10-31 20:57 Asia/Taipei. Project: niorteztdbuyusemsgwa only.

## Evidence
Current broad sale failure at 10:06:44.480Z is PostgREST14.5 SQLSTATE57014 in the initial paged IDs plus exact canonical count statement. Cancellation mechanism is not established. No public request was repeated this round.

EXPLAIN only (not ANALYZE) of the candidate in preview-canonical-count-candidate.sql produces two parallel Hash Anti Joins, estimated total cost44744.14. Previous view count cost514182.62. Planner cost is not milliseconds or a runtime guarantee. Hash plans require memory and may spill; no settings were changed. Do not replace the paged-ID query with this plan without separately checking ordered LIMIT performance.

## Candidate and semantics
Move each source-key prefix test inside its correlated NOT EXISTS. Preserve the substring alias exclusion and the moi:a:n: to n:a: alias exclusion with all seven IS NOT DISTINCT FROM comparisons. This permits anti-join planning while preserving exact count and aliases. With a NULL source key, equality cannot match any canonical key; both old predicates and candidate retain the row. No approximate count or raw-table count substitution.

## Required validation before any deployment
1. Inspect the exact current view definition, options, owner, grants and dependent objects. Preserve every selected column and security property.
2. Test representative synthetic cases offline: no alias; generic alias; second alias with every matching field; each single-field mismatch; null/null and null/non-null comparisons; NULL key; overlapping prefixes; canonical chains. Old and new membership must match.
3. In a healthy idle staging window, perform bounded read-only membership comparisons by ID ranges in the same statement/snapshot: symmetric difference of old and candidate IDs must be zero. Compare all rows, not only count; stop on slow/error/resource pressure, no retry. Do not raise timeout.
4. Compare sale/presale exact counts and ordered page IDs, including first/last/empty pages and narrow filters; verify master/detail/official-note data unchanged. EXPLAIN ordered LIMIT separately before considering a shared-view rewrite.
5. Only after explicit authorization for the staging view/query change: capture exact original definition for rollback, apply minimal reviewed change preserving options/grants/columns, and run existing public pagination/history checks using public response IDs only. On failure restore the reviewed original definition; never alter Production or limits.

## Authorization boundary
This round applies no schema/view/index/API change. A view predicate rewrite is outside the current read-only authorization. This is a concrete count candidate, not a deploy-ready migration: the full existing view and ordered-page plan must be validated before requesting approval to apply a final view definition. Continue safe read-only preparation first.

## Status
ACTIVE_HEALTHY; other active SQL0 at12:57:51Z; DB6247926931 bytes (+32768 from prior diagnostic, +4382720 from108 baseline), headroom752073069 bytes. No import/delete.108 annual acceptance and109/110/111 closeout remain pending;107 not started; no106.
