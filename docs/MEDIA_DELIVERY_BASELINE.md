# Media Delivery Baseline Measurement

This checklist records the pre-optimization baseline for the shared media delivery work. It changes no production behavior. Save the exported HAR and results outside the repository unless a reviewed, sanitized summary is intentionally added later.

## Test routes

Measure these routes in this order:

1. `https://good.m2.cc/`
2. `https://good.m2.cc/knowledge`
3. One published Knowledge article with a cover and inline images, if available
4. `https://good.m2.cc/properties`
5. One published, image-rich property detail page
6. One published property containing video, if available; record “not available” if none exists

Record the exact article/property URLs and timestamp with every run. Do not use an admin route for the public baseline.

## Browser setup

Use a fresh Chrome Incognito window with extensions disabled where possible.

1. Open DevTools → Network.
2. Enable **Preserve log** only for interaction sequences; leave it off for isolated navigation totals.
3. Enable **Disable cache**.
4. Clear the Network log.
5. Clear site data from DevTools → Application → Storage → Clear site data.
6. In Network, show columns: Status, Type, Initiator, Size, Time, Cache-Control, Content-Type, Content-Length, CF-Cache-Status, and x-smart-cdn. Add response-header columns through **Manage Header Columns** when necessary.
7. Use a hard reload, wait for the load event, then wait five seconds without scrolling or interacting.
8. Export **Save all as HAR with content**. Treat HAR files as potentially sensitive operational data.

Run each route once with a cold cache. Then turn off **Disable cache**, reload once, and record a warm-cache comparison separately.

## Desktop profile

- Viewport: 1440 × 900 CSS pixels
- Device emulation: off
- Network throttling: No throttling
- Record actual DPR from `window.devicePixelRatio`

## Mobile profile

Use DevTools device emulation:

- Viewport: 390 × 844 CSS pixels
- Device pixel ratio: 3
- Network: Fast 4G
- CPU: no throttling for bandwidth comparison; note any different setting
- User agent: mobile Chrome preset

Confirm the emulation toolbar shows 390 × 844 and DPR 3 before every run.

## Per-navigation totals

Copy the Network summary after the five-second idle point:

- Total transferred bytes
- Total resource size
- Total request count
- Image request count and transferred bytes
- Media/video request count and transferred bytes
- Number of Supabase Storage object requests
- Number of Supabase transformed-image requests (`/storage/v1/render/image/`)
- Failed/cancelled requests

Do not mix requests from two navigations in one total.

## Per-media-request capture

For every image and video request, record:

| Field | Where to obtain it |
|---|---|
| URL | Network → Headers → Request URL |
| Status | Network row / Response Headers |
| Transferred bytes | Network Size column |
| Resource size | Network Size tooltip or HAR body size |
| `Content-Length` | Response Headers; record “absent” for chunked/cached responses |
| `Content-Type` | Response Headers |
| `Cache-Control` | Response Headers |
| `CF-Cache-Status` | Response Headers |
| `x-smart-cdn` | Response Headers |
| Initiator | Network Initiator column |
| Rendered dimensions | Elements → select image → Computed/Layout, or console snippet below |
| Natural dimensions | `naturalWidth` × `naturalHeight` |
| `srcset` / `sizes` | Elements attributes or console snippet below |
| Selected resource | `currentSrc` |

Run this read-only Console expression after the page settles and save its output with the HAR:

```js
copy(JSON.stringify(Array.from(document.images, (image) => ({
  url: image.src,
  selectedUrl: image.currentSrc,
  renderedWidth: image.getBoundingClientRect().width,
  renderedHeight: image.getBoundingClientRect().height,
  naturalWidth: image.naturalWidth,
  naturalHeight: image.naturalHeight,
  loading: image.loading,
  fetchPriority: image.fetchPriority,
  srcset: image.getAttribute("srcset") || "",
  sizes: image.getAttribute("sizes") || ""
})), null, 2))
```

For mobile, derive **selected resource width** from the selected transformed URL width parameter when present. Otherwise record `naturalWidth` and mark it as an original/non-responsive resource. Also record rendered CSS width × DPR so over-delivery is visible.

## Route-specific interactions

### Homepage

Capture an initial no-scroll run. In a separate preserved-log run, allow two hero transitions, scroll each horizontal property carousel through its full range, then scroll to Knowledge and lower promotional sections. Record which requests occurred before interaction versus after each action.

### Knowledge index

Capture page 1 without scrolling, then scroll to the final card. In a separate log, use Next Page once and confirm whether only that page’s card images load. Record card count and total cover-image bytes.

### Knowledge article

Capture the above-the-fold cover separately, then scroll through the full article. Record cover and each inline image, including duplicate URLs.

### Properties index

Capture the initial viewport, then scroll through the complete result list. Record every cover URL and whether any image is requested more than once.

### Image-rich property detail

Capture initial load without scrolling. Then use a separate preserved log for: scroll through all gallery images; open the cover lightbox; navigate to the next image; close it. Record initial cover bytes, full-gallery cumulative bytes, duplicate URLs, and requests caused only by lightbox interaction.

### Video property

Capture three checkpoints in one preserved log:

1. Five seconds after load, before reaching or clicking video
2. After scrolling the video poster into view, before Play
3. After Play for 10 seconds, one seek, and Close

Record every GET/HEAD/Range request, request `Range`, response status (especially 206), `Content-Range`, bytes transferred, and whether transfer continues after Close. Do not play video during the initial-navigation baseline.

## Result table

Create one row per profile and cache state:

| Route | Profile | Cache | Transferred | Resource size | Requests | Images / bytes | Video / bytes | Supabase objects | Transforms | Notes |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `/` | Desktop | Cold | | | | | | | | |
| `/` | Mobile | Cold | | | | | | | | |
| `/knowledge` | Desktop | Cold | | | | | | | | |
| `/knowledge` | Mobile | Cold | | | | | | | | |

Add corresponding rows for the selected article, property index, image-rich detail, video detail, and warm-cache comparisons.

## Baseline completion criteria

- All available routes have desktop and mobile cold-cache results.
- Every run has a timestamp, exact URL, Chrome version, DPR, cache state, and HAR filename.
- Totals are separated from interaction-sequence totals.
- Every media request has the required response headers or an explicit “absent/not exposed” value.
- Image dimensions, `currentSrc`, `srcset`, and `sizes` are captured.
- The video property is measured, or its production absence is explicitly recorded.
- No production setting, content, media object, or CMS record is changed during measurement.
