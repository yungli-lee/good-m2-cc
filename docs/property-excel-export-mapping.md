# 物件 Excel template 結構與欄位 mapping（Stage A）

本文件只記錄 `lib/properties/export-template.ts` 目前內嵌 XLSX 的 XML 證據；沒有修改資料模型、匯出器或 template。

## Template 證據

- Worksheet：`Sheet1`（`xl/worksheets/sheet1.xml`）
- Used range：`A1:L104`（`dimension ref="A1:L104"`）
- Shared strings：152 entries；本 template 的文字標籤主要是 `t="s"` shared strings。
- Merged ranges：152 ranges；與本 mapping 相關的 ranges 列於下表。
- Drawing：`xl/drawings/drawing1.xml` 及其 relationship 存在，但未發現 checkbox/shape 可供委託方式使用；選項是儲存在儲存格文字中的 `□` 符號。

## 欄位 mapping

| Excel 顯示欄位 | Label cell | Value cell／range | Merged range | Cell type | Style | 現行資料來源 | 問題 | 建議新資料來源 |
|---|---|---|---|---|---:|---|---|---|
| 委託方式－一般簽 | A6 | A6 | A6:D6 | s | 137 | `listing_type` | checkbox 與 label 同一 cell；實際文字為「□一般簽」 | `listing_type` 對應文字，下一階段以同 cell 更新 |
| 委託方式－專任 | A7 | A7 | — | s | 33 | `listing_type` | template 顯示「□專簽」，非「專任」；沒有獨立 checkbox | `listing_type` 對應文字 |
| 委託方式－口頭 | A8 | A8 | — | s | 33 | `listing_type` | A8 是 `□口頭約` value cell，不是一般資料欄 | `listing_type` 對應文字 |
| 契約編號 | A11 | C11:F11 | C11:F11 | numberOrStyle | 48 | `listing_no` | 可直接填值 | `listing_no` |
| 簽約日期 | L11 | L11 | — | s | 20 | 無獨立欄位；L11 是 `簽約日:112/02/07` 整段文字 | 無獨立 value range，直接替換會涉及 label/value 拆分 | 新增獨立 merged value cell或 template layout |
| 委託期間 | G11 | H11:K11 | H11:K11 | s | 135 | `listing_start_date`／`listing_end_date` | 可直接填值 | 日期區間格式化值 |
| 售屋動機 | G12 | H12:L12 | H12:L12 | s | 106 | 目前無 property 欄位；template 只有預印選項 | 需新增資料來源，保留選項格式 | `sale_motivation`（下一階段欄位） |
| 現況種類 | G16 | H16:L16 | H16:L16 | s | 106 | 目前無獨立欄位；`H16` 為預印選項 | label 為「現況」，與資料模型契約不清 | `current_condition` |
| 現況用途 | A19 | C19:L19 | C19:L19 | s | 64 | `property_type` 推導 | 現況用途與物件類型混用 | `current_use` |
| 型態 | A20 | C20:L20 | C20:L20 | s | 67 | `property_type` 推導 | 一個 `property_type` 同時填兩個不同語意區塊 | `building_type` |
| 停車位 | A21 | C21:F22 | C21:F22 | s | 77 | 目前無獨立欄位 | template 有選項但 exporter 未接資料 | `parking_description` |
| 路寬 | A29 | B29:C29 | B29:C29 | numberOrStyle | 125 | exporter 目前把 `property_type` 寫到 B29 | 與物件類型寫入位置衝突，造成路寬錯置 | `road_width` |
| 面寬 | G21 | H21:L22 | H21:L22 | numberOrStyle | 70 | `frontage` | 可直接填值 | `frontage` |
| 深度 | G23 | H23:L23 | H23:L23 | numberOrStyle | 70 | `depth` | 可直接填值 | `depth` |
| 地坪 | A23 | C23:F23 | C23:F23 | numberOrStyle | 40 | `land_area_ping` | 可直接填值 | `land_area_ping` |
| 建坪 | A24 | C24:F24 | C24:F24 | numberOrStyle | 40 | `building_area_ping` | 可直接填值 | `building_area_ping` |
| 樓層 | A25 | C25:F25 | C25:F25 | s | 61 | `floor` | 可直接填值 | `floor` |
| 格局 | A26 | C26:F26 | C26:F26 | s | 61 | `layout` | 可直接填值 | `layout` |
| 完工日期 | A27 | C27:F27 | C27:F27 | s | 86 | `notes` regex（`完工日`） | 依賴 notes 非結構化文字 | `completion_date` |
| 屋齡 | — | — | — | — | — | exporter 目前錯寫 H27 | XML 沒有「屋齡」label；H27:L27 屬「加建」列 | 新增 label/value layout與 `age` |
| 加建 | G27 | H27:L27 | H27:L27 | numberOrStyle | 70 | 目前 exporter 寫 `age` | H27 是加建位置，現行程式把屋齡寫錯位置 | `extension_description` |
| 小學學區 | D29 | — | D29:E29 | s | 125 | 無 | 只有 label，沒有相鄰 writable value range | 調整 template 版面後接 `elementary_school_district` |
| 中學學區 | D30 | — | D30:E30 | s | 125 | 無 | 只有「國中學區」label，沒有 value range | 調整 template 版面後接 `middle_school_district` |
| 約看地點 | A43 | B43:F45 | B43:F45 | numberOrStyle | 96 | `showing_instructions`／notes | 欄位語意混在帶看說明 | `showing_location` |
| 地址 | A15 | C15:F15 | C15:F15 | numberOrStyle | 42 | `address_public`／notes 完整地址 | 可直接填值 | `address_public` |
| 推薦特色 | G28 | G29:L33 | G29:L33 | numberOrStyle | 125 | `highlights` | 可直接填值 | `highlights` |

## 必須回答的結論

1. `A8` 不是獨立 checkbox；XML 顯示 `A8 t="s"`、shared string 為 `□口頭約`，三個委託選項分別在 A6/A7/A8，沒有 drawing checkbox。
2. 簽約日沒有獨立寫入位置；L11 是整句 inline label/value 文字。
3. 售屋動機、現況種類、現況用途、型態、停車位均有 template 區域，但前三者部分是預印選項，需下一階段定義資料格式。
4. 路寬有 B29:C29 空間；現行 exporter 卻把 `property_type` 寫入 B29，這是實際 XML 位置與程式 mapping 不一致的 root cause。
5. `property_type` 現行同時推導 C19「現況用途」、C20「型態」，並錯寫 B29，造成語意混用與路寬錯誤。
6. 完工日目前由 notes regex 取得；屋齡沒有 XML label，且程式將 age 寫入 H27（實際是加建列）。
7. 小學/國中學區只有 D29:E29、D30:E30 label merge，沒有可由 XML 證明的 value range；需先調整版面。
8. 約看地點有 B43:F45 value range；現行 exporter 使用帶看說明，需下一階段拆欄位。

## 下一階段前的 layout 決策

需要修改 template XML layout 的欄位：簽約日期、屋齡、小學學區、中學學區；另需決定售屋動機、現況種類、停車位、約看地點的專用欄位語意。只需填值的欄位：契約編號、委託期間、地坪、建坪、樓層、格局、面寬、深度、地址、推薦特色，以及已確認的 B29:C29 路寬區域。這些決策本階段不執行。
