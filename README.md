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

## Email 通知

表單寫入 D1 成功後，會透過 Resend API 寄送通知信。

請在 Cloudflare Pages 專案的 Environment variables 設定：

- `RESEND_API_KEY`: Resend API Key
- `NOTIFY_EMAIL_FROM`: 寄件者，例如 `阿勇不動產顧問 <notify@good.m2.cc>`
- `NOTIFY_EMAIL_TO`: 收件者，預設可填 `best@m2.cc`

通知信主旨：

`【阿勇服務表單】新需求通知`

通知信內容包含表單資料、建立時間、User Agent 與 IP Address。
