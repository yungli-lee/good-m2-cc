# CMS Phase 1 known limitations

## Non-blocking limitations

1. The homepage remains a legacy HTML document hydrated by a client component
   and modified through an adapter/regex renderer. This phase deliberately did
   not replace it with a section builder.
2. Homepage navigation labels/order are still code-defined. Company identity
   and contact destinations are CMS-connected, but navigation CMS belongs to a
   later phase.
3. Only homepage section IDs already supported by the adapter are replaceable.
   Unsupported records now produce a warning and remain available through their
   independent page rather than being silently appended.
4. Company settings do not have a separate marketing site-name field. Header
   branding currently uses `company_name` and `franchise_name`.
5. Sitemap knowledge retrieval is capped at 1,000 published articles per build
   request. Pagination should be added before the catalog approaches that size.
6. Full Preview CRUD/browser acceptance remains pending because this task does
   not deploy.

## Closed Email/ledger side work

The prior Email reconciliation task is
`CLOSED_WITH_NON_BLOCKING_GAPS`. Missing Email Diagnostics success/failure
coverage and exact Cloudflare Preview metadata are separate work and do not
block CMS Phase 1 development.

No formal reconciliation migration or ledger repair was created.

## Required Preview acceptance

- Create a non-reserved custom page and verify independent rendering/metadata.
- Change it to draft and archived and verify 404/no sitemap entry.
- Update company phone or Email and verify Header/Footer/contact/home surfaces.
- Create two reminders, reorder them, publish/unpublish one, and delete a test
  reminder.
- Confirm sitemap and robots responses against staging data.
- Confirm supported homepage edits are visible without redeploying.
