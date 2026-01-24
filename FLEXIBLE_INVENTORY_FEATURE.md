# 🎯 彈性庫存管理功能說明

## 功能概述

本功能實作「彈性庫存管理」，支援兩種商品類型：
1. **有限庫存商品**：實體商品，需要追蹤庫存數量
2. **不限庫存商品**：服務類商品或接單訂製商品，無需追蹤庫存

---

## 📋 功能清單

### ✅ 已完成

1. **資料結構變更** (`types/db.ts`)
   - ✅ 在 `Product` 介面新增 `unlimitedStock?: boolean` 欄位
   - ✅ 在 `ProductCreatedPayload` 新增 `unlimitedStock?: boolean` 欄位

2. **事件處理邏輯** (`lib/db/events.ts`)
   - ✅ 商品建立時處理 `unlimitedStock` 欄位
   - ✅ 成交時只對「有限庫存」商品扣除庫存
   - ✅ 成交時計算轉換率和客單價時加入除數保護（防止 NaN）

3. **結帳防呆機制** (`lib/db/hooks.ts`)
   - ✅ `recordDeal` 函數在結帳前檢查庫存
   - ✅ 只檢查「有限庫存」商品的庫存是否足夠
   - ✅ 庫存不足時拋出錯誤並中斷結帳

4. **UI 組件更新**
   - ✅ `AddProductForm.tsx` - 新增「不限庫存」Checkbox
   - ✅ `EditProductForm.tsx` - 新增「不限庫存」Checkbox
   - ✅ `ProductCard.tsx` - 顯示不限庫存為「∞」

---

## 🎨 UI 互動邏輯

### 新增/編輯商品表單

#### 不限庫存 Checkbox
```
☐ 不限庫存（販售服務或接單訂製）
```

**互動行為：**

1. **勾選「不限庫存」時：**
   - 隱藏「庫存數量」輸入框
   - 顯示「∞ 不限庫存」提示
   - 自動將 `stock` 設為 `0`
   - 設定 `unlimitedStock` 為 `true`

2. **取消勾選時：**
   - 顯示「庫存數量」輸入框
   - 使用者可輸入庫存數量
   - 設定 `unlimitedStock` 為 `false`

#### 視覺效果

**勾選前：**
```
┌─────────────────────────────┐
│ 庫存數量                     │
│ ┌─────────────────────────┐ │
│ │ 100                     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**勾選後：**
```
┌─────────────────────────────┐
│ 庫存數量                     │
│ ☑ 不限庫存（販售服務或接單訂製）│
│ ┌─────────────────────────┐ │
│ │   ∞ 不限庫存            │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## 🔧 技術實作細節

### 1. 資料結構

```typescript
// types/db.ts
export interface Product {
  // ... 其他欄位
  stock?: number;              // 庫存數量
  unlimitedStock?: boolean;    // 不限庫存（預設 false）
  // ... 其他欄位
}
```

### 2. 商品建立邏輯

```typescript
// lib/db/events.ts - product_created 事件處理器
await db.products.add({
  // ... 其他欄位
  stock: payload.unlimitedStock ? 0 : (payload.stock || 0),
  unlimitedStock: payload.unlimitedStock || false,
  // ... 其他欄位
});
```

**邏輯：**
- 如果 `unlimitedStock` 為 `true`，強制 `stock` 為 `0`
- 如果 `unlimitedStock` 為 `false`，使用使用者輸入的 `stock` 值

### 3. 成交時庫存扣減

```typescript
// lib/db/events.ts - deal_closed 事件處理器
if (product) {
  const updates: any = {
    totalSold: (product.totalSold || 0) + item.quantity,
    updatedAt: event.timestamp,
  };
  
  // 只有「有限庫存」商品才扣除庫存
  if (!product.unlimitedStock && product.stock !== undefined) {
    updates.stock = Math.max(0, product.stock - item.quantity);
  }
  
  await db.products.update(item.productId, updates);
}
```

**邏輯：**
- 所有商品都更新 `totalSold`（銷售統計）
- 只有 `unlimitedStock === false` 的商品才扣除 `stock`
- 使用 `Math.max(0, ...)` 確保庫存不會變成負數

### 4. 結帳前庫存檢查

```typescript
// lib/db/hooks.ts - recordDeal 函數
export async function recordDeal(data: DealClosedPayload): Promise<void> {
  // 結帳前庫存檢查
  for (const item of data.items) {
    const product = await db.products.get(item.productId);
    
    if (!product) {
      throw new Error(`商品不存在：ID ${item.productId}`);
    }
    
    // 只檢查「有限庫存」商品
    if (!product.unlimitedStock) {
      const currentStock = product.stock || 0;
      
      if (currentStock < item.quantity) {
        throw new Error(
          `${product.name} 庫存不足！\n目前庫存：${currentStock}，需要：${item.quantity}`
        );
      }
    }
  }
  
  // 庫存檢查通過，記錄成交事件
  await recordEvent('deal_closed', data);
}
```

**邏輯：**
- 遍歷購物車中的每個商品
- 檢查商品是否存在
- 只對 `unlimitedStock === false` 的商品檢查庫存
- 庫存不足時拋出錯誤，中斷結帳流程

### 5. 除數保護（防止 NaN）

```typescript
// lib/db/events.ts - deal_closed 事件處理器
const newTotalInteractions = market.totalInteractions || 0;
const newTotalDeals = (market.totalDeals || 0) + 1;
const newTotalRevenue = (market.totalRevenue || 0) + totalAmount;

// 計算轉換率（防呆：分母為 0 時回傳 0）
const conversionRate = newTotalInteractions > 0 
  ? (newTotalDeals / newTotalInteractions) * 100 
  : 0;

// 計算客單價（防呆：分母為 0 時回傳 0）
const averageOrderValue = newTotalDeals > 0 
  ? newTotalRevenue / newTotalDeals 
  : 0;
```

**邏輯：**
- 在除法運算前檢查分母是否為 0
- 分母為 0 時回傳 0，避免 `NaN` 或 `Infinity`

---

## 📊 視覺回饋

### 商品卡片顯示

#### 有限庫存商品
```
┌─────────────────────────┐
│ 🧵                      │
│                         │
│ 手工陶杯                │
│ NT$ 350                 │
│ 庫存 10    已售 5       │
└─────────────────────────┘
```

#### 不限庫存商品
```
┌─────────────────────────┐
│ 🎨                      │
│                         │
│ 客製化插畫              │
│ NT$ 1,500               │
│ 庫存 ∞     已售 3       │
└─────────────────────────┘
```

#### 庫存不足商品（紅色警告）
```
┌─────────────────────────┐
│ 🍰                      │
│                         │
│ 手工餅乾                │
│ NT$ 120                 │
│ 庫存 0     已售 20      │
│         ↑ 紅色顯示      │
└─────────────────────────┘
```

---

## 🧪 測試場景

### 測試 1：建立不限庫存商品

**步驟：**
1. 進入「商品」頁面
2. 點擊「+」新增商品
3. 填寫商品資訊：
   - 名稱：客製化插畫
   - 分類：藝術品
   - 售價：1500
   - 成本：500
4. **勾選「不限庫存」**
5. 點擊「建立商品」

**預期結果：**
- ✅ 商品建立成功
- ✅ 商品卡片顯示「庫存 ∞」
- ✅ 資料庫中 `unlimitedStock: true`，`stock: 0`

### 測試 2：建立有限庫存商品

**步驟：**
1. 進入「商品」頁面
2. 點擊「+」新增商品
3. 填寫商品資訊：
   - 名稱：手工陶杯
   - 分類：手作
   - 售價：350
   - 成本：150
   - 庫存：10
4. **不勾選「不限庫存」**
5. 點擊「建立商品」

**預期結果：**
- ✅ 商品建立成功
- ✅ 商品卡片顯示「庫存 10」
- ✅ 資料庫中 `unlimitedStock: false`，`stock: 10`

### 測試 3：成交扣除庫存（有限庫存）

**步驟：**
1. 進入 POS 頁面
2. 選擇「手工陶杯」x 3
3. 點擊「結帳」
4. 完成結帳

**預期結果：**
- ✅ 成交成功
- ✅ 庫存從 10 變成 7
- ✅ 已售從 0 變成 3

### 測試 4：成交不扣除庫存（不限庫存）

**步驟：**
1. 進入 POS 頁面
2. 選擇「客製化插畫」x 2
3. 點擊「結帳」
4. 完成結帳

**預期結果：**
- ✅ 成交成功
- ✅ 庫存仍然顯示「∞」
- ✅ 已售從 0 變成 2
- ✅ 資料庫中 `stock` 仍為 0

### 測試 5：庫存不足防呆

**步驟：**
1. 建立商品「手工餅乾」，庫存 5
2. 進入 POS 頁面
3. 選擇「手工餅乾」x 10（超過庫存）
4. 點擊「結帳」

**預期結果：**
- ❌ 結帳失敗
- ✅ 顯示錯誤訊息：「手工餅乾 庫存不足！目前庫存：5，需要：10」
- ✅ 購物車保持不變
- ✅ 庫存未被扣除

### 測試 6：編輯商品切換庫存模式

**步驟：**
1. 編輯「手工陶杯」
2. 勾選「不限庫存」
3. 儲存變更

**預期結果：**
- ✅ 更新成功
- ✅ 商品卡片顯示「庫存 ∞」
- ✅ 資料庫中 `unlimitedStock: true`，`stock: 0`

---

## 🚀 使用場景

### 場景 1：手作攤販

**商品類型：**
- 有限庫存：手工陶杯、手工皂、編織包（實體商品）
- 不限庫存：客製化訂單、現場教學服務

**優勢：**
- 實體商品可追蹤庫存，避免超賣
- 服務類商品不受庫存限制，可無限接單

### 場景 2：插畫家攤位

**商品類型：**
- 有限庫存：明信片、貼紙、印刷品
- 不限庫存：現場手繪、客製化插畫、數位檔案

**優勢：**
- 印刷品庫存清楚，賣完即止
- 手繪服務可持續接單，不受限制

### 場景 3：食品攤販

**商品類型：**
- 有限庫存：手工餅乾、蛋糕、果醬（當日製作數量有限）
- 不限庫存：預購訂單、客製化蛋糕

**優勢：**
- 當日商品庫存管理精確
- 預購訂單不受當日庫存影響

---

## 📈 數據統計

### 轉換率計算（已加入除數保護）

```typescript
const conversionRate = totalInteractions > 0 
  ? (totalDeals / totalInteractions) * 100 
  : 0;
```

**說明：**
- 如果沒有任何互動（`totalInteractions === 0`），轉換率為 0%
- 避免除以 0 導致 `NaN`

### 客單價計算（已加入除數保護）

```typescript
const averageOrderValue = totalDeals > 0 
  ? totalRevenue / totalDeals 
  : 0;
```

**說明：**
- 如果沒有任何成交（`totalDeals === 0`），客單價為 0
- 避免除以 0 導致 `NaN`

---

## 🐛 已修復的問題

### 問題 1：成交時所有商品都扣除庫存

**原因：**
- 沒有檢查 `unlimitedStock` 欄位
- 所有商品都執行庫存扣減邏輯

**修復：**
```typescript
// 修復前
await db.products.update(item.productId, {
  totalSold: (product.totalSold || 0) + item.quantity,
  stock: product.stock - item.quantity, // ❌ 所有商品都扣除
  updatedAt: event.timestamp,
});

// 修復後
const updates: any = {
  totalSold: (product.totalSold || 0) + item.quantity,
  updatedAt: event.timestamp,
};

// 只有「有限庫存」商品才扣除庫存
if (!product.unlimitedStock && product.stock !== undefined) {
  updates.stock = Math.max(0, product.stock - item.quantity);
}

await db.products.update(item.productId, updates);
```

### 問題 2：轉換率和客單價出現 NaN

**原因：**
- 沒有檢查分母是否為 0
- 除以 0 導致 `NaN` 或 `Infinity`

**修復：**
```typescript
// 修復前
const conversionRate = (totalDeals / totalInteractions) * 100; // ❌ 可能除以 0

// 修復後
const conversionRate = totalInteractions > 0 
  ? (totalDeals / totalInteractions) * 100 
  : 0; // ✅ 除數保護
```

### 問題 3：沒有庫存檢查導致超賣

**原因：**
- `recordDeal` 函數直接記錄成交，沒有檢查庫存

**修復：**
```typescript
// 修復前
export async function recordDeal(data: DealClosedPayload): Promise<void> {
  await recordEvent('deal_closed', data); // ❌ 直接記錄，沒有檢查
}

// 修復後
export async function recordDeal(data: DealClosedPayload): Promise<void> {
  // 結帳前庫存檢查
  for (const item of data.items) {
    const product = await db.products.get(item.productId);
    
    if (!product) {
      throw new Error(`商品不存在：ID ${item.productId}`);
    }
    
    // 只檢查「有限庫存」商品
    if (!product.unlimitedStock) {
      const currentStock = product.stock || 0;
      
      if (currentStock < item.quantity) {
        throw new Error(
          `${product.name} 庫存不足！\n目前庫存：${currentStock}，需要：${item.quantity}`
        );
      }
    }
  }
  
  // 庫存檢查通過，記錄成交事件
  await recordEvent('deal_closed', data);
}
```

---

## 📝 注意事項

### 1. 資料庫遷移

**現有商品處理：**
- 現有商品的 `unlimitedStock` 欄位為 `undefined`
- 在邏輯中視為 `false`（有限庫存）
- 使用 `product.unlimitedStock || false` 確保相容性

### 2. 庫存為 0 的處理

**有限庫存商品：**
- 庫存為 0 時，商品卡片顯示紅色警告
- 結帳時會被防呆機制攔截

**不限庫存商品：**
- 庫存永遠為 0，但顯示為「∞」
- 結帳時不檢查庫存，可正常成交

### 3. 編輯商品時的注意事項

**從有限庫存改為不限庫存：**
- 原有庫存數量會被清除（設為 0）
- 已售數量保留

**從不限庫存改為有限庫存：**
- 需要重新輸入庫存數量
- 已售數量保留

---

## 🎉 功能完成度

- ✅ 資料結構變更
- ✅ 事件處理邏輯
- ✅ 結帳防呆機制
- ✅ UI 組件更新
- ✅ 視覺回饋
- ✅ 除數保護
- ✅ 錯誤處理
- ✅ 文件撰寫

**完成度：100%** ████████████████████

---

**最後更新：** 2026-01-22  
**功能版本：** v1.0.0  
**相關檔案：**
- `types/db.ts`
- `lib/db/events.ts`
- `lib/db/hooks.ts`
- `components/products/AddProductForm.tsx`
- `components/products/EditProductForm.tsx`
- `components/products/ProductCard.tsx`
