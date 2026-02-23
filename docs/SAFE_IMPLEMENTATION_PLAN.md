# 選項 1：完整整合 Event Sourcing - 安全實施計畫

## 🎯 目標

將員工權限系統完整整合到 Event Sourcing 架構中，同時確保：
- ✅ 不破壞現有功能
- ✅ 可以隨時回滾
- ✅ 逐步測試驗證
- ✅ 保持離線優先

---

## 🛡️ 風險控制策略

### 1. 分階段實施（每階段可獨立回滾）
- Phase A: 擴展數據結構（不影響現有功能）
- Phase B: 修改同步邏輯（向後兼容）
- Phase C: 更新 UI 組件（漸進式）
- Phase D: 測試驗證

### 2. 向後兼容設計
- 所有新欄位都是可選的
- 保留舊的查詢邏輯作為降級方案
- 使用特性開關（Feature Flag）

### 3. 備份機制
- 每個階段前創建備份點
- 提供快速回滾腳本

---

## 📋 Phase A: 擴展數據結構（30 分鐘）

### A1: 擴展 IndexedDB Schema

**目標**：在快照表中添加權限欄位

**文件**：`lib/db/index.ts`

**修改內容**：
```typescript
// 在 Market 接口中添加可選欄位
export interface Market {
  // ... 現有欄位
  
  // ✅ 新增：員工權限欄位（可選，向後兼容）
  access_type?: 'owner' | 'staff';
  permissions?: {
    can_view: boolean;
    can_edit: boolean;
  };
  relationship_owner_id?: string;
}

export interface Product {
  // ... 現有欄位
  
  // ✅ 新增：員工權限欄位（可選，向後兼容）
  access_type?: 'owner' | 'staff';
  permissions?: {
    can_view: boolean;
    can_edit: boolean;
  };
  relationship_owner_id?: string;
}
```

**風險**：❌ 無風險（只是添加可選欄位）

**回滾**：不需要（不影響現有功能）

---

## 📋 Phase B: 修改同步邏輯（1 小時）

### B1: 創建特性開關

**目標**：控制是否啟用員工模式

**文件**：`lib/db/settings.ts`（新建）

```typescript
/**
 * 特性開關：員工模式
 */
export function isStaffModeEnabled(): boolean {
  // 從 localStorage 讀取設定
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('feature_staff_mode') === 'true';
}

export function enableStaffMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('feature_staff_mode', 'true');
  }
}

export function disableStaffMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('feature_staff_mode');
  }
}
```

**風險**：❌ 無風險（獨立模組）

---

### B2: 修改同步邏輯（向後兼容）

**目標**：從視圖拉取數據，但保留降級方案

**文件**：`hooks/useSync.ts`

**策略**：
1. 檢查特性開關
2. 如果啟用員工模式，從視圖拉取
3. 如果未啟用，使用原邏輯（降級）
4. 如果視圖拉取失敗，自動降級

**修改位置**：`pullAllEvents` 函數

```typescript
// 在 pullAllEvents 函數中添加
async function pullAllEvents(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void
): Promise<void> {
  // ✅ 檢查是否啟用員工模式
  const { isStaffModeEnabled } = await import('@/lib/db/settings');
  const staffModeEnabled = isStaffModeEnabled();
  
  try {
    // ✅ 如果啟用員工模式，嘗試從視圖拉取
    if (staffModeEnabled) {
      console.log('📊 員工模式已啟用，從視圖拉取數據...');
      await pullEventsFromViews(userId, onProgress);
      return;
    }
  } catch (error) {
    console.warn('⚠️ 從視圖拉取失敗，降級到原邏輯:', error);
    // 繼續執行原邏輯（降級）
  }
  
  // ✅ 原邏輯（降級方案）
  // ... 現有代碼保持不變
}
```

**風險**：⚠️ 低風險（有降級方案）

**回滾**：關閉特性開關即可

---

### B3: 創建視圖拉取函數

**目標**：從 Supabase 視圖拉取數據

**文件**：`hooks/useSync.ts`（新增函數）

```typescript
/**
 * 從員工視圖拉取數據（員工模式）
 */
async function pullEventsFromViews(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void
): Promise<void> {
  console.log('📊 從員工視圖拉取數據...');
  
  // 1. 拉取市集數據（從視圖）
  const { data: marketsData, error: marketsError } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .is('deleted_at', null);
  
  if (marketsError) throw marketsError;
  
  // 2. 拉取商品數據（從視圖）
  const { data: productsData, error: productsError } = await supabase
    .from('staff_accessible_products')
    .select('*')
    .is('deleted_at', null);
  
  if (productsError) throw productsError;
  
  // 3. 同步到 IndexedDB（保留權限信息）
  await syncMarketsToIndexedDB(marketsData || []);
  await syncProductsToIndexedDB(productsData || []);
  
  // 4. 繼續拉取事件（用於歷史記錄）
  await pullAllEvents(userId, onProgress);
}

/**
 * 同步市集到 IndexedDB（保留權限）
 */
async function syncMarketsToIndexedDB(markets: any[]): Promise<void> {
  for (const market of markets) {
    const existing = await db.markets.get(market.id);
    
    if (existing) {
      // 更新現有記錄（保留權限信息）
      await db.markets.update(market.id, {
        ...market,
        access_type: market.access_type,
        permissions: market.permissions,
        relationship_owner_id: market.relationship_owner_id,
      });
    } else {
      // 新增記錄
      await db.markets.add({
        ...market,
        access_type: market.access_type,
        permissions: market.permissions,
        relationship_owner_id: market.relationship_owner_id,
      });
    }
  }
}

/**
 * 同步商品到 IndexedDB（保留權限）
 */
async function syncProductsToIndexedDB(products: any[]): Promise<void> {
  for (const product of products) {
    const existing = await db.products.get(product.id);
    
    if (existing) {
      // 更新現有記錄（保留權限信息）
      await db.products.update(product.id, {
        ...product,
        access_type: product.access_type,
        permissions: product.permissions,
        relationship_owner_id: product.relationship_owner_id,
      });
    } else {
      // 新增記錄
      await db.products.add({
        ...product,
        access_type: product.access_type,
        permissions: product.permissions,
        relationship_owner_id: product.relationship_owner_id,
      });
    }
  }
}
```

**風險**：⚠️ 中風險（新邏輯，但有降級）

**回滾**：關閉特性開關，數據自動降級

---

## 📋 Phase C: 更新 UI 組件（1 小時）

### C1: 修改市集頁面（漸進式）

**目標**：添加權限檢查，但不破壞現有功能

**文件**：`app/markets/page.tsx`

**策略**：
1. 檢查數據是否有權限欄位
2. 如果有，顯示身份標籤和權限控制
3. 如果沒有，使用原邏輯（降級）

```typescript
// 在 MarketCard 組件中
export function MarketCard({ market }: { market: Market }) {
  const { isStaff, checkPermission } = useStaffPermissions();
  
  // ✅ 檢查是否有權限欄位（向後兼容）
  const hasPermissions = market.access_type !== undefined;
  
  return (
    <div>
      {/* 顯示身份標籤（只在有權限欄位時） */}
      {hasPermissions && isStaff(market) && (
        <Badge>員工模式</Badge>
      )}
      
      {/* 編輯按鈕（檢查權限或降級到原邏輯） */}
      {(!hasPermissions || checkPermission(market, 'edit')) && (
        <Button>編輯</Button>
      )}
    </div>
  );
}
```

**風險**：⚠️ 低風險（向後兼容）

**回滾**：移除權限檢查代碼

---

### C2: 修改商品頁面（同上）

**文件**：`app/products/page.tsx`

**策略**：同市集頁面

**風險**：⚠️ 低風險（向後兼容）

---

## 📋 Phase D: 測試驗證（30 分鐘）

### D1: 測試清單

#### 老闆模式測試（特性開關關閉）
- [ ] 可以正常查看市集
- [ ] 可以正常編輯市集
- [ ] 可以正常查看商品
- [ ] 可以正常編輯商品
- [ ] 離線功能正常

#### 員工模式測試（特性開關開啟）
- [ ] 可以查看被授權的市集
- [ ] 無法編輯市集
- [ ] 可以查看被授權的商品
- [ ] 無法查看成本和利潤
- [ ] 顯示員工模式標籤

#### 降級測試
- [ ] 關閉特性開關後恢復原功能
- [ ] 視圖拉取失敗時自動降級
- [ ] 沒有權限欄位時使用原邏輯

---

## 🔄 回滾計畫

### 快速回滾（1 分鐘）

```typescript
// 在瀏覽器控制台執行
localStorage.removeItem('feature_staff_mode');
location.reload();
```

### 完整回滾（5 分鐘）

1. 關閉特性開關
2. 清除 IndexedDB 中的權限欄位
3. 重新同步數據

```typescript
// 回滾腳本
async function rollbackStaffMode() {
  // 1. 關閉特性開關
  localStorage.removeItem('feature_staff_mode');
  
  // 2. 清除權限欄位
  const markets = await db.markets.toArray();
  for (const market of markets) {
    await db.markets.update(market.id, {
      access_type: undefined,
      permissions: undefined,
      relationship_owner_id: undefined,
    });
  }
  
  const products = await db.products.toArray();
  for (const product of products) {
    await db.products.update(product.id, {
      access_type: undefined,
      permissions: undefined,
      relationship_owner_id: undefined,
    });
  }
  
  // 3. 重新載入
  location.reload();
}
```

---

## 📊 實施時間表

| Phase | 任務 | 時間 | 風險 | 可回滾 |
|-------|------|------|------|--------|
| A | 擴展數據結構 | 30 分鐘 | ❌ 無 | ✅ 是 |
| B1 | 創建特性開關 | 15 分鐘 | ❌ 無 | ✅ 是 |
| B2 | 修改同步邏輯 | 30 分鐘 | ⚠️ 低 | ✅ 是 |
| B3 | 創建視圖拉取 | 30 分鐘 | ⚠️ 中 | ✅ 是 |
| C1 | 修改市集頁面 | 30 分鐘 | ⚠️ 低 | ✅ 是 |
| C2 | 修改商品頁面 | 30 分鐘 | ⚠️ 低 | ✅ 是 |
| D | 測試驗證 | 30 分鐘 | - | - |

**總計**：約 3 小時（保守估計）

---

## 🎯 執行順序

### 第一步：Phase A（安全，無風險）
我會先擴展數據結構，這不會影響任何現有功能。

### 第二步：Phase B1（安全，獨立模組）
創建特性開關，預設關閉。

### 第三步：Phase B2-B3（有降級方案）
修改同步邏輯，但保留原邏輯作為降級。

### 第四步：Phase C（向後兼容）
更新 UI 組件，檢查權限欄位是否存在。

### 第五步：Phase D（驗證）
測試所有功能，確保沒有問題。

---

## 🛡️ 安全保證

1. **每個階段都可以獨立回滾**
2. **特性開關預設關閉**（不影響現有用戶）
3. **向後兼容設計**（沒有權限欄位時使用原邏輯）
4. **降級方案**（視圖拉取失敗時自動降級）
5. **漸進式更新**（不是一次性大改）

---

## 🚀 準備開始

我會按照以上計畫，逐步實施。每完成一個 Phase，我會告訴你進度和測試結果。

**準備好了嗎？我現在開始 Phase A！** 🎯
