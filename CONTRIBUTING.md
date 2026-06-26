# Yongmei OS Engineering Standard

## Rule No.1 — One Commit, One Purpose

每一個 Commit 只做一件事情。

禁止：

- 一個 Commit 同時修改多個 Module
- 混入不相關修正
- 混合 Feature + Refactor + Docs（除非 Docs 為同步更新）

## Rule No.2 — Verify Before Commit

任何程式 Commit 前必須完成：

- TypeScript
- ESLint
- Build

若任何一項失敗，不可 Commit。

## Rule No.3 — Module-based Development

所有開發皆以 Module 為單位。

例如：

- Authentication
- Property Management
- Homepage Content
- Inquiry CRM
- Media Library
- Knowledge Center

避免跨 Module 同時開發。

## Rule No.4 — PROJECT_STATUS is the Single Source of Truth

目前專案進度一律以 PROJECT_STATUS.md 為準。

ROADMAP 是未來規劃。

RELEASE_NOTES 是歷史版本。

不得互相矛盾。

## Rule No.5 — Documentation Follows Important Changes

凡屬於以下變更，必須同步更新文件：

- 新功能
- Module 完成
- Workflow
- API
- Database Schema
- Migration
- Role / Permission
- Architecture
- Environment Variables
- Deployment
- Development Process

可更新：

- README.md
- ROADMAP.md
- PROJECT_STATUS.md
- RELEASE_NOTES.md
- CONTRIBUTING.md
- docs/*

以下可不更新文件：

- typo
- CSS 微調
- icon
- 純 UI spacing
- 註解修正

## Rule No.6 — Release Before Tag

建立正式 Git Tag 前，必須完成：

✓ 功能完成
✓ TypeScript 通過
✓ ESLint 通過
✓ Build 通過
✓ Documentation 更新
✓ RELEASE_NOTES 更新

完成後才建立 Tag。

## Development Workflow

- Work should be split into small, reviewable tasks.
- Each task should have a clear scope.
- Avoid mixing unrelated changes.
- Complete review, verification, documentation update, and commit before moving to the next task.
