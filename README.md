# Money Manager Backend

記帳主頁功能後端 API - 社群帳號登入、會話管理、審計日誌

## 功能特性

- ✅ **社群帳號登入**: 支援 Google 與 Facebook OAuth 2.0 PKCE 登入
- ✅ **會話管理**: JWT token 認證、refresh token 機制、多裝置支援
- ✅ **安全性**: Rate limiting、Security headers (Helmet)、IP 加密、Token rotation
- ✅ **審計日誌**: 完整認證操作記錄、90 天自動清理
- ✅ **測試驅動開發**: 90% 測試覆蓋率、Unit/Integration/E2E 測試

## 技術棧

- **語言**: TypeScript 5.3+
- **框架**: NestJS 10.x
- **資料庫**: Supabase PostgreSQL
- **快取**: Redis 7.x
- **認證**: OAuth 2.0 PKCE + JWT
- **測試**: Jest 29.7.0 + Supertest

## 快速開始

詳細設定步驟請參閱 [quickstart.md](./specs/001-login-homepage/quickstart.md)

### 前置需求

- Node.js 20 LTS
- Redis 7.x
- Supabase CLI

### 安裝

\`\`\`bash
# Clone repository
git clone https://github.com/your-org/money-manager-backend.git
cd money-manager-backend

# 安裝相依套件
npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入 Supabase 與 OAuth 憑證

# 啟動 Supabase local dev
supabase start

# 執行資料庫 migrations
supabase db reset

# 啟動 Redis
brew services start redis  # macOS
# or
sudo systemctl start redis-server  # Linux

# 啟動開發伺服器
npm run start:dev
\`\`\`

### 測試

\`\`\`bash
# 執行所有測試
npm test

# 產生 coverage 報告
npm run test:cov

# E2E 測試
npm run test:e2e
\`\`\`

### API 文件

開發伺服器啟動後，訪問 Swagger UI：

```
http://localhost:3000/api/docs
```

## 專案結構

```
src/
├── models/           # TypeScript 介面定義
├── services/         # 業務邏輯層
│   ├── auth/         # 認證服務 (OAuth, Token, Session)
│   ├── user/         # 使用者管理
│   ├── audit/        # 審計日誌
│   └── supabase/     # Supabase 客戶端
├── api/              # API 路由與控制器
│   ├── routes/       # 端點路由
│   ├── middleware/   # 認證中介層
│   └── validators/   # 請求驗證
├── lib/              # 共用工具函式
└── config/           # 設定檔

supabase/
└── migrations/       # 資料庫 schema 變更
```

## API 端點

### 認證

- `POST /api/v1/auth/login/google` - Google OAuth 登入
- `POST /api/v1/auth/login/facebook` - Facebook OAuth 登入
- `POST /api/v1/auth/logout` - 登出
- `POST /api/v1/auth/refresh` - 更新 access token
- `GET /api/v1/auth/verify` - 驗證 token

### 使用者

- `DELETE /api/v1/user/delete` - 刪除帳號

### 主頁

- `GET /api/v1/homepage` - 取得主頁資料 (需認證)

## 開發指令

```bash
npm run start         # 啟動伺服器
npm run start:dev     # 啟動伺服器 (hot-reload)
npm run build         # 建置專案
npm test              # 執行測試
npm run lint          # ESLint 檢查
npm run format        # Prettier 格式化
```

## 文件

- [功能規格 (spec.md)](./specs/001-login-homepage/spec.md)
- [實作計畫 (plan.md)](./specs/001-login-homepage/plan.md)
- [任務清單 (tasks.md)](./specs/001-login-homepage/tasks.md)
- [資料模型 (data-model.md)](./specs/001-login-homepage/data-model.md)
- [API 契約 (openapi.yaml)](./specs/001-login-homepage/contracts/openapi.yaml)
- [快速開始 (quickstart.md)](./specs/001-login-homepage/quickstart.md)

## License

UNLICENSED
