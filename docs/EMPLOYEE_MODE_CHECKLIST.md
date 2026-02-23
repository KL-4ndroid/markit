# 員工模式實作檢查清單

## 📋 使用說明

本檢查清單用於追蹤員工模式的實作進度。每完成一項任務，請在 `[ ]` 中填入 `x`。

**格式**：
- `[ ]` 未完成
- `[x]` 已完成
- `[~]` 進行中
- `[!]` 遇到問題

---

## Phase 1: 數據層（預計 2 天）

### 1.1 Supabase Schema 變更

**目標**：擴展 `market_members` 表以支持角色系統

- [x] 創建遷移腳本 `supabase/migrations/20240220_add_staff_roles.sql`
- [x] 添加 `role` 欄位（'owner' | 'staff'）
- [x] 添加 `added_by` 欄位（記錄誰添加的員工）
- [x] 修改 `market_id` 為可選（NULL = 所有市集）
- [x] 創建索引 `idx_market_members_user_role`
- [x] 創建索引 `idx_market_members_added_by`
- [x] 設置 RLS 政策：用戶可查看自己的角色
- [x] 設置 RLS 政策：老闆可管理員工
- [x] 創建回滾腳本 `supabase/migrations/20240220_rollback_staff_roles.sql`
- [ ] 在測試環境執行遷移
- [ ] 驗證遷移成功

**檔案**：
- `supabase/migrations/20240220_add_staff_roles.sql`

**驗證方式**：
```sql
-- 檢查表結構
\d market_members

-- 檢查索引
\di market_members*

-- 檢查 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'market_members';
```

---

### 1.2 Dexie Schema 升級

**目標**：添加本地 `userRoles` 表

- [ ] 在 `lib/db/index.ts` 添加 version 5
- [ ] 定義 `userRoles` 表結構
- [ ] 實現升級邏輯（upgrade function）
- [ ] 添加備份機制（遷移前自動備份）
- [ ] 添加回滾機制（遷移失敗時恢復）
- [ ] 測試遷移流程（從 version 4 → version 5）
- [ ] 測試回滾流程
- [ ] 驗證數據完整性

**檔案**：
- `lib/db/index.ts`

**驗證方式**：
```typescript
// 檢查版本
console.log('DB Version:', db.verno);

// 檢查表是否存在
const tables = db.tables.map(t => t.name);
console.log('Tables:', tables); // 應包含 'userRoles'

// 檢查數據
const roles = await db.userRoles.toArray();
console.log('User Roles:', roles);
```

---

### 1.3 角色管理函數

**目標**：創建角色管理的核心函數

- [ ] 創建 `lib/db/roles.ts`
- [ ] 實現 `assignStaffRole(ownerId, staffEmail)`
- [ ] 實現 `removeStaffRole(ownerId, staffUserId)`
- [ ] 實現 `getUserRole(userId)`
- [ ] 實現 `getStaffList(ownerId)`
- [ ] 實現 `getOwnerIdByStaff(staffUserId)`
- [ ] 添加錯誤處理
- [ ] 添加日誌記錄
- [ ] 編寫單元測試
- [ ] 測試所有函數

**檔案**：
- `lib/db/roles.ts`
- `lib/db/roles.test.ts`

**API 設計**：
```typescript
// 添加員工
await assignStaffRole(ownerId, 'staff@example.com');

// 移除員工
await removeStaffRole(ownerId, staffUserId);

// 獲取角色
const role = await getUserRole(userId); // 'owner' | 'staff' | null

// 獲取員工列表
const staff = await getStaffList(ownerId);

// 獲取老闆 ID
const ownerId = await getOwnerIdByStaff(staffUserId);
```

---

### 1.4 類型定義

**目標**：定義角色相關的 TypeScript 類型

- [ ] 創建 `types/role.ts`
- [ ] 定義 `Role` 類型
- [ ] 定義 `UserRole` 介面
- [ ] 定義 `Permission` 類型
- [ ] 定義 `RoleContext` 介面
- [ ] 更新 `types/db.ts`（如需要）
- [ ] 驗證類型定義

**檔案**：
- `types/role.ts`

**類型設計**：
```typescript
export type Role = 'owner' | 'staff';

export interface UserRole {
  id: string;
  user_id: string;
  market_id: string | null;
  role: Role;
  added_by: string;
  created_at: number;
}

export type Permission = 
  | 'view_today_market'
  | 'view_upcoming_markets'
  | 'create_deal'
  | 'record_interaction'
  | 'view_revenue'
  | 'view_booth_cost'
  | 'view_equipment_cost'
  | 'view_all_markets'
  | 'view_analytics'
  | 'manage_products'
  | 'manage_markets'
  | 'view_costs'
  | 'view_profit'
  | 'manage_settings'
  | 'manage_staff';

export interface RoleContextType {
  role: Role | null;
  isStaff: boolean;
  isOwner: boolean;
  switchRole: (role: Role) => void;
  canManualSwitch: boolean;
}
```

---

### 1.5 數據遷移測試

**目標**：確保遷移過程安全可靠

- [ ] 準備測試數據（模擬真實數據）
- [ ] 測試 Supabase 遷移
- [ ] 測試 Dexie 遷移
- [ ] 測試備份功能
- [ ] 測試回滾功能
- [ ] 驗證數據完整性
- [ ] 性能測試（大數據量）
- [ ] 記錄測試結果

**測試場景**：
1. 全新安裝（無現有數據）
2. 從 version 4 升級（有現有數據）
3. 遷移失敗後回滾
4. 大數據量遷移（1000+ 市集）

---

## Phase 2: 權限系統（預計 2 天）

### 2.1 權限配置

**目標**：定義權限和數據可見性規則

- [ ] 創建 `lib/permissions.ts`
- [ ] 定義 `PERMISSIONS` 配置
- [ ] 定義 `DATA_VISIBILITY` 配置
- [ ] 定義 `ROUTE_PERMISSIONS` 配置
- [ ] 實現 `hasPermission(role, permission)` 函數
- [ ] 實現 `canViewData(role, dataType)` 函數
- [ ] 添加文檔註釋
- [ ] 編寫單元測試

**檔案**：
- `lib/permissions.ts`

---

### 2.2 角色 Context

**目標**：創建全局角色狀態管理

- [ ] 創建 `lib/role-context.tsx`
- [ ] 實現 `RoleProvider` 組件
- [ ] 實現自動角色檢測（從 Supabase 獲取）
- [ ] 實現手動角色切換（開發模式）
- [ ] 實現 Realtime 訂閱（權限變更通知）
- [ ] 添加環境變數控制（開發/正式環境）
- [ ] 整合到 `app/layout.tsx`
- [ ] 測試 Context 功能

**檔案**：
- `lib/role-context.tsx`

---

### 2.3 角色 Hook

**目標**：提供便捷的角色查詢 Hook

- [ ] 創建 `hooks/useRole.ts`
- [ ] 實現 `useRole()` Hook
- [ ] 實現 Realtime 更新邏輯
- [ ] 實現角色緩存
- [ ] 添加錯誤處理
- [ ] 編寫使用文檔
- [ ] 編寫單元測試
- [ ] 測試 Hook 功能

**檔案**：
- `hooks/useRole.ts`

**API 設計**：
```typescript
const { role, isStaff, isOwner, switchRole, canManualSwitch } = useRole();
```

---

### 2.4 權限 Hook

**目標**：提供便捷的權限檢查 Hook

- [ ] 創建 `hooks/usePermission.ts`
- [ ] 實現 `usePermission(permission)` Hook
- [ ] 實現 `useCanViewData(dataType)` Hook
- [ ] 實現 `useRoutePermission(route)` Hook
- [ ] 添加錯誤處理
- [ ] 編寫使用文檔
- [ ] 編寫單元測試
- [ ] 測試 Hook 功能

**檔案**：
- `hooks/usePermission.ts`

**API 設計**：
```typescript
const canManageProducts = usePermission('manage_products');
const canViewProfit = useCanViewData('profit');
const canAccessRoute = useRoutePermission('/analytics');
```

---

### 2.5 受保護路由組件

**目標**：創建基於權限的路由保護組件

- [ ] 創建 `components/ProtectedRoute.tsx`
- [ ] 實現權限檢查邏輯
- [ ] 實現重定向邏輯
- [ ] 實現友好的錯誤提示
- [ ] 添加載入狀態
- [ ] 編寫使用文檔
- [ ] 測試組件功能

**檔案**：
- `components/ProtectedRoute.tsx`

**使用方式**：
```typescript
<ProtectedRoute permission="manage_products">
  <ProductManagementPage />
</ProtectedRoute>
```

---

## Phase 3: 設置頁面（預計 2 天）

### 3.1 員工管理主組件

**目標**：創建員工管理的主要 UI

- [ ] 創建 `components/settings/EmployeeManagement.tsx`
- [ ] 實現佈局結構
- [ ] 整合添加員工表單
- [ ] 整合員工列表
- [ ] 添加權限檢查（只有老闆可見）
- [ ] 添加載入狀態
- [ ] 添加錯誤處理
- [ ] 測試組件功能

**檔案**：
- `components/settings/EmployeeManagement.tsx`

---

### 3.2 添加員工表單

**目標**：創建添加員工的表單

- [ ] 創建 `components/settings/AddEmployeeForm.tsx`
- [ ] 實現 Email 輸入
- [ ] 實現表單驗證
- [ ] 實現提交邏輯
- [ ] 添加成功/失敗提示
- [ ] 添加載入狀態
- [ ] 處理錯誤情況（員工未註冊等）
- [ ] 測試表單功能

**檔案**：
- `components/settings/AddEmployeeForm.tsx`

---

### 3.3 員工列表

**目標**：顯示已添加的員工列表

- [ ] 創建 `components/settings/EmployeeList.tsx`
- [ ] 實現員工卡片
- [ ] 實現移除員工功能
- [ ] 實現編輯權限功能（可選）
- [ ] 添加確認對話框
- [ ] 添加空狀態
- [ ] 添加載入狀態
- [ ] 測試列表功能

**檔案**：
- `components/settings/EmployeeList.tsx`

---

### 3.4 整合到設置頁面

**目標**：將員工管理整合到設置頁面

- [ ] 修改 `app/settings/page.tsx`
- [ ] 添加「員工管理」區塊
- [ ] 添加權限檢查
- [ ] 調整佈局
- [ ] 測試整合效果

**檔案**：
- `app/settings/page.tsx`

---

### 3.5 測試員工管理流程

**目標**：端到端測試員工管理功能

- [ ] 測試添加員工（已註冊）
- [ ] 測試添加員工（未註冊）
- [ ] 測試移除員工
- [ ] 測試權限檢查
- [ ] 測試 Realtime 更新
- [ ] 測試錯誤處理
- [ ] 記錄測試結果

---

## Phase 4: 員工專用頁面（預計 3 天）

### 4.1 員工模式 Layout

**目標**：創建員工模式的專用佈局

- [ ] 創建 `app/staff/layout.tsx`
- [ ] 實現權限檢查（只有員工可訪問）
- [ ] 實現專用導航
- [ ] 添加角色指示器
- [ ] 添加重定向邏輯
- [ ] 測試 Layout 功能

**檔案**：
- `app/staff/layout.tsx`

---

### 4.2 今日市集頁面

**目標**：顯示今日進行中的市集

- [ ] 創建 `app/staff/today/page.tsx`
- [ ] 實現市集列表
- [ ] 實現收入統計（不含利潤）
- [ ] 實現互動統計
- [ ] 實現快速成交按鈕
- [ ] 添加空狀態（今日無市集）
- [ ] 添加載入狀態
- [ ] 測試頁面功能

**檔案**：
- `app/staff/today/page.tsx`

---

### 4.3 未來市集頁面

**目標**：顯示未來的市集場次

- [ ] 創建 `app/staff/upcoming/page.tsx`
- [ ] 實現市集列表
- [ ] 實現日期排序
- [ ] 實現基本信息展示
- [ ] 添加空狀態（無未來市集）
- [ ] 添加載入狀態
- [ ] 測試頁面功能

**檔案**：
- `app/staff/upcoming/page.tsx`

---

### 4.4 今日市集卡片

**目標**：創建員工視角的市集卡片

- [ ] 創建 `components/staff/TodayMarketCard.tsx`
- [ ] 實現簡化的市集信息
- [ ] 實現收入顯示（不含利潤）
- [ ] 實現攤位成本顯示
- [ ] 實現設備成本顯示
- [ ] 實現互動統計
- [ ] 實現快速操作按鈕
- [ ] 測試卡片功能

**檔案**：
- `components/staff/TodayMarketCard.tsx`

---

### 4.5 快速成交按鈕

**目標**：創建員工友好的快速成交功能

- [ ] 創建 `components/staff/QuickDealButton.tsx`
- [ ] 實現簡化的成交流程
- [ ] 實現商品選擇
- [ ] 實現數量輸入
- [ ] 實現快速提交
- [ ] 添加成功提示
- [ ] 添加錯誤處理
- [ ] 測試按鈕功能

**檔案**：
- `components/staff/QuickDealButton.tsx`

---

### 4.6 測試員工頁面

**目標**：端到端測試員工專用頁面

- [ ] 測試今日市集頁面
- [ ] 測試未來市集頁面
- [ ] 測試快速成交功能
- [ ] 測試數據可見性
- [ ] 測試權限控制
- [ ] 測試多設備同步
- [ ] 記錄測試結果

---

## Phase 5: UI 調整（預計 2 天）

### 5.1 導航欄調整

**目標**：根據角色顯示不同的導航項

- [ ] 修改 `components/BottomNavigation.tsx`
- [ ] 實現角色檢測
- [ ] 實現動態導航項
- [ ] 員工模式：顯示「今日市集」、「未來場次」
- [ ] 老闆模式：顯示原有導航
- [ ] 添加平滑過渡動畫
- [ ] 測試導航功能

**檔案**：
- `components/BottomNavigation.tsx`

---

### 5.2 角色切換組件

**目標**：創建開發模式的角色切換器

- [ ] 創建 `components/RoleSwitcher.tsx`
- [ ] 實現角色切換按鈕
- [ ] 實現環境檢測（只在開發環境顯示）
- [ ] 添加視覺指示（開發模式標記）
- [ ] 添加切換動畫
- [ ] 測試切換功能

**檔案**：
- `components/RoleSwitcher.tsx`

---

### 5.3 市集卡片調整

**目標**：根據角色過濾敏感數據

- [ ] 修改 `components/markets/MarketCard.tsx`
- [ ] 實現數據可見性檢查
- [ ] 隱藏利潤數據（員工模式）
- [ ] 隱藏商品成本（員工模式）
- [ ] 保留收入、攤位成本（員工可見）
- [ ] 測試卡片顯示

**檔案**：
- `components/markets/MarketCard.tsx`

---

### 5.4 購物車調整

**目標**：確保員工可以正常使用購物車

- [ ] 修改 `components/sales/CartDrawer.tsx`
- [ ] 隱藏商品成本（員工模式）
- [ ] 保留售價、數量
- [ ] 測試購物車功能

**檔案**：
- `components/sales/CartDrawer.tsx`

---

### 5.5 市集詳情頁調整

**目標**：根據角色控制頁面訪問和數據顯示

- [ ] 修改 `app/markets/[id]/page.tsx`
- [ ] 實現訪問權限檢查（員工只能訪問今日+未來）
- [ ] 實現數據過濾（隱藏敏感數據）
- [ ] 添加友好的錯誤提示
- [ ] 測試頁面功能

**檔案**：
- `app/markets/[id]/page.tsx`

---

### 5.6 測試 UI 權限控制

**目標**：確保所有 UI 正確實現權限控制

- [ ] 測試導航欄（角色切換）
- [ ] 測試市集卡片（數據過濾）
- [ ] 測試市集詳情頁（訪問控制）
- [ ] 測試購物車（數據過濾）
- [ ] 測試設置頁面（權限控制）
- [ ] 記錄測試結果

---

## Phase 6: 測試與優化（預計 2 天）

### 6.1 權限測試

**目標**：確保權限系統安全可靠

- [ ] 測試員工無法訪問受限頁面
- [ ] 測試員工無法查看敏感數據
- [ ] 測試員工無法執行受限操作
- [ ] 測試權限繞過場景（URL 直接訪問）
- [ ] 測試 API 端點權限
- [ ] 記錄測試結果
- [ ] 修復發現的問題

**測試場景**：
1. 員工嘗試訪問 `/analytics`
2. 員工嘗試訪問 `/settings`
3. 員工嘗試訪問過去的市集詳情
4. 員工嘗試查看利潤數據
5. 員工嘗試管理商品

---

### 6.2 Realtime 更新測試

**目標**：確保權限變更即時生效

- [ ] 測試添加員工後的即時更新
- [ ] 測試移除員工後的即時更新
- [ ] 測試多設備同步
- [ ] 測試網路斷線重連
- [ ] 測試 Realtime 訂閱穩定性
- [ ] 記錄測試結果
- [ ] 修復發現的問題

**測試場景**：
1. 老闆添加員工 → 員工立即看到新市集
2. 老闆移除員工 → 員工立即失去訪問權限
3. 兩個設備同時操作

---

### 6.3 多設備同步測試

**目標**：確保數據在多設備間正確同步

- [ ] 測試老闆和員工同時操作
- [ ] 測試離線操作後上線同步
- [ ] 測試衝突解決
- [ ] 測試事件順序
- [ ] 測試數據一致性
- [ ] 記錄測試結果
- [ ] 修復發現的問題

**測試場景**：
1. 老闆和員工同時創建交易
2. 員工離線創建交易，上線後同步
3. 老闆修改市集，員工同步更新

---

### 6.4 性能優化

**目標**：確保系統性能不受影響

- [ ] 測試權限檢查性能
- [ ] 優化查詢邏輯
- [ ] 實現權限緩存
- [ ] 測試大數據量場景
- [ ] 監控網路請求數量
- [ ] 優化渲染性能
- [ ] 記錄性能指標

**性能指標**：
- 權限檢查時間 < 10ms
- 頁面載入時間 < 2s
- 角色切換時間 < 500ms

---

### 6.5 文檔撰寫

**目標**：提供完整的用戶和開發文檔

- [ ] 撰寫用戶手冊（如何添加員工）
- [ ] 撰寫員工使用指南
- [ ] 撰寫開發文檔（API 說明）
- [ ] 撰寫部署指南
- [ ] 撰寫故障排除指南
- [ ] 更新 README.md
- [ ] 審核文檔

**文檔清單**：
- `docs/USER_GUIDE.md`（用戶手冊）
- `docs/STAFF_GUIDE.md`（員工指南）
- `docs/DEVELOPER_GUIDE.md`（開發文檔）
- `docs/DEPLOYMENT.md`（部署指南）
- `docs/TROUBLESHOOTING.md`（故障排除）

---

### 6.6 部署準備

**目標**：準備生產環境部署

- [ ] 創建部署檢查清單
- [ ] 準備數據庫遷移腳本
- [ ] 配置環境變數
- [ ] 設置監控和日誌
- [ ] 準備回滾計畫
- [ ] 通知用戶（如需要）
- [ ] 執行部署

**部署檢查清單**：
- [ ] 所有測試通過
- [ ] 代碼審查完成
- [ ] 文檔已更新
- [ ] 備份已創建
- [ ] 環境變數已配置
- [ ] 監控已設置

---

## 📊 總體進度

```
Phase 1: 數據層          [~] 2/10  (20%) - 進行中
Phase 2: 權限系統        [ ] 0/8   (0%)
Phase 3: 設置頁面        [ ] 0/5   (0%)
Phase 4: 員工專用頁面    [ ] 0/6   (0%)
Phase 5: UI 調整         [ ] 0/6   (0%)
Phase 6: 測試與優化      [ ] 0/6   (0%)

總進度: 2/41 (5%)
最後更新: 2024-02-20
```

---

## 🎯 里程碑

- [ ] **M1**: 數據層完成（Phase 1）
- [ ] **M2**: 權限系統完成（Phase 2）
- [ ] **M3**: 設置頁面完成（Phase 3）
- [ ] **M4**: 員工頁面完成（Phase 4）
- [ ] **M5**: UI 調整完成（Phase 5）
- [ ] **M6**: 測試通過，準備部署（Phase 6）

---

## 📝 每日更新模板

```markdown
## YYYY-MM-DD

### 完成的任務
- [x] 任務 1
- [x] 任務 2

### 進行中的任務
- [~] 任務 3 (50%)

### 遇到的問題
1. 問題描述
   - 解決方案：...

### 明天計畫
- [ ] 任務 4
- [ ] 任務 5

### 備註
- 其他需要記錄的事項
```

---

## ✅ 完成標準

每個任務完成後，需要滿足以下標準：

1. **代碼質量**
   - 通過 ESLint 檢查
   - 通過 TypeScript 類型檢查
   - 代碼有適當的註釋

2. **功能完整**
   - 實現所有需求
   - 通過功能測試
   - 處理邊界情況

3. **用戶體驗**
   - UI 美觀易用
   - 載入狀態清晰
   - 錯誤提示友好

4. **文檔完整**
   - 代碼有文檔註釋
   - 使用方式清晰
   - 範例代碼完整

---

## 🚀 開始實作

準備好了嗎？讓我們開始吧！

**第一步**：Phase 1.1 - 創建 Supabase 遷移腳本

```bash
# 創建遷移檔案
cd supabase/migrations
touch 20240220_add_staff_roles.sql
```

祝實作順利！🎉
