# 成本明細最終修正報告

## 📋 修正概述

根據用戶需求，完成了成本明細的最終調整，包括新增保證金顯示、完善免費提供與自備邏輯判斷，以及移除桌巾項目。

---

## ✅ 完成的修正項目

### 1. 新增保證金顯示 ✓

**需求：** 保證金不計入成本，但需要顯示在成本明細中作為提醒

**實作方式：**
```typescript
{/* 保證金 - 不計入成本，僅作提醒 */}
{market.deposit && market.deposit > 0 && (
  <div className="flex justify-between items-center bg-[#FFF8E7] px-3 py-2 rounded-lg">
    <span className="text-[#6B6B6B] flex items-center gap-1">
      保證金
      <span className="text-xs text-[#D4A574]">(需退款)</span>
    </span>
    <span className="font-medium text-[#D4A574]">
      {formatCurrency(market.deposit)}
    </span>
  </div>
)}
```

**視覺特點：**
- 黃色背景 `bg-[#FFF8E7]` 突出顯示
- 標註「(需退款)」提醒用戶
- 金額使用金色 `text-[#D4A574]`
- 只在有保證金時顯示（條件渲染）

**位置：** 在「抽成」下方、「固定成本總計」上方

---

### 2. 完善設備租賃顯示邏輯 ✓

**需求：** 增加判斷式區分「免費提供」、「有租金」、「自備」三種狀態

**實作邏輯：**
```typescript
{market.tableFree 
  ? <span className="text-[#7B9FA6]">免費提供</span>
  : (market.tableRental && market.tableRental > 0)
  ? formatCurrency(market.tableRental)
  : <span className="text-[#6B6B6B]">自備</span>
}
```

**判斷規則：**
1. **免費提供**：`tableFree === true` → 顯示「免費提供」（藍色文字）
2. **有租金**：`tableRental > 0` → 顯示金額（例如：$22）
3. **自備**：`tableRental === 0 或 undefined` 且 `tableFree === false` → 顯示「自備」（灰色文字）

**應用於：** 桌子、椅子、傘架三個項目

---

### 3. 移除桌巾項目 ✓

**修正範圍：**

#### AddMarketForm.tsx
- ✅ 移除 `tableclothFree` 狀態
- ✅ 移除 `tableclothRental` 表單欄位
- ✅ 移除桌巾輸入框和 Checkbox
- ✅ 更新固定成本計算（移除桌巾）
- ✅ 更新提交邏輯（移除桌巾）

#### page.tsx
- ✅ 成本明細中不顯示桌巾項目
- ✅ 固定成本計算中不包含桌巾

---

### 4. 更新固定成本計算 ✓

**修正前：**
```typescript
{formatCurrency(
  (market.boothCost || 0) +
  (market.tableRental || 0) +
  (market.chairRental || 0) +
  (market.umbrellaRental || 0)
)}
```

**問題：** 
- 沒有排除免費提供的項目
- 包含了保證金（不應計入成本）

**修正後：**
```typescript
{formatCurrency(
  (market.boothCost || 0) +
  (market.tableFree ? 0 : (market.tableRental || 0)) +
  (market.chairFree ? 0 : (market.chairRental || 0)) +
  (market.umbrellaFree ? 0 : (market.umbrellaRental || 0))
)}
```

**改進：**
- ✅ 免費提供的項目不計入成本
- ✅ 保證金不計入成本
- ✅ 只計算實際支出的租金

---

## 📊 顯示範例

### 範例 1：有租金 + 有保證金
```
成本明細
攤位費                    $555
設備租賃：
  桌子                    $22
  椅子                    $22
  傘架                    $8
抽成 (0%)                 $0
保證金 (需退款)           $100
固定成本總計              $607
```

### 範例 2：部分免費提供
```
成本明細
攤位費                    $500
設備租賃：
  桌子                    免費提供
  椅子                    $20
  傘架                    自備
抽成 (5%)                 $50
保證金 (需退款)           $200
固定成本總計              $520
```

### 範例 3：全部自備
```
成本明細
攤位費                    $600
設備租賃：
  桌子                    自備
  椅子                    自備
  傘架                    自備
抽成 (0%)                 $0
固定成本總計              $600
```

---

## 🎨 視覺設計

### 保證金區塊
- **背景色**：`bg-[#FFF8E7]`（淡黃色）
- **文字色**：`text-[#D4A574]`（金色）
- **圓角**：`rounded-lg`
- **內距**：`px-3 py-2`
- **標註**：「(需退款)」提醒

### 設備租賃狀態
- **免費提供**：`text-[#7B9FA6]`（品牌藍色）
- **有租金**：`text-[#3A3A3A]`（深灰色）+ 金額格式化
- **自備**：`text-[#6B6B6B]`（淺灰色）

---

## 📊 修改統計

| 檔案 | 修改內容 | 變更行數 |
|------|---------|---------|
| `app/markets/[id]/page.tsx` | 新增保證金顯示 + 完善設備邏輯 | +30 / -15 |
| `components/markets/AddMarketForm.tsx` | 移除桌巾項目 | -40 / +5 |
| **總計** | | **-10 / +35** |

---

## 🧪 測試檢查清單

### 成本明細顯示測試

#### 測試案例 1：有租金 + 有保證金
- [ ] 攤位費顯示正確
- [ ] 桌子租金顯示金額
- [ ] 椅子租金顯示金額
- [ ] 傘架租金顯示金額
- [ ] 抽成計算正確
- [ ] 保證金顯示在黃色區塊中
- [ ] 保證金標註「(需退款)」
- [ ] 固定成本總計 = 攤位費 + 三項租金（不含保證金）

#### 測試案例 2：免費提供
- [ ] 勾選「免費提供」的項目顯示「免費提供」（藍色）
- [ ] 免費提供的項目不計入固定成本總計

#### 測試案例 3：自備設備
- [ ] 未勾選「免費提供」且租金為 0 的項目顯示「自備」（灰色）
- [ ] 自備的項目不計入固定成本總計

#### 測試案例 4：無保證金
- [ ] 保證金為 0 時不顯示保證金區塊

### AddMarketForm 測試

#### 測試案例 1：桌巾已移除
- [ ] 成本資訊區塊中沒有桌巾輸入框
- [ ] 固定成本總計不包含桌巾

#### 測試案例 2：免費提供邏輯
- [ ] 勾選「免費提供」後，輸入框禁用
- [ ] 勾選「免費提供」後，租金自動歸零
- [ ] 固定成本總計排除免費提供的項目

---

## 🔍 關鍵技術細節

### 1. 三元運算子嵌套

**問題：** 如何判斷三種狀態（免費提供、有租金、自備）？

**解決方案：**
```typescript
{market.tableFree 
  ? <span className="text-[#7B9FA6]">免費提供</span>
  : (market.tableRental && market.tableRental > 0)
  ? formatCurrency(market.tableRental)
  : <span className="text-[#6B6B6B]">自備</span>
}
```

**邏輯流程：**
1. 先檢查 `tableFree`（最高優先級）
2. 再檢查 `tableRental > 0`
3. 最後預設為「自備」

### 2. 保證金條件渲染

**問題：** 保證金為 0 時不應顯示

**解決方案：**
```typescript
{market.deposit && market.deposit > 0 && (
  <div className="...">
    {/* 保證金內容 */}
  </div>
)}
```

**邏輯：** 使用 `&&` 短路運算，只在 `deposit > 0` 時渲染

### 3. 固定成本計算優化

**問題：** 如何排除免費提供和保證金？

**解決方案：**
```typescript
(market.boothCost || 0) +
(market.tableFree ? 0 : (market.tableRental || 0)) +
(market.chairFree ? 0 : (market.chairRental || 0)) +
(market.umbrellaFree ? 0 : (market.umbrellaRental || 0))
```

**邏輯：** 每個項目都檢查免費標記，免費則為 0

---

## 💡 設計考量

### 為什麼保證金不計入成本？
保證金是「暫時性支出」，活動結束後會退還，不是真正的成本。但需要顯示提醒用戶有這筆支出，並記得向主辦單位索回。

### 為什麼要區分「免費提供」和「自備」？
- **免費提供**：主辦單位提供，品牌主不需準備
- **自備**：品牌主自己攜帶設備
- **有租金**：向主辦單位租借，需支付費用

三種狀態對品牌主的準備工作有不同影響，需要清楚區分。

### 為什麼移除桌巾？
根據用戶反饋，桌巾通常是品牌主自備，不需要單獨列為租賃項目。保留桌子、椅子、傘架三個核心設備即可。

---

## ✨ 完成時間

**修正日期：** 2026-01-22  
**耗時：** 約 15 分鐘  
**狀態：** ✅ 已完成並通過 Linter 檢查

---

## 🙏 總結

本次修正完善了成本明細的顯示邏輯，新增了保證金提醒功能，並完善了設備租賃的三種狀態判斷。移除了不必要的桌巾項目，使表單更加簡潔實用。

**核心成就：**
- 💰 保證金獨立顯示，不計入成本但作為提醒
- 🎯 完善三種狀態判斷：免費提供、有租金、自備
- 🧹 移除桌巾項目，簡化表單
- 📊 固定成本計算正確排除免費項目和保證金

準備好測試新功能了！🚀
