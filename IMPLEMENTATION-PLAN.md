# Supabase 多人協作功能 - 實施計畫

> **開始日期：** 2026-01-24  
> **預計完成：** 7 週  
> **當前狀態：** 🟡 準備階段

---

## 📋 執行總覽

```
階段 0: 環境準備 (1-2 天)          ← 你需要手動操作
階段 1: UUID 遷移 (1 週)           ← 大部分自動化
階段 2: Supabase 設置 (3-4 天)     ← 你需要手動操作
階段 3: CQRS Trigger (2-3 天)      ← 自動化腳本
階段 4: 認證與邀請 (1 週)          ← 自動化開發
階段 5: 事件同步 (2 週)            ← 自動化開發
階段 6: 測試與優化 (1 週)          ← 混合模式
```

---

## 🚀 階段 0: 環境準備（1-2 天）

### ✅ 任務清單

#### 📦 安裝依賴套件
```bash
# UUID 生成套件
npm install uuid
npm install --save-dev @types/uuid

# Supabase 客戶端
npm install @supabase/supabase-js

# 可選：Supabase CLI（用於本地開發）
npm install -g supabase
```

#### 🔧 Supabase 專案設置（需要你手動操作）

**步驟 1: 創建 Supabase 專案**
1. 前往 https://supabase.com/dashboard
2. 點擊「New Project」
3. 填寫資訊：
   - Project Name: `market-pulse-collab`
   - Database Password: **請記住這個密碼！**
   - Region: 選擇最近的區域（建議：Singapore）
4. 等待專案建立完成（約 2 分鐘）

**步驟 2: 獲取 API 金鑰**
1. 進入專案 Settings → API
2. 複製以下資訊：
   - `Project URL`
   - `anon public` key
   - `service_role` key（僅用於開發）

**步驟 3: 設置環境變數**
創建 `.env.local` 檔案：
```env
NEXT_PUBLIC_SUPABASE_URL=你的_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=你的_SERVICE_ROLE_KEY
```

**步驟 4: 初始化 Supabase 客戶端**
創建 `lib/supabase/client.ts`（稍後會自動生成）

#### ✅ 檢查點
- [ ] UUID 套件已安裝
- [ ] Supabase 專案已創建
- [ ] API 金鑰已複製
- [ ] `.env.local` 已設置
- [ ] 將 `.env.local` 加入 `.gitignore`

---

## 🔄 階段 1: UUID 遷移（1 週）

### 📝 任務清單

#### 1.1 更新 TypeScript 類型定義
- [ ] 自動生成：`types/db.ts` 更新
- [ ] 自動生成：`types/events.ts` 更新

#### 1.2 更新 Dexie Schema（版本 3）
- [ ] 自動生成：`lib/db/index.ts` 更新
- [ ] 包含 UUID 遷移邏輯
- [ ] 包含 ID 映射表

#### 1.3 更新事件處理器
- [ ] 自動更新：所有 `recordEvent` 調用
- [ ] 自動更新：所有 `getMarketById` 調用
- [ ] 自動更新：所有 `getProductById` 調用

#### 1.4 測試 UUID 遷移
- [ ] 手動測試：備份現有資料
- [ ] 手動測試：執行遷移
- [ ] 手動測試：驗證資料完整性
- [ ] 手動測試：驗證關聯正確性

#### ⚠️ 重要提醒
**在執行遷移前，請務必備份 IndexedDB 資料！**

```javascript
// 在瀏覽器 Console 執行備份
const db = new MarketPulseDB();
const backup = {
  markets: await db.markets.toArray(),
  products: await db.products.toArray(),
  events: await db.events.toArray(),
  dailyStats: await db.dailyStats.toArray(),
};
console.log('備份資料：', JSON.stringify(backup));
// 複製輸出並保存到文件
```

---

## ☁️ 階段 2: Supabase 資料庫設置（3-4 天）

### 📝 任務清單

#### 2.1 創建資料表（需要你手動操作）

**方式 A: 使用 Supabase Dashboard（推薦新手）**
1. 進入 Supabase Dashboard → SQL Editor
2. 複製 `supabase/migrations/001_uuid_schema.sql` 的內容
3. 點擊「Run」執行

**方式 B: 使用 Supabase CLI（推薦進階）**
```bash
# 初始化 Supabase 專案
supabase init

# 連結到遠端專案
supabase link --project-ref 你的_PROJECT_REF

# 執行遷移
supabase db push
```

#### 2.2 設置 Row Level Security (RLS)
- [ ] 手動執行：`supabase/migrations/004_rls_policies.sql`
- [ ] 驗證：測試權限是否正確

#### 2.3 啟用 Realtime（可選）
1. 進入 Database → Replication
2. 啟用 `events` 表的 Realtime
3. 啟用 `market_members` 表的 Realtime

#### ✅ 檢查點
- [ ] 所有資料表已創建
- [ ] RLS 政策已設置
- [ ] 可以在 Table Editor 中看到資料表

---

## 🔧 階段 3: CQRS Trigger 設置（2-3 天）

### 📝 任務清單

#### 3.1 創建 Trigger 函數
- [ ] 手動執行：`supabase/migrations/002_cqrs_triggers.sql`
- [ ] 包含 Market 讀取模型 Trigger
- [ ] 包含 Product 讀取模型 Trigger

#### 3.2 測試 Trigger
```sql
-- 在 SQL Editor 中測試
INSERT INTO events (
  id,
  type,
  payload,
  actor_id,
  market_id,
  timestamp
) VALUES (
  gen_random_uuid(),
  'market_created',
  '{"name": "測試市集", "location": "台北", "startDate": "2026-02-01", "endDate": "2026-02-01"}'::jsonb,
  auth.uid(),
  gen_random_uuid(),
  NOW()
);

-- 檢查 markets 表是否自動新增資料
SELECT * FROM markets ORDER BY created_at DESC LIMIT 1;
```

#### 3.3 效能優化
- [ ] 檢查 Trigger 執行時間
- [ ] 必要時添加索引

#### ✅ 檢查點
- [ ] Trigger 函數已創建
- [ ] 測試事件可以自動更新讀取模型
- [ ] 效能可接受（< 100ms）

---

## 🔐 階段 4: 認證與邀請（1 週）

### 📝 任務清單

#### 4.1 Supabase Auth 整合
- [ ] 自動生成：`lib/supabase/auth.ts`
- [ ] 自動生成：`hooks/useAuth.ts`
- [ ] 自動生成：`components/auth/LoginForm.tsx`
- [ ] 自動生成：`components/auth/SignupForm.tsx`

#### 4.2 RPC 函數設置
- [ ] 手動執行：`supabase/migrations/003_rpc_functions.sql`
- [ ] 包含 `join_market_by_code` 函數
- [ ] 包含權限檢查

#### 4.3 邀請碼功能
- [ ] 自動生成：`lib/collaboration/invitations.ts`
- [ ] 自動生成：`components/team/InviteCodeGenerator.tsx`
- [ ] 自動生成：`components/team/JoinTeamForm.tsx`

#### 4.4 團隊管理 UI
- [ ] 自動生成：`components/team/TeamMemberList.tsx`
- [ ] 自動生成：`components/team/TeamSettings.tsx`
- [ ] 自動更新：`app/markets/[id]/page.tsx`（新增團隊標籤）

#### ✅ 檢查點
- [ ] 可以註冊/登入
- [ ] 可以生成邀請碼
- [ ] 可以使用邀請碼加入團隊
- [ ] 可以查看團隊成員

---

## 🔄 階段 5: 事件同步（2 週）

### 📝 任務清單

#### 5.1 同步核心邏輯
- [ ] 自動生成：`lib/collaboration/sync.ts`
  - `pushEvents()` - 推送本地事件
  - `pullEvents()` - 拉取遠端事件
  - `syncMarket()` - 完整同步

#### 5.2 離線佇列
- [ ] 自動生成：`lib/collaboration/queue.ts`
- [ ] 自動更新：`lib/events/index.ts`（整合佇列）

#### 5.3 衝突處理
- [ ] 自動生成：`lib/collaboration/conflicts.ts`
- [ ] 實作 Last-Write-Wins (LWW) 策略

#### 5.4 錯誤處理
- [ ] 自動生成：`lib/collaboration/errors.ts`
- [ ] 403 權限失效處理
- [ ] 網路錯誤重試機制

#### 5.5 UI 整合
- [ ] 自動更新：新增同步按鈕
- [ ] 自動更新：新增同步狀態指示器
- [ ] 自動更新：新增離線提示

#### ✅ 檢查點
- [ ] 本地事件可以推送到 Supabase
- [ ] 遠端事件可以拉取到本地
- [ ] 離線時事件會進入佇列
- [ ] 重新上線後自動同步
- [ ] 權限失效時自動清理

---

## 🧪 階段 6: 測試與優化（1 週）

### 📝 任務清單

#### 6.1 功能測試
- [ ] 手動測試：UUID 遷移完整性
- [ ] 手動測試：多人同時編輯
- [ ] 手動測試：離線操作
- [ ] 手動測試：權限控制
- [ ] 手動測試：邀請碼流程

#### 6.2 效能測試
- [ ] 手動測試：大量事件同步（1000+ 事件）
- [ ] 手動測試：Trigger 效能
- [ ] 手動測試：首次同步速度

#### 6.3 安全測試
- [ ] 手動測試：RLS 政策是否生效
- [ ] 手動測試：無權限用戶無法存取資料
- [ ] 手動測試：邀請碼過期機制

#### 6.4 優化
- [ ] 根據測試結果優化
- [ ] 添加必要的索引
- [ ] 優化批次大小

#### ✅ 檢查點
- [ ] 所有功能測試通過
- [ ] 效能可接受
- [ ] 安全性驗證通過

---

## 📊 進度追蹤

### 當前狀態
```
階段 0: 🟡 準備中
階段 1: ⚪ 未開始
階段 2: ⚪ 未開始
階段 3: ⚪ 未開始
階段 4: ⚪ 未開始
階段 5: ⚪ 未開始
階段 6: ⚪ 未開始
```

### 圖例
- 🟢 已完成
- 🟡 進行中
- 🔴 遇到問題
- ⚪ 未開始

---

## 🎯 下一步行動

### 立即執行（今天）
1. ✅ 安裝 UUID 套件
2. ✅ 創建 Supabase 專案
3. ✅ 設置環境變數
4. ✅ 備份現有 IndexedDB 資料

### 明天執行
1. 開始 UUID 遷移（階段 1）
2. 我會協助生成所有必要的代碼

---

## 📞 需要協助時

在每個階段，你可以隨時告訴我：
- "開始階段 X" - 我會生成該階段的所有代碼
- "遇到問題：[描述]" - 我會協助排查
- "測試階段 X" - 我會提供測試腳本

準備好開始了嗎？🚀
