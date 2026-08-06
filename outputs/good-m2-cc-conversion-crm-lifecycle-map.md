# good-m2-cc CRM Lifecycle Map

| Stage | 進入條件 | 來源/時間 | Responsible | 可逆 | Funnel | 人工確認 / event |
|---|---|---|---|---|---|---|
| Visitor | production session 有首個合法 event | analytics event / occurred_at | system | N/A | 曝光母體 | 自動 `page_view` |
| Engaged visitor | allowlisted engagement（property/media/search/CTA） | events / occurred_at | system | 是 | 行為層 | 自動 client event |
| Inquiry | `inquiries` insert 成功且非 spam/rate-limit | inquiries.created_at | system/客服 | 狀態可變 | 詢問 | server `inquiry_created` |
| Lead | inquiry 被接受並建立/關聯 People；不能只因任意 People 存在 | inquiry-person linkage（目前 MISSING） | 業務 | 可取消/合併 | CRM 建檔 | 人工確認後 event |
| Qualified lead | 至少有效 requirement + 業務明確 qualified | requirement + qualification timestamp（目前缺） | assigned user | 可 disqualify | 有效客需 | 人工確認，server `lead_qualified` |
| Showing | 指定 person/requirement/property 的 showing scheduled/completed | formal showing（目前只有 timeline/visit） | assigned user | 狀態可改 | 帶看 | 人工，server events |
| Offer | 指定 deal/property/person 的出價 | formal offer（目前 MISSING） | assigned user | 可 withdrawn | 斡旋前 | 人工，server event |
| Negotiation | offer/deal 進入議價 | negotiation（目前 MISSING） | assigned user/manager | 可回 offer/lost | 斡旋 | 人工，server event |
| Closed won | deal 有 property/person、成交價、won_at，授權角色確認 | deals（目前 MISSING） | admin/owner | 僅 audited correction | 最終成交 | server-only `deal_won` + snapshot |
| Closed lost | deal 明確失敗原因與 lost_at | deals（目前 MISSING） | assigned user/admin | 可 reopen | 漏斗終止 | server-only `deal_lost` |

## 現況 mapping

- `inquiries.status`: new/contacted/in_progress/closed 是客服處理狀態，不等於 lead/qualified/deal。
- `people.status`: active/inactive/archived 是通訊錄狀態，不等於漏斗階段。
- requirement `active/paused/fulfilled/archived`: fulfilled 不保證成交。
- `people_activities.visit`: 一般活動，無 property 與 scheduled/completed distinction。
- people_properties `viewer/negotiator`: 關係標籤，不是 showing/negotiation transaction。
- property timeline `showing/offer/negotiation/closed`: 有 property/date/text，但缺 person、requirement、deal/value、state machine；只能當歷史備註或 Phase 1 backfill candidate，不能直接當可信 funnel。
- property 下架理由「成交」也不能自動推導 `deal_won`。

## 最小 gap closure 順序

1. inquiry→person/requirement attribution linkage。
2. qualification status/timestamp/actor。
3. showing/offer/deal 正規實體或至少可信 state table。
4. `deal_won` transaction + immutable attribution snapshot。
5. 所有狀態修正保留 audit，不刪除歷史 lifecycle event。

## Role 原則

Editor 可記錄日常聯絡與建議中的 showing；敏感 deal won/lost、成交價與 commission snapshot 應限制 admin/owner（最終以現行權限模型 review）。System 只可根據成功 DB transition 發 event，不可從 client click 或文字內容推測成交。
