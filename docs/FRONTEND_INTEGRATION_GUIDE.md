# 前端整合指南：員工模式

## 🎯 核心概念

**關鍵變更**：將所有查詢從**表**改為**視圖**

```typescript
// ❌ 舊代碼
.from('markets')
.from('products')

// ✅ 新代碼
.from('staff_accessible_markets')
.from('staff_accessible_products')
```

---

## 📋 需要修改的文件清單

### 1. Supabase 查詢層

| 文件路徑 | 修改內容 | 優先級 |
|---------|---------|--------|
| `lib/supabase/markets.ts` | 改用 `staff_accessible_markets` | 🔴 高 |
| `lib/supabase/products.ts` | 改用 `staff_accessible_products` | 🔴 高 |
| `lib/supabase/transactions.ts` | 檢查是否需要權限控制 | 🟡 中 |

### 2. UI 組件

| 文件路徑 | 修改內容 | 優先級 |
|---------|---------|--------|
| `components/markets/MarketList.tsx` | 顯示身份標籤 | 🟡 中 |
| `components/products/ProductList.tsx` | 根據權限隱藏編輯按鈕 | 🔴 高 |
| `components/transactions/TransactionForm.tsx` | 隱藏成本和利潤 | 🔴 高 |

### 3. 新增文件

| 文件路徑 | 功能 | 優先級 |
|---------|------|--------|
| `components/staff/StaffManagement.tsx` | 員工管理界面 | 🔴 高 |
| `lib/hooks/useStaffPermissions.ts` | 權限檢查 Hook | 🔴 高 |
| `lib/types/staff.ts` | 員工相關類型定義 | 🔴 高 |

---

## 🔧 詳細修改步驟

### Step 1: 更新類型定義

創建 `lib/types/staff.ts`：

```typescript
// lib/types/staff.ts
export type AccessType = 'owner' | 'staff';

export type StaffPermissions = {
  can_view: boolean;
  can_edit: boolean;
};

export interface MarketWithAccess {
  // 原有的 market 欄位
  id: string;
  name: string;
  // ... 其他欄位
  
  // 新增的權限欄位
  relationship_owner_id: string;
  permissions: StaffPermissions;
  access_type: AccessType;
}

export interface ProductWithAccess {
  // 原有的 product 欄位
  id: string;
  name: string;
  // ... 其他欄位
  
  // 新增的權限欄位
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

---

### Step 2: 更新 Supabase 查詢

#### 修改 `lib/supabase/markets.ts`

```typescript
// lib/supabase/markets.ts
import { supabase } from './client';
import type { MarketWithAccess } from '@/lib/types/staff';

// ✅ 新函數：查詢可訪問的市集（包含員工權限）
export async function getAccessibleMarkets() {
  const { data, error } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as MarketWithAccess[];
}

// ✅ 新函數：查詢單個市集（檢查權限）
export async function getAccessibleMarket(marketId: string) {
  const { data, error } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (error) throw error;
  return data as MarketWithAccess;
}

// ⚠️ 舊函數保留（向後兼容），但建議改用新函數
export async function getMarkets() {
  console.warn('getMarkets() 已過時，請使用 getAccessibleMarkets()');
  return getAccessibleMarkets();
}
```

#### 修改 `lib/supabase/products.ts`

```typescript
// lib/supabase/products.ts
import { supabase } from './client';
import type { ProductWithAccess } from '@/lib/types/staff';

// ✅ 新函數：查詢可訪問的商品
export async function getAccessibleProducts(marketId?: string) {
  let query = supabase
    .from('staff_accessible_products')
    .select('*');

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data as ProductWithAccess[];
}

// ✅ 新函數：查詢單個商品
export async function getAccessibleProduct(productId: string) {
  const { data, error } = await supabase
    .from('staff_accessible_products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) throw error;
  return data as ProductWithAccess;
}
```

---

### Step 3: 創建權限檢查 Hook

創建 `lib/hooks/useStaffPermissions.ts`：

```typescript
// lib/hooks/useStaffPermissions.ts
import { useMemo } from 'react';
import type { MarketWithAccess, ProductWithAccess } from '@/lib/types/staff';

type AccessItem = MarketWithAccess | ProductWithAccess;

export function useStaffPermissions() {
  const checkPermission = useMemo(() => {
    return (item: AccessItem | null, action: 'view' | 'edit'): boolean => {
      if (!item) return false;

      // 如果是老闆，擁有全部權限
      if (item.access_type === 'owner') {
        return true;
      }

      // 如果是員工，檢查 permissions
      const perms = item.permissions;
      if (action === 'view') return perms.can_view ?? false;
      if (action === 'edit') return perms.can_edit ?? false;

      return false;
    };
  }, []);

  const isOwner = (item: AccessItem | null): boolean => {
    return item?.access_type === 'owner';
  };

  const isStaff = (item: AccessItem | null): boolean => {
    return item?.access_type === 'staff';
  };

  return {
    checkPermission,
    isOwner,
    isStaff,
  };
}
```

---

### Step 4: 更新 UI 組件

#### 修改 `components/markets/MarketList.tsx`

```tsx
// components/markets/MarketList.tsx
import { useStaffPermissions } from '@/lib/hooks/useStaffPermissions';
import { getAccessibleMarkets } from '@/lib/supabase/markets';

export function MarketList() {
  const [markets, setMarkets] = useState<MarketWithAccess[]>([]);
  const { isOwner, isStaff, checkPermission } = useStaffPermissions();

  useEffect(() => {
    // ✅ 使用新的視圖查詢
    getAccessibleMarkets().then(setMarkets);
  }, []);

  return (
    <div>
      {markets.map(market => (
        <div key={market.id}>
          <h3>{market.name}</h3>
          
          {/* 顯示身份標籤 */}
          {isStaff(market) && (
            <Badge variant="secondary">員工模式</Badge>
          )}
          
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

#### 修改 `components/products/ProductList.tsx`

```tsx
// components/products/ProductList.tsx
import { useStaffPermissions } from '@/lib/hooks/useStaffPermissions';
import { getAccessibleProducts } from '@/lib/supabase/products';

export function ProductList({ marketId }: { marketId: string }) {
  const [products, setProducts] = useState<ProductWithAccess[]>([]);
  const { checkPermission, isStaff } = useStaffPermissions();

  useEffect(() => {
    // ✅ 使用新的視圖查詢
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

---

### Step 5: 創建員工管理界面

創建 `components/staff/StaffManagement.tsx`：

```tsx
// components/staff/StaffManagement.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { StaffRelationship } from '@/lib/types/staff';

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffRelationship[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // 載入員工列表
  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    const { data, error } = await supabase
      .from('staff_relationships')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('載入員工失敗:', error);
      return;
    }

    setStaff(data);
  }

  // 邀請員工
  async function handleInvite() {
    if (!email) return;

    setLoading(true);
    try {
      // 1. 查詢用戶是否存在
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !userData) {
        alert('找不到此用戶，請確認 Email 是否正確');
        return;
      }

      // 2. 創建員工關係
      const { error: insertError } = await supabase
        .from('staff_relationships')
        .insert({
          staff_id: userData.id,
          staff_email: email.toLowerCase(),
          status: 'pending',
          permissions: { can_view: true, can_edit: false },
        });

      if (insertError) {
        console.error('邀請失敗:', insertError);
        alert('邀請失敗: ' + insertError.message);
        return;
      }

      alert('邀請成功！');
      setEmail('');
      loadStaff();
    } finally {
      setLoading(false);
    }
  }

  // 撤銷員工
  async function handleRevoke(staffId: string) {
    if (!confirm('確定要撤銷此員工的權限嗎？')) return;

    const { error } = await supabase
      .from('staff_relationships')
      .update({ status: 'revoked' })
      .eq('id', staffId);

    if (error) {
      console.error('撤銷失敗:', error);
      alert('撤銷失敗');
      return;
    }

    alert('已撤銷權限');
    loadStaff();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">員工管理</h2>

      {/* 邀請表單 */}
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="輸入員工 Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-2 border rounded"
        />
        <button
          onClick={handleInvite}
          disabled={loading || !email}
          className="px-6 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? '邀請中...' : '邀請員工'}
        </button>
      </div>

      {/* 員工列表 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">員工列表</h3>
        {staff.length === 0 ? (
          <p className="text-gray-500">尚未添加員工</p>
        ) : (
          <div className="space-y-2">
            {staff.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 border rounded"
              >
                <div>
                  <p className="font-medium">{s.staff_email}</p>
                  <p className="text-sm text-gray-500">
                    狀態: {s.status === 'pending' ? '待接受' : s.status === 'active' ? '已接受' : '已撤銷'}
                  </p>
                  {s.accepted_at && (
                    <p className="text-xs text-gray-400">
                      接受時間: {new Date(s.accepted_at).toLocaleString()}
                    </p>
                  )}
                </div>
                {s.status === 'active' && (
                  <button
                    onClick={() => handleRevoke(s.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    撤銷權限
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🧪 測試檢查清單

### 數據庫測試
- [ ] 視圖查詢返回正確數據
- [ ] RLS 政策正常運作
- [ ] 員工只能看到被授權的數據

### 前端測試
- [ ] 老闆可以看到所有市集
- [ ] 員工只能看到被授權的市集
- [ ] 員工看不到成本和利潤
- [ ] 編輯按鈕根據權限顯示/隱藏
- [ ] 身份標籤正確顯示

---

## 🚨 常見錯誤

### 錯誤 1: 查詢返回空結果
```typescript
// ❌ 錯誤：仍在使用舊的表查詢
.from('markets')

// ✅ 正確：使用視圖查詢
.from('staff_accessible_markets')
```

### 錯誤 2: 類型錯誤
```typescript
// ❌ 錯誤：使用舊的類型
const markets: Market[] = ...

// ✅ 正確：使用新的類型
const markets: MarketWithAccess[] = ...
```

### 錯誤 3: 忘記檢查權限
```tsx
// ❌ 錯誤：直接顯示編輯按鈕
<Button onClick={handleEdit}>編輯</Button>

// ✅ 正確：根據權限顯示
{checkPermission(item, 'edit') && (
  <Button onClick={handleEdit}>編輯</Button>
)}
```

---

## 📌 重要提醒

1. **所有查詢都要改用視圖**：這是最關鍵的變更
2. **使用 `useStaffPermissions` Hook**：統一權限檢查邏輯
3. **顯示身份標籤**：讓用戶知道當前是老闆還是員工模式
4. **隱藏敏感信息**：成本、利潤等只有老闆可見

---

## 🎯 下一步

1. ✅ 執行 SQL 遷移（已完成）
2. 🔄 修改 Supabase 查詢層
3. 🔄 創建權限檢查 Hook
4. 🔄 更新 UI 組件
5. 🔄 創建員工管理界面
6. 🧪 測試所有功能

---

**總結**：核心是將所有查詢改為視圖查詢，並使用 `useStaffPermissions` Hook 統一處理權限檢查。
