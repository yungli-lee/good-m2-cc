# Development Guide

本文件是 good.m2.cc 專案所有工程師共同遵守的開發規範，適用於 Codex、Cursor、Claude Code 與人工開發者。工作流程請參閱 [../PROJECT_WORKING_AGREEMENT.md](../PROJECT_WORKING_AGREEMENT.md)，本文件僅定義技術開發規範。它不是 README，也不是架構文件；架構細節請看 [ARCHITECTURE.md](ARCHITECTURE.md)，目前產品狀態請看 [../PROJECT_STATUS.md](../PROJECT_STATUS.md)。

## 1. Project Philosophy

good.m2.cc 以正式商用平台為目標，不以 demo 或作品集標準交付。

- Production Ready：每次修改都要朝可上線、可維護、可回滾的方向前進。
- Security First：登入、權限、RLS、表單、防機器人、檔案上傳與 secret 管理都必須優先考量。
- Documentation First：開始工作前先讀文件；功能變更若讓文件過期，必須同步更新文件。
- Small Increment：一次只處理一個明確目標，避免大範圍同時修改。
- Verify Before Commit：commit 前必須完成可重現的驗證，並回報結果。

## 2. Before You Start

每次開始工作前，請依序閱讀：

1. [../PROJECT_STATUS.md](../PROJECT_STATUS.md)
2. [../ROADMAP.md](../ROADMAP.md)
3. [../CHANGELOG.md](../CHANGELOG.md)
4. [ARCHITECTURE.md](ARCHITECTURE.md)
5. [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)
6. [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)

接著確認目前 branch：

```bash
git status
```

確認 branch 與任務目標相符後，才開始修改。

## 3. Git Workflow

建議流程：

1. 確認 Branch。
2. 修改程式或文件。
3. 執行 TypeScript 檢查。
4. 執行 ESLint 檢查。
5. 查看 `git diff`。
6. 回報修改內容與驗證結果。
7. 等待阿勇確認。
8. Commit。
9. 再次等待確認。
10. Push，且僅在明確指示下執行。

未經明確指示，不得 push `main`、production branch 或任何會觸發 production deployment 的分支。

## 4. Development Rules

### Must

- 小步提交，保持 Small Increment。
- 一次只完成一個功能或一個文件目標。
- 功能完成時同步更新相關文件。
- 每次修改都必須有可驗證結果。
- 動到資料庫、權限、API、環境變數或部署設定時，必須額外檢查安全與 rollback 風險。
- 遇到既有未追蹤或未提交檔案時，不得任意刪除或覆蓋。

### Forbidden

- 未經確認直接 push。
- 未經確認修改 production。
- 一次重構大量模組。
- 同時修改 UI、Database、API，除非任務明確要求且已拆好驗證步驟。
- 未驗證即 commit。
- 把 secret、API key、token、密碼寫入 repo。
- 為了讓功能通過而關閉 RLS、繞過登入或放寬權限。

## 5. Validation Checklist

每次完成工作至少執行：

```bash
npx tsc --noEmit
npx eslint .
git diff
git status
```

必要時加做：

- Mobile Preview。
- Desktop Preview。
- Security Review。
- Cloudflare Preview deployment 驗證。
- Supabase RLS / Storage policy 驗證。
- 表單、防機器人、通知信端到端驗證。

## 6. Commit Convention

採用 Conventional Commits：

- `feat:` 新功能。
- `fix:` 修正 bug。
- `docs:` 文件。
- `refactor:` 不改變行為的整理。
- `style:` 格式或樣式調整。
- `test:` 測試。
- `chore:` 工具、設定、維護。

範例：

```text
docs: add development guide
fix: prevent property edit form from posting to page route
feat: add admin inquiry status update
chore: update cloudflare pages config
```

## 7. Pull Request Checklist

建立 PR 或交付修改前，請確認：

- TypeScript OK。
- ESLint OK。
- Mobile OK。
- Desktop OK。
- Security OK。
- Documentation Updated。
- No Secret Added。
- Preview Verified。
- RLS / Auth checked when touching database or admin features。
- Rollback path known when touching deployment or schema。

## 8. Definition of Done

一項功能完成需同時符合：

- 功能完成。
- TypeScript 通過。
- ESLint 通過。
- 文件同步更新。
- Preview 驗證。
- 阿勇確認。
- 才可 Commit。

若尚未 preview 驗證或尚未阿勇確認，只能回報「已實作待驗證」，不得回報正式完成。

## 9. Security Principles

- 不得提交 Secret。
- 不得提交 API Key。
- 不得提交 token、密碼或 service role key。
- 不得關閉 RLS。
- 不得繞過 Auth、role check 或 server-side validation。
- Production 不允許使用 debug 設定。
- Production 不允許跳過 Turnstile、rate limit 或必要權限檢查。
- Public anon key 可公開，但必須搭配正確 RLS。
- Service role key 只能在可信 server runtime 使用，不得進入 client bundle。

## 10. Living Document

本文件為 Living Document。

每次工作流程若有重大變更，應同步更新本文件。若其他文件與本文件衝突，請先停止修改並回報，確認新的開發規範後再繼續。

## README Recommendation

本次不修改 README。建議未來在 `README.md` 最前面加入：

```text
Before You Start:

1. PROJECT_STATUS.md
2. ROADMAP.md
3. docs/ARCHITECTURE.md
4. docs/DEVELOPMENT_GUIDE.md
5. docs/GO_LIVE_CHECKLIST.md
```
