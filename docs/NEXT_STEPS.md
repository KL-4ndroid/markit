# 員工模式：下一步行動清單

## ✅ 已完成

- [x] 執行 SQL 遷移腳本
- [x] 創建 `staff_relationships` 表
- [x] 創建 `staff_accessible_markets` 視圖
- [x] 創建 `staff_accessible_products` 視圖
- [x] 設置 RLS 政策

---

## 🎯 Phase 1: 驗證數據庫（立即執行）

### 1.1 驗證表和視圖

在 Supabase Dashboard 的 SQL Editor 執行：

```sql
-- 檢查表是否創建成功
SELECT COUNT(*) FROM staff_relationships;

-- 檢查視圖是否可用
SELECT * FROM staff_accessible_markets LIMIT 1;
SELECT * FROM staff_accessible_products LIMIT 1;

-- 檢查函數是否創建
SELECT is_staff_of('00000000-0000-0000-0000-000000000000');
SELECT * FROM get_my_staff();
SELECT * FROM get_my_owners();
```

### 1.2 測試 RLS 政策

```sql
-- 測試添加員工關係（應該成功）
INSERT INTO staff_relationships (
  owner_id,    -- 當前用戶作為老闆
  staff_id,    -- 當前用戶作為員工（測試用）
  staff_email, 
  status
) VALUES (
  auth.uid(),  -- 老闆 ID
  auth.uid(),  -- 員工 ID（暫時用自己測試）
  'test@example.com',
  'active'
);

-- 測試查詢（應該只看到自己的記錄）
SELECT * FROM staff_relationships;

-- 清理測試數據
DELETE FROM staff_relationships WHERE staff_email = 'test@example.com';
```

**預計時間**：15 分鐘

---

## 🎯 Phase 2: 前端基礎設置（1-2 天）

### 2.1 創建類型定義

**文件**：`lib/types/staff.ts`

```typescript
export type AccessType = 'owner' | 'staff';

export type StaffPermissions = {
  can_view: boolean;
  can_edit: boolean;
};

export interface MarketWithAccess {
  id: string;
  name: string;
  // ... 其他 market 欄位
  relationship_owner_id: string;
  permissions: StaffPermissions;
  access_type: AccessType;
}

export interface ProductWithAccess {
  id: string;
  name: string;
  // ... 其他 product 欄位
  relationship_owner_id: string;
  permissions: StaffPermissions;
  access_type: AccessType;
}

export interface StaffRelationship {
  id: string;
  owner_id: string;
  staff_id: string;
  staff_email: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: StaffPermissions;
  invited_at: string;
  accepted_at?: string;
}
```

**預計時間**：30 分鐘

---

### 2.2 創建權限檢查 Hook

**文件**：`lib/hooks/useStaffPermissions.ts`

參考 `FRONTEND_INTEGRATION_GUIDE.md` 的完整代碼。

**核心功能**：
- `checkPermission(item, 'view' | 'edit')` - 檢查權限
- `isOwner(item)` - 是否為老闆
- `isStaff(item)` - 是否為員工

**預計時間**：1 小時

---

### 2.3 更新 Supabase 查詢層

#### 文件 1：`lib/supabase/markets.ts`

```typescript
// 新增函數：查詢可訪問的市集
export async function getAccessibleMarkets() {
  const { data, error } = await supabase
    .from('staff_accessible_markets')  // ✅ 改用視圖
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as MarketWithAccess[];
}
```

#### 文件 2：`lib/supabase/products.ts`

```typescript
// 新增函數：查詢可訪問的商品
export async function getAccessibleProducts(marketId?: string) {
  let query = supabase
    .from('staff_accessible_products')  // ✅ 改用視圖
    .select('*');

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data as ProductWithAccess[];
}
```

**預計時間**：2 小時

---

## 🎯 Phase 3: 更新現有 UI 組件（1-2 天）

### 3.1 市集列表頁面

**文件**：`components/markets/MarketList.tsx`（或類似文件）

**需要修改**：
1. 改用 `getAccessibleMarkets()` 查詢
2. 顯示身份標籤（老闆/員工）
3. 根據權限顯示/隱藏編輯按鈕

```tsx
import { useStaffPermissions } from '@/lib/hooks/useStaffPermissions';
import { getAccessibleMarkets } from '@/lib/supabase/markets';

export function MarketList() {
  const [markets, setMarkets] = useState<MarketWithAccess[]>([]);
  const { isStaff, checkPermission } = useStaffPermissions();

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
            <Button onClick={() => handleEdit(market)}>編輯</Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

**預計時間**：3 小時

---

### 3.2 商品列表頁面

**文件**：`components/products/ProductList.tsx`（或類似文件）

**需要修改**：
1. 改用 `getAccessibleProducts()` 查詢
2. 員工模式下隱藏成本和利潤
3. 根據權限顯示/隱藏編輯按鈕

```tsx
import { useStaffPermissions } from '@/lib/hooks/useStaffPermissions';
import { getAccessibleProducts } from '@/lib/supabase/products';

export function ProductList({ marketId }: { marketId: string }) {
  const [products, setProducts] = useState<ProductWithAccess[]>([]);
  const { isStaff, checkPermission } = useStaffPermissions();

  useEffect(() => {
    getAccessibleProducts(marketId).then(setProducts);
  }, [marketId]);

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <h4>{product.name}</h4>
          
          {/* 員工模式下隱藏成本 */}
          {!isStaff(product) && (
            <p>成本: ${product.cost}</p>
          )}
          
          {/* 根據權限顯示編輯按鈕 */}
          {checkPermission(product, 'edit') && (
            <Button onClick={() => handleEdit(product)}>編輯</Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

**預計時間**：3 小時

---

### 3.3 交易記錄頁面

**文件**：`components/transactions/TransactionList.tsx`（或類似文件）

**需要修改**：
1. 員工模式下隱藏利潤和利潤率
2. 員工可以新增交易記錄

```tsx
export function TransactionList({ marketId }: { marketId: string }) {
  const { isStaff } = useStaffPermissions();
  const [market, setMarket] = useState<MarketWithAccess | null>(null);

  // 載入市集信息（包含權限）
  useEffect(() => {
    getAccessibleMarket(marketId).then(setMarket);
  }, [marketId]);

  return (
    <div>
      {transactions.map(tx => (
        <div key={tx.id}>
          <p>收入: ${tx.revenue}</p>
          
          {/* 員工模式下隱藏利潤 */}
          {!isStaff(market) && (
            <>
              <p>成本: ${tx.cost}</p>
              <p>利潤: ${tx.profit}</p>
            </>
          )}
        </div>
      ))}
      
      {/* 員工可以新增交易 */}
      <Button onClick={handleAddTransaction}>新增交易</Button>
    </div>
  );
}
```

**預計時間**：2 小時

---

## 🎯 Phase 4: 創建員工管理 UI（1 天）

### 4.1 員工管理頁面

**文件**：`app/staff/page.tsx` 或 `components/staff/StaffManagement.tsx`

**功能**：
- ✅ 邀請員工（輸入 Email）
- ✅ 查看員工列表
- ✅ 撤銷員工權限
- ✅ 設定員工權限（未來擴展）

參考 `FRONTEND_INTEGRATION_GUIDE.md` 的完整代碼。

**預計時間**：4 小時

---

### 4.2 導航菜單

**文件**：`components/layout/Navigation.tsx`（或類似文件）

**需要修改**：
- 添加「員工管理」菜單項（只有老闆可見）

```tsx
export function Navigation() {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // 檢查用戶是否為老闆（有自己的市集）
    checkIfOwner(user?.id).then(setIsOwner);
  }, [user]);

  return (
    <nav>
      <Link href="/markets">市集</Link>
      <Link href="/products">商品</Link>
      <Link href="/transactions">交易</Link>
      
      {/* 只有老闆可以看到員工管理 */}
      {isOwner && (
        <Link href="/staff">員工管理</Link>
      )}
    </nav>
  );
}
```

**預計時間**：1 小時

---

## 🎯 Phase 5: 測試（1 天）

### 5.1 功能測試清單

#### 老闆功能
- [ ] 可以查看所有市集
- [ ] 可以編輯市集
- [ ] 可以查看所有商品
- [ ] 可以編輯商品
- [ ] 可以查看成本和利潤
- [ ] 可以邀請員工
- [ ] 可以查看員工列表
- [ ] 可以撤銷員工權限

#### 員工功能
- [ ] 可以查看被授權的市集
- [ ] 無法編輯市集
- [ ] 可以查看被授權的商品
- [ ] 無法編輯商品
- [ ] 無法查看成本和利潤
- [ ] 可以新增交易記錄
- [ ] 無法訪問員工管理頁面

#### 視圖測試
- [ ] `staff_accessible_markets` 返回正確數據
- [ ] `staff_accessible_products` 返回正確數據
- [ ] `access_type` 欄位正確
- [ ] `permissions` 欄位正確

---

### 5.2 測試場景

#### 場景 1：老闆邀請員工
1. 老闆登入
2. 進入員工管理頁面
3. 輸入員工 Email
4. 點擊「邀請員工」
5. 驗證員工列表中出現新員工（狀態：pending）

#### 場景 2：員工接受邀請
1. 員工登入
2. 查看邀請通知（未來功能）
3. 接受邀請
4. 驗證可以查看老闆的市集

#### 場景 3：員工查看市集
1. 員工登入
2. 進入市集列表
3. 驗證只能看到被授權的市集
4. 驗證顯示「員工模式」標籤
5. 驗證無法看到編輯按鈕

#### 場景 4：員工查看商品
1. 員工登入
2. 進入商品列表
3. 驗證無法看到成本欄位
4. 驗證無法看到利潤欄位
5. 驗證無法編輯商品

#### 場景 5：老闆撤銷員工
1. 老闆登入
2. 進入員工管理頁面
3. 點擊「撤銷權限」
4. 驗證員工無法再訪問市集

---

## 🎯 Phase 6: 優化和擴展（選做）

### 6.1 通知系統
- [ ] 員工收到邀請通知
- [ ] 老闆收到員工接受邀請通知

### 6.2 權限細化
- [ ] 設定員工可以編輯商品（但看不到成本）
- [ ] 設定員工可以查看特定市集

### 6.3 審計日誌
- [ ] 記錄員工操作（新增交易、修改數據等）
- [ ] 老闆可以查看員工操作記錄

---

## 📊 進度追蹤

| Phase | 任務 | 預計時間 | 狀態 |
|-------|------|---------|------|
| 1 | 驗證數據庫 | 15 分鐘 | ⏳ 待開始 |
| 2.1 | 創建類型定義 | 30 分鐘 | ⏳ 待開始 |
| 2.2 | 創建權限 Hook | 1 小時 | ⏳ 待開始 |
| 2.3 | 更新查詢層 | 2 小時 | ⏳ 待開始 |
| 3.1 | 更新市集列表 | 3 小時 | ⏳ 待開始 |
| 3.2 | 更新商品列表 | 3 小時 | ⏳ 待開始 |
| 3.3 | 更新交易記錄 | 2 小時 | ⏳ 待開始 |
| 4.1 | 員工管理頁面 | 4 小時 | ⏳ 待開始 |
| 4.2 | 更新導航菜單 | 1 小時 | ⏳ 待開始 |
| 5 | 測試 | 1 天 | ⏳ 待開始 |

**總預計時間**：3-5 天

---

## 🚨 重要提醒

### 1. 所有查詢必須改用視圖

這是最關鍵的變更！

```typescript
// ❌ 錯誤
.from('markets')
.from('products')

// ✅ 正確
.from('staff_accessible_markets')
.from('staff_accessible_products')
```

### 2. 使用 useStaffPermissions Hook

統一權限檢查邏輯，避免重複代碼。

### 3. 顯示身份標籤

讓用戶清楚知道當前是老闆還是員工模式。

### 4. 隱藏敏感信息

成本、利潤等只有老闆可見。

---

## 📞 需要幫助？

如果在實作過程中遇到問題，可以參考：
- `FRONTEND_INTEGRATION_GUIDE.md` - 詳細的前端整合指南
- `EMPLOYEE_MODE_SIMPLE_PLAN.md` - 完整的實作計畫

---

## 🎯 立即開始

**下一步**：執行 Phase 1（驗證數據庫），確保所有表和視圖都正常運作。

```sql
-- 在 Supabase Dashboard 執行
SELECT COUNT(*) FROM staff_relationships;
SELECT * FROM staff_accessible_markets LIMIT 1;
SELECT * FROM staff_accessible_products LIMIT 1;
```

準備好了嗎？讓我們開始吧！🚀
