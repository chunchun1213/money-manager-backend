# 實作任務清單: 登入記帳主頁功能（後端）

**Branch**: `001-login-homepage` | **Date**: 2025-11-18  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## 實作策略

本專案採用 **TDD (Test-Driven Development)** 流程,每個任務必須先撰寫測試,確保測試失敗後再進行實作。

### MVP 範圍
**User Story 1 (P1)** 為 MVP 核心功能,必須優先完成並確保獨立可測試。

### 並行執行機會
標記 `[P]` 的任務可以並行執行,因為它們操作不同檔案且無相依性。

---

## Phase 1: Setup（專案初始化）

### 目標
建立專案基礎架構,確保開發環境可運行。

---

- [ ] T001 建立 NestJS 專案結構
  - 執行 `nest new money-manager-backend`
  - 設定 TypeScript 5.3+ 編譯選項
  - 建立目錄結構: `src/{models,services,api,lib,config}`
  - 檔案: `package.json`, `tsconfig.json`, `nest-cli.json`

- [ ] T002 安裝核心相依套件
  - 安裝 `@supabase/supabase-js@2.39.0`
  - 安裝 `@nestjs/jwt@10.2.0`, `@nestjs/passport@10.0.3`
  - 安裝 `ioredis@5.3.2`, `helmet@7.1.0`, `@nestjs/throttler@5.0.1`
  - 安裝 `@nestjs/schedule@4.0.0`
  - 檔案: `package.json`

- [ ] T003 設定環境變數範本
  - 建立 `.env.example` 包含所有必要變數
  - 變數: SUPABASE_URL, JWT_SECRET, REDIS_HOST 等
  - 檔案: `.env.example`

- [ ] T004 設定 Supabase 本地開發環境
  - 執行 `supabase init`
  - 設定 `supabase/config.toml`
  - 檔案: `supabase/config.toml`

- [ ] T005 建立資料庫 migrations
  - 建立 `supabase/migrations/20250118_create_social_accounts.sql`
  - 建立 `supabase/migrations/20250118_create_sessions.sql`
  - 建立 `supabase/migrations/20250118_create_audit_logs.sql`
  - 包含所有索引與約束 (參考 data-model.md)
  - 檔案: `supabase/migrations/*.sql`

- [ ] T006 設定 Redis 連線模組
  - 建立 `src/config/redis.config.ts`
  - 使用 ioredis 建立 Redis client
  - 檔案: `src/config/redis.config.ts`

- [ ] T007 設定測試環境
  - 安裝 `jest@29.7.0`, `supertest@6.3.3`, `@nestjs/testing@10.3.0`
  - 設定 `jest.config.js` (coverage 90%)
  - 設定 `test/jest-e2e.json`
  - 檔案: `jest.config.js`, `test/jest-e2e.json`

- [ ] T008 設定 ESLint 與 Prettier
  - 設定 `.eslintrc.js` (TypeScript 規則)
  - 設定 `.prettierrc`
  - 檔案: `.eslintrc.js`, `.prettierrc`

---

## Phase 2: Foundational（基礎元件）

### 目標
建立所有 User Stories 共用的基礎元件,包含 models、utilities、Supabase client。

**注意**: 此階段必須完成才能開始 User Story 實作。

---

- [ ] T009 [P] 建立 User model TypeScript 介面
  - 定義 `User` 介面 (參考 data-model.md)
  - 屬性: id, email, raw_user_meta_data, created_at 等
  - 檔案: `src/models/user.ts`

- [ ] T010 [P] 建立 SocialAccount model TypeScript 介面
  - 定義 `SocialAccount` 介面
  - 屬性: id, user_id, provider, provider_user_id, linked_at
  - 檔案: `src/models/social_account.ts`

- [ ] T011 [P] 建立 Session model TypeScript 介面
  - 定義 `Session` 介面
  - 屬性: id, user_id, token, created_at, expires_at, revoked, device_info
  - 檔案: `src/models/session.ts`

- [ ] T012 [P] 建立 AuditLog model TypeScript 介面
  - 定義 `AuditLog` 介面
  - 屬性: id, user_id, action, timestamp, ip_address, result, error_message
  - 檔案: `src/models/audit_log.ts`

- [ ] T013 [P] 建立錯誤類別
  - 定義 `InvalidTokenError`, `ExpiredTokenError`, `RevokedTokenError`
  - 定義 `OAuthError`, `DatabaseError`
  - 檔案: `src/lib/errors.ts`

- [ ] T014 [P] 建立常數定義
  - 定義 `TOKEN_EXPIRY_DAYS = 30`
  - 定義 `AUDIT_LOG_RETENTION_DAYS = 90`
  - 定義 `OAUTH_PROVIDERS = ['google', 'facebook']`
  - 檔案: `src/lib/constants.ts`

- [ ] T015 [P] 建立加密工具函式 (for IP address)
  - 實作 `encryptIpAddress(ip: string): string`
  - 實作 `decryptIpAddress(encrypted: string): string`
  - 使用 AES-256-GCM
  - 檔案: `src/lib/utils.ts`

- [ ] T016 建立 Supabase client 封裝
  - 實作 `SupabaseClientService`
  - 方法: `getClient()`, `getAuth()`, `getDatabase()`
  - 使用 @nestjs/common Injectable
  - 檔案: `src/services/supabase/supabase_client.ts`

- [ ] T017 建立錯誤處理中介層
  - 實作 `ErrorHandlerMiddleware`
  - 轉換內部錯誤為標準 API 錯誤格式
  - 記錄錯誤到日誌
  - 檔案: `src/api/middleware/error_handler.ts`

---

## Phase 3: User Story 1 - 社群帳號登入 (P1)

### 目標
實作 Google/Facebook OAuth 2.0 登入流程,建立使用者帳號與會話。

### 獨立測試標準
可透過發送 OAuth code 到後端 API,驗證是否成功建立使用者與會話,並返回有效 JWT token。

---

### User Story 1: 測試任務

- [ ] T018 [P] [US1] 撰寫 OAuthService 單元測試
  - 測試場景 1: Google authorization code 交換成功
  - 測試場景 2: Facebook authorization code 交換成功
  - 測試場景 3: 無效 OAuth code 回傳錯誤
  - 測試場景 4: OAuth 提供者 timeout 處理
  - Mock Supabase Auth API
  - 檔案: `tests/unit/services/oauth_service.spec.ts`

- [ ] T019 [P] [US1] 撰寫 UserService 單元測試
  - 測試場景 1: 首次登入建立新使用者
  - 測試場景 2: 再次登入使用現有使用者
  - 測試場景 3: 更新 last_sign_in_at
  - 測試場景 4: Email 格式驗證
  - Mock Supabase Database
  - 檔案: `tests/unit/services/user_service.spec.ts`

- [ ] T020 [P] [US1] 撰寫 AccountLinkingService 單元測試
  - 測試場景 1: 相同 email 自動連結社群帳號
  - 測試場景 2: 不同 provider 但相同 email 連結成功
  - 測試場景 3: 防止重複連結相同社群帳號
  - 測試場景 4: Provider user ID 唯一性檢查
  - 檔案: `tests/unit/services/account_linking.spec.ts`

- [ ] T021 [P] [US1] 撰寫 TokenService 單元測試
  - 測試場景 1: 產生有效 JWT token
  - 測試場景 2: 驗證有效 token
  - 測試場景 3: 驗證過期 token 回傳錯誤
  - 測試場景 4: 驗證無效簽名 token 回傳錯誤
  - 測試場景 5: 產生 refresh token
  - 檔案: `tests/unit/services/token_service.spec.ts`

- [ ] T022 [P] [US1] 撰寫 SessionService 單元測試
  - 測試場景 1: 建立新 session (30 天過期)
  - 測試場景 2: 驗證 session 是否有效
  - 測試場景 3: 檢查 revoked session 回傳 false
  - 測試場景 4: 檢查過期 session 回傳 false
  - 測試場景 5: 記錄裝置資訊
  - Mock Database
  - 檔案: `tests/unit/services/session_service.spec.ts`

- [ ] T023 [P] [US1] 撰寫 AuditService 單元測試
  - 測試場景 1: 記錄成功登入
  - 測試場景 2: 記錄失敗登入
  - 測試場景 3: IP 位址加密儲存
  - 測試場景 4: 異步寫入不阻塞主流程
  - Mock Database
  - 檔案: `tests/unit/services/audit_service.spec.ts`

- [ ] T024 [US1] 撰寫 Google 登入 API 整合測試
  - 測試場景 1: 完整登入流程 (首次登入)
  - 測試場景 2: 再次登入返回新 token
  - 測試場景 3: 無效 code 回傳 401
  - 測試場景 4: 缺少參數回傳 400
  - 使用 Supertest
  - 檔案: `tests/integration/auth_flow.test.ts`

- [ ] T025 [US1] 撰寫 Facebook 登入 API 整合測試
  - 測試場景 1: 完整登入流程
  - 測試場景 2: 相同 email 自動連結
  - 測試場景 3: 無效 code 回傳 401
  - 使用 Supertest
  - 檔案: `tests/integration/auth_flow.test.ts` (新增)

- [ ] T026 [US1] 撰寫帳號連結整合測試
  - 測試場景: Google 登入後再用 Facebook 登入 (相同 email)
  - 驗證: 只有一個 User 記錄,兩個 SocialAccount 記錄
  - 檔案: `tests/integration/account_linking.test.ts`

- [ ] T027 [P] [US1] 撰寫 OAuth 提供者契約測試
  - 測試 Google OAuth API 回應格式
  - 測試 Facebook OAuth API 回應格式
  - 使用 Pact 或 mock server
  - 檔案: `tests/contract/oauth_provider.test.ts`

### User Story 1: 實作任務

- [ ] T028 [US1] 實作 OAuthService
  - 方法: `exchangeCodeForToken(code: string, codeVerifier: string, provider: 'google' | 'facebook'): Promise<OAuthUser>`
  - 使用 Supabase Auth `exchangeCodeForSession()`
  - 錯誤處理: OAuth token 無效、timeout
  - 檔案: `src/services/auth/oauth_service.ts`

- [ ] T029 [US1] 實作 UserService
  - 方法: `findOrCreateUser(email: string, profile: UserProfile): Promise<User>`
  - 方法: `updateLastSignIn(userId: string): Promise<void>`
  - 使用 Supabase Database
  - 檔案: `src/services/user/user_service.ts`

- [ ] T030 [US1] 實作 AccountLinkingService
  - 方法: `linkSocialAccount(userId: string, provider: string, providerUserId: string): Promise<SocialAccount>`
  - 方法: `findUserByProvider(provider: string, providerUserId: string): Promise<User | null>`
  - Email 唯一性檢查邏輯
  - 檔案: `src/services/user/account_linking.ts`

- [ ] T031 [US1] 實作 TokenService
  - 方法: `generateAccessToken(userId: string, sessionId: string): string`
  - 方法: `generateRefreshToken(userId: string, sessionId: string): string`
  - 方法: `verifyAccessToken(token: string): { userId: string, sessionId: string }`
  - 使用 @nestjs/jwt
  - 檔案: `src/services/auth/token_service.ts`

- [ ] T032 [US1] 實作 SessionService
  - 方法: `createSession(userId: string, token: string, deviceInfo?: any): Promise<Session>`
  - 方法: `validateSession(token: string): Promise<boolean>`
  - 方法: `getSessionByToken(token: string): Promise<Session | null>`
  - 檔案: `src/services/auth/session_service.ts`

- [ ] T033 [US1] 實作 AuditService
  - 方法: `logLogin(userId: string, ip: string, result: 'success' | 'failure', error?: string): Promise<void>`
  - IP 位址加密
  - 使用 Bull queue 異步寫入
  - 檔案: `src/services/audit/audit_service.ts`

- [ ] T034 [US1] 實作 Google 登入 API endpoint
  - Route: `POST /auth/login/google`
  - Controller 方法: `loginWithGoogle(body: { code, code_verifier, device_info? })`
  - 呼叫 OAuthService → UserService → SessionService → AuditService
  - 返回 LoginResponse
  - 檔案: `src/api/routes/auth.ts`

- [ ] T035 [US1] 實作 Facebook 登入 API endpoint
  - Route: `POST /auth/login/facebook`
  - Controller 方法: `loginWithFacebook(body: { code, code_verifier, device_info? })`
  - 邏輯同 Google 登入
  - 檔案: `src/api/routes/auth.ts` (新增方法)

- [ ] T036 [US1] 實作請求參數驗證
  - 驗證 `code` 必填
  - 驗證 `code_verifier` 長度 43-128 字元
  - 使用 class-validator
  - 檔案: `src/api/validators/request_validator.ts`

- [ ] T037 [US1] 實作 Redis 快取 (session validation)
  - Key: `session:{token}`
  - TTL: 5 分鐘
  - Cache hit → 直接返回, Cache miss → 查詢資料庫
  - 檔案: `src/services/auth/session_service.ts` (修改)

### User Story 1: 整合與驗證

- [ ] T038 [US1] 執行所有 User Story 1 測試
  - 執行 `npm test -- --testPathPattern=US1`
  - 確認所有測試通過
  - Coverage 必須 ≥ 90%

- [ ] T039 [US1] 手動端對端測試
  - 使用 REST Client 測試 Google 登入完整流程
  - 使用 REST Client 測試 Facebook 登入
  - 驗證帳號連結功能 (相同 email)
  - 檔案: `test-api.http`

---

## Phase 4: User Story 2 - 登出功能 (P2)

### 目標
實作登出 API,撤銷 session token。

### 獨立測試標準
可透過發送登出請求驗證 session 被撤銷,後續使用該 token 的請求被拒絕。

---

### User Story 2: 測試任務

- [ ] T040 [P] [US2] 撰寫 SessionService.revokeSession 單元測試
  - 測試場景 1: 成功撤銷 session
  - 測試場景 2: 撤銷不存在的 session 回傳錯誤
  - 測試場景 3: 撤銷已撤銷的 session (idempotent)
  - Mock Database
  - 檔案: `tests/unit/services/session_service.spec.ts` (新增)

- [ ] T041 [US2] 撰寫登出 API 整合測試
  - 測試場景 1: 成功登出撤銷 token
  - 測試場景 2: 登出後使用 token 訪問 API 回傳 401
  - 測試場景 3: 多裝置登出只影響當前裝置
  - 測試場景 4: 無效 token 登出回傳 401
  - 使用 Supertest
  - 檔案: `tests/integration/auth_flow.test.ts` (新增)

### User Story 2: 實作任務

- [ ] T042 [US2] 實作 SessionService.revokeSession
  - 方法: `revokeSession(token: string): Promise<void>`
  - 設定 `revoked = TRUE`
  - 清除 Redis cache
  - 檔案: `src/services/auth/session_service.ts` (新增方法)

- [ ] T043 [US2] 實作登出 API endpoint
  - Route: `POST /auth/logout`
  - Controller 方法: `logout(req: Request)`
  - 從 Authorization header 取得 token
  - 呼叫 SessionService.revokeSession
  - 記錄 AuditLog
  - 檔案: `src/api/routes/auth.ts` (新增方法)

- [ ] T044 [US2] 實作認證中介層
  - 驗證 Authorization header 存在
  - 驗證 JWT token 格式與簽名
  - 檢查 session 是否 revoked
  - 將 userId 注入 request object
  - 檔案: `src/api/middleware/auth_middleware.ts`

### User Story 2: 整合與驗證

- [ ] T045 [US2] 執行所有 User Story 2 測試
  - 執行 `npm test -- --testPathPattern=US2`
  - 確認所有測試通過
  - Coverage ≥ 90%

- [ ] T046 [US2] 手動端對端測試
  - 登入取得 token → 登出 → 使用 token 訪問 API (應回傳 401)
  - 檔案: `test-api.http` (新增)

---

## Phase 5: User Story 3 - 記帳主頁資料 API (P3)

### 目標
實作受保護的主頁 API,返回佔位資料。

### 獨立測試標準
可透過帶有效 token 的請求驗證是否返回預期資料結構。

---

### User Story 3: 測試任務

- [ ] T047 [P] [US3] 撰寫 HomepageController 單元測試
  - 測試場景 1: 有效 token 返回主頁資料
  - 測試場景 2: 無效 token 回傳 401
  - 測試場景 3: 過期 token 回傳 401
  - Mock AuthMiddleware
  - 檔案: `tests/unit/api/homepage.spec.ts`

- [ ] T048 [US3] 撰寫主頁 API 整合測試
  - 測試場景 1: 已登入用戶取得主頁資料
  - 測試場景 2: 未登入用戶回傳 401
  - 測試場景 3: 過期 token 回傳 401
  - 使用 Supertest
  - 檔案: `tests/integration/homepage.test.ts`

### User Story 3: 實作任務

- [ ] T049 [US3] 實作主頁 API endpoint
  - Route: `GET /homepage`
  - Controller 方法: `getHomepage(req: Request)`
  - 使用 AuthMiddleware 保護
  - 返回使用者資訊 + 佔位內容 `{ message: "施工中...", icon: "🚧" }`
  - 檔案: `src/api/routes/homepage.ts`

### User Story 3: 整合與驗證

- [ ] T050 [US3] 執行所有 User Story 3 測試
  - 執行 `npm test -- --testPathPattern=US3`
  - 確認所有測試通過
  - Coverage ≥ 90%

- [ ] T051 [US3] 手動端對端測試
  - 登入取得 token → 訪問主頁 API (應返回施工中訊息)
  - 檔案: `test-api.http` (新增)

---

## Phase 6: Cross-Cutting Concerns（跨功能需求）

### 目標
實作所有 User Stories 共用的功能,包含 token 更新、帳號刪除、審計日誌清理。

---

- [ ] T052 [P] 撰寫 TokenService.refreshToken 單元測試
  - 測試場景 1: 有效 refresh token 產生新 access token
  - 測試場景 2: 無效 refresh token 回傳錯誤
  - 測試場景 3: refresh token rotation (舊 token 失效)
  - 檔案: `tests/unit/services/token_service.spec.ts` (新增)

- [ ] T053 [P] 撰寫 Token 更新 API 整合測試
  - 測試場景 1: 成功更新 token
  - 測試場景 2: 無效 refresh token 回傳 401
  - 使用 Supertest
  - 檔案: `tests/integration/auth_flow.test.ts` (新增)

- [ ] T054 實作 Token 更新 API endpoint
  - Route: `POST /auth/refresh`
  - Controller 方法: `refreshToken(body: { refresh_token })`
  - Token rotation: 產生新 access token 與 refresh token
  - 檔案: `src/api/routes/auth.ts` (新增方法)

- [ ] T055 [P] 撰寫 Token 驗證 API 單元測試
  - 測試場景 1: 有效 token 返回使用者資訊
  - 測試場景 2: 無效 token 回傳 401
  - 檔案: `tests/unit/api/auth.spec.ts`

- [ ] T056 實作 Token 驗證 API endpoint
  - Route: `GET /auth/verify`
  - Controller 方法: `verifyToken(req: Request)`
  - 使用 AuthMiddleware
  - 返回使用者資訊與 session 過期時間
  - 檔案: `src/api/routes/auth.ts` (新增方法)

- [ ] T057 [P] 撰寫 UserService.deleteAccount 單元測試
  - 測試場景 1: 成功刪除使用者與關聯資料
  - 測試場景 2: CASCADE 刪除 SocialAccounts 與 Sessions
  - 測試場景 3: AuditLogs.user_id 設為 NULL (匿名化)
  - Mock Database
  - 檔案: `tests/unit/services/user_service.spec.ts` (新增)

- [ ] T058 [P] 撰寫帳號刪除 API 整合測試
  - 測試場景 1: 成功刪除帳號
  - 測試場景 2: 刪除後所有資料已移除
  - 測試場景 3: Audit logs 保留但 user_id 為 NULL
  - 使用 Supertest
  - 檔案: `tests/integration/account_deletion.test.ts`

- [ ] T059 實作 UserService.deleteAccount
  - 方法: `deleteAccount(userId: string): Promise<void>`
  - 刪除 User (CASCADE 刪除 SocialAccounts, Sessions)
  - AuditLog user_id SET NULL
  - 記錄刪除操作到 AuditLog
  - 檔案: `src/services/user/user_service.ts` (新增方法)

- [ ] T060 實作帳號刪除 API endpoint
  - Route: `DELETE /user/delete`
  - Controller 方法: `deleteAccount(req: Request)`
  - 使用 AuthMiddleware
  - 呼叫 UserService.deleteAccount
  - 檔案: `src/api/routes/user.ts`

- [ ] T061 [P] 撰寫審計日誌清理 cron job 單元測試
  - 測試場景 1: 刪除超過 90 天的日誌
  - 測試場景 2: 保留 90 天內的日誌
  - 測試場景 3: Batch deletion (每次最多 1000 筆)
  - Mock Database
  - 檔案: `tests/unit/services/log_cleanup.spec.ts`

- [ ] T062 [P] 撰寫審計日誌清理整合測試
  - 測試場景 1: 完整清理流程
  - 測試場景 2: 清理失敗記錄錯誤日誌
  - 檔案: `tests/integration/audit_cleanup.test.ts`

- [ ] T063 實作審計日誌清理 cron job
  - 使用 @nestjs/schedule `@Cron('0 2 * * *')`
  - 刪除 `timestamp < NOW() - 90 days` 的記錄
  - Batch deletion (1000 筆一次)
  - 記錄清理結果到系統日誌
  - 檔案: `src/services/audit/log_cleanup.ts`

---

## Phase 7: Polish & Testing（優化與測試）

### 目標
確保所有功能符合憲章要求,優化效能,完善文件。

---

- [ ] T064 設定 Rate Limiting
  - 使用 @nestjs/throttler
  - 限制: 10 requests / 60 seconds per IP
  - 套用到所有 API endpoints
  - 檔案: `src/main.ts` (設定)

- [ ] T065 設定 Security Headers
  - 使用 Helmet middleware
  - 設定 HSTS, X-Content-Type-Options, X-Frame-Options, CSP
  - 檔案: `src/main.ts` (設定)

- [ ] T066 設定 CORS
  - 允許前端 origin
  - 設定 credentials: true
  - 檔案: `src/main.ts` (設定)

- [ ] T067 實作效能監控
  - 使用 @nestjs/prometheus
  - 監控 API latency (p95)
  - Alert: p95 > 200ms (讀取) / 500ms (寫入)
  - 檔案: `src/config/monitoring.ts`

- [ ] T068 執行完整測試套件
  - 執行 `npm test`
  - 執行 `npm run test:e2e`
  - 確認 coverage ≥ 90%
  - 產生 coverage 報告

- [ ] T069 執行效能測試
  - 使用 k6 或 Apache JMeter
  - 測試 100 並發登入請求
  - 驗證 p95 < 200ms/500ms
  - 檔案: `tests/performance/login.k6.js`

- [ ] T070 產生 API 文件
  - 使用 NestJS Swagger 自動產生
  - 驗證與 contracts/openapi.yaml 一致
  - 部署 Swagger UI 到 `/api/docs`

- [ ] T071 撰寫 README.md
  - 專案描述
  - 技術棧
  - 快速開始 (參考 quickstart.md)
  - API 文件連結
  - 檔案: `README.md`

- [ ] T072 Code Review & Refactoring
  - 確保所有程式碼符合 ESLint 規則
  - 移除 magic numbers
  - 確保命名清晰
  - 確保錯誤處理完整

- [ ] T073 最終 Constitution Check
  - 驗證 TDD 流程已遵循
  - 驗證測試覆蓋率 ≥ 90%
  - 驗證效能標準已達成
  - 驗證安全措施已實作
  - 驗證文件完整性

---

## 相依關係圖

```text
Phase 1: Setup (T001-T008)
    ↓
Phase 2: Foundational (T009-T017)
    ↓
    ├─► Phase 3: User Story 1 (T018-T039) [P1 - MVP]
    │   │
    │   ├─► Phase 4: User Story 2 (T040-T046) [P2]
    │   │
    │   └─► Phase 5: User Story 3 (T047-T051) [P3]
    │
    └─► Phase 6: Cross-Cutting (T052-T063)
        ↓
    Phase 7: Polish (T064-T073)
```

### 並行執行範例 (Phase 2)

可同時執行:
- T009, T010, T011, T012 (Models - 不同檔案)
- T013, T014, T015 (Utilities - 不同檔案)

### 並行執行範例 (User Story 1 測試)

可同時撰寫:
- T018 (OAuth 測試)
- T019 (User 測試)
- T020 (AccountLinking 測試)
- T021 (Token 測試)
- T022 (Session 測試)
- T023 (Audit 測試)

---

## 任務統計

- **總任務數**: 73
- **Setup**: 8 任務
- **Foundational**: 9 任務
- **User Story 1 (P1)**: 22 任務 (10 測試 + 10 實作 + 2 驗證)
- **User Story 2 (P2)**: 7 任務 (2 測試 + 3 實作 + 2 驗證)
- **User Story 3 (P3)**: 5 任務 (2 測試 + 1 實作 + 2 驗證)
- **Cross-Cutting**: 12 任務
- **Polish**: 10 任務

### MVP 範圍 (建議)

**最小可行產品包含**:
- Phase 1: Setup (T001-T008)
- Phase 2: Foundational (T009-T017)
- Phase 3: User Story 1 (T018-T039)

**MVP 後續迭代**:
- Iteration 2: User Story 2 (T040-T046)
- Iteration 3: User Story 3 (T047-T051) + Cross-Cutting (T052-T063)
- Iteration 4: Polish (T064-T073)

---

## 預估時程

**假設**: 1 位開發者,遵循 TDD 流程

- **Phase 1 (Setup)**: 1 天
- **Phase 2 (Foundational)**: 1 天
- **Phase 3 (User Story 1)**: 5 天
- **Phase 4 (User Story 2)**: 2 天
- **Phase 5 (User Story 3)**: 1 天
- **Phase 6 (Cross-Cutting)**: 3 天
- **Phase 7 (Polish)**: 2 天

**總計**: 15 天 (3 週)

**MVP 時程**: 7 天 (1.5 週)

---

**Tasks Document Completed**: 2025-11-18  
**Ready for Implementation**: ✅
