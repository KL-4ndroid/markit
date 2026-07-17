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
3. 先檢查遠端 migration history 與實際 schema
4. 對既有環境只執行已審核且尚未套用的 migration，並確認無錯誤

> 此 repository 的歷史 migration 含重複版本前綴。不得對既有 staging／production 直接執行完整 migration chain 或盲目執行 `supabase db push`。Phase 2 照片邊界必須使用經審核的 `057 -> 058 -> staging smoke -> 059 -> post-cutover smoke` 順序。

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
| SUPABASE_SECRET_KEY | Dedicated named `sb_secret_...`; server-only | Branch-specific Preview / Production；每個環境使用不同 key |
| NEXT_PUBLIC_DEBUG_MODE | false | Production |
| APP_API_CORS_ALLOWED_ORIGINS | Production: `https://markit-app-mocha.vercel.app,capacitor://localhost`; Preview: `<stable-staging-origin>,capacitor://localhost` | Production；Preview 的精確 origin 待首次 persistent branch deployment 後填入 |
| SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED | `1` only while enabled | Preview first, then Production |
| SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION | `0` → `1` after smoke | Production only |
| SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED | `1` only while enabled | Preview first, then Production |
| SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION | `0` → `1` after smoke | Production only |
| SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED | `1` only while enabled | Preview first, then Production |
| SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ALLOW_PRODUCTION | `0` → `1` after smoke | Production only |
| R2_ACCOUNT_ID | Vercel secret | Preview/Production, preferably separate |
| R2_ACCESS_KEY_ID | Vercel secret | Preview/Production, preferably separate |
| R2_SECRET_ACCESS_KEY | Vercel secret | Preview/Production, preferably separate |
| R2_BUCKET_NAME | Private bucket name | Preview/Production, preferably separate |

Phase 2 server-only mutation cutover:

- [ ] Confirm the Vercel production Git branch (`main` versus `master`) before creating staging.
- [ ] Create a persistent `staging` branch in the same Vercel project and record its stable branch URL after the first deployment.
- [ ] Use a separate staging Supabase project, R2 bucket/token, and named `SUPABASE_SECRET_KEY` whenever possible.
- [ ] Inspect staging migration history, then apply `057_harden_sales_photo_evidence_api_boundary.sql` without pushing the complete historical chain.
- [ ] Apply additive `058_add_sales_photo_evidence_server_mutation_rpcs.sql`; confirm the three RPCs exist and the legacy authenticated write path is still available for controlled comparison.
- [ ] Deploy the server-secret RPC client with controlled route gates and run staging RPC smoke before any permission cutover.
- [ ] Only after the RPC smoke passes, apply `059_enforce_sales_photo_evidence_server_mutation_boundary.sql`.
- [ ] After migration 059, confirm `authenticated` retains SELECT but cannot INSERT/UPDATE/DELETE `sale_photo_evidence`.
- [ ] After migration 059, confirm `service_role` cannot mutate the table directly and can execute only the three approved BFF mutation RPCs.
- [ ] Keep `SUPABASE_SECRET_KEY` server-only; never expose it through `NEXT_PUBLIC_*`, logs, mobile artifacts, or support output.
- [ ] Verify missing/invalid server secret returns retryable 503 before metadata or R2 writes.
- [ ] Before and after migration 059, verify owner upload/read, active-staff upload, revoked-staff denial, revoke-during-upload finalize denial, and unrelated-user denial against staging.
- [ ] Verify authenticated direct Supabase INSERT/UPDATE/DELETE is denied after migration 059 while approved BFF RPC writes still succeed.
- [x] Production API origin confirmed: `https://markit-app-mocha.vercel.app`.
- [ ] Stable staging origin: pending first persistent branch deployment.

補充邊界：

- [ ] Vercel Web 專案未設定 `APP_BUILD_TARGET` 或 `NEXT_PUBLIC_APP_BUILD_TARGET`
- [ ] Build Command 為 `npm run build`，Output Directory 未設為 `out`
- [ ] Web 的 `NEXT_PUBLIC_API_BASE_URL` 留空，沿用 same-origin `/api`
- [ ] iOS staging／production build 分別注入固定 HTTPS API origin
- [ ] 不將臨時 Preview URL 寫入正式 iOS binary
- [ ] R2 變數都沒有 `NEXT_PUBLIC_` 前綴
- [ ] Supabase 已套用 `057_harden_sales_photo_evidence_api_boundary.sql`
- [ ] Supabase 已套用 additive `058_add_sales_photo_evidence_server_mutation_rpcs.sql`，且 staging RPC smoke 通過
- [ ] Supabase 僅在 smoke 通過後套用 `059_enforce_sales_photo_evidence_server_mutation_boundary.sql`
- [ ] 059 後的 BFF smoke 與 direct-write denial 驗證均通過

### 3. 部署

- [ ] 觸發部署（Push 或手動）
- [ ] 確認 Build Log 無錯誤
- [ ] 確認 `npm run build` 成功

### 4. 驗證部署

1. 開啟 production URL
2. 測試首頁載入
3. 測試離線模式（關閉網路）
4. 測試資料創建（若已配置 Supabase）

### 5. Phase 2 BFF 驗證

- [ ] `GET /api/health` 回 200、`Cache-Control: no-store`
- [ ] `capacitor://localhost` 對 upload/image 的 preflight 回 204
- [ ] 非 allowlist origin 在 auth、Supabase、R2 前回 403
- [ ] 缺少或無效 Bearer token 回 401，且沒有 stack／secret
- [ ] owner 可讀取自己已上傳的 image／thumbnail
- [ ] unrelated user 與 revoked staff fail closed
- [ ] active staff 只能上傳自己 actor identity 對應的 payload
- [ ] 上傳 MIME signature、單檔 1 MB、合計 1.5 MB、request 2 MB 上限生效
- [ ] 058 後、059 前的 BFF RPC path staging smoke 通過，且 retry／lease／failure cleanup 行為正確
- [ ] 059 後重跑相同 BFF smoke，並確認 direct authenticated 及 direct `service_role` table mutation 均被拒絕
- [ ] Production 第一次部署保持所有 `*_ALLOW_PRODUCTION=0`
- [ ] 回滾時先關閉 server production allow flags，再重新建置 client public flags

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

Phase 2 權限 cutover 不應以未審核的反向 SQL 直接恢復舊有 grants：

1. 先關閉照片 route/runtime flags，停止新的 mutation。
2. 若 059 後發生問題，使用經審核的 forward-fix migration 修正權限或 RPC；不要盲目重放舊 authenticated／service-role table grants。
3. 檢查 R2 已寫入但資料庫 finalize 失敗的物件，依 upload lease 與 evidence ID 執行人工 reconciliation。

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
