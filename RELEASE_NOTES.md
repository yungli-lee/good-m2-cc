# Release Notes

---

## admin-timeline-edit-company-settings (Draft)

Tag:
尚未建立

Date:
2026-06-30

Completed

- Add inline edit forms for property timeline events
- Allow owner/admin/editor to update timeline events while retaining delete behavior
- Add company settings table with public defaults and admin maintenance page
- Show public company information below property detail CTA buttons

Not Included

- Push to main or staging

Verification

- Timeline tests ✅
- TypeScript ✅
- ESLint ✅
- Build ✅

---

## admin-property-save-media-hotfix (Draft)

Tag:
尚未建立

Date:
2026-06-30

Completed

- Add admin property grants/RLS refresh for owner/admin property updates
- Add sanitized server logs for edit save DB failures
- Support multi-image append upload on new and edit property forms
- Keep existing property photos when uploading more images

Not Included

- Push to main or staging

Verification

- Parser tests ✅
- Export tests ✅
- Timeline tests ✅
- Health tests ✅
- TypeScript ✅
- ESLint ✅
- Build ✅

---

## admin-property-form-media-fix (Draft)

Tag:
尚未建立

Date:
2026-06-30

Completed

- Show floor price and service fee fields on new/edit property forms
- Restore new property photo upload with drag-and-drop support
- Restore edit property media manager with upload, cover, and delete actions
- Restrict property type dropdown to 7 requested options

Not Included

- Push to main or staging

Verification

- Parser tests ✅
- Export tests ✅
- Timeline tests ✅
- Health tests ✅
- TypeScript ✅
- ESLint ✅
- Build ✅

---

## B-admin-property-internal-fields-expiry (Draft)

Tag:
尚未建立

Date:
2026-06-30

Completed

- Land/building ping input and export support up to 3 decimal places
- Internal property fields: `service_fee_rate`, `floor_price`
- AI parser support for service fee and floor price
- Admin-only listing expiry tool
- Expired published listings are moved back to draft and write timeline events

Not Included

- Public display of internal fields
- Automatic DB writes from public requests
- Push to main or staging

Verification

- Parser tests ✅
- Export tests ✅
- Timeline tests ✅
- Health tests ✅
- TypeScript ✅
- ESLint ✅
- Build ✅

---

## B-002-property-timeline (Draft)

Tag:
尚未建立

Date:
2026-06-30

Completed

- `property_timeline_events` migration with RLS
- Admin property timeline list and create form on `/admin/properties/[id]/edit`
- Timeline delete for owner/admin
- Automatic timeline events for property create, publish/unpublish, featured/unfeatured, and price changes
- `npm run test:timeline`
- `npm run test:health`

Not Included

- Public timeline display
- Progress notes migration into timeline
- Health Score rule changes
- Push to main or staging

Verification

- Timeline tests ✅
- Health tests ✅
- Parser tests ✅
- Export tests ✅
- TypeScript ✅
- ESLint ✅
- Build ✅

---

## B-001-property-health-score (Draft)

Tag:
尚未建立

Date:
2026-06-30

Completed

- Admin Property Health Score helper
- Health score display on `/admin/properties`
- Health score summary on `/admin/properties/[id]/edit`

Not Included

- Database schema changes
- Publish workflow changes
- Public property page changes
- Push to main or staging

Verification

- TypeScript ✅
- ESLint ✅
- Build ✅

---

## property-management-v1

Tag:
property-management-v1

Date:
2026-06-26

Completed

- Admin Login
- Session / Middleware
- Property List
- Draft Create
- Property Edit
- Publish Workflow
- Featured Property

Not Included

- Homepage Featured API
- Media Upload
- Delete

Verification

- TypeScript ✅
- ESLint ✅
- Build ✅

Git Tag

property-management-v1

---

## documentation-standard-v1

Tag:
尚未建立

Date:
2026-06-26

Completed

- Engineering Standard v1
- Rule 1~6
- Development Workflow
- Documentation workflow
- Module workflow

Not Included

- No runtime change
- No code change
- No schema change

---

## homepage-content-v1 (Draft)

Tag:
尚未建立

Date:
2026-06-26

Completed

- Homepage Featured Query
- Homepage Featured Integration

Not Included

- Media
- Search
- SEO
- TikTok
- Analytics Dashboard
- GA4 tracking script / page_view
