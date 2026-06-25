# Release History

本文件是 good.m2.cc release 與 Git tag 的主要紀錄來源。工作流程請參閱 [../PROJECT_WORKING_AGREEMENT.md](../PROJECT_WORKING_AGREEMENT.md)；技術驗證規範請參閱 [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)。

## Release Strategy

### Foundation

Foundation release 用於標記專案治理、文件基線、開發驗證工具等可回溯里程碑。Foundation tag 不代表 production ready。

### Sprint

Sprint release 用於標記一個 Sprint 的主要功能範圍完成，且已完成必要驗證與阿勇確認。

### Release Candidate

Release Candidate 用於 production 前的候選版本，應完成 preview/staging 驗收與 go-live checklist 的必要項。

### Production

Production release 代表可正式上線或已正式上線的版本。Production tag 只能在完成 release rule 後建立。

### Hotfix

Hotfix 用於 production 問題修正，應保持最小範圍，並在修正後補齊驗證與文件。

### Versioning

版本命名以可讀、可回溯為原則：

- Foundation: `foundation-v0.1`
- Sprint: `sprint-a-v1.0`
- Release Candidate: `rc-v0.9.0`
- Production: `v1.0.0`
- Hotfix: `v1.0.1`, `v1.0.2`, ...

## Release Table

| Version | Date | Git Tag | Commit | Status | Description |
| --- | --- | --- | --- | --- | --- |
| Foundation v0.1 | 2026-06-25 | `foundation-v0.1` | `fec3add` | Completed | Documentation Foundation; Project Working Agreement; Developer Automation Scripts |
| Sprint A v1.0 | TBD | `sprint-a-v1.0` | TBD | Planned | Sprint A core platform completion |
| Release Candidate | TBD | `rc-v0.9.0` | TBD | Planned | Production candidate after preview/staging validation |
| Production | TBD | `v1.0.0` | TBD | Planned | First production-ready release |
| Hotfix | TBD | `v1.0.1`, `v1.0.2`, ... | TBD | Planned | Production hotfix releases |

## Tag Naming Convention

| Release Type | Tag Format | Example |
| --- | --- | --- |
| Foundation | `foundation-v<major>.<minor>` | `foundation-v0.1` |
| Sprint | `sprint-<sprint>-v<major>.<minor>` | `sprint-a-v1.0` |
| Release Candidate | `rc-v<major>.<minor>.<patch>` | `rc-v0.9.0` |
| Production | `v<major>.<minor>.<patch>` | `v1.0.0` |
| Hotfix | `v<major>.<minor>.<patch>` | `v1.0.1` |

## Release Rule

只有符合以下條件才能建立 Git Tag：

- 功能完成。
- TypeScript 通過。
- ESLint 通過。
- 文件同步。
- Git Health Check 通過。
- Preview 驗證完成。
- 阿勇確認。

重大里程碑才建立 Git Tag。不要每一個 Task 都建立 Tag。

