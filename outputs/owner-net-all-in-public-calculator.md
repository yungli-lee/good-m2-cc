# 屋主實拿試算公開版

## 現況與共用架構

- 後台路由：`/admin/tools/owner-net-all-in`
- 共用元件：`components/calculator/owner-net-all-in-calculator.tsx`
- 共用 calculation engine：`lib/calculators/seller.ts`（公開契約 re-export：`lib/calculators/owner-net-all-in.ts`）
- 反推方式：既有 binary search，80 iterations；本次未改變公式。
- 公開路由：`/calculators/owner-net-all-in`
- 工具中心：`/calculators`（保留既有 `/calculator`）
- 公開版只在瀏覽器試算，不呼叫 Supabase 寫入或後台 API。

## Regression expected result

輸入後台既有範例：目標 1000、取得成本 800、買入仲介費 16、裝修 20、出售費率 4%、土地增值稅 30、代書 3、清償 2、房地合一稅率 35%，日期 2023-05-03 至 2026-06-22。

- 建議成交總價：`1,189.74` 萬元（原始值 1189.7435897435898）
- 出售仲介服務費：`47.59` 萬元
- 房地合一稅：`107.15` 萬元
- 預估總費用：`189.74` 萬元
- 預估實拿：`1,000.00` 萬元
- 持有期間：`1146` 天

## Verification

- TypeScript：PASS
- Lint：PASS
- Unit calculation test：PASS
- CMS Phase 1 regression：PASS
- Production build：PASS
- Production deployment：尚未執行
