# good-m2-cc Conversion Attribution Model

## Touch 定義

有效 touch 必須來自 production、非 bot、非 internal session，且 source/medium 經 normalize。站內導航永不建立新 acquisition touch，也不得覆蓋既有 first/last non-direct。

### First touch

訪客最早有效 acquisition touch：`first_source`, `first_medium`, `first_campaign`, `first_landing_page`, `first_property_id`, `first_seen_at`。寫入後 immutable；除資料修復外不可覆蓋。

### Lead creation touch

`inquiry_created` 成功時的 session snapshot：`lead_source`, `lead_medium`, `lead_campaign`, `lead_landing_page`, `inquiry_property_id`, `inquiry_at`。direct 是合法 lead touch，但不覆蓋 last non-direct。

### Last non-direct touch

截至轉換時間最後一個非 direct、非 internal touch：`last_source`, `last_medium`, `last_campaign`, `last_property_id`, `last_touch_at`。成交時 freeze。

### Deal snapshot

`deal_won` transaction 內建立 immutable `deal_attributions`：first/lead/last touch FK，person_id、property_id、deal_value、commission_value、won_at、source snapshot。之後修改 CRM 聯絡資料或 campaign label 不改寫歷史。

## Source normalization

優先序：合法 UTM > known referrer > organic search > direct。固定 source：`facebook`, `instagram`, `line`, `google`, `google_business`, `direct`, `referral`；未知外部 hostname 可 normalize 為 `referral` 並另存 allowlisted `referrer_domain`。

medium：`organic`, `social`, `message`, `cpc`, `qr`, `email`, `referral`。未知/大小寫/空白使用 lowercase、trim、separator normalize；不合法值落 `other`（Phase 1 enum 決議）並標記 data quality。

## UTM 規範

- `utm_campaign` 優先 listing number/property id/campaign code，例如 `AK5384522`。
- `utm_content`：`image_01`, `video_01`, `reel_01`, `post_a`, `qr_signboard`。
- 後台 URL builder 僅允許固定 source/medium，campaign/content 做長度與字符驗證。
- QR 每個 placement 使用可辨識 content；不要多人共用不可分辨短網址。
- URL 可複製但不能包含 PII。

## Session/visitor 規則

- `visitor_id` 是第一方隨機 UUID，不是 GA Client ID/IP/user-agent hash。
- `session_id` 是隨機 UUID；30 分鐘 inactivity 或新 campaign touch 開新 session。
- anonymous→known link 只在 inquiry 成功或員工明確關聯後進行。
- inquiry/person 合併不得合併原始事件 identity，只建立 linkage/snapshot。
- consent 未確定前採必要性最低設計；若 visitor cookie 非必要，需依法律/政策決定 consent gate。

## Acceptance walkthrough

1. Facebook UTM→物件→照片→LINE→inquiry：first/last=Facebook，lead touch=該 inquiry session，property 保留。
2. 隔日 direct 回訪提交：first=Facebook；lead=direct；last non-direct=Facebook。
3. 業務建 People/客需：`lead_attributions` 關聯 person/requirement，不改原 touch。
4. 帶看/斡旋/成交：只有 CRM server lifecycle 可寫；won snapshot immutable。
5. Preview event 以 environment/physical policy 排除，Production report 必須固定 `environment=production`。
6. event_id unique 保證重送不重複。

## 邊界與歸因說明

「內容輔助成交」是 assisted attribution：成交旅程中曾有 qualified content view，不能宣稱單一因果。第一版同時呈現 first/lead/last 三種模型，不合成一個黑箱分數。direct 不等於 unknown；unknown source 必須列入資料品質，而不是硬歸 direct。
