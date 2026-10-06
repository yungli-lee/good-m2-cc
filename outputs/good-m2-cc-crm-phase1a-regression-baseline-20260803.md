# good-m2-cc CRM Phase 1A regression baseline — 2026-08-03

## Protected capability matrix

| Capability | Schema | API/action | UI | Automated evidence | Result |
|---|---|---|---|---|---|
| People create/detail | `people`, `person_roles` | create action + queries | new/detail | `test:people-create-detail` | PASS |
| People edit/address | `people.address` | `PATCH /api/admin/people/[id]` | client fetch form | `test:people-update` | PASS |
| Empty normalization | nullable People fields | payload builder/normalizer | preserved form errors | People tests | PASS |
| Activities/visit records | `people_activities` | `/api/admin/people-activities` | People detail capture/list | `test:people-activity` | PASS |
| People–Property | `people_properties` | create/update/archive APIs/actions | People and property panels | `test:people-property-relation` | PASS |
| Customer requirements | `crm_customer_requirements` | CRUD/duplicate/status APIs | People summary + central list/detail/edit | Phase 1 tests | PASS |
| Requirement/property mapping | English DB enums | shared schema validation | Chinese labels/options | Phase 1 tests | PASS |
| Property-price matching | sale/rent min/max | contained-price query | central requirement filter | Phase 2A tests | PASS |
| Activity linkage to requirement | nullable `requirement_id` | activity helper | activity history | requirement migration/test evidence | PASS |

## Regression commands executed

| Command | Result |
|---|---|
| `pnpm run test:people-update` | PASS |
| `pnpm run test:people-create-detail` | PASS |
| `pnpm run test:people-activity` | PASS |
| `pnpm run test:people-property-relation` | PASS |
| `pnpm run test:requirements-phase1` | PASS |
| `pnpm run test:requirements-phase2a` | PASS |
| `pnpm run test:health` | PASS |

## Contracts that must not regress

- People edit remains a JSON `PATCH` Route Handler flow; it must not return to
  an RSC POST with `next-action`.
- UUID, session and editable-role checks remain server-side.
- Empty email/address and other nullable strings normalize to `null`.
- Activities and relations must preserve safe 401/403/404/validation/DB-error
  handling and must not expose Supabase error details.
- Requirement enums remain English in DB/API while user-facing labels remain
  Chinese with a safe unknown fallback.
- Requirement type changes remove incompatible property categories.
- Property price matching uses `(min is null or min <= price) AND (max is null
  or max >= price)`, with buy/rent columns selected independently.
- Filter count is calculated before pagination and uses identical predicates.

## Known gaps

| Gap | Result | Next action |
|---|---|---|
| People/profile photo and visit/activity image attachments | PARTIAL | design one attachment model and reference policy; do not duplicate equivalent fields |
| Tasks/reminders/work packages | PARTIAL | separate schema/API/RLS/test phase |
| People list scale/pagination | PARTIAL | verify current query limit against real row count and add pagination |
| Role-matrix browser/RLS E2E | PARTIAL | Preview tests for owner/admin/editor/viewer with isolated data |
| Production schema/RLS ledger evidence | PARTIAL | read-only catalog and ledger gate |

## Change safety rule

Any future CRM change is FAIL if it breaks one of the dedicated scripts above,
reintroduces Server Action editing for People, changes DB enum values without a
migration plan, weakens role/session validation, or applies a price predicate
after pagination. A documentation-only PARTIAL is acceptable only with a named
gap and next action.

## Result

**CRM_PHASE1A_REGRESSION_PASS_WITH_SCOPE_GAPS**
