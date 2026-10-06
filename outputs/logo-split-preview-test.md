# Logo Split Preview Test

## Automated verification

- Transparent brand asset: `public/assets/logo-yongmei-transparent.png` (886×886 RGBA, alpha channel confirmed).
- Brand default now points to `/assets/logo-yongmei-transparent.png`.
- Typecheck: PASS.
- Lint: PASS.
- Production build: PASS.
- Company identity mapping: PASS.
- CMS Phase 1 regression: PASS.

## Staging-only follow-up

- `company_name` must be restored to `赫成開發有限公司` through authenticated Staging settings.
- Staging `brand_logo_url` must be updated to the transparent asset after the Preview deployment.
- `franchise_logo_url` must remain the confirmed Pacific logo; Production is untouched.
- Mobile Header and Property detail require manual browser verification.
