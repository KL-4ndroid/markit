# 部署檢查清單

部署前請確認以下所有項目已完成。

## 部署前檢查

### 1. 本地驗證

```bash
# 1. 建置檢查
npm run build

# 2. Lint 檢查
npm run lint

# 3. TypeScript 檢查
npx tsc --noEmit --incremental false

# 4. 執行測試
npm test

# 5. 安全審計
npm audit --omit=dev
```

### 2. 確認無阻塞問題

- [ ] `npm run build` 成功
- [ ] `npm run lint` 無警告/錯誤
- [ ] `npx tsc --noEmit` 無錯誤
- [ ] `npm test` 全部通過
- [ ] `npm audit` 無高嚴重性問題

### 3. 環境變數

若使用雲端同步功能：

- [ ] 建立 `.env.local`（不同步到 Git）
- [ ] 確認 `NEXT_PUBLIC_SUPABASE_URL` 正確
- [ ] 確認 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正確
- [ ] 測試 Supabase 連線

若純離線模式：
- [ ] 確認 `.env.local` 不存在或為空
- [ ] 驗證無 Supabase 錯誤訊息

## Supabase 部署（可選）

若使用 Supabase 雲端同步，需要部署資料庫 Migration：

### 執行 Migration

1. 進入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇專案 > SQL Editor
3. 依序執行 `supabase/migrations/` 下的 SQL 檔案
4. 確認無錯誤

### Migration 順序

```
001_initial_schema.sql      # 基礎結構
002_profiles.sql           # 用戶資料
003_events.sql             # 事件表
004_markets.sql            # 市集表
005_products.sql           # 商品表
006_daily_stats.sql        # 每日統計
007_rls_policies.sql       # RLS 政策
... (依此類推)
```

### 驗證資料庫

```sql
-- 檢查錶是否存在
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables WHERE schemaname = 'public';

-- 檢查用戶
SELECT id, email FROM auth.users LIMIT 5;
```

## Vercel 部署

### 1. 連接 GitHub

1. 進入 [Vercel Dashboard](https://vercel.com/dashboard)
2. New Project > Import Git Repository
3. 選擇此專案
4. Framework Preset: Next.js

### 2. 環境變數

在 Vercel Project Settings > Environment Variables 新增：

| Name | Value | Environments |
|------|-------|--------------|
| NEXT_PUBLIC_SUPABASE_URL | https://xxx.supabase.co | Production, Preview, Development |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJxxx... | Production, Preview, Development |
| NEXT_PUBLIC_DEBUG_MODE | false | Production |

### 3. 部署

- [ ] 觸發部署（Push 或手動）
- [ ] 確認 Build Log 無錯誤
- [ ] 確認 `npm run build` 成功

### 4. 驗證部署

1. 開啟 production URL
2. 測試首頁載入
3. 測試離線模式（關閉網路）
4. 測試資料創建（若已配置 Supabase）

## 安全檢查

### 認證與授權

- [ ] RLS 政策已啟用
- [ ] 員工無法刪除老闆資料
- [ ] 敏感資料對員工不可見

### 調試工具

- [ ] `/recovery` 頁面僅管理員可見
- [ ] 調試功能僅 localhost 可用
- [ ] 無敏感資訊洩漏

### 同步安全

- [ ] 同步失敗時保留本地資料
- [ ] 403 錯誤暫停同步而非刪除資料
- [ ] 員工同步不刪除其他用戶資料

## 功能驗證

### 離線功能

- [ ] 無網路時可正常載入
- [ ] 可創建/編輯市集
- [ ] 可創建/編輯商品
- [ ] 可記錄互動與成交
- [ ] 數據本地保存

### 雲端同步（若已配置）

- [ ] 登入/登出正常
- [ ] 資料可同步到雲端
- [ ] 多設備資料一致
- [ ] 衝突處理正常

### 員工模式

- [ ] 可接受邀請加入團隊
- [ ] 只能看到老闆的市集
- [ ] 敏感收入資料已遮罩
- [ ] 無法刪除老闆資料

### PWA

- [ ] 可安裝到主畫面
- [ ] 離線時有 Service Worker
- [ ] 更新提示正常

## 監控設定

### 錯誤追蹤

建議設定錯誤追蹤（如 Sentry）：

```typescript
// next.config.mjs
const sentryConfig = {
  enabled: process.env.SENTRY_AUTH_TOKEN !== undefined,
};
```

### 效能監控

- [ ] Vercel Analytics 啟用（可選）
- [ ] Core Web Vitals 監控

## 回滾計劃

若部署失敗：

### 1. Vercel 回滾

1. Vercel Dashboard > Deployments
2. 選擇上一個正常版本
3. 點擊 "Redeploy"

### 2. 資料庫回滾

```sql
-- 查看 Migration 歷史
SELECT * FROM schema_migrations ORDER BY version DESC;

-- 手動回滾（如有必要）
-- 請參考各 Migration 檔案的回滾說明
```

### 3. 本地資料救援

若本地 IndexedDB 損壞：
1. 訪問 `/recovery` 頁面
2. 建立救援備份
3. 執行資料重建

## 部署後檢查清單

- [ ] 生產 URL 可正常訪問
- [ ] 所有頁面載入正常
- [ ] 市集 CRUD 功能正常
- [ ] 商品 CRUD 功能正常
- [ ] 互動/成交記錄正常
- [ ] 離線模式正常
- [ ] 雲端同步正常（如已配置）
- [ ] PWA 可正常安裝
- [ ] 無 console 錯誤
- [ ] 響應式設計正常（手機/平板）

## 聯繫支援

如有問題，請檢查：
- [Vercel 文檔](https://vercel.com/docs)
- [Supabase 文檔](https://supabase.com/docs)
- [Next.js 文檔](https://nextjs.org/docs)
