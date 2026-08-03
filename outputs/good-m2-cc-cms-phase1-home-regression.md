# CMS Phase 1 — Homepage Regression Record

## Automated gates

| Gate | Result |
|---|---|
| TypeScript | PASS |
| ESLint | PASS |
| CRM Customer Requirements Phase 1 | PASS |
| CRM Customer Requirements Phase 2A | PASS |
| Media Library Video Phase 1 | PASS |
| CMS single renderer / registry | PASS |
| Property health | PASS |
| Next production build | PASS |
| Cloudflare pages build | PASS |
| `git diff --check` | PASS |

## Homepage and media protection

- Header/footer have one React owner each.
- All 19 homepage section slots and existing anchors remain present.
- CMS unavailable state renders the static fallback instead of returning 500.
- Video source is active-only; inactive slides release the source.
- First and later rounds reset and replay through the explicit lifecycle helper.
- Image duration, 30-second video cap, failed-video five-second advance,
  reduced-motion behavior and visibility resume remain wired.
- Lightbox opening deactivates the background video; controls, Escape and
  backdrop close remain in the shared lightbox.
- Poster and video mobile framing continue using the existing stylesheet hooks.

## Manual/local verification

Local browser verification confirmed one header, one footer, 19 main sections,
all expected IDs, the default H1, no horizontal overflow, no not-found heading,
and the behavior-only enhancement script loading after hydration. With local
Supabase variables intentionally absent, all four CMS sources safely degraded
and the homepage remained usable.

Live CMS update, live reorder/hidden mutation and production media playback are
not performed in this implementation worktree. They require a deployed Preview
with authenticated CMS access and are acceptance items, not fabricated PASSes.

## Known partials

- Non-CMS static copy remains in an explicit per-section compatibility content
  map. The old full-page skeleton and regex adapter are gone.
- Property discovery, calculator, reminder accordion and inquiry form still use
  the legacy behavior script. These are isolated from structural rendering.
- The baseline Supabase Edge `process.version` warning remains a known upstream
  warning. Build output must be compared separately before claiming no new warnings.

## Phase 2 suggestions

Convert the remaining static compatibility sections and four behavior groups to
typed React components; add Preview fixture controls for order/visibility; then
retire `legacy-section-content.ts`, `legacy-static/script.js`, and the unused
public home CMS aggregation endpoint.

## Rollback

Revert the Phase 1 commit. There is no schema migration, production SQL, or CMS
data transformation to undo.
