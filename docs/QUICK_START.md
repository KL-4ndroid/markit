# 員工模式實作 - 快速開始指南

## 🎯 目標

本指南幫助你快速開始員工模式的實作，5 分鐘內完成環境準備。

---

## ⚡ 快速開始（5 分鐘）

### 1. 閱讀文檔（2 分鐘）

**必讀**：
- [ ] `docs/EMPLOYEE_MODE_PLAN.md` - 了解整體計畫
- [ ] `docs/EMPLOYEE_MODE_RISKS.md` - 了解風險和避免策略

**選讀**：
- [ ] `docs/EMPLOYEE_MODE_CHECKLIST.md` - 詳細任務清單
- [ ] `docs/EMPLOYEE_MODE_IMPACT_ASSESSMENT.md` - 影響評估

### 2. 準備測試環境（2 分鐘）

**選項 A：本地 Supabase（推薦）**

```bash
# 1. 確保 Docker 已安裝並運行
docker --version

# 2. 啟動本地 Supabase
npx supabase start

# 3. 查看連接信息
npx supabase status
```

**選項 B：使用現有測試專案**

```bash
# 連結到測試專案
npx supabase link --project-ref YOUR_TEST_PROJECT_REF
```

### 3. 執行遷移（1 分鐘）

```bash
# 方法 1：使用 CLI
npx supabase db push

# 方法 2：手動執行
# 打開 Supabase Dashboard → SQL Editor
# 複製 supabase/migrations/20240220_add_staff_roles.sql
# 執行
```

---

## 📋 檢查清單

### 開始前
- [ ] 已閱讀實作計畫
- [ ] 已閱讀風險評估
- [ ] 已準備測試環境
- [ ] 已備份數據（如需要）

### Phase 1.1（已完成）
- [x] Supabase 遷移腳本
- [x] 回滾腳本
- [x] 測試環境準備文檔

### Phase 1.2（下一步）
- [ ] Dexie Schema 升級
- [ ] 備份/回滾機制
- [ ] 測試遷移流程

---

## 🗂️ 文檔導航

```
docs/
├── EMPLOYEE_MODE_PLAN.md              # 📋 實作計畫（總覽）
├── EMPLOYEE_MODE_RISKS.md             # 🚨 風險評估（必讀）
├── EMPLOYEE_MODE_CHECKLIST.md         # ✅ 任務清單（追蹤進度）
├── EMPLOYEE_MODE_IMPACT_ASSESSMENT.md # 📊 影響評估（深入分析）
├── TEST_ENVIRONMENT_SETUP.md          # 🧪 測試環境準備
├── PROGRESS_REPORT.md                 # 📈 進度報告
└── QUICK_START.md                     # ⚡ 快速開始（本文檔）

supabase/migrations/
├── 20240220_add_staff_roles.sql       # 遷移腳本
└── 20240220_rollback_staff_roles.sql  # 回滾腳本
```

---

## 🎯 實作流程

```
第 1 週：數據層
├── Day 1-2: Supabase + Dexie 遷移 ✅ (Phase 1.1 完成)
├── Day 3-4: 角色管理函數
└── Day 5: 測試和驗證

第 2 週：權限系統
├── Day 6-7: 權限配置 + Context
├── Day 8-9: Hooks + 組件
└── Day 10: 測試

第 3 週：UI 實現
├── Day 11-12: 設置頁面
├── Day 13-15: 員工頁面
└── Day 16-17: UI 調整

第 4 週：測試與部署
├── Day 18-19: 完整測試
├── Day 20-21: 性能優化
└── Day 22: 部署準備
```

---

## 🚀 下一步

### 立即開始 Phase 1.2

```bash
# 1. 打開文件
code lib/db/index.ts

# 2. 添加 version 5
# 參考 docs/EMPLOYEE_MODE_CHECKLIST.md 的 Phase 1.2 部分

# 3. 測試遷移
npm run dev
```

---

## 💡 提示

### 開發模式

```bash
# .env.local
NEXT_PUBLIC_ENABLE_STAFF_MODE=true
NEXT_PUBLIC_ENABLE_ROLE_SWITCH=true
NEXT_PUBLIC_DEBUG_MODE=true
```

### 測試帳號

```
老闆：owner@test.com / password123
員工：staff@test.com / password123
```

### 常用命令

```bash
# 查看 Supabase 狀態
npx supabase status

# 查看日誌
npx supabase logs

# 重置數據庫（測試環境）
npx supabase db reset

# 執行遷移
npx supabase db push

# 回滾遷移
npx supabase db execute --file supabase/migrations/20240220_rollback_staff_roles.sql
```

---

## 🆘 遇到問題？

### 1. 遷移失敗

**檢查**：
- Docker 是否運行？
- Supabase 是否啟動？
- 遷移腳本語法是否正確？

**解決**：
```bash
# 查看錯誤日誌
npx supabase logs

# 回滾並重試
npx supabase db execute --file supabase/migrations/20240220_rollback_staff_roles.sql
npx supabase db push
```

### 2. 權限錯誤

**檢查**：
- RLS 政策是否正確？
- 用戶是否存在？

**解決**：
```sql
-- 暫時禁用 RLS（僅測試）
ALTER TABLE market_members DISABLE ROW LEVEL SECURITY;

-- 執行操作

-- 重新啟用
ALTER TABLE market_members ENABLE ROW LEVEL SECURITY;
```

### 3. 數據不一致

**檢查**：
- 遷移是否完整執行？
- 數據驗證是否通過？

**解決**：
```sql
-- 檢查數據
SELECT * FROM market_members WHERE role IS NULL;

-- 手動修復
UPDATE market_members SET role = 'owner' WHERE role IS NULL;
```

---

## 📚 參考資料

### 內部文檔
- [實作計畫](./EMPLOYEE_MODE_PLAN.md)
- [風險評估](./EMPLOYEE_MODE_RISKS.md)
- [檢查清單](./EMPLOYEE_MODE_CHECKLIST.md)
- [測試環境](./TEST_ENVIRONMENT_SETUP.md)

### 外部資源
- [Supabase 文檔](https://supabase.com/docs)
- [Dexie.js 文檔](https://dexie.org)
- [Next.js 文檔](https://nextjs.org/docs)

---

## ✅ 準備就緒

完成以上步驟後，你已經：

- ✅ 了解整體計畫
- ✅ 評估了風險
- ✅ 準備好測試環境
- ✅ 完成了 Phase 1.1

**現在可以開始 Phase 1.2 了！** 🚀

---

## 🎉 祝你實作順利！

如有任何問題，請參考相關文檔或聯絡技術負責人。
