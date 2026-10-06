# Analytics Dashboard Phase 2A — UI Plan

## Route and access

- Route: `/admin/analyze`
- Navigation label: `成效分析`
- Visibility and server authorization: `admin` and `owner` only.
- Editors/viewers do not see the navigation item and receive the existing forbidden redirect if they request the route directly.
- Page subtitle: “哪些來源、內容、物件與 CTA，正在產生有效詢問？”

## Global controls

- Presets: 今日、7 天、30 天、90 天.
- Default: 30 天.
- Fixed timezone label: `Asia/Taipei`.
- Environment is not a user control; it follows the deployment.
- Show “資料更新時間” and a low-data badge when denominators are below insight thresholds.

## 1. 經營摘要

Cards:

1. Visitors
2. Sessions
3. Property Views
4. LINE Clicks
5. Phone Clicks
6. Inquiries
7. Inquiry Conversion Rate

Each card shows current value, previous equal period, and change percentage. When the previous denominator is zero, show `—` with “上一期間無可比較資料”. Rate cards also show numerator/denominator in accessible helper text.

## 2. 轉換趨勢

- Daily lines: Visitors, Property Views, Inquiries.
- 7/30/90-day switches reuse the global range.
- Default rendering recommendation: Recharts client island fed by server-produced points, subject to bundle review. Provide a semantic table immediately below or through an accessible toggle.
- Zero-filled dates produce a flat zero line rather than an empty chart.
- With no data, replace the chart with a compact empty state; never render an empty axis shell.

## 3. 來源成效

Columns:

- Source / Medium / Campaign
- Visitors
- Sessions
- Property Views
- LINE
- Phone
- Inquiries
- Conversion Rate

Default order: Inquiries descending, then Visitors descending. Direct and `(not set)` remain visible. A definition popover explains the selected acquisition model and why visitor rows may not be additive.

## 4. 物件成效

Columns:

- Property title, current status, and link
- Views
- Visitors
- LINE
- Phone
- Inquiries
- Conversion Rate

Sort options: Views, Inquiries, Conversion Rate. Conversion-rate sorting places null rates last. Archived properties remain in historical results with a status badge but no broken public link.

## 5. 熱門但低詢問

Each item shows:

- property title
- views and the minimum sample threshold
- CTA count/rate
- inquiries
- conversion rate
- deterministic reason such as “瀏覽位於同期間物件前 25%，詢問轉換低於後 25%”

If fewer than five eligible properties or sample thresholds are unmet, show “資料量不足，暫不判定熱門低詢問物件”. Do not rank tiny samples.

## 6. 最近詢問歸因

Columns:

- Inquiry time
- Property
- First touch
- Lead touch
- Last non-direct
- Attribution status

No customer identity or message is displayed. Missing/partial/failed states use neutral, warning, and error badges with a concise explanation; they are not hidden.

## Decision insights

Insights appear above the relevant table, not as an unbounded AI feed. Each insight contains:

- observed fact;
- range and denominator;
- formula/threshold link;
- cautious action wording: “建議檢查素材、價格呈現或 CTA 路徑”.

Examples:

- “近 30 天此物件有 48 次瀏覽、0 筆詢問，且已達 20 次樣本門檻。”
- “Facebook 帶來 32 個物件瀏覽 sessions，LINE/電話 CTA session rate 為 3.1%，低於來源 cohort p25。”
- “Campaign A 有 4/28 位訪客形成詢問，高於全站 6.2%；樣本仍偏低。”

Never state causal claims such as “Facebook 品質差” or “價格造成無詢問”.

## Empty and low-data states

| Condition | UI behavior |
|---|---|
| 0 events | Summary zeros, dashboard onboarding message, tables and chart replaced by empty states. |
| 1 visitor | Show count; rates with valid denominator may display, plus low-sample badge. |
| 0 inquiry | Show zero inquiries; conversion is 0% only when denominator > 0. |
| 0 campaign | Show Direct/Unattributed explanation; no empty campaign chart. |
| 0 property attribution | Keep site-wide metrics; property table explains missing property linkage. |
| previous period = 0 | Change percentage is `—`, not infinity. |
| query error | Preserve section layout with safe retry message; do not leak database details. |

No fake sample data is shipped in runtime code.

## Responsive behavior

### Desktop

- Seven metric cards use a responsive grid.
- Trend and data tables use the full content width.
- Sticky table headings only where they do not conflict with admin navigation.

### Tablet

- Metric cards use two or three columns depending on width.
- Source/property tables may horizontally scroll with the first descriptive column sticky.

### Mobile

- Metric cards use two columns, falling to one at narrow widths.
- Tables become compact cards: label/value pairs, primary sort control above the list.
- No interaction depends on hover.
- Range and sort controls have at least 44×44 px touch targets.
- Long campaign/property labels wrap; the page must not create global horizontal overflow.
- Trend has a horizontally compact chart plus accessible data table toggle.

## Accessibility

- Every chart has a text summary and tabular alternative.
- Color is not the only indicator of positive/negative change.
- Sort buttons expose direction through `aria-sort` or equivalent text.
- Empty/error/refresh messages use appropriate live regions without excessive announcements.
- Metric abbreviations have Chinese accessible labels.

## V1 visual constraints

- Reuse existing admin tokens, cards, buttons, tables, and badges.
- Do not redesign the admin shell.
- Do not add maps, heatmaps, funnel animations, AI summaries, or GA4 widgets in Phase 2A.
