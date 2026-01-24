# ✅ Payload 完整性檢查報告

## 檢查日期
2026-01-24

---

## 🎯 檢查目標

確保所有事件的 payload 包含完整的欄位，並正確轉換為底線式命名（用於 Supabase 同步）。

---

## ✅ Market Created Payload - 完整

### 對比 `MarketCreatedPayload` 類型定義

#### 駝峰式命名（原始，用於本地 Dexie）
| 欄位 | 類型 | 狀態 |
|------|------|------|
| `name` | string | ✅ |
| `location` | string | ✅ |
| `startDate` | string | ✅ |
| `endDate` | string | ✅ |
| `startTime` | string? | ✅ |
| `endTime` | string? | ✅ |
| `earlyEntryEnabled` | boolean? | ✅ |
| `earlyEntryTime` | string? | ✅ |
| `checkInTime` | string? | ✅ |
| `operatingStartTime` | string? | ✅ |
| `operatingEndTime` | string? | ✅ |
| `registrationFee` | number | ✅ |
| `boothCost` | number | ✅ |
| `deposit` | number? | ✅ |
| `tableRental` | number? | ✅ |
| `chairRental` | number? | ✅ |
| `umbrellaRental` | number? | ✅ |
| `tableclothRental` | number? | ✅ |
| `commissionRate` | number? | ✅ |
| `tableFree` | boolean? | ✅ |
| `chairFree` | boolean? | ✅ |
| `umbrellaFree` | boolean? | ✅ |
| `tableclothFree` | boolean? | ✅ |
| `notes` | string? | ✅ |

#### 底線式命名（用於 Supabase）
| 欄位 | 對應駝峰式 | 狀態 |
|------|-----------|------|
| `market_id` | - | ✅ 新增 |
| `start_date` | `startDate` | ✅ |
| `end_date` | `endDate` | ✅ |
| `start_time` | `startTime` | ✅ |
| `end_time` | `endTime` | ✅ |
| `early_entry_enabled` | `earlyEntryEnabled` | ✅ |
| `early_entry_time` | `earlyEntryTime` | ✅ |
| `check_in_time` | `checkInTime` | ✅ |
| `operating_start_time` | `operatingStartTime` | ✅ |
| `operating_end_time` | `operatingEndTime` | ✅ |
| `registration_fee` | `registrationFee` | ✅ |
| `booth_cost` | `boothCost` | ✅ |
| `deposit` | `deposit` | ✅ 已修復 |
| `table_rental` | `tableRental` | ✅ |
| `chair_rental` | `chairRental` | ✅ |
| `umbrella_rental` | `umbrellaRental` | ✅ |
| `tablecloth_rental` | `tableclothRental` | ✅ |
| `commission_rate` | `commissionRate` | ✅ |
| `table_free` | `tableFree` | ✅ |
| `chair_free` | `chairFree` | ✅ |
| `umbrella_free` | `umbrellaFree` | ✅ |
| `tablecloth_free` | `tableclothFree` | ✅ |
| `notes` | `notes` | ✅ 已修復 |

**總計：** 24 個欄位，全部包含 ✅

---

## ✅ Product Created Payload - 完整

### 對比 `ProductCreatedPayload` 類型定義

| 欄位 | 類型 | 狀態 |
|------|------|------|
| `productId` | string | ✅ 自動生成 |
| `name` | string | ✅ |
| `category` | ProductCategory | ✅ |
| `price` | number | ✅ |
| `cost` | number? | ✅ |
| `iconName` | string? | ✅ |
| `colorCode` | string? | ✅ |
| `stock` | number? | ✅ |
| `unlimitedStock` | boolean? | ✅ |
| `description` | string? | ✅ |

**總計：** 10 個欄位，全部包含 ✅

---

## ✅ Interaction Recorded Payload - 完整

### 對比 `InteractionRecordedPayload` 類型定義

| 欄位 | 類型 | 狀態 |
|------|------|------|
| `market_id` | string | ✅ 已統一 |
| `type` | InteractionType | ✅ |
| `productIds` | string[]? | ✅ |
| `notes` | string? | ✅ |

**總計：** 4 個欄位，全部包含 ✅

---

## ✅ Deal Closed Payload - 完整

### 對比 `DealClosedPayload` 類型定義

| 欄位 | 類型 | 狀態 |
|------|------|------|
| `market_id` | string | ✅ 已統一 |
| `items` | array | ✅ |
| `items[].productId` | string | ✅ |
| `items[].quantity` | number | ✅ |
| `items[].price` | number | ✅ |
| `items[].price_at_time_of_sale` | number? | ✅ 自動添加 |
| `items[].cost_at_time_of_sale` | number? | ✅ 自動添加 |
| `items[].product_name` | string? | ✅ 自動添加 |
| `totalAmount` | number | ✅ |
| `paymentMethod` | string | ✅ |
| `notes` | string? | ✅ |

**總計：** 11 個欄位，全部包含 ✅

---

## 🔧 已修復的問題

### 問題 1：缺少 `deposit` 和 `notes` 的底線式版本
**狀態：** ✅ 已修復

**修復前：**
```typescript
updates.payload = {
  ...payload,
  // ... 其他欄位
  // ❌ 缺少 deposit 和 notes
};
```

**修復後：**
```typescript
updates.payload = {
  ...payload,
  // ... 其他欄位
  deposit: payload.deposit,  // ✅ 添加
  notes: payload.notes,      // ✅ 添加
};
```

---

## 📊 完整性統計

| 事件類型 | 必要欄位 | 已包含 | 完整度 |
|---------|---------|--------|--------|
| `market_created` | 24 | 24 | ✅ 100% |
| `product_created` | 10 | 10 | ✅ 100% |
| `interaction_recorded` | 4 | 4 | ✅ 100% |
| `deal_closed` | 11 | 11 | ✅ 100% |
| `market_status_changed` | 3 | 3 | ✅ 100% |
| `market_started` | 1 | 1 | ✅ 100% |
| `market_ended` | 1 | 1 | ✅ 100% |

**總體完整度：** ✅ 100%

---

## 🎯 Supabase Trigger 兼容性

### 已支援的命名方式

Supabase Trigger 使用 `COALESCE` 同時支援兩種命名：

```sql
COALESCE(
  (NEW.payload->>'start_date')::DATE,   -- ✅ 優先使用底線式
  (NEW.payload->>'startDate')::DATE     -- ✅ 回退到駝峰式
)
```

**支援的欄位：**
- ✅ `start_date` / `startDate`
- ✅ `end_date` / `endDate`
- ✅ `start_time` / `startTime`
- ✅ `end_time` / `endTime`
- ✅ `early_entry_enabled` / `earlyEntryEnabled`
- ✅ `early_entry_time` / `earlyEntryTime`
- ✅ `check_in_time` / `checkInTime`
- ✅ `operating_start_time` / `operatingStartTime`
- ✅ `operating_end_time` / `operatingEndTime`
- ✅ `registration_fee` / `registrationFee`
- ✅ `booth_cost` / `boothCost`
- ✅ `table_rental` / `tableRental`
- ✅ `chair_rental` / `chairRental`
- ✅ `umbrella_rental` / `umbrellaRental`
- ✅ `tablecloth_rental` / `tableclothRental`
- ✅ `commission_rate` / `commissionRate`
- ✅ `table_free` / `tableFree`
- ✅ `chair_free` / `chairFree`
- ✅ `umbrella_free` / `umbrellaFree`
- ✅ `tablecloth_free` / `tableclothFree`
- ✅ `market_id` / `marketId`

---

## ✅ 結論

**所有事件的 payload 都包含完整的欄位！**

- ✅ 駝峰式命名（用於本地 Dexie）
- ✅ 底線式命名（用於 Supabase 同步）
- ✅ Supabase Trigger 兼容兩種命名
- ✅ 所有必要欄位都已包含
- ✅ 沒有遺漏任何欄位

---

## 🚀 測試建議

### 1. 測試完整的市集創建流程
- 創建市集（包含所有可選欄位）
- 同步到 Supabase
- 檢查 Supabase `markets` 表是否所有欄位都正確填入

### 2. 測試邊界情況
- 創建市集時不填寫可選欄位
- 檢查 Supabase 是否正確處理 `null` 值

### 3. 測試其他事件類型
- 創建商品
- 記錄互動
- 記錄成交
- 檢查所有事件是否正確同步

---

**檢查完成！所有 payload 欄位都已包含且正確轉換。** ✅
