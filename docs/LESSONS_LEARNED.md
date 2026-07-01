# Lessons Learned

## Production DB Seed Drift（2026-07-01）

現象：
Production Knowledge 分類只有「未分類」。

原因：
Production `content_categories` 缺少 knowledge seed。

症狀：
- Preview 正常
- Production 異常
- 程式碼一致

分析過程：
- 先確認 production deployment 與 preview/staging 使用同一版程式碼。
- 檢查後台 Knowledge 新增頁分類資料來源，確認程式查詢的是 `content_categories`，不是獨立的 `knowledge_categories` table。
- 比對 staging 與 production DB，確認 staging 有 knowledge categories seed，但 production `content_categories` 缺少對應 seed。
- 判定為 Production DB Seed Drift，不是 React、Server Action 或 Cloudflare deployment 問題。

處理方式：
- 補 knowledge categories seed
- 執行：

```sql
notify pgrst, 'reload schema';
```

預防措施：
Production Release 必須新增 DB Seed Check，不可只驗證 migration。
