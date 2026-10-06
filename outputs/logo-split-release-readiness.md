# Logo Split Release Readiness

Status: `READY_FOR_MANUAL_PRODUCTION_MIGRATION`

The migration is now additive, idempotent, and safe to paste into the Production SQL Editor during an approved change window. It uses `/assets/logo-yongmei-transparent.png` for an empty brand field and preserves the existing Production `logo_url` for the franchise fallback. No Production database or deployment operation has been performed.
