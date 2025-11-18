````markdown
# Implementation Plan: 登入記帳主頁功能（後端）

**Branch**: `001-login-homepage` | **Date**: 2025-11-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-login-homepage/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能實作社群帳號登入（Google/Facebook OAuth 2.0 Authorization Code Flow with PKCE）、會話管理、登出功能以及記帳主頁基本 API。後端使用 Supabase Auth 作為帳號儲存機制,支援 Email 全域唯一、多社群帳號連結、會話資料庫儲存（支援即時撤銷和多裝置管理）、審計日誌記錄（90 天保留）以及帳號刪除功能。系統必須符合憲章要求：TDD 測試覆蓋率 90%+、API 回應時間 p95 < 200ms（讀取）/ 500ms（寫入）、完整錯誤處理、資料加密儲存。

## Technical Context

*✅ Phase 0 完成: 所有 NEEDS CLARIFICATION 已在 research.md 中解決*

**Language/Version**: Node.js 20 LTS + TypeScript 5.3+  
**Framework**: NestJS 10.x  
**Primary Dependencies**: 
- `@supabase/supabase-js` 2.39.0 (資料庫與認證)
- `@nestjs/jwt` 10.2.0 (JWT 產生與驗證)
- `@nestjs/passport` 10.0.3 + `passport-jwt` 4.0.1 (認證策略)
- `ioredis` 5.3.2 (快取)
- `helmet` 7.1.0 (安全標頭)
- `@nestjs/throttler` 5.0.1 (rate limiting)
- `@nestjs/schedule` 4.0.0 (cron jobs)
**Storage**: Supabase PostgreSQL (auth.users + 3 custom tables: social_accounts, sessions, audit_logs)  
**Caching**: Redis (session validation, user data)  
**Testing**: Jest 29.7.0 + Supertest 6.3.3 + @nestjs/testing 10.3.0  
**Target Platform**: Linux server (Docker container), Node.js 20 runtime  
**Project Type**: Web API (RESTful backend, 無前端實作)  
**Performance Goals**: 
- API 回應時間 p95 < 200ms (讀取操作, 如取得主頁資料)
- API 回應時間 p95 < 500ms (寫入操作, 如登入/登出)
- 支援至少 100 個並發登入請求
- 登入流程完成時間 < 3 秒
**Constraints**: 
- 社群登入流程必須在 3 秒內完成
- 所有 API 端點必須符合 p95 回應時間要求
- 測試覆蓋率必須達到 90% 以上 (unit tests 95%)
- 必須支援 OAuth 2.0 PKCE 流程 (RFC 7636)
- 會話 token 預設過期時間 30 天
- 審計日誌保留 90 天後自動清理 (cron job 每日 2:00 AM)
**Scale/Scope**: 
- 預期初期使用者 < 1000 人
- 4 個核心實體 (User, SocialAccount, Session, AuditLog)
- 16 個功能需求
- 7 個 API 端點 (Google/Facebook 登入、登出、token 驗證/更新、主頁資料、帳號刪除)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Code Quality First

✅ **符合** - 規格要求:
- 清晰的錯誤處理 (FR-011): 所有認證相關操作必須返回清晰的錯誤訊息
- 審計日誌 (FR-010): 所有認證操作必須記錄
- 實體設計清晰 (User, SocialAccount, Session, AuditLog)
- 需確保程式碼覆審、無 magic numbers、遵循 linting 規則

### Principle II: Test-Driven Development (NON-NEGOTIABLE)

✅ **符合** - 規格明確定義測試場景:
- 使用者故事 1: 5 個驗收場景 (首次登入、再次登入、帳號連結、無效 token、自動驗證)
- 使用者故事 2: 4 個驗收場景 (登出、撤銷 token、多裝置登出、無效 token 登出)
- 使用者故事 3: 3 個驗收場景 (已登入取得資料、未登入拒絕、過期 token)
- 邊界案例: 7 個 (網路異常、重複登入、Email 衝突、Token 過期、並發會話、部分資料、帳號刪除)
- 需確保 TDD 流程: 測試先行 → 實作 → 重構

### Principle III: User Experience Consistency

✅ **符合** - 規格要求:
- API 設計一致性: RESTful 端點、標準回應格式
- 錯誤回應標準化 (FR-011): 無效 token、過期 token、社群登入失敗等情況都需清晰錯誤訊息
- 資料格式標準: ISO 8601 時間格式、審計日誌結構化
- 需確保所有 API 端點遵循相同的回應格式

### Principle IV: Performance & Scalability Requirements

✅ **符合** - 規格明確定義效能標準:
- SC-001: 登入流程 < 3 秒
- SC-002: 支援至少 100 個並發登入請求
- SC-003: API p95 回應時間 < 200ms (讀取) / 500ms (寫入)
- SC-004: 登入成功率 99%
- 需確保資料庫索引最佳化、連線池管理、N+1 查詢避免

### Principle V: Documentation Language Standards

✅ **符合** - 本文件使用繁體中文撰寫
- 規格文件 (spec.md): 繁體中文
- 實作計畫 (plan.md): 繁體中文
- 使用者錯誤訊息: 需使用繁體中文 (符合 FR-011)

### Security & Data Integrity Standards

✅ **符合** - 規格要求:
- 認證與授權: OAuth 2.0 PKCE 流程 (FR-001, FR-002)
- 會話管理: JWT token, 30 天過期 (FR-012), refresh token 支援 (FR-013)
- 資料保護: 敏感資料加密 (FR-015), IP 位址加密儲存
- 審計與合規: 所有操作記錄審計日誌 (FR-010), 90 天保留 (FR-016), 帳號刪除功能 (FR-014)
- 需確保 SQL injection 防護、輸入驗證、輸出編碼

### Development Workflow & Quality Gates

✅ **符合** - 規格已完成澄清階段:
- 功能規格已批准 (spec.md 狀態: Draft 已澄清)
- 實作計畫進行中 (本文件)
- 需確保: 原子化 commit、feature branch 開發、CI/CD 整合、peer review、測試覆蓋率 90%+

**評估結果**: ✅ **通過 Constitution Check** - 無違規項目,所有憲章原則皆符合規格要求

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── user.ts/py              # User 實體模型 (id, email, name, avatar, created_at, last_login_at)
│   ├── social_account.ts/py    # SocialAccount 實體模型 (provider, provider_user_id, linked_at)
│   ├── session.ts/py           # Session 實體模型 (token, user_id, created_at, expires_at, revoked)
│   └── audit_log.ts/py         # AuditLog 實體模型 (action, user_id, timestamp, ip, result)
├── services/
│   ├── auth/
│   │   ├── oauth_service.ts/py      # OAuth 2.0 PKCE 流程處理 (Google/Facebook)
│   │   ├── session_service.ts/py    # 會話管理 (建立、驗證、撤銷)
│   │   └── token_service.ts/py      # JWT token 產生與驗證
│   ├── user/
│   │   ├── user_service.ts/py       # 使用者管理 (建立、查詢、更新、刪除)
│   │   └── account_linking.ts/py    # 社群帳號連結邏輯 (Email 唯一性檢查)
│   ├── audit/
│   │   ├── audit_service.ts/py      # 審計日誌記錄
│   │   └── log_cleanup.ts/py        # 90 天自動清理機制
│   └── supabase/
│       └── supabase_client.ts/py    # Supabase 客戶端封裝
├── api/
│   ├── routes/
│   │   ├── auth.ts/py          # 登入、登出、token 驗證 API
│   │   ├── user.ts/py          # 使用者帳號刪除 API
│   │   └── homepage.ts/py      # 記帳主頁資料 API (佔位)
│   ├── middleware/
│   │   ├── auth_middleware.ts/py    # 認證中介層 (token 驗證)
│   │   └── error_handler.ts/py      # 錯誤處理中介層
│   └── validators/
│       └── request_validator.ts/py  # 請求參數驗證
├── lib/
│   ├── errors.ts/py            # 自訂錯誤類別
│   ├── constants.ts/py         # 常數定義 (token 過期時間、審計保留期限)
│   └── utils.ts/py             # 工具函式 (加密、時間格式化)
└── config/
    ├── database.ts/py          # Supabase 連線設定
    └── oauth.ts/py             # OAuth 提供者設定 (Google/Facebook client ID)

tests/
├── unit/
│   ├── models/                 # 模型單元測試
│   ├── services/               # 服務層單元測試
│   └── lib/                    # 工具函式單元測試
├── integration/
│   ├── auth_flow.test.ts/py    # 完整登入/登出流程測試
│   ├── account_linking.test.ts/py  # 帳號連結邏輯測試
│   └── audit_cleanup.test.ts/py    # 審計日誌清理測試
└── contract/
    ├── oauth_provider.test.ts/py   # Google/Facebook OAuth API 契約測試
    └── supabase.test.ts/py         # Supabase API 契約測試
```

**Structure Decision**: 
選擇 **Option 1: Single project (Backend API only)** 因為規格明確表示「No frontend implementation is required」。專案為 RESTful API 後端服務,使用 Supabase 作為資料庫與認證基礎設施。結構採用分層架構:
- **models/**: 資料模型定義 (4 個實體)
- **services/**: 業務邏輯層 (OAuth、會話、使用者、審計)
- **api/**: API 路由與中介層 (RESTful endpoints)
- **lib/**: 共用工具與常數
- **tests/**: 三層測試結構 (unit/integration/contract)

語言選擇已確認: **Node.js 20 LTS + TypeScript 5.3+ + NestJS 10.x**

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**無違規項目** - Constitution Check 已通過,無需追蹤複雜度違規。

---

## Phase Completion Status

### ✅ Phase 0: Research (已完成)
- **research.md** 已產生
- 所有 NEEDS CLARIFICATION 項目已解決
- 技術棧決策: Node.js 20 + TypeScript 5.3 + NestJS 10.x
- OAuth 2.0 最佳實踐、資料庫 schema、效能最佳化策略、測試策略皆已定義

### ✅ Phase 1: Design (已完成)
- **data-model.md** 已產生: 4 個實體完整定義、關聯圖、驗證規則、state transitions
- **contracts/openapi.yaml** 已產生: 7 個 API endpoints、完整 request/response schemas、錯誤處理
- **quickstart.md** 已產生: 開發環境設定指南 (9 步驟)
- **Agent context 更新**: GitHub Copilot context 已更新 (新增 Supabase PostgreSQL)

### ✅ Constitution Check Re-evaluation (Phase 1 後)
- **Principle I-V**: 全部符合 ✅
- **Security & Data Integrity**: 符合 ✅
- **Development Workflow**: 符合 ✅
- **無新增違規項目**: Phase 1 設計未引入任何違反憲章的設計決策

### ⏭️ Phase 2: Tasks (下一步)
執行指令: `/speckit.tasks` 以產生 `tasks.md` (實作任務拆解)

---

**Planning Phase Completed**: 2025-11-18  
**Ready for Task Breakdown**: ✅
