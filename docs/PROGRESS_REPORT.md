# 員工模式實作進度報告

## ✅ 已完成的工作

### Phase 1: 數據庫設置 ✅
- [x] 執行 SQL 遷移腳本 `20240220_staff_system_simple.sql`
- [x] 創建 `staff_relationships` 表
- [x] 創建 `staff_accessible_markets` 視圖
- [x] 創建 `staff_accessible_products` 視圖
- [x] 設置 RLS 政策
- [x] 創建輔助函數（`is_staff_of`, `get_my_staff`, `get_my_owners`）

### Phase 2: 前端基礎設置 ✅
- [x] **2.1 創建類型定義** - `types/staff.ts`
  - AccessType（owner/staff）
  - StaffPermissions（can_view/can_edit）
  - MarketWithAccess（帶權限的市集類型）
  - ProductWithAccess（帶權限的商品類型）
  - StaffRelationship（員工關係記錄）
  - StaffInviteForm（邀請表單）

- [x] **2.2 創建權限檢查 Hook** - `hooks/useStaffPermissions.ts`
  - `checkPermission(item, action)` - 檢查權限
  - `isOwner(item)` - 是否為老闆
  - `isStaff(item)` - 是否為員工
  - `canViewSensitiveData(item)` - 是否可查看敏感數據
  - `getPermissionLabel(item)` - 獲取權限描述

- [x] **2.3 更新 Supabase 查詢層**
  - `lib/supabase/markets.ts` - 市集查詢（使用視圖）
    - `getAccessibleMarkets()` - 查詢可訪問的市集
    - `getAccessibleMarket(id)` - 查詢單個市集
    - `getAccessibleMarketsByDateRange()` - 按日期範圍查詢
    - `canAccessMarket(id)` - 檢查訪問權限
    - `getOwnedMarkets()` - 獲取老闆的市集
    - `getStaffMarkets()` - 獲取員工可訪問的市集
  
  - `lib/supabase/products.ts` - 商品查詢（使用視圖）
    - `getAccessibleProducts(marketId?)` - 查詢可訪問的商品
    - `getAccessibleProduct(id)` - 查詢單個商品
    - `canAccessProduct(id)` - 檢查訪問權限
    - `getOwnedProducts()` - 獲取老闆的商品
    - `getStaffProducts()` - 獲取員工可訪問的商品
    - `getProductsWithStock()` - 查詢有庫存的商品
    - `getOutOfStockProducts()` - 查詢缺貨的商品
  
  - `lib/supabase/staff.ts` - 員工管理查詢
    - `getMyStaff()` - 獲取我的員工列表
    - `getMyOwners()` - 獲取我的老闆列表
    - `isStaffOf(ownerId)` - 檢查是否為某老闆的員工
    - `inviteStaff(data)` - 邀請員工
    - `acceptInvitation(id)` - 接受邀請
    - `revokeStaff(id)` - 撤銷員工權限
    - `updateStaffPermissions(id, perms)` - 更新員工權限
    - `deleteStaffRelationship(id)` - 刪除員工關係
    - `getPendingInvitations()` - 獲取待處理的邀請
    - `isOwner()` - 檢查是否為老闆

---

## 📋 待完成的工作

### Phase 3: 更新現有 UI 組件（需要手動完成）

#### 3.1 市集列表頁面
**需要修改的文件**：
- 查找包含市集列表的組件（可能在 `app/` 或 `components/` 目錄）
- 將查詢改為 `getAccessibleMarkets()`
- 添加身份標籤顯示（老闆/員工）
- 根據權限顯示/隱藏編輯按鈕

**示例代碼**：
```tsx
import { getAccessibleMarkets } from '@/lib/supabase/markets';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';

const { isStaff, checkPermission } = useStaffPermissions();
const markets = await getAccessibleMarkets();

// 顯示身份標籤
{isStaff(market) && <Badge>員工模式</Badge>}

// 根據權限顯示編輯按鈕
{checkPermission(market, 'edit') && <Button>編輯</Button>}
```

#### 3.2 商品列表頁面
**需要修改的文件**：
- 查找包含商品列表的組件
- 將查詢改為 `getAccessibleProducts(marketId)`
- 員工模式下隱藏成本欄位
- 根據權限顯示/隱藏編輯按鈕

**示例代碼**：
```tsx
import { getAccessibleProducts } from '@/lib/supabase/products';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';

const { isStaff, canViewSensitiveData } = useStaffPermissions();
const products = await getAccessibleProducts(marketId);

// 隱藏敏感數據
{canViewSensitiveData(product) && <p>成本: ${product.cost}</p>}
```

#### 3.3 交易記錄頁面
**需要修改的文件**：
- 查找包含交易記錄的組件
- 員工模式下隱藏利潤和利潤率
- 員工仍可新增交易記錄

---

### Phase 4: 創建員工管理 UI（需要手動完成）

#### 4.1 員工管理頁面
**需要創建的文件**：
- `app/staff/page.tsx` 或 `components/staff/StaffManagement.tsx`

**功能需求**：
- 邀請員工（輸入 Email）
- 查看員工列表（狀態、權限）
- 撤銷員工權限
- 更新員工權限（未來擴展）

**參考代碼**：見 `FRONTEND_INTEGRATION_GUIDE.md` 的完整實現

#### 4.2 導航菜單
**需要修改的文件**：
- 查找導航組件（可能在 `components/layout/` 或 `app/layout.tsx`）
- 添加「員工管理」菜單項
- 只有老闆可見（使用 `isOwner()` 檢查）

---

### Phase 5: 測試（需要手動完成）

#### 功能測試清單
- [ ] 老闆可以查看所有市集
- [ ] 老闆可以編輯市集
- [ ] 老闆可以邀請員工
- [ ] 員工可以查看被授權的市集
- [ ] 員工無法編輯市集
- [ ] 員工無法查看成本和利潤
- [ ] 員工可以新增交易記錄

---

## 📊 進度統計

| Phase | 任務 | 狀態 | 完成度 |
|-------|------|------|--------|
| 1 | 數據庫設置 | ✅ 完成 | 100% |
| 2.1 | 創建類型定義 | ✅ 完成 | 100% |
| 2.2 | 創建權限 Hook | ✅ 完成 | 100% |
| 2.3 | 更新查詢層 | ✅ 完成 | 100% |
| 3.1 | 更新市集列表 | ⏳ 待開始 | 0% |
| 3.2 | 更新商品列表 | ⏳ 待開始 | 0% |
| 3.3 | 更新交易記錄 | ⏳ 待開始 | 0% |
| 4.1 | 員工管理頁面 | ⏳ 待開始 | 0% |
| 4.2 | 更新導航菜單 | ⏳ 待開始 | 0% |
| 5 | 測試 | ⏳ 待開始 | 0% |

**總體進度**：40% 完成

---

## 🎯 下一步行動

### 立即執行（優先級：🔴 高）

1. **查找市集列表組件**
   ```bash
   # 在專案中搜尋市集相關的組件
   # 可能的文件名：MarketList, Markets, market-list 等
   ```

2. **更新市集列表查詢**
   - 將 `.from('markets')` 改為使用 `getAccessibleMarkets()`
   - 添加權限檢查和身份標籤

3. **查找商品列表組件**
   - 將查詢改為 `getAccessibleProducts()`
   - 添加敏感數據隱藏邏輯

4. **創建員工管理頁面**
   - 參考 `FRONTEND_INTEGRATION_GUIDE.md` 的完整代碼
   - 實現邀請、查看、撤銷功能

---

## 📚 參考文檔

| 文檔 | 用途 |
|------|------|
| `NEXT_STEPS.md` | 詳細的下一步行動清單 |
| `EMPLOYEE_MODE_SIMPLE_PLAN.md` | 完整實作計畫 |
| `FRONTEND_INTEGRATION_GUIDE.md` | 前端整合詳細指南（含完整代碼） |
| `PROGRESS_REPORT.md` | 本文檔（進度報告） |

---

## 🔑 關鍵提醒

### 最重要的變更

**所有查詢市集和商品的地方，都必須改用新的查詢函數**：

```typescript
// ❌ 舊代碼
const { data } = await supabase.from('markets').select('*');

// ✅ 新代碼
import { getAccessibleMarkets } from '@/lib/supabase/markets';
const markets = await getAccessibleMarkets();
```

### 為什麼必須改？

1. **自動權限過濾**：視圖會自動過濾用戶無權訪問的數據
2. **添加權限欄位**：自動添加 `access_type` 和 `permissions`
3. **合併數據**：自動合併老闆和員工的數據

---

## 🚀 已創建的文件

### 類型定義
- ✅ `types/staff.ts` - 員工系統類型定義

### Hooks
- ✅ `hooks/useStaffPermissions.ts` - 權限檢查 Hook

### Supabase 查詢
- ✅ `lib/supabase/markets.ts` - 市集查詢（支援員工模式）
- ✅ `lib/supabase/products.ts` - 商品查詢（支援員工模式）
- ✅ `lib/supabase/staff.ts` - 員工管理查詢

---

## 💡 使用範例

### 在組件中使用權限檢查

```tsx
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { getAccessibleMarkets } from '@/lib/supabase/markets';

export function MarketList() {
  const [markets, setMarkets] = useState([]);
  const { isStaff, checkPermission, canViewSensitiveData } = useStaffPermissions();

  useEffect(() => {
    getAccessibleMarkets().then(setMarkets);
  }, []);

  return (
    <div>
      {markets.map(market => (
        <div key={market.id}>
          <h3>{market.name}</h3>
          
          {/* 顯示身份標籤 */}
          {isStaff(market) && <Badge>員工模式</Badge>}
          
          {/* 根據權限顯示編輯按鈕 */}
          {checkPermission(market, 'edit') && (
            <Button>編輯</Button>
          )}
          
          {/* 隱藏敏感數據 */}
          {canViewSensitiveData(market) && (
            <p>成本: ${market.cost}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🎉 總結

我已經完成了員工模式的**核心基礎設施**：

1. ✅ 數據庫結構（表、視圖、函數、RLS）
2. ✅ TypeScript 類型定義
3. ✅ 權限檢查 Hook
4. ✅ Supabase 查詢函數（市集、商品、員工管理）

接下來需要**手動更新 UI 組件**，將現有的查詢改為使用新的函數，並添加權限檢查邏輯。

所有必要的工具和函數都已準備好，可以直接在組件中使用！🚀
