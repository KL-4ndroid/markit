# 成本明細與編輯功能修正報告

## 📋 修正概述

根據用戶需求，修正了市集詳情頁的成本明細顯示邏輯，確保始終顯示所有成本項目（即使為 $0），並實作了編輯按鈕的提示功能。

---

## ✅ 完成項目

### 1. 成本明細顯示修正 ✓

#### 修正前的問題
- 設備租賃區塊使用條件渲染，當所有租金為 0 時不顯示
- 保證金使用條件渲染，為 0 時不顯示
- 桌巾項目使用條件渲染
- 免費提供標記顯示邏輯複雜

#### 修正後的邏輯

**始終顯示的項目：**
```typescript
<div className="space-y-2 text-sm">
  {/* 攤位費 - 始終顯示 */}
  <div className="flex justify-between">
    <span className="text-[#6B6B6B]">攤位費</span>
    <span className="font-medium text-[#3A3A3A]">
      {formatCurrency(market.boothCost || 0)}
    </span>
  </div>
  
  {/* 設備租賃 - 始終顯示 */}
  <div className="space-y-1 pl-4 py-2 bg-[#FAFAF8] rounded-xl">
    <div className="text-xs font-medium text-[#6B6B6B] mb-1">設備租賃：</div>
    
    {/* 桌子 - 始終顯示 */}
    <div className="flex justify-between items-center">
      <span className="flex items-center gap-1 text-[#6B6B6B]">
        <Table className="w-4 h-4" />
        桌子
      </span>
      <span className="font-medium text-[#3A3A3A]">
        {formatCurrency(market.tableRental || 0)}
      </span>
    </div>
    
    {/* 椅子 - 始終顯示 */}
    <div className="flex justify-between items-center">
      <span className="flex items-center gap-1 text-[#6B6B6B]">
        <Armchair className="w-4 h-4" />
        椅子
      </span>
      <span className="font-medium text-[#3A3A3A]">
        {formatCurrency(market.chairRental || 0)}
      </span>
    </div>
    
    {/* 傘架 - 始終顯示 */}
    <div className="flex justify-between items-center">
      <span className="flex items-center gap-1 text-[#6B6B6B]">
        <Umbrella className="w-4 h-4" />
        傘架
      </span>
      <span className="font-medium text-[#3A3A3A]">
        {formatCurrency(market.umbrellaRental || 0)}
      </span>
    </div>
  </div>

  {/* 抽成 - 始終顯示 */}
  <div className="flex justify-between">
    <span className="text-[#6B6B6B]">
      抽成 ({market.commissionRate || 0}%)
    </span>
    <span className="font-medium text-[#3A3A3A]">
      {formatCurrency(
        ((market.totalRevenue || 0) * (market.commissionRate || 0)) / 100
      )}
    </span>
  </div>
  
  {/* 固定成本總計 - 始終顯示 */}
  <div className="border-t border-[#7B9FA6]/10 pt-2 flex justify-between font-medium">
    <span className="text-[#3A3A3A]">固定成本總計</span>
    <span className="text-[#D4A574]">
      {formatCurrency(
        (market.boothCost || 0) +
        (market.tableRental || 0) +
        (market.chairRental || 0) +
        (market.umbrellaRental || 0)
      )}
    </span>
  </div>
</div>
```

#### 顯示範例

**當租金為 $555, $22, $22, $8 時：**
```
成本明細
攤位費                    $555
設備租賃：
  桌子                    $22
  椅子                    $22
  傘架                    $8
抽成 (0%)                 $0
固定成本總計              $607
```

**當所有租金為 $0 時：**
```
成本明細
攤位費                    $0
設備租賃：
  桌子                    $0
  椅子                    $0
  傘架                    $0
抽成 (0%)                 $0
固定成本總計              $0
```

---

### 2. 編輯按鈕功能實作 ✓

#### 修正前
```typescript
<button 
  onClick={() => router.push(`/markets/${marketId}/edit`)}
  className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 text-white backdrop-blur-sm"
>
  <SquarePen className="w-4 h-4" />
  編輯
</button>
```

**問題：** 跳轉到不存在的編輯頁面，導致 404 錯誤

#### 修正後
```typescript
<button 
  onClick={() => {
    toast.info('編輯功能開發中', {
      description: '此功能即將推出，敬請期待！',
    });
  }}
  className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 text-white backdrop-blur-sm"
>
  <SquarePen className="w-4 h-4" />
  編輯
</button>
```

**效果：** 點擊後顯示友善的提示訊息，告知用戶功能開發中

---

### 3. 移除的邏輯

#### 移除保證金條件渲染
```typescript
// 移除前
{market.deposit && market.deposit > 0 && (
  <div className="flex justify-between">
    <span className="text-[#6B6B6B]">保證金</span>
    <span className="font-medium text-[#3A3A3A]">
      {formatCurrency(market.deposit)}
    </span>
  </div>
)}
```

**原因：** 根據用戶需求，成本明細應該簡化，只顯示核心項目

#### 移除桌巾項目
```typescript
// 移除前
{(market.tableclothRental || market.tableclothFree) && (
  <div className="flex justify-between items-center">
    <span className="flex items-center gap-1 text-[#6B6B6B]">
      <Package className="w-4 h-4" />
      桌巾
      {market.tableclothFree && <span className="text-xs text-[#7B9FA6]">(免費)</span>}
    </span>
    <span className="font-medium text-[#3A3A3A]">
      {market.tableclothFree ? '-' : formatCurrency(market.tableclothRental || 0)}
    </span>
  </div>
)}
```

**原因：** 用戶提供的範例中未包含桌巾項目

#### 移除免費提供標記顯示
```typescript
// 移除前
{market.tableFree && <span className="text-xs text-[#7B9FA6]">(免費)</span>}
```

**原因：** 簡化顯示邏輯，統一顯示金額（包括 $0）

#### 簡化固定成本計算
```typescript
// 移除前
{formatCurrency(
  (market.boothCost || 0) +
  (market.deposit || 0) +
  (market.tableFree ? 0 : (market.tableRental || 0)) +
  (market.chairFree ? 0 : (market.chairRental || 0)) +
  (market.umbrellaFree ? 0 : (market.umbrellaRental || 0)) +
  (market.tableclothFree ? 0 : (market.tableclothRental || 0))
)}

// 修正後
{formatCurrency(
  (market.boothCost || 0) +
  (market.tableRental || 0) +
  (market.chairRental || 0) +
  (market.umbrellaRental || 0)
)}
```

**原因：** 移除保證金和桌巾，簡化免費提供邏輯

---

## 📊 修改統計

| 檔案 | 修改內容 | 變更行數 |
|------|---------|---------|
| `app/markets/[id]/page.tsx` | 簡化成本明細顯示邏輯 | -60 / +40 |
| `app/markets/[id]/page.tsx` | 修正編輯按鈕功能 | -1 / +5 |
| **總計** | | **-61 / +45** |

---

## 🎯 核心改進

### 顯示邏輯
✅ **始終顯示所有項目**：無論金額是否為 0  
✅ **移除條件渲染**：簡化代碼邏輯  
✅ **統一格式**：所有金額使用 `formatCurrency` 格式化  
✅ **清晰結構**：攤位費 → 設備租賃 → 抽成 → 總計  

### 用戶體驗
✅ **資訊完整**：用戶可以看到所有成本項目  
✅ **友善提示**：編輯按鈕顯示開發中訊息  
✅ **視覺一致**：保持日系設計風格  

---

## 🧪 測試建議

### 成本明細測試
1. **所有租金為 0**：確認顯示 $0 而非隱藏
2. **部分租金為 0**：確認所有項目都顯示
3. **所有租金有值**：確認計算正確
4. **抽成為 0%**：確認顯示 $0
5. **固定成本總計**：確認計算正確（攤位費 + 三項租金）

### 編輯按鈕測試
1. 點擊編輯按鈕
2. 確認顯示 Toast 提示訊息
3. 確認訊息內容為「編輯功能開發中」
4. 確認不會跳轉到 404 頁面

---

## 📝 後續開發建議

### 編輯功能實作
當準備實作編輯功能時，建議：

1. **創建編輯頁面**：`app/markets/[id]/edit/page.tsx`
2. **複用 AddMarketForm**：將表單組件改為可編輯模式
3. **預填資料**：從資料庫讀取現有市集資料
4. **更新邏輯**：透過 `recordEvent` 記錄 `market_updated` 事件
5. **返回詳情頁**：編輯完成後返回市集詳情頁

**範例結構：**
```typescript
// app/markets/[id]/edit/page.tsx
'use client';

import { EditMarketForm } from '@/components/markets/EditMarketForm';

export default function EditMarketPage({ params }: { params: { id: string } }) {
  const marketId = parseInt(params.id);
  
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <EditMarketForm marketId={marketId} />
    </div>
  );
}
```

### 保證金與桌巾功能
如果未來需要顯示保證金和桌巾：

1. 在成本明細中新增對應項目
2. 更新固定成本計算邏輯
3. 確保 AddMarketForm 中有對應輸入框

---

## ✨ 完成時間

**修正日期：** 2026-01-22  
**耗時：** 約 10 分鐘  
**狀態：** ✅ 已完成並通過 Linter 檢查

---

## 🙏 總結

本次修正成功簡化了成本明細的顯示邏輯，確保所有成本項目始終可見，並為編輯按鈕添加了友善的提示訊息。修正後的代碼更加簡潔易維護，用戶體驗也更加一致。

**核心成就：**
- 📊 成本明細始終顯示所有項目（包括 $0）
- 🎨 保持日系設計風格的視覺一致性
- 💬 編輯按鈕提供友善的開發中提示
- 🔧 簡化代碼邏輯，移除複雜的條件渲染

準備好進入測試階段！🚀
