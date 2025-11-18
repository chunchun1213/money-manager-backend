# Research Document: 登入記帳主頁功能（後端）

**Branch**: `001-login-homepage` | **Date**: 2025-11-18
**Purpose**: 解決 Technical Context 中所有 NEEDS CLARIFICATION 項目

## Research Tasks

### 1. 語言與框架選擇

**Question**: 應選擇 Node.js/TypeScript 或 Python/FastAPI 作為後端技術棧?

**Decision**: **Node.js 20 LTS + TypeScript 5.x + NestJS**

**Rationale**:
- **Supabase 官方支援**: Supabase 提供完整的 JavaScript/TypeScript SDK (`@supabase/supabase-js`),文件完善且社群活躍
- **型別安全**: TypeScript 提供編譯期型別檢查,降低執行期錯誤,符合憲章「Code Quality First」原則
- **NestJS 框架優勢**:
  - 內建 Dependency Injection,易於測試 (符合 TDD 要求)
  - 模組化架構,清晰的分層設計 (controllers/services/repositories)
  - 原生支援 OpenAPI/Swagger 文件自動產生
  - 內建 Guard/Interceptor/Middleware 系統,易於實作認證授權
  - 優秀的測試支援 (Jest 整合良好)
- **效能**: Node.js 非阻塞 I/O 適合處理大量並發請求,符合「支援 100 個並發登入」需求
- **生態系**: npm 生態系完整,OAuth、JWT、加密等函式庫成熟

**Alternatives Considered**:
- **Python + FastAPI**: 優點為簡潔語法、async/await 支援、自動 API 文件,但 Supabase Python SDK 較不成熟,且團隊熟悉度未知
- **Go + Gin**: 極高效能,但開發速度較慢,Supabase SDK 支援有限

**Dependencies Resolved**:
- **Language**: Node.js 20 LTS
- **Language Version**: TypeScript 5.3+
- **Framework**: NestJS 10.x

---

### 2. OAuth 2.0 與 JWT 函式庫選擇

**Question**: 需要哪些函式庫來實作 OAuth 2.0 PKCE 流程與 JWT 驗證?

**Decision**: 
- **OAuth 2.0**: `@supabase/auth-helpers-nextjs` + `@supabase/supabase-js` (Supabase 內建 OAuth 支援)
- **JWT 驗證**: `@nestjs/jwt` + `jsonwebtoken`
- **Passport.js**: `@nestjs/passport` + `passport-jwt` (整合 NestJS 認證)

**Rationale**:
- **Supabase Auth 整合**: Supabase 原生支援 Google/Facebook OAuth 2.0 PKCE 流程,可透過 `supabase.auth.signInWithOAuth()` 簡化實作
  - 前端發送 OAuth authorization code 給後端
  - 後端使用 `supabase.auth.exchangeCodeForSession(code)` 交換 token
  - 自動處理 PKCE challenge/verifier 驗證
- **NestJS JWT 模組**: 提供 `JwtService` 封裝 token 產生與驗證,整合 Passport.js 策略
- **Passport.js**: NestJS 官方推薦的認證函式庫,支援多種策略 (JWT、OAuth、Local 等),易於擴展

**Implementation Notes**:
- 使用 Supabase Auth 儲存使用者基本資料 (email, name, avatar)
- 使用 Supabase Database 儲存 Session 與 AuditLog (自訂表格)
- 使用 `@supabase/supabase-js` 的 Row Level Security (RLS) 保護資料

**Dependencies Resolved**:
```json
{
  "@supabase/supabase-js": "^2.39.0",
  "@supabase/auth-helpers-nextjs": "^0.9.0",
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "passport-jwt": "^4.0.1",
  "jsonwebtoken": "^9.0.2"
}
```

---

### 3. 測試框架與策略

**Question**: 如何實現 90% 測試覆蓋率並符合 TDD 要求?

**Decision**: **Jest + Supertest + NestJS Testing Module**

**Rationale**:
- **Jest**: NestJS 預設測試框架,社群生態成熟
  - 內建 coverage 報告 (`jest --coverage`)
  - 支援 mocking/spying/stubbing
  - 快速執行 (parallel test execution)
- **Supertest**: HTTP API 端對端測試,模擬真實請求
- **NestJS Testing Module**: 提供 Dependency Injection 測試支援,易於 mock services

**Testing Strategy**:

1. **Unit Tests** (目標 95% 覆蓋率):
   - 所有 services 邏輯測試 (OAuth, Session, User, Audit)
   - 所有 models 驗證邏輯測試
   - 工具函式測試 (加密、時間格式化)
   - Mock 外部相依 (Supabase client, HTTP requests)

2. **Integration Tests** (關鍵流程):
   - 完整登入流程: OAuth code → session token → 使用者資料
   - 帳號連結: 相同 email 多社群帳號連結測試
   - 登出流程: token 撤銷 → 後續請求拒絕
   - 審計日誌: 操作記錄 → 90 天清理
   - 使用 Test Database (Supabase local dev or test project)

3. **Contract Tests** (外部 API):
   - Google OAuth API contract
   - Facebook OAuth API contract
   - Supabase Auth API contract
   - 使用 Pact 或 WireMock 記錄 API 行為

4. **E2E Tests** (端對端場景):
   - 使用 Supertest 測試完整 API 流程
   - 測試錯誤處理 (無效 token、過期 token、網路失敗)
   - 測試邊界案例 (並發登入、重複請求)

**Test Execution Requirements**:
- Unit tests: < 100ms per test
- Integration tests: < 5s per test suite
- Coverage threshold: 90% (branches, functions, lines, statements)
- CI/CD integration: GitHub Actions or GitLab CI

**Dependencies Resolved**:
```json
{
  "jest": "^29.7.0",
  "@nestjs/testing": "^10.3.0",
  "supertest": "^6.3.3",
  "@types/supertest": "^6.0.2",
  "@pact-foundation/pact": "^12.1.0" // for contract testing
}
```

---

### 4. 資料庫 Schema 設計 (Supabase PostgreSQL)

**Question**: 如何設計資料庫 schema 以支援功能需求?

**Decision**: 使用 Supabase Auth 內建 `auth.users` 表格 + 4 張自訂表格

**Schema Design**:

#### Table 1: `auth.users` (Supabase 內建)
- Supabase 自動管理的使用者表格
- 欄位: `id` (UUID), `email`, `encrypted_password`, `created_at`, `updated_at`, `last_sign_in_at`
- 儲存 OAuth 提供者資料在 `raw_user_meta_data` (JSON)

#### Table 2: `public.social_accounts` (自訂)
```sql
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'facebook')),
  provider_user_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_social_accounts_user_id ON public.social_accounts(user_id);
```

#### Table 3: `public.sessions` (自訂)
```sql
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  device_info JSONB -- optional: user agent, IP, etc.
);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_token ON public.sessions(token) WHERE revoked = FALSE;
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);
```

#### Table 4: `public.audit_logs` (自訂)
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('login', 'logout', 'token_validation_failed', 'account_deleted')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT, -- encrypted
  result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
  error_message TEXT
);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
```

**Data Migration Strategy**:
- 使用 Supabase Migrations (`supabase/migrations/*.sql`)
- 版本控制所有 schema 變更
- 包含 rollback scripts

**Dependencies Resolved**:
```json
{
  "@supabase/supabase-js": "^2.39.0", // includes database access
  "drizzle-orm": "^0.29.0" // optional: type-safe query builder
}
```

---

### 5. OAuth 2.0 最佳實踐

**Question**: 如何安全實作 OAuth 2.0 Authorization Code Flow with PKCE?

**Decision**: 遵循 RFC 7636 (PKCE) 與 RFC 6749 (OAuth 2.0) 標準

**Best Practices**:

1. **PKCE Flow Implementation**:
   - 前端產生 `code_verifier` (random string, 43-128 chars)
   - 前端計算 `code_challenge = BASE64URL(SHA256(code_verifier))`
   - 前端向 OAuth 提供者請求 authorization code (帶 `code_challenge`)
   - 前端將 `authorization_code` 與 `code_verifier` 發送給後端
   - 後端使用 `code` + `code_verifier` 向 OAuth 提供者交換 `access_token`
   - OAuth 提供者驗證 `SHA256(code_verifier) === code_challenge` 防止授權碼攔截

2. **Token Security**:
   - Access token 短期有效 (15 分鐘 - 1 小時)
   - Refresh token 長期有效 (30 天, 符合規格要求)
   - Refresh token rotation: 每次使用後產生新的 refresh token
   - 儲存 token 時加密 (AES-256-GCM)

3. **Session Management**:
   - Session token 使用 JWT (HS256 或 RS256)
   - Payload 包含: `user_id`, `session_id`, `iat`, `exp`
   - 每次請求驗證 token 並檢查 session 是否被撤銷 (database query)
   - Implement token blacklist for revoked tokens

4. **Error Handling**:
   - 不洩露敏感錯誤訊息 (如「OAuth provider returned invalid token」→「登入失敗，請重試」)
   - 記錄所有認證失敗到 audit log
   - Rate limiting: 限制同一 IP 每分鐘最多 10 次登入嘗試

5. **Security Headers**:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Content-Security-Policy: default-src 'self'`

**Implementation Libraries**:
```json
{
  "helmet": "^7.1.0", // security headers
  "@nestjs/throttler": "^5.0.1", // rate limiting
  "bcrypt": "^5.1.1", // password hashing (if needed)
  "crypto": "built-in" // Node.js crypto for PKCE
}
```

---

### 6. 效能最佳化策略

**Question**: 如何確保 API 回應時間符合 p95 < 200ms/500ms 要求?

**Decision**: 多層快取 + 資料庫索引 + 連線池

**Optimization Strategies**:

1. **Caching**:
   - **User data cache**: Redis (TTL 15 mins)
     - Key: `user:{user_id}`, Value: user profile JSON
   - **Session validation cache**: Redis (TTL 5 mins)
     - Key: `session:{token}`, Value: `{user_id, valid: true/false}`
   - Cache invalidation: 登出時刪除相關 cache

2. **Database Indexing** (已在 Schema Design 定義):
   - `social_accounts.user_id` (B-tree index)
   - `sessions.token` (partial index, WHERE revoked = FALSE)
   - `sessions.expires_at` (for cleanup queries)
   - `audit_logs.timestamp` (for range queries)

3. **Connection Pooling**:
   - Supabase client pool size: 20 connections
   - Connection timeout: 30 seconds
   - Idle connection timeout: 10 minutes

4. **Query Optimization**:
   - Avoid N+1 queries: 使用 JOIN 或 batch queries
   - Limit result set: 分頁查詢 (default page size: 50)
   - Use `SELECT` specific columns (避免 `SELECT *`)

5. **Async Operations**:
   - Audit log 寫入異步執行 (不阻塞主請求)
   - Email 通知異步發送 (如有實作)
   - 使用 Bull queue (Redis-backed) for background jobs

6. **Monitoring**:
   - 使用 Prometheus + Grafana 監控 API latency
   - 設定 alert: p95 > 200ms/500ms 觸發通知
   - Supabase Dashboard 監控資料庫查詢效能

**Dependencies Resolved**:
```json
{
  "ioredis": "^5.3.2", // Redis client
  "@nestjs/bull": "^10.0.1", // queue management
  "bull": "^4.12.0",
  "@nestjs/prometheus": "^1.0.0" // metrics
}
```

---

### 7. 審計日誌自動清理機制

**Question**: 如何實作 90 天審計日誌自動清理?

**Decision**: Cron Job + Soft Delete + 硬刪除

**Implementation Strategy**:

1. **Cron Schedule**:
   - 使用 NestJS `@nestjs/schedule` 模組
   - 每日凌晨 2:00 執行清理 (低流量時段)
   - Cron expression: `0 2 * * *`

2. **Cleanup Query**:
```sql
DELETE FROM public.audit_logs
WHERE timestamp < NOW() - INTERVAL '90 days';
```

3. **Safety Measures**:
   - Dry-run mode: 先計算要刪除的筆數
   - Batch deletion: 每次最多刪除 1000 筆 (避免 long-running transactions)
   - 記錄清理操作到系統日誌
   - 如果刪除失敗,發送 alert 通知管理員

4. **Compliance Consideration**:
   - 匿名化敏感資料: 刪除前將 `ip_address` 清空
   - 保留統計資料: 可選擇將彙總資料 (登入次數、失敗率) 保留到另一張表

**Dependencies Resolved**:
```json
{
  "@nestjs/schedule": "^4.0.0",
  "node-cron": "^3.0.3" // alternative if needed
}
```

---

## Summary of Resolved Decisions

### Technical Context (Updated)

**Language/Version**: Node.js 20 LTS + TypeScript 5.3+  
**Framework**: NestJS 10.x  
**Primary Dependencies**: 
- `@supabase/supabase-js` 2.39.0 (資料庫與認證)
- `@nestjs/jwt` 10.2.0 (JWT 產生與驗證)
- `@nestjs/passport` 10.0.3 (認證策略)
- `passport-jwt` 4.0.1 (JWT Passport 策略)
- `ioredis` 5.3.2 (快取)
- `helmet` 7.1.0 (安全標頭)
- `@nestjs/throttler` 5.0.1 (rate limiting)
- `@nestjs/schedule` 4.0.0 (cron jobs)

**Storage**: Supabase PostgreSQL (auth.users + 3 custom tables: social_accounts, sessions, audit_logs)  
**Caching**: Redis (session validation, user data)  
**Testing**: Jest 29.7.0 + Supertest 6.3.3 + @nestjs/testing 10.3.0  
**Target Platform**: Linux server (Docker container), Node.js 20 runtime  
**Project Type**: RESTful API (backend only)  

**Performance Goals**: 
- API p95 < 200ms (讀取) / 500ms (寫入)
- 100 並發登入請求
- 登入流程 < 3 秒

**Testing Strategy**:
- TDD workflow: 測試先行 → 實作 → 重構
- 90% coverage (unit 95%, integration 覆蓋關鍵流程)
- Contract tests for OAuth providers
- E2E tests with Supertest

**Security Measures**:
- OAuth 2.0 PKCE (RFC 7636)
- JWT with refresh token rotation
- Rate limiting (10 req/min per IP)
- Security headers (Helmet)
- IP address encryption in audit logs
- Session token blacklist

**Background Jobs**:
- 審計日誌 90 天自動清理 (每日 2:00 AM)
- 異步 audit log 寫入 (Bull queue)

---

## Next Steps (Phase 1)

1. **Generate data-model.md**: 詳細定義 4 個實體 (User, SocialAccount, Session, AuditLog)
2. **Generate contracts/**: OpenAPI/Swagger schemas for all API endpoints
3. **Generate quickstart.md**: 開發環境設定指南 (Supabase local setup, Node.js installation, Redis setup)
4. **Update agent context**: 執行 `update-agent-context.sh` 新增技術棧資訊到 Copilot context

---

**Research Completed**: 2025-11-18  
**All NEEDS CLARIFICATION Resolved**: ✅
