# Quickstart Guide: 登入記帳主頁功能開發環境

**Branch**: `001-login-homepage` | **Date**: 2025-11-18
**Purpose**: 快速設定開發環境,準備開始實作登入記帳主頁功能

## 前置需求

### 必要軟體

- **Node.js**: 20 LTS 或更高版本
  - 驗證: `node --version` (應顯示 v20.x.x)
  - 下載: https://nodejs.org/

- **npm**: 10.x 或更高版本
  - 驗證: `npm --version` (應顯示 10.x.x)
  - 隨 Node.js 自動安裝

- **Git**: 2.x 或更高版本
  - 驗證: `git --version`
  - 下載: https://git-scm.com/

- **Supabase CLI**: 1.x 或更高版本
  - 安裝: `npm install -g supabase`
  - 驗證: `supabase --version`
  - 文件: https://supabase.com/docs/guides/cli

- **Redis**: 7.x 或更高版本 (用於快取)
  - macOS: `brew install redis`
  - Linux: `sudo apt install redis-server`
  - 驗證: `redis-cli --version`

### 建議軟體

- **Visual Studio Code**: 最新版本
  - 擴充套件:
    - ESLint (`dbaeumer.vscode-eslint`)
    - Prettier (`esbenp.prettier-vscode`)
    - TypeScript (`ms-vscode.vscode-typescript-next`)
    - REST Client (`humao.rest-client`)

- **Docker Desktop**: 最新版本 (選填,用於容器化部署)
  - 下載: https://www.docker.com/products/docker-desktop

---

## Step 1: Clone Repository

```bash
# Clone 專案 (假設已存在 GitHub repo)
git clone https://github.com/your-org/money-manager-backend.git
cd money-manager-backend

# 切換到功能分支
git checkout 001-login-homepage

# 驗證分支
git branch
# 應顯示 * 001-login-homepage
```

---

## Step 2: 安裝相依套件

```bash
# 安裝專案相依套件
npm install

# 驗證安裝
npm list --depth=0
# 應顯示所有 package.json 中的相依套件
```

### 核心相依套件 (參考)

```json
{
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/throttler": "^5.0.1",
    "@supabase/supabase-js": "^2.39.0",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.1.14",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "prettier": "^3.2.4",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

---

## Step 3: 設定環境變數

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 檔案
# 使用 VS Code:
code .env

# 或使用任何文字編輯器:
# nano .env
# vim .env
```

### 必要環境變數 (.env)

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=3600 # 1 hour (seconds)
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=2592000 # 30 days (seconds)

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD= # leave empty for local dev
REDIS_DB=0

# OAuth Configuration (Google)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth Configuration (Facebook)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Rate Limiting
RATE_LIMIT_TTL=60 # seconds
RATE_LIMIT_MAX=10 # requests per TTL

# Audit Log
AUDIT_LOG_RETENTION_DAYS=90

# Logging
LOG_LEVEL=debug # debug, info, warn, error
```

### 取得 Supabase 憑證

1. 前往 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇專案或建立新專案
3. 進入 `Settings` → `API`
4. 複製以下值:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 取得 OAuth 憑證

#### Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案或選擇現有專案
3. 啟用 `Google+ API`
4. 前往 `APIs & Services` → `Credentials`
5. 建立 `OAuth 2.0 Client ID` (Application type: Web application)
6. 設定 Authorized redirect URIs:
   - 開發環境: `http://localhost:3000/api/v1/auth/callback/google`
   - 正式環境: `https://api.money-manager.example.com/api/v1/auth/callback/google`
7. 複製 `Client ID` 與 `Client Secret`

#### Facebook OAuth

1. 前往 [Facebook Developers](https://developers.facebook.com/)
2. 建立應用程式或選擇現有應用程式
3. 前往 `Settings` → `Basic`
4. 複製 `App ID` 與 `App Secret`
5. 前往 `Facebook Login` → `Settings`
6. 設定 Valid OAuth Redirect URIs:
   - 開發環境: `http://localhost:3000/api/v1/auth/callback/facebook`
   - 正式環境: `https://api.money-manager.example.com/api/v1/auth/callback/facebook`

---

## Step 4: 設定 Supabase Local Development

```bash
# 初始化 Supabase 專案 (如果尚未初始化)
supabase init

# 啟動 Supabase local dev server
supabase start

# 輸出範例:
# Started supabase local development setup.
#
#          API URL: http://localhost:54321
#      GraphQL URL: http://localhost:54321/graphql/v1
#           DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#       Studio URL: http://localhost:54323
#     Inbucket URL: http://localhost:54324
#       JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
#         anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 更新 .env 使用 local Supabase
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=<從上方輸出複製>
# SUPABASE_SERVICE_ROLE_KEY=<從上方輸出複製>
```

### 執行資料庫 Migrations

```bash
# 建立自訂表格 (social_accounts, sessions, audit_logs)
supabase migration new create_social_accounts
supabase migration new create_sessions
supabase migration new create_audit_logs

# 複製 SQL 從 data-model.md 到 migration 檔案
# 檔案位置: supabase/migrations/*.sql

# 執行 migrations
supabase db reset

# 驗證表格已建立
supabase db diff
```

---

## Step 5: 啟動 Redis

```bash
# macOS (使用 Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis-server

# 驗證 Redis 運行中
redis-cli ping
# 應回應: PONG

# 檢查 Redis 版本
redis-cli --version
```

---

## Step 6: 執行開發伺服器

```bash
# 啟動開發伺服器 (hot-reload)
npm run start:dev

# 輸出範例:
# [Nest] 12345  - 2025/01/18 10:30:00     LOG [NestFactory] Starting Nest application...
# [Nest] 12345  - 2025/01/18 10:30:00     LOG [InstanceLoader] AppModule dependencies initialized
# [Nest] 12345  - 2025/01/18 10:30:00     LOG [RoutesResolver] AuthController {/api/v1/auth}: +5
# [Nest] 12345  - 2025/01/18 10:30:00     LOG [RouterExplorer] Mapped {/api/v1/auth/login/google, POST} route
# [Nest] 12345  - 2025/01/18 10:30:00     LOG [NestApplication] Nest application successfully started
# [Nest] 12345  - 2025/01/18 10:30:00     LOG Application listening on http://localhost:3000

# 測試 API 健康檢查
curl http://localhost:3000/health
# 應回應: {"status":"ok"}
```

---

## Step 7: 執行測試

```bash
# 執行所有測試
npm test

# 執行測試並產生 coverage 報告
npm run test:cov

# 執行 watch mode (自動重跑測試)
npm run test:watch

# 執行特定測試檔案
npm test -- auth.service.spec.ts

# Coverage 報告位置: coverage/lcov-report/index.html
# 使用瀏覽器開啟: open coverage/lcov-report/index.html
```

### 測試標準

- **Unit tests**: 覆蓋率必須 ≥ 90%
- **Integration tests**: 覆蓋所有 API endpoints
- **Contract tests**: 驗證 OAuth provider API contracts

---

## Step 8: 驗證設定

### 8.1 檢查 API 端點

```bash
# 使用 curl 測試 (需要先取得 OAuth code)
# 或使用 REST Client (VS Code 擴充套件)

# 建立測試檔案: test-api.http
cat > test-api.http <<EOF
### Health Check
GET http://localhost:3000/health

### Login with Google (需要真實 OAuth code)
POST http://localhost:3000/api/v1/auth/login/google
Content-Type: application/json

{
  "code": "4/0AfJohXk...",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
}

### Verify Token (需要先登入取得 token)
GET http://localhost:3000/api/v1/auth/verify
Authorization: Bearer <your-token-here>

### Get Homepage (需要先登入取得 token)
GET http://localhost:3000/api/v1/homepage
Authorization: Bearer <your-token-here>
EOF
```

### 8.2 檢查 Supabase Studio

```bash
# 開啟 Supabase Studio (local)
open http://localhost:54323

# 登入 (預設密碼在 supabase start 輸出中)

# 驗證表格已建立:
# - public.social_accounts
# - public.sessions
# - public.audit_logs
```

### 8.3 檢查 Redis

```bash
# 連線到 Redis
redis-cli

# 檢查 keys
redis> KEYS *
# 應為空 (開發初期)

# 測試設定 key
redis> SET test:key "hello"
redis> GET test:key
# 應回應: "hello"

# 清除測試 key
redis> DEL test:key

# 離開
redis> EXIT
```

---

## Step 9: OpenAPI 文件

### 啟動 Swagger UI

NestJS 自動產生 Swagger 文件:

```bash
# 確保開發伺服器執行中
# 開啟瀏覽器
open http://localhost:3000/api/docs

# Swagger UI 會顯示所有 API 端點
# 可以直接在介面中測試 API
```

### 匯出 OpenAPI Spec

```bash
# NestJS CLI 產生 OpenAPI JSON
npm run build
node dist/main.js --swagger-json

# 輸出: swagger.json
# 或使用已定義的 contracts/openapi.yaml
```

---

## Troubleshooting

### 問題 1: Supabase connection 失敗

```bash
# 檢查 Supabase 是否執行中
supabase status

# 如果未執行,重新啟動
supabase start

# 檢查環境變數是否正確
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

### 問題 2: Redis connection 失敗

```bash
# 檢查 Redis 是否執行中
redis-cli ping
# 應回應: PONG

# 如果未執行,啟動 Redis
# macOS:
brew services start redis

# Linux:
sudo systemctl start redis-server
```

### 問題 3: Port 3000 已被佔用

```bash
# 找出佔用 port 的 process
lsof -i :3000

# 終止 process (假設 PID 為 12345)
kill -9 12345

# 或修改 .env 使用其他 port
# PORT=3001
```

### 問題 4: npm install 失敗

```bash
# 清除 npm cache
npm cache clean --force

# 刪除 node_modules 與 package-lock.json
rm -rf node_modules package-lock.json

# 重新安裝
npm install
```

### 問題 5: TypeScript 編譯錯誤

```bash
# 清除 build cache
npm run build:clean

# 重新建置
npm run build

# 檢查 TypeScript 版本
npx tsc --version
# 應為 5.3.x
```

---

## Next Steps

設定完成後,可以開始實作功能:

1. **Phase 0 Complete**: 所有技術決策已在 `research.md` 定義
2. **Phase 1 Complete**: 資料模型、API 契約、Quickstart 已產生
3. **Phase 2 Start**: 執行 `/speckit.tasks` 指令產生實作任務清單 (tasks.md)

### 開發流程

```bash
# 1. 取得最新程式碼
git pull origin 001-login-homepage

# 2. 建立功能分支 (基於 TDD)
git checkout -b 001-login-homepage/auth-service

# 3. 撰寫測試 (測試先行)
# 編輯: tests/unit/services/auth.service.spec.ts

# 4. 執行測試 (應該失敗 - Red)
npm test

# 5. 實作程式碼
# 編輯: src/services/auth/oauth_service.ts

# 6. 執行測試 (應該通過 - Green)
npm test

# 7. 重構 (保持測試通過)
# 優化程式碼品質

# 8. Commit
git add .
git commit -m "feat: implement OAuth service with PKCE flow"

# 9. Push & Create PR
git push origin 001-login-homepage/auth-service
```

---

## Useful Commands

```bash
# Development
npm run start         # 啟動伺服器
npm run start:dev     # 啟動伺服器 (hot-reload)
npm run start:debug   # 啟動伺服器 (debug mode)

# Building
npm run build         # 建置專案
npm run build:clean   # 清除 build cache 並重新建置

# Testing
npm test              # 執行所有測試
npm run test:watch    # Watch mode
npm run test:cov      # 產生 coverage 報告
npm run test:e2e      # 執行端對端測試

# Code Quality
npm run lint          # 執行 ESLint
npm run format        # 執行 Prettier 格式化
npm run type-check    # TypeScript 型別檢查

# Database
supabase start        # 啟動 local Supabase
supabase stop         # 停止 local Supabase
supabase db reset     # 重設資料庫 (執行所有 migrations)
supabase migration new <name>  # 建立新 migration

# Redis
redis-cli             # 連線到 Redis
brew services start redis     # 啟動 Redis (macOS)
sudo systemctl start redis-server  # 啟動 Redis (Linux)
```

---

## Resources

- **NestJS 文件**: https://docs.nestjs.com/
- **Supabase 文件**: https://supabase.com/docs
- **TypeScript 手冊**: https://www.typescriptlang.org/docs/
- **Jest 文件**: https://jestjs.io/docs/getting-started
- **Redis 指令參考**: https://redis.io/commands/
- **OAuth 2.0 RFC 6749**: https://datatracker.ietf.org/doc/html/rfc6749
- **PKCE RFC 7636**: https://datatracker.ietf.org/doc/html/rfc7636

---

**Quickstart Guide Completed**: 2025-11-18  
**Ready for Development**: ✅
