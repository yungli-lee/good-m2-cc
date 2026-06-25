# Project Working Agreement v1.0

> 如果本次工作與專案文件不一致，請先提出差異並等待確認，不要自行推測或修改。

Project: good.m2.cc

本文件是 good.m2.cc 所有 AI 與工程師共同遵守的工作協議。技術開發規範請參閱 [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)；專案狀態請參閱 [PROJECT_STATUS.md](PROJECT_STATUS.md)；Roadmap 請參閱 [ROADMAP.md](ROADMAP.md)。

## 1. Working Mode

每次開始新的 Sprint、開新對話或重新接手專案時，請先完成專案盤點，不要直接修改程式。

除非阿勇明確要求開始實作，否則只允許：

- 盤點。
- 分析。
- 提出建議。
- 標示風險。
- 等待確認。

## 2. Standard Startup Procedure

標準啟動流程：

1. Read Docs。
2. Check Branch。
3. Review Git Status。
4. Identify Sprint / Task。
5. Review Production Readiness。
6. Propose Priority 1 / 2 / 3。
7. Wait for confirmation。

未完成上述流程前，不得開始 coding。

## 3. Mandatory Documents

每次開始工作前，依序閱讀：

1. [PROJECT_STATUS.md](PROJECT_STATUS.md)
2. [ROADMAP.md](ROADMAP.md)
3. [CHANGELOG.md](CHANGELOG.md)
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
5. [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)
6. [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md)
7. [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)
8. [docs/SERVICE_ACCOUNTS_AND_URLS.md](docs/SERVICE_ACCOUNTS_AND_URLS.md)

若本次工作涉及特定功能，請再閱讀：

- [docs/ROUTE_MAP.md](docs/ROUTE_MAP.md)
- [docs/FEATURE_BACKLOG_09_16.md](docs/FEATURE_BACKLOG_09_16.md)
- [docs/MEDIA_CAPABILITY_GAP.md](docs/MEDIA_CAPABILITY_GAP.md)
- [docs/MAINTENANCE_AND_BACKUP.md](docs/MAINTENANCE_AND_BACKUP.md)

## 4. Startup Header

每次開始工作時，固定先回報：

```text
Project:
Sprint:
Task:
Branch:
Status:
Production:
Priority:
```

## 5. Status Review

專案盤點需回報：

- Project。
- Sprint。
- Task。
- Branch。
- Git Status。
- Production Readiness。
- 目前完成度。
- Modified Files。
- Untracked Files。
- Staged Files。
- 未完成工作。

若有未追蹤、未提交或 staged 檔案，必須列出並說明是否與本次工作相關。

## 6. Planning Before Coding

依據 [PROJECT_STATUS.md](PROJECT_STATUS.md)、[ROADMAP.md](ROADMAP.md) 與目前 repo 狀態提出：

- Priority 1。
- Priority 2。
- Priority 3。

每一項需說明：

- 為什麼先做。
- 預估影響範圍。
- 是否影響 Production。

## 7. Approval Before Implementation

未經確認，不得：

- 修改功能。
- Commit。
- Push。
- Merge。
- Deploy。
- 修改 production 設定。

收到明確確認後，才可開始實作。

## 8. Small Increment Rule

一次只完成一個 Task。

例如本次只做 `A-005`，就不要同時完成 `A-006`、`A-007` 或其他順手項目。

若發現相鄰問題，先回報並等待確認，不自行擴大 scope。

## 9. Validation Rule

每完成一項工作，必須執行：

```bash
npx tsc --noEmit
npx eslint .
git diff
git status
```

若有 Preview，請一併驗證：

- Desktop。
- Mobile。

若涉及安全、資料庫、登入、表單、上傳或部署，需加做相關安全與 production risk review。

## 10. Report Format

每次回報應包含：

- 修改內容。
- 修改檔案。
- 驗證結果。
- Git status。
- Production risk。
- 尚未完成項目。
- 是否 commit。
- 是否 push。

若未執行某項驗證，需明確說明原因。

## 11. Definition of Done

一項工作完成需符合：

- 功能完成。
- TypeScript OK。
- ESLint OK。
- Preview 驗證。
- 文件同步更新。
- 回報完成。
- 阿勇確認。

等待確認後，才能 commit。

若尚未完成 Preview 或阿勇確認，只能回報「已實作待驗證」，不得回報正式完成。

## 12. Documentation Update Rule

若修改：

- Architecture。
- Route。
- Security。
- Workflow。
- Deployment。
- Environment variables。
- Database schema。
- Feature status。

請同步更新相關文件。

避免同一資訊重複維護，保持 Single Source of Truth。

## 13. Task ID Convention

Sprint A：

- A-001 Route Map
- A-002 Hero
- A-003 Architecture
- A-004 Property CRUD
- A-005 Public Inquiry API
- A-006 Seller Calculator
- A-007 Mortgage Calculator
- A-008 Purchase Cost Calculator
- A-009 Featured Properties
- A-010 TikTok Videos
- A-011 Audit Logs
- A-012 Blocklist
- A-013 Dashboard
- A-014 Inquiry Management
- A-015 Go Live
- A-016 Maintenance
- A-017 Analytics

未來：

- Sprint B: `B-001...`
- Sprint C: `C-001...`

## 14. Branch Policy

禁止直接修改：

- `main`
- `production`

所有工作均於以下分支類型進行：

- `preview/*`
- `feature/*`
- `hotfix/*`

未經明確允許，不得 push 會觸發 production deployment 的分支。

## 15. Release Governance

Release history 與 tag 規則請參閱 [docs/RELEASE_HISTORY.md](docs/RELEASE_HISTORY.md)。

重大里程碑才建立 Git Tag，不要每一個 Task 都建立 Tag。

Git Tag 代表可以回溯的重要版本，例如：

- Foundation。
- Sprint。
- Release Candidate。
- Production。
- Hotfix。

建立 tag 前必須完成必要驗證、文件同步、Git Health Check、Preview 驗證與阿勇確認。

## 16. Living Document

本文件為專案工作協議，也是 Living Document。

若工作流程、規範或開發方式有重大變更，請同步更新本文件。

若本文件與其他專案文件衝突，先提出差異並等待確認。

## 17. Project Philosophy

這不是 Demo Website。

這是一個可長期維護、可持續迭代、可正式商業上線的 Production Ready 專案。

所有修改都應符合：

- Security First。
- Documentation First。
- Small Increment。
- Verify Before Commit。
- Maintainability。
- Production Ready。
