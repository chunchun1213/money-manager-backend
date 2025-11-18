# Data Model: 登入記帳主頁功能（後端）

**Branch**: `001-login-homepage` | **Date**: 2025-11-18
**Purpose**: 定義系統資料模型,包含實體、關聯、驗證規則與狀態轉換

## Entity Relationship Diagram

```text
┌─────────────────────────┐
│     auth.users          │ (Supabase 內建表格)
│─────────────────────────│
│ id: UUID (PK)           │
│ email: TEXT (UNIQUE)    │◄──────┐
│ raw_user_meta_data: JSON│       │
│ created_at: TIMESTAMPTZ │       │
│ updated_at: TIMESTAMPTZ │       │
│ last_sign_in_at: TS     │       │
└─────────────────────────┘       │
          ▲                        │
          │                        │
          │ 1:N                    │ N:1
          │                        │
┌─────────────────────────┐  ┌─────────────────────────┐
│  social_accounts        │  │      sessions           │
│─────────────────────────│  │─────────────────────────│
│ id: UUID (PK)           │  │ id: UUID (PK)           │
│ user_id: UUID (FK)      │  │ user_id: UUID (FK)      │
│ provider: TEXT          │  │ token: TEXT (UNIQUE)    │
│ provider_user_id: TEXT  │  │ created_at: TIMESTAMPTZ │
│ linked_at: TIMESTAMPTZ  │  │ expires_at: TIMESTAMPTZ │
│ UNIQUE(provider,        │  │ revoked: BOOLEAN        │
│        provider_user_id)│  │ device_info: JSONB      │
└─────────────────────────┘  └─────────────────────────┘
                                      ▲
                                      │ Reference
                                      │ (Soft FK)
                             ┌────────────────────────┐
                             │    audit_logs          │
                             │────────────────────────│
                             │ id: UUID (PK)          │
                             │ user_id: UUID (FK?)    │
                             │ action: TEXT           │
                             │ timestamp: TIMESTAMPTZ │
                             │ ip_address: TEXT       │
                             │ result: TEXT           │
                             │ error_message: TEXT    │
                             └────────────────────────┘
```

---

## Entity 1: User (auth.users)

### Description
代表應用程式的使用者帳號。由 Supabase Auth 自動管理,儲存核心認證資訊。

### Attributes

| 欄位名稱 | 型別 | 必填 | 唯一性 | 預設值 | 說明 |
|---------|------|------|--------|--------|------|
| `id` | UUID | ✅ | ✅ | `gen_random_uuid()` | 使用者唯一識別碼 (Primary Key) |
| `email` | TEXT | ✅ | ✅ | - | 使用者 Email,全域唯一 (由 OAuth 提供者取得) |
| `encrypted_password` | TEXT | ❌ | ❌ | NULL | 密碼雜湊值 (OAuth 使用者為 NULL) |
| `raw_user_meta_data` | JSONB | ❌ | ❌ | `{}` | 使用者元資料 (姓名、頭像 URL、OAuth 提供者) |
| `created_at` | TIMESTAMPTZ | ✅ | ❌ | `NOW()` | 帳號建立時間 |
| `updated_at` | TIMESTAMPTZ | ✅ | ❌ | `NOW()` | 最後更新時間 |
| `last_sign_in_at` | TIMESTAMPTZ | ❌ | ❌ | NULL | 最後登入時間 |

### Validation Rules

- **Email 格式**: 必須符合 RFC 5322 標準 (由 Supabase 自動驗證)
- **Email 唯一性**: 跨所有使用者全域唯一 (FR-008)
- **Metadata 結構**: 
  ```json
  {
    "name": "使用者姓名",
    "avatar_url": "https://example.com/avatar.jpg",
    "provider": "google" | "facebook"
  }
  ```

### State Transitions

```text
[未註冊] 
   │
   │ 首次 OAuth 登入 (FR-003)
   ▼
[已註冊 - 啟用]
   │
   │ 帳號刪除 (FR-014)
   ▼
[已刪除] (hard delete from Supabase)
```

### Business Rules

- **BR-001**: 每個 email 只能對應一個使用者 (FR-008)
- **BR-002**: 多個社群帳號可連結到同一使用者 (相同 email)
- **BR-003**: 刪除使用者時必須同時刪除所有關聯資料 (CASCADE)
- **BR-004**: `last_sign_in_at` 在每次登入時更新 (FR-007)

---

## Entity 2: SocialAccount (social_accounts)

### Description
代表使用者連結的社群登入帳號 (Google 或 Facebook)。一個使用者可以連結多個社群帳號。

### Attributes

| 欄位名稱 | 型別 | 必填 | 唯一性 | 預設值 | 說明 |
|---------|------|------|--------|--------|------|
| `id` | UUID | ✅ | ✅ | `gen_random_uuid()` | 社群帳號連結唯一識別碼 (PK) |
| `user_id` | UUID | ✅ | ❌ | - | 關聯的使用者 ID (FK → auth.users.id) |
| `provider` | TEXT | ✅ | ❌ | - | OAuth 提供者 (`google` 或 `facebook`) |
| `provider_user_id` | TEXT | ✅ | ❌ | - | OAuth 提供者的使用者 ID (如 Google User ID) |
| `linked_at` | TIMESTAMPTZ | ✅ | ❌ | `NOW()` | 社群帳號連結時間 |

### Validation Rules

- **Provider 限制**: 必須為 `google` 或 `facebook` (CHECK constraint)
- **Provider User ID 唯一性**: `(provider, provider_user_id)` 組合必須唯一
  - 防止同一社群帳號連結到多個使用者
- **User ID 外鍵**: 必須參考有效的 `auth.users.id`

### Indexes

```sql
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE UNIQUE INDEX idx_social_accounts_provider_user ON social_accounts(provider, provider_user_id);
```

### State Transitions

```text
[未連結]
   │
   │ OAuth 登入 (首次或新社群帳號)
   ▼
[已連結]
   │
   │ 使用者刪除帳號 (FR-014)
   ▼
[已刪除] (CASCADE delete)
```

### Business Rules

- **BR-005**: 同一社群帳號 (provider + provider_user_id) 只能連結一次
- **BR-006**: 如果 OAuth 登入的 email 已存在,自動連結到該使用者 (FR-008)
- **BR-007**: 刪除使用者時,所有 social_accounts 記錄一併刪除 (ON DELETE CASCADE)

---

## Entity 3: Session (sessions)

### Description
代表使用者的登入會話。儲存在資料庫以支援即時撤銷、多裝置管理和審計追蹤。

### Attributes

| 欄位名稱 | 型別 | 必填 | 唯一性 | 預設值 | 說明 |
|---------|------|------|--------|--------|------|
| `id` | UUID | ✅ | ✅ | `gen_random_uuid()` | 會話唯一識別碼 (PK) |
| `user_id` | UUID | ✅ | ❌ | - | 關聯的使用者 ID (FK → auth.users.id) |
| `token` | TEXT | ✅ | ✅ | - | JWT token 字串 |
| `created_at` | TIMESTAMPTZ | ✅ | ❌ | `NOW()` | 會話建立時間 |
| `expires_at` | TIMESTAMPTZ | ✅ | ❌ | `NOW() + 30 days` | 會話過期時間 (FR-012) |
| `revoked` | BOOLEAN | ✅ | ❌ | `FALSE` | 是否已撤銷 (登出時設為 TRUE) |
| `device_info` | JSONB | ❌ | ❌ | `{}` | 裝置資訊 (User-Agent, IP, 平台) |

### Validation Rules

- **Token 唯一性**: 每個 token 必須全域唯一
- **Expires At**: 必須大於 `created_at`
- **Device Info 結構** (選填):
  ```json
  {
    "user_agent": "Mozilla/5.0 ...",
    "ip": "192.168.1.1",
    "platform": "iOS 17.0"
  }
  ```

### Indexes

```sql
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE UNIQUE INDEX idx_sessions_token ON sessions(token) WHERE revoked = FALSE;
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### State Transitions

```text
[未建立]
   │
   │ 登入成功 (FR-004)
   ▼
[啟用 (revoked=FALSE)]
   │
   ├─► 登出 (FR-006) → [已撤銷 (revoked=TRUE)]
   │
   ├─► 過期 (expires_at < NOW()) → [已過期]
   │
   └─► 使用者刪除帳號 (FR-014) → [已刪除] (CASCADE)
```

### Business Rules

- **BR-008**: 登入時建立新 session,預設 30 天過期 (FR-012)
- **BR-009**: 登出時將 session 的 `revoked` 設為 TRUE (FR-006)
- **BR-010**: Token 驗證時必須檢查 `revoked=FALSE` 且 `expires_at > NOW()` (FR-005)
- **BR-011**: 一個使用者可以有多個啟用的 session (多裝置支援)
- **BR-012**: 刪除使用者時,所有 sessions 記錄一併刪除 (ON DELETE CASCADE)

---

## Entity 4: AuditLog (audit_logs)

### Description
記錄所有認證相關操作,用於安全追蹤與合規審計。保留 90 天後自動清理。

### Attributes

| 欄位名稱 | 型別 | 必填 | 唯一性 | 預設值 | 說明 |
|---------|------|------|--------|--------|------|
| `id` | UUID | ✅ | ✅ | `gen_random_uuid()` | 審計日誌唯一識別碼 (PK) |
| `user_id` | UUID | ❌ | ❌ | NULL | 關聯的使用者 ID (FK → auth.users.id, ON DELETE SET NULL) |
| `action` | TEXT | ✅ | ❌ | - | 操作類型 (登入/登出/驗證失敗/帳號刪除) |
| `timestamp` | TIMESTAMPTZ | ✅ | ❌ | `NOW()` | 操作時間 |
| `ip_address` | TEXT | ❌ | ❌ | NULL | 來源 IP 位址 (加密儲存, FR-015) |
| `result` | TEXT | ✅ | ❌ | - | 操作結果 (`success` 或 `failure`) |
| `error_message` | TEXT | ❌ | ❌ | NULL | 失敗時的錯誤訊息 |

### Validation Rules

- **Action 限制**: 必須為以下值之一 (CHECK constraint):
  - `login`: 登入操作
  - `logout`: 登出操作
  - `token_validation_failed`: Token 驗證失敗
  - `account_deleted`: 帳號刪除
- **Result 限制**: 必須為 `success` 或 `failure`
- **IP Address 加密**: 儲存前必須使用 AES-256-GCM 加密 (FR-015)

### Indexes

```sql
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### State Transitions

```text
[未記錄]
   │
   │ 認證操作發生 (FR-010)
   ▼
[已記錄]
   │
   │ 90 天後 (FR-016)
   ▼
[已刪除] (自動清理 cron job)
```

### Business Rules

- **BR-013**: 所有認證操作必須記錄到 audit_logs (FR-010)
- **BR-014**: IP 位址必須加密儲存 (FR-015)
- **BR-015**: 使用者刪除帳號時,`user_id` 設為 NULL (匿名化, ON DELETE SET NULL)
- **BR-016**: 超過 90 天的日誌自動刪除 (FR-016)
- **BR-017**: 失敗操作必須記錄 `error_message`

---

## Data Relationships

### 1. User ↔ SocialAccount (1:N)
- 一個使用者可以連結多個社群帳號 (Google + Facebook)
- 使用者刪除時,所有社群帳號連結一併刪除 (CASCADE)

### 2. User ↔ Session (1:N)
- 一個使用者可以有多個啟用的會話 (多裝置登入)
- 使用者刪除時,所有會話記錄一併刪除 (CASCADE)

### 3. User ↔ AuditLog (1:N, Soft FK)
- 一個使用者可以有多筆審計日誌
- 使用者刪除時,`user_id` 設為 NULL (保留匿名日誌)

### 4. Social Provider ↔ User (N:1, Implicit)
- 多個 OAuth 提供者 (Google/Facebook) 可映射到同一使用者 (透過 email)

---

## Data Flow: 登入流程

```text
1. 前端發送 OAuth authorization code 給後端
   ↓
2. 後端使用 Supabase SDK 交換 access token
   ↓
3. 取得使用者 email 與 profile
   ↓
4. 檢查 email 是否存在於 auth.users
   ├─ 不存在 → 建立新 User (FR-003)
   └─ 已存在 → 使用現有 User
   ↓
5. 建立或更新 SocialAccount 記錄 (FR-008)
   ↓
6. 建立新 Session (token, 30天過期) (FR-004, FR-012)
   ↓
7. 更新 User.last_sign_in_at (FR-007)
   ↓
8. 記錄 AuditLog (action=login, result=success) (FR-010)
   ↓
9. 回傳 JWT token 給前端
```

---

## Data Flow: 登出流程

```text
1. 前端發送登出請求 (帶 JWT token)
   ↓
2. 後端驗證 token 並找到對應 Session
   ↓
3. 設定 Session.revoked = TRUE (FR-006)
   ↓
4. 記錄 AuditLog (action=logout, result=success) (FR-010)
   ↓
5. 清除 Redis cache (session:{token})
   ↓
6. 回傳成功訊息
```

---

## Data Flow: 帳號刪除流程

```text
1. 前端發送帳號刪除請求 (帶 JWT token)
   ↓
2. 後端驗證 token 並識別 user_id
   ↓
3. 刪除 User 記錄 (Supabase Auth)
   ↓
4. CASCADE 刪除所有 SocialAccounts (ON DELETE CASCADE)
   ↓
5. CASCADE 刪除所有 Sessions (ON DELETE CASCADE)
   ↓
6. SET NULL 所有 AuditLogs.user_id (ON DELETE SET NULL) (匿名化)
   ↓
7. 記錄 AuditLog (action=account_deleted, user_id=NULL) (FR-014)
   ↓
8. 回傳成功訊息
```

---

## Data Integrity Constraints

### Foreign Key Constraints

```sql
-- SocialAccount → User
ALTER TABLE social_accounts 
  ADD CONSTRAINT fk_social_accounts_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Session → User
ALTER TABLE sessions 
  ADD CONSTRAINT fk_sessions_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- AuditLog → User (soft FK)
ALTER TABLE audit_logs 
  ADD CONSTRAINT fk_audit_logs_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE SET NULL;
```

### Check Constraints

```sql
-- SocialAccount provider 限制
ALTER TABLE social_accounts 
  ADD CONSTRAINT chk_provider 
  CHECK (provider IN ('google', 'facebook'));

-- AuditLog action 限制
ALTER TABLE audit_logs 
  ADD CONSTRAINT chk_action 
  CHECK (action IN ('login', 'logout', 'token_validation_failed', 'account_deleted'));

-- AuditLog result 限制
ALTER TABLE audit_logs 
  ADD CONSTRAINT chk_result 
  CHECK (result IN ('success', 'failure'));

-- Session expires_at 必須大於 created_at
ALTER TABLE sessions 
  ADD CONSTRAINT chk_expires_at 
  CHECK (expires_at > created_at);
```

### Unique Constraints

```sql
-- Email 全域唯一 (Supabase 預設)
ALTER TABLE auth.users ADD CONSTRAINT uq_email UNIQUE (email);

-- (Provider, Provider User ID) 組合唯一
ALTER TABLE social_accounts 
  ADD CONSTRAINT uq_provider_user 
  UNIQUE (provider, provider_user_id);

-- Session token 唯一
ALTER TABLE sessions 
  ADD CONSTRAINT uq_token 
  UNIQUE (token);
```

---

## Migration Strategy

### Phase 1: 建立自訂表格 (Initial Migration)

```sql
-- Migration: 20250118_create_social_accounts.sql
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

```sql
-- Migration: 20250118_create_sessions.sql
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  device_info JSONB DEFAULT '{}',
  CHECK (expires_at > created_at)
);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_token ON public.sessions(token) WHERE revoked = FALSE;
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);
```

```sql
-- Migration: 20250118_create_audit_logs.sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('login', 'logout', 'token_validation_failed', 'account_deleted')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
  error_message TEXT
);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
```

### Phase 2: Row Level Security (RLS) 設定

```sql
-- 啟用 RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: 使用者只能讀取自己的資料
CREATE POLICY "Users can view own social accounts" 
  ON public.social_accounts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" 
  ON public.sessions FOR SELECT 
  USING (auth.uid() = user_id);

-- AuditLog 只有 service role 可讀取 (後端服務)
CREATE POLICY "Service role can read audit logs" 
  ON public.audit_logs FOR SELECT 
  USING (auth.role() = 'service_role');
```

---

## TypeScript Type Definitions

```typescript
// User (from Supabase Auth)
interface User {
  id: string; // UUID
  email: string;
  raw_user_meta_data: {
    name: string;
    avatar_url: string;
    provider: 'google' | 'facebook';
  };
  created_at: string; // ISO 8601
  updated_at: string;
  last_sign_in_at: string | null;
}

// SocialAccount
interface SocialAccount {
  id: string; // UUID
  user_id: string; // UUID
  provider: 'google' | 'facebook';
  provider_user_id: string;
  linked_at: string; // ISO 8601
}

// Session
interface Session {
  id: string; // UUID
  user_id: string; // UUID
  token: string; // JWT
  created_at: string; // ISO 8601
  expires_at: string; // ISO 8601
  revoked: boolean;
  device_info?: {
    user_agent?: string;
    ip?: string;
    platform?: string;
  };
}

// AuditLog
interface AuditLog {
  id: string; // UUID
  user_id: string | null; // UUID (nullable)
  action: 'login' | 'logout' | 'token_validation_failed' | 'account_deleted';
  timestamp: string; // ISO 8601
  ip_address?: string; // encrypted
  result: 'success' | 'failure';
  error_message?: string;
}
```

---

## Summary

- **4 個實體**: User (Supabase 內建), SocialAccount, Session, AuditLog
- **3 個自訂表格**: social_accounts, sessions, audit_logs
- **關聯**: User 1:N SocialAccount, User 1:N Session, User 1:N AuditLog
- **完整性約束**: 外鍵、唯一性、CHECK constraints
- **安全性**: RLS policies, IP 加密, 匿名化
- **效能**: 6 個索引 (user_id, token, timestamp, provider)
- **合規**: 90 天自動清理, 帳號刪除時匿名化

**Data Model Completed**: 2025-11-18
