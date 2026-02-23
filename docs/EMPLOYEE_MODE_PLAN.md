# 員工模式實作計畫

## 📋 專案概述

**目標**：在現有 Market Pulse 系統中新增員工模式，讓老闆可以添加員工協助管理市集，員工擁有受限的權限。

**實作方式**：角色權限系統（Role-Based Access Control）

**預計工期**：8-12 天

---

## 🎯 功能需求

### 員工可以做什麼
- ✅ 新增交易記錄（成交）
- ✅ 記錄互動（摸摸、詢問等）
- ✅ 查看當日市集詳情（收入、互動次數、成交數）
- ✅ 查看未來市集場次資訊
- ✅ 查看攤位成本、設備成本

### 員工不能做什麼
- ❌ 查看過往市集資訊
- ❌ 查看商品成本
- ❌ 查看利潤、利潤率
- ❌ 管理商品（新增/編輯/刪除）
- ❌ 管理市集（新增/編輯/刪除）
- ❌ 修改設置
- ❌ 管理員工

---

## 🏗️ 技術架構

### 1. 數據層

#### Supabase Schema 變更

```sql
-- 1. 擴展 market_members 表
ALTER TABLE market_members 
ADD COLUMN role TEXT DEFAULT 'owner' 
CHECK (role IN ('owner', 'staff'));

ALTER TABLE market_members 
ADD COLUMN added_by UUID REFERENCES auth.users(id);

ALTER TABLE market_members 
ALTER COLUMN market_id DROP NOT NULL;

-- 2. 創建索引
CREATE INDEX idx_market_members_user_role 
ON market_members(user_id, role);

CREATE INDEX idx_market_members_added_by 
ON market_members(added_by);

-- 3. RLS 政策
CREATE POLICY "Users can view their own roles"
ON market_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage staff"
ON market_members FOR ALL
USING (auth.uid() = added_by);
```

#### Dexie Schema 變更

```typescript
// 新增 version 5
this.version(5).stores({
  events: 'id, type, timestamp, actor_id, market_id, sync_status',
  markets: 'id, status, name, startDate, endDate, owner_id, is_collaborative, sync_status, isDeleted',
  products: 'id, category, name, isActive, market_id, owner_id',
  dailyStats: '++id, [date+marketId], date, marketId',
  settings: '++id',
  syncQueue: 'id, status, created_at',
  userRoles: 'id, user_id, market_id, role, added_by', // ✅ 新增
});
```

### 2. 權限系統

#### 權限配置

```typescript
// lib/permissions.ts
export const PERMISSIONS = {
  staff: [
    'view_today_market',
    'view_upcoming_markets',
    'create_deal',
    'record_interaction',
    'view_revenue',
    'view_booth_cost',
    'view_equipment_cost',
  ],
  owner: [
    // 繼承員工權限
    ...PERMISSIONS.staff,
    // 額外權限
    'view_all_markets',
    'view_analytics',
    'manage_products',
    'manage_markets',
    'view_costs',
    'view_profit',
    'manage_settings',
    'manage_staff',
  ],
};

export const DATA_VISIBILITY = {
  staff: {
    revenue: true,
    dealCount: true,
    interactionCount: true,
    boothCost: true,
    equipmentCost: true,
    productCost: false,
    profit: false,
    profitMargin: false,
  },
  owner: {
    // 全部可見
  }
};
```

---

## 📅 實作階段

### Phase 1：數據層（2 天）

**任務清單**：
- [ ] 1.1 Supabase 遷移腳本
- [ ] 1.2 Dexie Schema 升級（version 5）
- [ ] 1.3 創建 `lib/db/roles.ts`
- [ ] 1.4 創建 `types/role.ts`
- [ ] 1.5 測試數據遷移

**交付物**：
- `supabase/migrations/20240220_add_staff_roles.sql`
- `lib/db/index.ts`（version 5）
- `lib/db/roles.ts`
- `types/role.ts`

---

### Phase 2：權限系統（2 天）

**任務清單**：
- [ ] 2.1 創建 `lib/permissions.ts`
- [ ] 2.2 創建 `lib/role-context.tsx`
- [ ] 2.3 創建 `hooks/useRole.ts`（Realtime）
- [ ] 2.4 創建 `hooks/usePermission.ts`
- [ ] 2.5 創建 `components/ProtectedRoute.tsx`

**交付物**：
- `lib/permissions.ts`
- `lib/role-context.tsx`
- `hooks/useRole.ts`
- `hooks/usePermission.ts`
- `components/ProtectedRoute.tsx`

---

### Phase 3：設置頁面（2 天）

**任務清單**：
- [ ] 3.1 創建 `components/settings/EmployeeManagement.tsx`
- [ ] 3.2 創建 `components/settings/AddEmployeeForm.tsx`
- [ ] 3.3 創建 `components/settings/EmployeeList.tsx`
- [ ] 3.4 整合到 `app/settings/page.tsx`
- [ ] 3.5 測試員工添加/移除流程

**交付物**：
- `components/settings/EmployeeManagement.tsx`
- `components/settings/AddEmployeeForm.tsx`
- `components/settings/EmployeeList.tsx`

---

### Phase 4：員工專用頁面（3 天）

**任務清單**：
- [ ] 4.1 創建 `/app/staff/layout.tsx`
- [ ] 4.2 創建 `/app/staff/today/page.tsx`
- [ ] 4.3 創建 `/app/staff/upcoming/page.tsx`
- [ ] 4.4 創建 `components/staff/TodayMarketCard.tsx`
- [ ] 4.5 創建 `components/staff/QuickDealButton.tsx`
- [ ] 4.6 測試員工頁面功能

**交付物**：
- `app/staff/layout.tsx`
- `app/staff/today/page.tsx`
- `app/staff/upcoming/page.tsx`
- `components/staff/TodayMarketCard.tsx`
- `components/staff/QuickDealButton.tsx`

---

### Phase 5：UI 調整（2 天）

**任務清單**：
- [ ] 5.1 調整 `components/BottomNavigation.tsx`
- [ ] 5.2 創建 `components/RoleSwitcher.tsx`
- [ ] 5.3 調整 `components/markets/MarketCard.tsx`
- [ ] 5.4 調整 `components/sales/CartDrawer.tsx`
- [ ] 5.5 調整 `app/markets/[id]/page.tsx`
- [ ] 5.6 測試 UI 權限控制

**交付物**：
- 更新的導航組件
- 角色切換組件
- 權限控制的 UI 組件

---

### Phase 6：測試與優化（2 天）

**任務清單**：
- [ ] 6.1 權限測試（員工無法訪問受限功能）
- [ ] 6.2 Realtime 更新測試
- [ ] 6.3 多設備同步測試
- [ ] 6.4 性能優化
- [ ] 6.5 文檔撰寫
- [ ] 6.6 部署準備

**交付物**：
- 測試報告
- 用戶文檔
- 部署檢查清單

---

## 📊 進度追蹤

### 總體進度

```
Phase 1: 數據層          [ ] 0/5   (0%)
Phase 2: 權限系統        [ ] 0/5   (0%)
Phase 3: 設置頁面        [ ] 0/5   (0%)
Phase 4: 員工專用頁面    [ ] 0/6   (0%)
Phase 5: UI 調整         [ ] 0/6   (0%)
Phase 6: 測試與優化      [ ] 0/6   (0%)

總進度: 0/33 (0%)
```

### 每日更新

**格式**：
```
## YYYY-MM-DD

### 完成
- [x] 任務描述

### 進行中
- [ ] 任務描述

### 遇到的問題
- 問題描述及解決方案

### 明天計畫
- 任務描述
```

---

## 🔄 更新日誌

### 2024-02-20
- 📝 創建實作計畫文檔
- 📝 創建風險評估文檔
- 📝 創建實作檢查清單

---

## 📚 相關文檔

- [風險評估報告](./EMPLOYEE_MODE_RISKS.md)
- [實作檢查清單](./EMPLOYEE_MODE_CHECKLIST.md)
- [API 文檔](./EMPLOYEE_MODE_API.md)

---

## 👥 團隊

- **開發者**：[你的名字]
- **審核者**：[審核者名字]
- **測試者**：[測試者名字]

---

## 📞 聯絡方式

如有問題，請聯絡：[你的聯絡方式]
