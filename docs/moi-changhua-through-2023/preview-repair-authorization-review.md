# Staging Preview repair authorization review

2026-11-01 05:20 Asia/Taipei. No change applied.

Proposed scope: authorize completion of read-only full equivalence checks and, only if all pass in a healthy idle window, replace the predicate of public.moi_preview_transactions on niorteztdbuyusemsgwa using preview-view-candidate-review.sql. Keep all31 columns/types/order, owner, ACL/options, exact counts, alias rules, official notes and detail mapping. Capture fresh original definition before applying; abort if it differs from reviewed metadata. Roll back with preview-view-rollback-review.sql if post-change verification fails. No Production/index/column/layout/timeout/quota/7GB changes, no data deletion, no import until108 annual acceptance passes.

Evidence: current initial paged IDs+exact count canceled57014; precise cause not established. Count EXPLAIN cost44744.14 vs514182.62, ordered LIMIT85.86 vs109.18 (estimates only). Offline model107163 cases, SQL synthetic441 cases, two live1000-row segments differences0. Full candidate SELECT parses. Full live equivalence and all public filters/pages/history remain unverified; deployment prohibited until these pass. Runtime improvement not established.

Files: preview-view-candidate-review.sql, preview-view-rollback-review.sql, preview-view-original-metadata.json. Remaining acceptance preserves108/109/110/111 pending and107 conditional authorization, no106.

The current task explicitly prohibits view/schema mutation. This review requests a narrow exception for the staging view predicate only; neither broad historical append authorization nor prior Preview discussion is treated as overriding that latest boundary. Pause repeat checks pending this authorization, retaining all work.
