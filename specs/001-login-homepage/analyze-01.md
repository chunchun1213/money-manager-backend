# 規格分析報告

**功能分支**: `001-login-homepage`  
**分析日期**: 2025-11-18  
**分析範圍**: spec.md, plan.md, tasks.md  
**執行指令**: `/speckit.analyze`

---

## 執行摘要

已完成 `spec.md`、`plan.md`、`tasks.md` 三份核心文件的一致性與品質分析。總計檢測 **16 個功能需求**、**3 個使用者故事**、**73 個實作任務**、**5 項憲章原則**。

### 關鍵發現

- ✅ **零 CRITICAL 問題** - 無憲章違規或阻塞性缺陷
- ⚠️ **4 個 HIGH 嚴重度問題** - 主要為規格不足與模糊定義
- ⚠️ **6 個 MEDIUM 嚴重度問題** - 覆蓋率缺口與術語不一致
- ℹ️ **3 個 LOW 嚴重度問題** - 輕微措辭改進建議

**整體評估**: 文件品質良好，符合憲章所有原則，但存在 4 項 HIGH 嚴重度規格模糊問題，建議在實作前澄清。

---

## 發現清單

| ID | 類別 | 嚴重度 | 位置 | 摘要 | 建議 |
|----|----------|----------|-------------|---------|----------------|
| A1 | Ambiguity | HIGH | spec.md:FR-008 | "自動連結" 缺乏失敗情境定義 | 明確定義：Email 衝突時如何處理已存在不同使用者的情況？應阻止連結並回傳錯誤？ |
| A2 | Ambiguity | HIGH | spec.md:FR-014 | "匿名化的審計日誌" 未定義匿名化範圍 | 列舉哪些欄位需保留（timestamp, action, result）哪些需移除（user_id 設 NULL 已明確，但 IP 是否保留？） |
| A3 | Ambiguity | HIGH | spec.md:邊界案例 "網路異常" | 缺乏具體處理策略 | 定義 timeout 閾值（3秒？5秒？）、重試次數（0次直接失敗？）、錯誤訊息格式 |
| U1 | Underspecification | HIGH | spec.md:FR-013 | Refresh token 機制未定義過期時間與 rotation 策略 | 明確：refresh token 過期時間（90天？永不？）、是否支援 token rotation、revoke 邏輯 |
| C1 | Coverage | MEDIUM | spec.md:FR-006 vs tasks.md | 登出 API 未明確涵蓋「登出所有裝置」功能 | tasks.md T041 測試「多裝置登出只影響當前裝置」，但 spec 未明確是否支援 logout all devices API |
| C2 | Coverage | MEDIUM | spec.md:邊界案例 "部分資料" | 無對應任務處理社群登入缺少 email 的情境 | 新增任務或在 T028/T035 明確處理：當 OAuth 回傳無 email 時的錯誤處理與測試 |
| C3 | Coverage | MEDIUM | spec.md:SC-006 | "防止 token 偽造、重放攻擊" 無對應測試任務 | 新增安全測試任務驗證：JWT 簽名偽造檢測、重放攻擊防護（如 jti claim + blacklist） |
| C4 | Coverage | MEDIUM | spec.md:FR-012 | Token 過期時間可設定性未在 tasks 中實作 | T031 實作 TokenService 時需支援可設定的過期時間（環境變數 TOKEN_EXPIRY_DAYS） |
| I1 | Inconsistency | MEDIUM | plan.md vs tasks.md | Session model 屬性不一致 | plan.md 定義 `revoked` 欄位，tasks.md T011 未列出此屬性。需統一 TypeScript 介面定義 |
| I2 | Inconsistency | MEDIUM | Terminology | "會話" vs "Session" 混用 | spec.md 使用「會話」，tasks.md 混用 "Session" 與「會話」。建議統一使用繁體中文「會話」 |
| D1 | Duplication | LOW | spec.md:FR-005 vs FR-006 | Token 驗證邏輯重複描述 | FR-005「驗證 token 識別使用者」與 FR-006「撤銷 token」可合併為「會話管理」需求組 |
| D2 | Duplication | LOW | tasks.md | T024-T026 測試範圍重疊 | Google/Facebook 登入測試（T024/T025）與帳號連結測試（T026）有部分重疊情境，可整合避免重複測試 |
| A4 | Ambiguity | LOW | spec.md:SC-002 | "並發登入請求" 未定義成功標準 | 「不出現錯誤或明顯延遲」太模糊，建議量化：95% 請求成功 + p95 延遲 < 3s |

---

## 覆蓋率摘要

### 功能需求覆蓋率

| 需求 ID | 需求描述 | 是否有任務 | 對應任務 ID | 備註 |
|---------|---------|-----------|------------|------|
| FR-001 | Google OAuth PKCE | ✅ | T018, T024, T028, T034 | 完整覆蓋 |
| FR-002 | Facebook OAuth PKCE | ✅ | T018, T025, T028, T035 | 完整覆蓋 |
| FR-003 | 首次登入建立帳號 | ✅ | T019, T029 | 完整覆蓋 |
| FR-004 | 產生會話 token | ✅ | T021, T022, T031, T032 | 完整覆蓋 |
| FR-005 | 驗證 token | ✅ | T021, T022, T055, T056 | 完整覆蓋 |
| FR-006 | 登出 API | ✅ | T040, T041, T042, T043 | 完整覆蓋 |
| FR-007 | 記錄最後登入時間 | ✅ | T019, T029 | 完整覆蓋 |
| FR-008 | 連結相同 Email 社群帳號 | ✅ | T020, T026, T030 | 完整覆蓋 |
| FR-009 | 受保護主頁 API | ✅ | T047, T048, T049 | 完整覆蓋 |
| FR-010 | 審計日誌記錄 | ✅ | T023, T033 | 完整覆蓋 |
| FR-011 | 錯誤訊息處理 | ✅ | T017, T036 | 完整覆蓋 |
| FR-012 | Token 過期時間 | ⚠️ | T031 (部分) | 缺少可設定性實作 (C4) |
| FR-013 | Refresh token | ⚠️ | T052, T053, T054 | 缺少過期與 rotation 策略 (U1) |
| FR-014 | 帳號刪除 | ✅ | T057, T058, T059, T060 | 完整覆蓋 |
| FR-015 | 資料收集告知與加密 | ✅ | T015, T033 (IP 加密) | 完整覆蓋（告知為前端責任） |
| FR-016 | 審計日誌 90 天清理 | ✅ | T061, T062, T063 | 完整覆蓋 |

**統計**:
- 總需求: 16
- 完整覆蓋: 14 (87.5%)
- 部分覆蓋: 2 (12.5%)
- 零覆蓋: 0 (0%)

### 使用者故事覆蓋率

| 故事 ID | 優先級 | 驗收場景數 | 對應任務數 | 覆蓋率 | 備註 |
|---------|-------|-----------|-----------|--------|------|
| US1 - 社群帳號登入 | P1 | 5 | 22 | 100% | 所有場景有明確測試任務 |
| US2 - 登出功能 | P2 | 4 | 7 | 100% | 所有場景有明確測試任務 |
| US3 - 記帳主頁 API | P3 | 3 | 5 | 100% | 所有場景有明確測試任務 |

**評估**: 所有使用者故事均有完整的測試與實作任務對應，TDD 流程清晰。

### 邊界案例覆蓋率

| 案例 | 是否有任務 | 對應任務/位置 | 備註 |
|------|-----------|-------------|------|
| 網路異常 | ⚠️ | T018 (部分: "timeout 處理") | 缺乏具體策略定義 (A3) |
| 重複登入 | ✅ | T019, T020 (Email 唯一性) | 已覆蓋 |
| Email 衝突 | ✅ | T020, T026 | 已覆蓋 |
| Token 過期 | ✅ | T021, T041, T048 | 已覆蓋 |
| 並發會話 | ✅ | T041 (多裝置測試) | 已覆蓋 |
| 部分資料 | ❌ | 無對應任務 | 未覆蓋 (C2) |
| 帳號刪除 | ✅ | T057, T058, T059 | 已覆蓋 |

**統計**:
- 總邊界案例: 7
- 完整覆蓋: 5 (71.4%)
- 部分覆蓋: 1 (14.3%)
- 零覆蓋: 1 (14.3%)

---

## 憲章符合性檢查

### Principle I: Code Quality First ✅ 符合

- **清晰命名**: tasks.md T072 明確要求清晰命名與移除 magic numbers
- **錯誤處理**: FR-011 + T017 實作標準錯誤處理中介層
- **常數定義**: T014 定義 TOKEN_EXPIRY_DAYS, AUDIT_LOG_RETENTION_DAYS
- **Code Review**: T072 包含 code review 與 linting 檢查

**驗證**: 無違規項目。

### Principle II: Test-Driven Development ✅ 符合

- **TDD 流程**: tasks.md 明確採用「測試先行 → 實作 → 重構」流程
- **測試覆蓋率**: T068 驗證 ≥90% 覆蓋率目標
- **測試類型**: 
  - Unit Tests: T018-T023 (6 個服務單元測試)
  - Integration Tests: T024-T026, T041, T048 等
  - Contract Tests: T027 (OAuth provider)
- **測試品質**: 所有測試任務定義具體場景、mock 策略與預期結果

**驗證**: 無違規項目。所有 User Story 實作任務前皆有對應測試任務。

### Principle III: User Experience Consistency ✅ 符合

- **API 設計**: plan.md 中 contracts/openapi.yaml 定義標準 RESTful 端點
- **錯誤格式**: T017 實作統一錯誤回應格式
- **資料格式**: data-model.md 使用 ISO 8601 時間格式
- **錯誤訊息**: FR-011 要求清晰的繁體中文錯誤訊息（需前端配合）

**驗證**: 無違規項目。

### Principle IV: Performance & Scalability ✅ 符合

- **回應時間**: SC-003 明確定義 p95 < 200ms (讀取) / 500ms (寫入)
- **並發要求**: SC-002 要求支援 100 個並發登入請求
- **效能測試**: T069 使用 k6 執行效能測試
- **監控**: T067 實作 Prometheus 效能監控
- **資源管理**: T006 設定 Redis 連線池, T037 實作快取策略

**驗證**: 無違規項目。效能標準明確且有對應測試任務。

### Principle V: Documentation Language Standards ✅ 符合

- **規格文件**: spec.md 使用繁體中文 ✅
- **實作計畫**: plan.md 使用繁體中文 ✅
- **任務清單**: tasks.md 使用繁體中文 ✅
- **憲章**: constitution.md 使用英文（符合規定）✅
- **使用者錯誤訊息**: FR-011 要求使用繁體中文

**驗證**: 無違規項目。

### Security & Data Integrity ✅ 符合

- **認證**: OAuth 2.0 PKCE 流程 (FR-001, FR-002, T028, T034, T035)
- **會話管理**: JWT token + 30 天過期 + refresh token (FR-012, FR-013)
- **資料加密**: IP 位址 AES-256-GCM 加密 (T015, T033)
- **審計**: 所有認證操作記錄 (T023, T033), 90 天保留 (T061-T063)
- **Rate Limiting**: T064 設定 throttling (10 req/60s)
- **Security Headers**: T065 設定 Helmet (HSTS, CSP 等)

**驗證**: 無違規項目。

### Development Workflow & Quality Gates ✅ 符合

- **Feature Branch**: plan.md 明確使用 feature branch 工作流程
- **CI/CD**: T068 整合測試管線
- **Peer Review**: T072 包含 code review 步驟
- **Pre-Merge Gates**: T068 測試通過、T072 linting 通過
- **Constitution Check**: T073 最終憲章檢查

**驗證**: 無違規項目。

---

## 憲章違規項目

**無違規項目** ✅

所有 5 項核心憲章原則與安全/開發流程標準皆符合規格要求。

---

## 未映射任務

以下任務未明確映射到 spec.md 的功能需求或使用者故事（屬於基礎建設或優化）：

| 任務 ID | 描述 | 分類 | 合理性 |
|---------|------|------|--------|
| T001-T008 | 專案初始化（NestJS、套件安裝、環境設定等） | 基礎建設 | ✅ 必要 |
| T009-T017 | 基礎元件（Models, Utilities, Supabase Client） | 基礎建設 | ✅ 必要 |
| T064-T067 | Security headers, CORS, Rate Limiting, Monitoring | 非功能需求（NFR） | ✅ 憲章要求 |
| T070-T073 | API 文件、README、Code Review、Constitution Check | 品質閘門 | ✅ 憲章要求 |

**評估**: 這些任務屬於必要的技術債務與品質保證，符合憲章 Development Workflow 要求。無不合理任務。

---

## 指標統計

### 整體數據

- **總功能需求**: 16
- **總使用者故事**: 3 (優先級: 1×P1, 1×P2, 1×P3)
- **總任務**: 73
- **總 Phase**: 7 (Setup → Foundational → US1/US2/US3 → Cross-Cutting → Polish)

### 覆蓋率

- **需求覆蓋率**: 87.5% (14/16 完整覆蓋, 2/16 部分覆蓋)
- **故事覆蓋率**: 100% (3/3)
- **邊界案例覆蓋率**: 71.4% (5/7 完整覆蓋, 1/7 部分覆蓋, 1/7 零覆蓋)

### 問題分佈

- **模糊定義數**: 4 (A1, A2, A3, A4)
- **規格不足數**: 1 (U1)
- **覆蓋率缺口數**: 4 (C1, C2, C3, C4)
- **不一致項目數**: 2 (I1, I2)
- **重複項目數**: 2 (D1, D2)

### 嚴重度分佈

- **CRITICAL 問題**: 0 ✅
- **HIGH 問題**: 4 ⚠️
- **MEDIUM 問題**: 6 ⚠️
- **LOW 問題**: 3 ℹ️

---

## 下一步行動

### 🚨 必須處理（HIGH 問題）

**建議在執行 `/speckit.implement` 前解決以下 4 項 HIGH 嚴重度問題**:

#### 1. A1 - 澄清 Email 衝突處理邏輯

**位置**: spec.md FR-008  
**現況**: "系統必須能夠將相同 email 的不同社群帳號連結到同一使用者"  
**問題**: 未定義當 Email 已屬於不同使用者時的處理邏輯  
**行動**: 更新 spec.md FR-008，新增以下內容：

```markdown
FR-008 補充：
- 當使用者用新社群帳號登入，且該帳號的 email 已存在於系統中：
  - 如果 email 屬於當前使用者的其他社群帳號 → 自動連結
  - 如果 email 屬於不同使用者 → 拒絕連結並回傳錯誤 (HTTP 409 Conflict)
    - 錯誤訊息：「此電子郵件已被其他帳號使用，請使用其他方式登入」
```

#### 2. A2 - 定義審計日誌匿名化範圍

**位置**: spec.md FR-014  
**現況**: "保留匿名化的審計日誌以符合安全追蹤需求"  
**問題**: 未明確定義哪些欄位需匿名化，哪些需保留  
**行動**: 更新 spec.md FR-014，新增以下內容：

```markdown
FR-014 補充（審計日誌匿名化規則）：
- 帳號刪除後，審計日誌處理：
  - 保留欄位: id, action, timestamp, result, error_message
  - 匿名化欄位: user_id 設為 NULL
  - 刪除欄位: ip_address（完全移除，即使已加密）
- 匿名化後的日誌保留 90 天，之後自動清理
```

#### 3. A3 - 定義網路異常處理策略

**位置**: spec.md 邊界案例 "網路異常"  
**現況**: "當社群登入服務（Google/Facebook）無回應或超時時，系統應如何處理？"  
**問題**: 缺乏具體 timeout、重試、錯誤處理策略  
**行動**: 更新 spec.md 邊界案例，新增以下內容：

```markdown
邊界案例 - 網路異常（補充）：
- Timeout 設定: OAuth token 交換請求設定 5 秒 timeout
- 重試策略: 不重試（立即失敗，避免阻塞使用者）
- 錯誤處理:
  - HTTP 503 Service Unavailable
  - 錯誤訊息: "社群登入服務暫時無法使用，請稍後再試"
  - 記錄 AuditLog (action: 'login_failed', error_message: 'OAuth provider timeout')
```

#### 4. U1 - 定義 Refresh Token 過期與 Rotation 策略

**位置**: spec.md FR-013  
**現況**: "系統必須支援 token 更新機制（refresh token），避免使用者頻繁重新登入"  
**問題**: 未定義 refresh token 過期時間、rotation 邏輯、revoke 策略  
**行動**: 更新 spec.md FR-013，新增以下內容：

```markdown
FR-013 補充（Refresh Token 詳細規範）：
- Access Token 過期時間: 30 天（如 FR-012）
- Refresh Token 過期時間: 90 天
- Token Rotation 策略:
  - 每次使用 refresh token 更新時，產生新的 access token 與 refresh token
  - 舊的 refresh token 立即失效（一次性使用）
- Revoke 邏輯:
  - 使用者登出時，同時撤銷 access token 與 refresh token
  - 偵測到 refresh token 重複使用時（可能的 token 洩漏），撤銷該使用者的所有 sessions
```

---

### 執行指令建議

#### 選項 A: 手動更新 spec.md

1. 複製上述 4 項補充內容
2. 手動編輯 `specs/001-login-homepage/spec.md`
3. 更新後執行 `/speckit.tasks` 重新產生 tasks.md（確保新需求有對應任務）

#### 選項 B: 使用 /speckit.specify 重新澄清

執行指令:
```bash
/speckit.specify --clarify "FR-008, FR-013, FR-014, 邊界案例網路異常"
```

#### 選項 C: 直接進入實作（不建議）

**風險**: 實作時開發者需自行決策模糊需求，可能導致:
- 技術債累積
- 測試案例不完整
- 後續需求變更成本高

---

### 🔧 建議處理（MEDIUM 問題）

以下問題不阻塞實作，但建議在 code review 前解決：

#### C2 - 新增任務處理社群登入缺少 email 的情境

**行動**: 手動編輯 tasks.md，在 T028 (實作 OAuthService) 中新增：

```markdown
T028 補充：
- 錯誤處理: 
  - OAuth 回傳無 email → 拋出 OAuthError("OAuth provider did not return email")
  - 前端顯示: "無法取得電子郵件資訊，請確認社群帳號設定"
```

並在 T018 (單元測試) 中新增測試場景：
```markdown
測試場景 5: OAuth 回傳無 email 拋出錯誤
```

#### C3 - 新增安全測試任務

**行動**: 在 tasks.md Phase 7 新增任務：

```markdown
- [ ] T073a [P] 撰寫 JWT 安全測試
  - 測試場景 1: 偽造 JWT 簽名應被拒絕
  - 測試場景 2: 使用已撤銷的 token 應回傳 401
  - 測試場景 3: Token replay attack 防護（檢查 jti claim 或 timestamp）
  - 檔案: tests/unit/services/token_service.spec.ts (新增)
```

#### C4 - 修改 T031 支援可設定 token 過期時間

**行動**: 手動編輯 tasks.md T031，修改為：

```markdown
- [ ] T031 [US1] 實作 TokenService
  - 方法: generateAccessToken(userId: string, sessionId: string, expiresIn?: number)
  - 使用環境變數 TOKEN_EXPIRY_DAYS (預設 30 天)
  - 方法: generateRefreshToken(userId: string, sessionId: string, expiresIn?: number)
  - 使用環境變數 REFRESH_TOKEN_EXPIRY_DAYS (預設 90 天)
  - 方法: verifyAccessToken(token: string): { userId: string, sessionId: string }
  - 使用 @nestjs/jwt
  - 檔案: src/services/auth/token_service.ts
```

#### I1 - 統一 Session model 屬性定義

**行動**: 手動編輯 tasks.md T011，修改為：

```markdown
- [ ] T011 [P] 建立 Session model TypeScript 介面
  - 定義 `Session` 介面
  - 屬性: id, user_id, token, created_at, expires_at, revoked, device_info
  - 檔案: `src/models/session.ts`
```

確保與 plan.md 中 data-model.md 定義一致。

#### I2 - 統一術語

**行動**: 執行全域搜尋取代：

```bash
# 將 tasks.md 中的 "Session" 替換為「會話」（保留程式碼中的 Session）
# 僅替換描述文字中的 "Session"，不影響程式碼
```

---

### ℹ️ 可選處理（LOW 問題）

以下問題不影響功能，可在後續迭代處理：

- **D1**: 整合 FR-005 與 FR-006 為「會話管理」需求組（下次 spec 更新時處理）
- **D2**: 整合重複測試（code review 時檢視是否確實重複）
- **A4**: 量化 SC-002 成功標準（效能測試時驗證）

---

## 補救計畫確認

請選擇以下選項以繼續：

### 選項 A: 我提供具體文字修正（建議）

我已在上方「下一步行動」中提供 4 項 HIGH 問題的具體修正文字，您可以：
1. 複製修正內容
2. 手動套用到 spec.md
3. 執行 `/speckit.tasks` 更新 tasks.md

### 選項 B: 執行 /speckit.specify 重新澄清

執行指令重新澄清規格（需提供具體澄清需求）

### 選項 C: 接受現狀，直接實作

**風險評估**:
- **HIGH 風險**: A1, A3, U1 可能導致實作時需求不明確
- **MEDIUM 風險**: C2, C3 可能導致測試覆蓋率不足
- **接受現狀建議**: 僅在時程緊迫且願意承擔技術債時選擇

---

**分析完成時間**: 2025-11-18  
**建議行動**: 優先解決 4 項 HIGH 問題（預估 1-2 小時），再進入實作階段

---

## 附錄：完整需求-任務映射表

### FR-001: Google OAuth PKCE
- T018 [測試] OAuthService 單元測試（場景 1: Google code 交換）
- T024 [測試] Google 登入 API 整合測試
- T028 [實作] OAuthService
- T034 [實作] Google 登入 API endpoint

### FR-002: Facebook OAuth PKCE
- T018 [測試] OAuthService 單元測試（場景 2: Facebook code 交換）
- T025 [測試] Facebook 登入 API 整合測試
- T028 [實作] OAuthService
- T035 [實作] Facebook 登入 API endpoint

### FR-003: 首次登入建立帳號
- T019 [測試] UserService 單元測試（場景 1: 首次登入建立新使用者）
- T029 [實作] UserService.findOrCreateUser

### FR-004: 產生會話 token
- T021 [測試] TokenService 單元測試（場景 1: 產生 JWT）
- T022 [測試] SessionService 單元測試（場景 1: 建立 session）
- T031 [實作] TokenService
- T032 [實作] SessionService.createSession

### FR-005: 驗證 token
- T021 [測試] TokenService 單元測試（場景 2-4: 驗證 token）
- T022 [測試] SessionService 單元測試（場景 2-4: 驗證 session）
- T055 [測試] Token 驗證 API 單元測試
- T056 [實作] Token 驗證 API endpoint

### FR-006: 登出 API
- T040 [測試] SessionService.revokeSession 單元測試
- T041 [測試] 登出 API 整合測試
- T042 [實作] SessionService.revokeSession
- T043 [實作] 登出 API endpoint

### FR-007: 記錄最後登入時間
- T019 [測試] UserService 單元測試（場景 3: 更新 last_sign_in_at）
- T029 [實作] UserService.updateLastSignIn

### FR-008: 連結相同 Email 社群帳號
- T020 [測試] AccountLinkingService 單元測試
- T026 [測試] 帳號連結整合測試
- T030 [實作] AccountLinkingService

### FR-009: 受保護主頁 API
- T047 [測試] HomepageController 單元測試
- T048 [測試] 主頁 API 整合測試
- T049 [實作] 主頁 API endpoint

### FR-010: 審計日誌記錄
- T023 [測試] AuditService 單元測試
- T033 [實作] AuditService

### FR-011: 錯誤訊息處理
- T017 [實作] 錯誤處理中介層
- T036 [實作] 請求參數驗證

### FR-012: Token 過期時間
- T031 [實作] TokenService（⚠️ 需補充可設定性 - C4）

### FR-013: Refresh token
- T052 [測試] TokenService.refreshToken 單元測試
- T053 [測試] Token 更新 API 整合測試
- T054 [實作] Token 更新 API endpoint
- ⚠️ 缺少過期與 rotation 策略 (U1)

### FR-014: 帳號刪除
- T057 [測試] UserService.deleteAccount 單元測試
- T058 [測試] 帳號刪除 API 整合測試
- T059 [實作] UserService.deleteAccount
- T060 [實作] 帳號刪除 API endpoint

### FR-015: 資料收集告知與加密
- T015 [實作] 加密工具函式（IP 加密）
- T033 [實作] AuditService（IP 加密儲存）
- 告知功能為前端責任（不在後端範圍）

### FR-016: 審計日誌 90 天清理
- T061 [測試] 審計日誌清理 cron job 單元測試
- T062 [測試] 審計日誌清理整合測試
- T063 [實作] 審計日誌清理 cron job

---

**報告結束** | 如需進一步澄清任何發現，請告知。
