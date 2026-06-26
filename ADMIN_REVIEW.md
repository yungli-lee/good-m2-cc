# Admin Integration Review

Date: 2026-06-26
Branch: `preview/sprint-a-production-wiring`
Scope: Sprint A Plan II admin integration check

This review covers the currently completed admin flow only. It does not add new functionality.

## 現況

### Reviewed Routes

| Route | Current Status | Notes |
| --- | --- | --- |
| `/admin/login` | Implemented | Supabase email/password login via server action. Shows configured error states. Logged-in admin roles redirect to `/admin`. |
| `/admin` | Implemented as placeholder | Shows current user email, role, logout button, and links to properties and inquiries. Not a full dashboard. |
| `/admin/properties` | Implemented Phase 1 list | Requires `editor`, `admin`, or `owner`. Reads Supabase `properties`. Shows empty state. No edit/delete/publish actions exposed on the list. |
| `/admin/properties/new` | Implemented Phase 2 draft create | Requires `editor`, `admin`, or `owner`. Creates `status = draft` with `title`, `slug`, `price`, and `address_public`. |

### Auth And Session

- Login uses `createSupabaseServerClient()` and `supabase.auth.signInWithPassword()`.
- Logout uses `supabase.auth.signOut()` and redirects to `/admin/login`.
- Middleware protects `/admin/*` and `/api/admin/*`.
- Middleware redirects unauthenticated page requests to `/admin/login`.
- Middleware returns `401` for unauthenticated `/api/admin/*`.
- Logged-in users visiting `/admin/login` are redirected to `/admin`.

### Roles

- Role scaffold is centralized in `types/auth/admin.ts`.
- Admin roles are `editor`, `admin`, and `owner`.
- `viewer` exists as a non-admin fallback role.
- Admin pages use `requireRole(["editor", "admin", "owner"])`.
- Publish/delete/media/sensitive helpers are already defined for later phases.

### Property Draft Create

- `/admin/properties/new` uses `DraftPropertyForm`.
- Draft create uses a dedicated `createDraftPropertyAction()`.
- It inserts into existing `properties` schema.
- It relies on existing table defaults for fields not included in Phase 2.
- It redirects to `/admin/properties` after success.
- Validation errors return field state and keep the user on the form.

## 發現問題

### P1

1. Login success destination is inconsistent with the current A-011 target.

   `loginAction()` currently redirects to `/admin/properties` after successful login, while the newer admin shell expects `/admin` as the post-login landing page. Middleware and `/admin/login` already treat `/admin` as the logged-in destination.

   Risk: Not blocking, but the login flow bypasses the admin placeholder page and can make validation inconsistent.

2. `/admin/login` is wrapped by `app/admin/layout.tsx`.

   The login page currently displays the admin topbar and links such as `物件管理`, `詢問單`, and `前台物件`. For unauthenticated users, protected links redirect back to login.

   Risk: Not a dead link, but confusing UX.

### P2

3. `/admin` shows a logout button, and `app/admin/layout.tsx` also shows logout when logged in.

   Risk: Duplicate UI on `/admin`. Functionally safe, visually noisy.

4. Existing full property actions remain in `app/admin/properties/actions.ts`.

   Phase 1 and Phase 2 currently expose only list and draft create, but older actions for update, publish, delete, upload, and cover remain in the same file for existing routes.

   Risk: Not exposed from the current Phase 1 list, but the file mixes Phase 2 draft create with later CRUD/media behavior. This should be organized before broadening CRUD again.

5. Empty State copy references "後續建置中的新增頁" on `/admin/properties`.

   Now that `/admin/properties/new` can create drafts, the copy should be updated in a small follow-up.

   Risk: Copy is stale, not functional.

### P3

6. `DraftPropertyForm` uses inline style for field errors.

   Risk: Acceptable for Phase 2, but shared admin form error styling would be cleaner.

7. `parsePublicLocation()` is local to `/admin/properties/page.tsx`.

   Risk: Fine for now. If location parsing is reused later, extract helper.

8. `statusLabel` is repeated in multiple admin files.

   Risk: Low. Can extract later if status display grows.

## Dead Link / Redirect Review

| Item | Finding |
| --- | --- |
| `/admin/login` unauthenticated | OK. Shows login form. |
| `/admin/login` authenticated | OK. Redirects to `/admin`. |
| Login success | Works, but redirects to `/admin/properties`; recommended to align to `/admin`. |
| Logout | OK. Redirects to `/admin/login`. |
| `/admin` unauthenticated | OK. Middleware redirects to login. |
| `/admin/properties` unauthenticated | OK. Middleware redirects to login. |
| `/admin/properties/new` unauthenticated | OK. Middleware redirects to login. |
| `/admin/properties` Empty State | OK. Shows empty row. Copy should be updated. |
| Draft create success | OK by code path. Redirects to `/admin/properties`. |

## 建議改善

### Priority 1

1. Align successful login redirect to `/admin`.
2. Hide or simplify admin topbar on `/admin/login`.
3. Update `/admin/properties` empty state copy now that draft create exists.

### Priority 2

4. Remove duplicate logout button from either `/admin` page body or admin layout.
5. Split property actions by phase or responsibility:
   - draft create
   - full CRUD
   - publish/delete
   - media
6. Extract shared property status labels.

### Priority 3

7. Extract shared admin field error style.
8. Extract location parsing only if reused.
9. Add a small route/link checklist to future admin reviews.

## 重構觀察

### Good Candidates

- `types/auth/admin.ts` is already a good central place for role types.
- A future `lib/properties/status.ts` could hold status labels and status helpers.
- A future `lib/properties/location.ts` could hold public address parsing if needed.
- `app/admin/properties/actions.ts` is the most likely file to split as property features grow.

### Not Recommended Yet

- Do not extract property form abstraction further until A-012 Phase 3 clarifies edit requirements.
- Do not introduce a dashboard abstraction yet; `/admin` is still a placeholder.
- Do not change database schema for this review.

## 是否建議開始 A-012 Phase 3

建議先做一個 very small cleanup task before A-012 Phase 3:

1. Align login success redirect to `/admin`.
2. Remove duplicate logout UI or decide where logout should live.
3. Update stale empty-state copy on `/admin/properties`.

After those small fixes, it is reasonable to start A-012 Phase 3.

Reason: The current foundation is functional, but Phase 3 will likely add edit-related links and actions. Cleaning the small navigation and copy inconsistencies first will reduce confusion before expanding the admin surface.
