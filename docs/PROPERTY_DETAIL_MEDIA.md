# PR #4 — Property detail gallery media

Base: main `0a02dcee1e2d92cebb03a7c4420f6ac26067d034`. Branch: `feature/property-detail-gallery-media`.
User chose dynamic Supabase transforms after the 328-origin quota gate. No billing settings, DB, storage objects or upload pipeline changed. Stop at Preview; no merge or Production release.

## Delivery and loading

Existing shared `detail` policy: 640/960/1280/1600 q82; existing fullscreen policy:1280/1600/2048 q86. Every transform has `resize=contain`, no fixed height. External fallback, original tier and video exclusion unchanged. No new transform builder or global quality change.

Main images remain eager and available in SSR. The two existing responsive DOM trees share identical cover src/srcset/sizes, allowing the same selected URL to be reused. Normal gallery slots reserve their existing 4:3 geometry and receive no img/src until IntersectionObserver reports positive visible area. No gallery prefetch; observer disconnects after admission and cleans up on unmount. Browsers lacking IntersectionObserver fall back to native lazy loading. Lightbox mounts only its current fullscreen derivative; close/navigation/focus/keyboard and image/cover order resolvers are unchanged.

## Baseline (CONFIRMED DOM + HTTP)

Public Production inventory:23 properties,328 distinct live Supabase image origins, no attached live video rows. Video fixture covered by regression tests; no live video property available.

At1280×720, property-6771aa54:54 gallery img nodes,27 hidden mobile copies,27 unique decoded original URLs before scrolling; visible cover767.19×479.48. On390×844 fresh mobile navigation:5 unique originals decoded, cover343×214.38; first grid slots at y1230.63 and1499.88 already decoded.

At1280×720,20260820-farmland:20 gallery img nodes,10 hidden mobile copies; all10 unique originals decoded. Cover4032×2268 rendered767.19×479.48; grid182.8×137.09. On390×844 mobile fresh navigation, only cover decoded; first grid begins y2146.98. After one844px scroll, cover plus first3 originals decoded. Original lightbox mounts one original URL, no separate fullscreen resource.

Decoded image counts are DOM observations, NOT cold-network request counts. Browser cache was not disabled. Exact transferred bytes, duplicate HTTP requests and first-scroll counts for property-6771aa54 were not instrumented. Full traversal below uses individually fetched HTTP resources, not a fabricated browser trace.

## HTTP resource totals (bytes and MiB)

GET Accept:image/webp,image/*;q=0.8. These are response body lengths, not network transfer including headers or cache effects. All59 originals fetched successfully. All236 detail variants plus3 fullscreen2048 cover variants fetched successfully. Additional fullscreen1280 covers measured separately.

| Property | Photos | Original bytes | Original MiB | All640 q82 MiB | All1280 q82 MiB | All1600 q82 MiB |
|---|---:|---:|---:|---:|---:|---:|
| property-6771aa54 | 27 | 4880096 | 4.654 | 0.837 | 1.797 | 1.819 |
| 20260820-farmland | 10 | 37098418 | 35.380 | 0.609 | 2.423 | 3.663 |
| huatan153 | 22 | 19374899 | 18.477 | 0.911 | 3.029 | 4.443 |

huatan153 is an additional HTTP-only sales-photo sample,22images. At1600q82 it totals4.443MiB vs18.477MiB originals. No old rough40–100MiB estimate was substituted for measurements.

## Representative covers

| Property | Original dimensions / bytes | Detail1600q82 dimensions / bytes | Fullscreen2048q86 dimensions / bytes |
|---|---|---|---|
| 20260820-farmland | [4032, 2268] / 4811107 | [1600, 900] / 387968 | [2048, 1152] / 724620 |
| huatan153 | [2364, 1774] / 1745410 | [1600, 1201] / 526536 | [2048, 1537] / 938338 |
| property-6771aa54 | [1477, 1108] / 286064 | [1477, 1108] / 109706 | [1477, 1108] / 133298 |

## After DOM and FB referral scenario

Local production build uses public Production data read-only for apples-to-apples comparison. At390×844 / DPR1,20260820-farmland: exactly2 cover img nodes using the identical640q82 URL (one CSS-hidden);18 source-free detail placeholders. After first844px scroll, still only cover; at scroll1688, first2 detail slots receive640q82 URLs. Opening lightbox mounts one1280q86 image, Next switches to image2/10, close works. No horizontal overflow.

Desktop1280×900 / DPR1: cover960q82, four visible grid thumbnails640q82;14 remaining placeholders including9hidden mobile slots. The original desktop/mobile structures remain; hidden details now produce no image/network work. Actual cover request coalescing/cache reuse still requires Chrome Network verification; DOM duplicates are not claimed to be duplicate HTTP requests.

Accurate sizes follow existing container/grid breakpoints: mobile100vw−32px; desktop cover capped767.2px and min300px summary; grid capped182.8px. Browser scrollbar can reduce actual visible slot by15px at mobile. Expected390px DPR3 selection is1280 for detail and1280 for fullscreen; this is a selection estimate, pending manual DPR3 test. Fullscreen at desktopDPR2 should select2048.

The following is a resource-budget model using confirmed DOM-selected URLs and confirmed HTTP body sizes, NOT a measured cold-network transfer:

| Scenario:20260820-farmland | Before bytes | After bytes |
|---|---:|---:|
| Mobile initial visible image | 4811107 | 64688 |
| Mobile after first844px scroll (cumulative) | 13897382 | 64688 |
| Mobile initial plus one cover lightbox (cumulative distinct resources) | 4811107 | 364868 |
| Desktop first viewport resources (cover+4 thumbnails) | 18060189 | 353220 |
| Full normal-gallery traversal mobileDPR1 | 37098418 | 638304 |
| Full normal-gallery traversal desktopDPR1 | 37098418 | 717984 |

The baseline desktop decoded all10 originals, so its unique decoded-resource budget was35.380MiB before interaction despite only5 images intersecting the first viewport. Fullscreen full-traversal aggregate was not measured; normal-gallery totals must not be presented as full lightbox traversal.

## Headers and exact URLs

All measured transformations returned200,image/webp,Cache-Control:public,max-age=3600,CF-Cache-Status:MISS,x-smart-cdn:true. x-transformations confirms width:N,resizing_type:fit,quality:82 or86. Headers are per-response observations, not a guarantee of future HIT/MISS. Original JPEG Content-Type and exact dimensions/bytes are in the local audit JSON. Representative URLs:
- 20260820-farmland: `https://rlbuadkmylulieoryzal.supabase.co/storage/v1/render/image/public/property-media/446af609-b855-4819-a12f-452ec1036634/cf9db8d6-eec8-47e7-ae25-78a1cabdf464/img-9595-94df6408-0eb4-42ff-8bc4-2a82ade2e63e.jpeg?width=1600&quality=82&resize=contain` (387968bytes)
- 20260820-farmland: `https://rlbuadkmylulieoryzal.supabase.co/storage/v1/render/image/public/property-media/446af609-b855-4819-a12f-452ec1036634/cf9db8d6-eec8-47e7-ae25-78a1cabdf464/img-9595-94df6408-0eb4-42ff-8bc4-2a82ade2e63e.jpeg?width=2048&quality=86&resize=contain` (724620bytes)
- huatan153: `https://rlbuadkmylulieoryzal.supabase.co/storage/v1/render/image/public/property-media/446af609-b855-4819-a12f-452ec1036634/ed2f33ff-06a6-4e72-8cf1-8f08c44e5803/728b9646-05c6-4010-a44f-c2c317afb2db-70e08b88-cfb3-41d2-8aef-163ada592e1b.jpeg?width=1600&quality=82&resize=contain` (526536bytes)
- huatan153: `https://rlbuadkmylulieoryzal.supabase.co/storage/v1/render/image/public/property-media/446af609-b855-4819-a12f-452ec1036634/ed2f33ff-06a6-4e72-8cf1-8f08c44e5803/728b9646-05c6-4010-a44f-c2c317afb2db-70e08b88-cfb3-41d2-8aef-163ada592e1b.jpeg?width=2048&quality=86&resize=contain` (938338bytes)
- property-6771aa54: `https://rlbuadkmylulieoryzal.supabase.co/storage/v1/render/image/public/property-media/446af609-b855-4819-a12f-452ec1036634/8225a5f1-4270-4614-a9b8-8d36ae9f2ba7/img-7841-dd1ae64c-9f25-4a0d-b97e-112e1b0f89fe.jpeg?width=1600&quality=82&resize=contain` (109706bytes)
- property-6771aa54: `https://rlbuadkmylulieoryzal.supabase.co/storage/v1/render/image/public/property-media/446af609-b855-4819-a12f-452ec1036634/8225a5f1-4270-4614-a9b8-8d36ae9f2ba7/img-7841-dd1ae64c-9f25-4a0d-b97e-112e1b0f89fe.jpeg?width=2048&quality=86&resize=contain` (133298bytes)

## Quota and economics

328 current property origins vs at most23 current covers; about305 additional origins if all galleries are encountered. This is an inventory ceiling for the unchanged current property set, not a monthly traffic forecast. At328 monthly origins alone, official Pro pricing implies one US$5 overage package beyond the100 included; other organization/project images, storage and egress are additional. Multiple widths count once per origin per billing cycle. User explicitly accepted option A; billing/spend-cap settings were not changed. Historical13/100 usage is stale and not used as current consumption.
Official: https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations

## Validation

Frozen install, TypeScript, ESLint, complete pnpm test, Next production build, git diff --check and unchanged lockfile:PASS. Includes new delivery, visibility-admission and fullscreen rendering tests; existing card/Hero, Knowledge/LifeNotes/aspect, mobile order, cover/order, gallery and video tests. Additional desktop Life Notes test PASS. No dependency upgrades.

Local analytics emits errors because no service role is configured for the read-only local audit; do not treat those as gallery regressions. Preview Console must be checked separately.

## Human Preview acceptance

- Desktop: crisp main photo; correct cover/order; grid scroll; no layout shift; lightbox close/previous/next/keyboard/fullscreen behavior.
- Mobile: crisp cover; cover→summary→copy→gallery→company order; scrolling/navigation; no overflow; usable lightbox.
- Visual quality: exterior/interior finishes, signs/text, brick/tile, foliage, sky gradients and room lighting. Local1280 fullscreen foliage/sky view inspected; complete sales-photo quality review remains human acceptance.
- Chrome Network with Disable cache: initial request count/bytes; first scroll; one lightbox; complete gallery traversal; duplicate cover requests/cache reuse.
- DPR3 mobile: inspect selected width and q82/q86 resize=contain URLs; no routine4032px original requests.
- Hidden/distant gallery has no downloadable sources until visible; opening lightbox does not fetch all fullscreen photos.
- Video property if available: unchanged poster/click-to-play/preload/Range requests. No live published video was available for automatic smoke.
- Homepage,/properties,Knowledge,LifeNotes and Console regression smoke.
- No merge/Production deployment until human approval.

Raw local evidence:outputs/pr4/{original,derivatives,fullscreen-1280}.json and pr4-public-inventory.json.
