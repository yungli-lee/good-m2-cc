# Property cards and homepage Hero media

## Implementation

Public PropertyCard (/properties, filtered results, /areas/[slug]) and HomePropertyCard (Featured, Latest, home search) opt into the shared DeliveredImage renderer. The property-card policy uses 384/640/960, quality 80, resize=contain, no height. Existing card quality 75 and Knowledge/Life Notes behavior are unchanged. External URLs and video URLs retain the helper fallback. Admin cover previews do not opt in. Cover selection and query ordering are unchanged.

Hero previously mounted all six original image sources, including five hidden slides. It now mounts active + next only; autoplay advances this window. Existing slide structure, order, controls, transitions and video logic remain unchanged. Known Supabase raster assets larger than 1 MiB use shared 960/1280/1600/2048 quality 86 contain delivery; smaller or unknown assets retain originals. Two current PNGs qualify.

## Measurement method and results

Baseline was captured before implementation; after measurements reuse the same Production originals through read-only HTTP and the local production build. These are image resource-set byte totals, **not measured cold-load page transfer**, LCP or Core Web Vitals. GETs negotiated WebP. All 71 derivatives returned HTTP 200, image/webp, public max-age=3600, CF-Cache-Status MISS, x-smart-cdn true. x-transformations reports width, resizing_type:fit, quality:80 (cards) or quality:86 (Hero). All use /render/image/public/ and resize=contain; baseline originals use /object/public/.

| Resource set | Before bytes | After 384w | After 640w | After 960w |
|---|---:|---:|---:|---:|
| Homepage 18 property covers | 20,900,916 | 473,066 | 1,204,830 | 2,333,620 |
| /properties 21 covers | 21,715,608 | 517,002 | 1,307,948 | 2,539,600 |

Maximum 960w card: 262,002 bytes (256 KiB); none are MB-sized. Representative 1024x768 original: 340,115 bytes; derivatives 384x288: 19,166; 640x480: 57,546; 960x720: 133,630 bytes. Small/simple cards can be below the 80–250 KB target; the maximum detailed card is below 300 KB.

Hero baseline six-image set: 4,364,911 bytes. At desktop 1600w selection, initial active original + next derivative: 574,703 + 87,724 = 662,427 bytes. All six after visiting the carousel: 1,057,010 bytes (the second large PNG is 69,584 bytes). Homepage scoped cards + initial Hero: 1,135,493 bytes at 384w cards, versus baseline cards + all Hero 25,265,827 bytes. This changes the resource set intentionally; it is not a cold-cache browser benchmark.

Initial downloadable Hero source count: 6 -> 2, confirmed in server HTML and live DOM. Actual cold-cache request count awaits Chrome. Local DOM observed autoplay moving from slide 0 to 2 and 4, always with only active + next image elements. Pointer-control automation timed out, so arrows/dots remain on the human checklist.

## DOM evidence

Observed DPR1, not DPR3. All public card images have src/srcset/sizes, loading=lazy and are not hidden. Source defaults to 640w, srcset contains only 384/640/960; currentSrc selected 384w in the measurements below. DOM natural dimensions are density-corrected by the browser for width descriptors; use HTTP decoded dimensions for actual response pixels.

| Viewport / route | Rendered card width x height | Example DOM natural width x height | Selected request |
|---|---|---|---|
| 1440x900 /properties | 359.33x269.48 | 359x269 | 384w |
| 390x844 /properties | 341x255.75 | 356x267 | 384w |
| 1280px homepage | 366.33x228.95 | 371x660 (portrait) | 384w |
| 390x844 homepage | 278x173.75 | 317x565 (portrait) | 384w |

Homepage sizes reflects the CSS grid maximum slot: mobile max(280px,82vw)-2px, two-column tablet, three-column desktop capped at 381px. The mobile carousel grid can resolve to its 280px minimum with multiple cards; sizes conservatively describes its upper bound. Listing sizes follows 32px container margins, gaps and borders, capped at 360px. Desktop DPR1 typically selects 384w; higher density can select 640/960. Mobile DPR3 is expected to select at most 960w; 341px x 3 exceeds this cap slightly by design.

HTML comparisons confirm all 18 homepage and 21 listing cover URLs and their order are unchanged after normalizing the transform path. No duplicate origin occurs between current Featured and Latest. Both use the same component/policy, so any shared cover at the same candidate width produces the exact same URL and is eligible for browser cache reuse. Actual duplicate network requests have not been measured with a cleared cache.

## Quota gate

Existing baseline: 13/100 organization transform origins, with reporting delayed up to 24 hours. Published Production covers: 21 (21% of included 100); homepage 18 is a subset. Three widths count as one origin, not three. Staging adds up to four covers; only two Production Hero origins qualify for transformation. Illustrative incremental ceiling 13+21+4+2=40, not a monthly forecast or a fresh usage reading. Other content, changed covers and Preview assets also consume allowance. Current inventory does not justify stopping rollout. Reassess as total monthly origins approach 80–100; do not infer unlimited usage from low bandwidth.

Existing quota research: https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations . Pro includes 100 origins; excess is sold in 1,000-origin packages at $5, subject to billing/spend-cap behavior. Dynamic delivery is minimal for the current inventory. Pre-generated variants avoid monthly transform-origin metering but require generation, storage and upload/versioning work outside this PR. No R2 migration is proposed.

## Validation

PASS: frozen install; full TypeScript; ESLint; pnpm test (including new component SSR/helper tests, PR17 contain, Knowledge, cover ordering and mobile property ordering); homepage carousel tests; Life Notes desktop clipping and mobile tests; Next production build; git diff --check; unchanged pnpm-lock.yaml. No dependency upgrade.

## Human Preview acceptance — pending

- DPR 3 / Fast 4G / Disable cache: 待人工 Preview 驗收.
- Homepage Featured/Latest/search and /properties/area cards: correct covers, ordering, layout and acceptable q80 detail; no routine original-image requests.
- Inspect selected 384/640/960w URLs, contain, no height; verify total transferred bytes and duplicate requests in Network.
- Hero: first image immediately visible; only active + next initially fetched; autoplay, arrows/dots, wraparound and transitions work on desktop/mobile.
- Knowledge/Life Notes and desktop full markdown remain normal; no new console errors.
- Preview approval is required before any merge or Production release.
