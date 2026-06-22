# good.m2.cc static site

這是可部署到 Cloudflare Pages 的靜態網站版本。

## 預覽

直接打開 `index.html` 即可預覽。

## Cloudflare Pages

- Build command: 留空
- Build output directory: `/`

若使用 GitHub 專案部署，請將本資料夾內容放在專案根目錄。

## D1 服務表單資料庫

Cloudflare D1 資料庫：

- Database name: `good-m2-service-db`
- Binding name: `DB`

第一次部署前，請到 Cloudflare D1 的 Console 執行 `schema.sql`，建立 `service_requests` 資料表。

網站表單送出後會呼叫 `/api/service-request`，並將資料寫入 D1。
