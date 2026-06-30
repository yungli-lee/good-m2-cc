#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
DB schema drift check template
==============================

This command is intentionally non-destructive. It does not connect to staging
or production automatically and does not run migrations.

Before release, run the checklist in:

  docs/DB_RELEASE_CHECKLIST.md

Minimum command sequence:

  # 1. Compare staging migration history
  npx supabase link --project-ref niorteztdbuyusemsgwa
  npx supabase migration list --linked

  # 2. Compare production migration history
  npx supabase link --project-ref rlbuadkmylulieoryzal
  npx supabase migration list --linked

  # 3. Run required SQL checks from docs/DB_RELEASE_CHECKLIST.md
  #    - table columns
  #    - RLS policies
  #    - storage policies
  #    - profiles roles
  #    - audit_logs grants
  #    - property_media columns

  # 4. Reload PostgREST schema cache after migrations
  npx supabase db query --linked "notify pgrst, 'reload schema';"

  # 5. Confirm Cloudflare production env/secrets in Dashboard or Wrangler
  #    NEXT_PUBLIC_SUPABASE_URL must point to production project:
  #    https://rlbuadkmylulieoryzal.supabase.co

EOF
