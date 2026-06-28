# Release Flow

good.m2.cc is treated as a production commercial platform. High-risk admin features, including `/admin/users`, must not be validated directly against production.

## 1. Branch Strategy

### Feature branches

- Use feature branches for implementation work.
- Feature branches may create Cloudflare preview deployments when useful.
- Feature branch previews must not use production Supabase for high-risk admin/auth/database changes.

### Staging branch

- Use `staging` as the release validation branch.
- Merge completed feature work into `staging` before production.
- The staging branch must deploy to a staging Cloudflare Pages environment connected to a staging Supabase project.

### Production branch

- Use `main` as the production branch.
- Only merge `staging` into `main` after staging validation passes.
- Do not push unverified high-risk backend/admin changes directly to `main`.

## 2. Cloudflare Pages Setup

Recommended branch mapping:

| Branch | Cloudflare target | Purpose |
|---|---|---|
| `main` | Production | Live good.m2.cc |
| `staging` | Preview/Staging | Release validation before production |
| feature branches | Preview, optional | UI/dev review only |

Cloudflare Pages should have environment variables separated by deployment environment. Staging must not inherit production Supabase credentials for high-risk testing.

## 3. Supabase Project Separation

Use separate Supabase projects:

| Environment | Supabase project | Data policy |
|---|---|---|
| Production | Production Supabase | Real users, real inquiries, real listings |
| Staging | Staging Supabase | Test users and test data only |

Each project must have its own:

- Supabase URL
- anon key
- service role key
- Auth users
- Storage buckets
- RLS policies
- migrations applied

Do not use the production Supabase project for `/admin/users`, role changes, disable/restore, upload, or inquiry mutation testing.

## 4. Environment Variables

Both production and staging need the following environment variables.

| Variable | Production | Staging | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase URL | Staging Supabase URL | Public client config |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key | Staging anon key | Public client config |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role key | Staging service role key | Server only; never expose client-side |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Production site key | Staging site key | Public Turnstile key |
| `TURNSTILE_SECRET_KEY` | Production secret | Staging secret | Server-side verification |
| `IP_HASH_SECRET` | Production secret | Staging secret | Use different values per environment |
| `RESEND_API_KEY` | Production Resend key | Staging Resend key or disabled test key | Email notifications |
| `CONTACT_FROM_EMAIL` | Production sender | Staging sender | Current default: `service@m2.cc` |
| `CONTACT_FROM_NAME` | Production sender name | Staging sender name | Current default: `阿勇不動產顧問` |
| `CONTACT_NOTIFY_TO` | Production recipient | Staging test recipient | Do not send staging test leads to production recipients unless intentional |

Current repo warning: `wrangler.toml` currently points preview and production to the same Supabase project. This must be fixed before relying on preview/staging for high-risk validation.

## 5. Migration Process

### Staging first

1. Create or update the staging Supabase project.
2. Apply migrations to staging in filename order.
3. Deploy the `staging` branch to Cloudflare Pages staging.
4. Validate `/admin/users`, auth, RLS, audit logs, and pending access.

### Production after staging passes

1. Take a production database backup.
2. Confirm a rollback path or forward-fix plan.
3. Apply the same migrations to production in filename order.
4. Deploy `main` to production.
5. Run production smoke tests.

### Migration order

Apply migrations in order:

1. `supabase/migrations/202606250101_sprint_a_core_platform.sql`
2. `supabase/migrations/202606260101_a011_admin_profile_display_name.sql`
3. `supabase/migrations/202606270101_grant_public_property_read.sql`
4. `supabase/migrations/202606270102_admin_user_management_p0.sql`

Do not patch production schema manually unless it is an emergency.

## 6. `/admin/users` Staging Verification Checklist

Create staging-only test users:

- one `owner`
- one `admin`
- one `editor`
- one `viewer`

Checklist:

- Owner can sign in and access `/admin`.
- Admin can sign in and access `/admin`.
- Editor can sign in and access `/admin`.
- Viewer can sign in and is sent to `/admin/pending`.
- Pending page shows no admin navigation or admin features.
- Owner can access `/admin/users`.
- Admin can access `/admin/users`.
- Editor cannot access `/admin/users`.
- Viewer cannot access `/admin/users`.
- Owner can change `viewer -> editor`.
- Owner can change `viewer -> admin`.
- Owner can change `editor -> viewer`.
- Owner can change `editor -> admin`.
- Owner can change `admin -> viewer`.
- Owner can change `admin -> editor`.
- Admin can change `viewer -> editor`.
- Admin can change `editor -> viewer`.
- Admin cannot manage `admin`.
- Admin cannot manage `owner`.
- UI does not provide an option to upgrade anyone to `owner`.
- Owner cannot disable self.
- Last active owner cannot be disabled.
- Last active owner cannot be downgraded.
- Disabled editor cannot enter admin.
- Restored editor can enter admin again.
- Viewer upgraded to editor can refresh `/admin/pending` and enter `/admin`.
- Display name can be updated.
- Empty display name is stored consistently as `null`.
- Audit logs include:
  - `role_changed`
  - `user_disabled`
  - `user_restored`
  - `display_name_updated`
  - `failed_permission_attempt`
- Audit logs include actor user id, target user id, before/after data, IP hash, and user agent where available.

## 7. Rollback Plan

### App rollback

- Use Cloudflare Pages deployment rollback to restore the previous production deployment.
- If the issue is isolated to the UI, app rollback may be enough.
- After rollback, verify `/admin`, `/admin/login`, and public pages.

### DB migration rollback

- Database rollback is more sensitive than app rollback.
- Enum additions are usually not safely reversible without careful cleanup.
- Trigger/function changes should be rolled forward with a corrective migration when possible.
- Always take a production backup before applying production migrations.
- If a migration causes auth lockout, use an owner recovery SQL runbook and restore from backup only if a forward fix is unsafe.

### Feature flag recommendation

For future high-risk admin features:

- Add a server-side feature flag for new admin routes.
- Default production to off until staging validation passes.
- Keep security checks active even when UI is disabled.
- Use feature flags to hide UI, not to bypass RBAC/RLS/audit protections.

## 8. Prohibited Actions

- Do not manually change production schema in Supabase SQL Editor unless it is an emergency.
- Do not use production Supabase for preview testing of high-risk features.
- Do not directly push `main` to test admin permission behavior.
- Do not directly edit `profiles.role` in Table Editor for normal operations.
- Do not test disable/restore/role changes against real production users.
- Do not expose service role keys in client code or public logs.

## 9. Minimal Staging Setup Steps

When back on the MacBook, do the following:

1. Create a `staging` branch from current local `main`.
2. Create a new Supabase staging project.
3. Configure staging Auth settings.
4. Apply all migrations to staging in order.
5. Create staging-only test users.
6. Set one staging user as `owner`.
7. Create/confirm Cloudflare Pages staging branch deployment for `staging`.
8. Set Cloudflare staging environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `IP_HASH_SECRET`
   - email notification variables if needed
9. Push `staging`.
10. Wait for the staging deployment.
11. Run the `/admin/users` staging verification checklist.
12. Fix issues on feature/staging branches if needed.
13. After staging passes, back up production Supabase.
14. Apply production migrations.
15. Merge `staging` into `main`.
16. Deploy production.
17. Run production smoke tests.

## 10. Production Smoke Test Checklist

After production deployment:

- Public homepage loads.
- Public properties pages load.
- `/admin/login` loads.
- Owner can sign in.
- Owner can access `/admin/users`.
- Viewer test account goes to `/admin/pending`.
- No admin navigation appears on `/admin/pending`.
- Audit log writes for a low-risk display name update.
- No raw database error is shown to the user.
- Cloudflare deployment status is healthy.
- Supabase logs show no repeated auth/profile errors.

