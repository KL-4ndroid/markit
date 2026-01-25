# 問題修復總結

本次更新解決了以下四個問題：

## ✅ 問題 1：首頁市集日期範圍顯示 Bug

### 問題描述
如果市集日期是 1/24 - 1/25 兩日，今天是 1/25 日，市集首頁就不會顯示這個進行中的市集，只有在市集列表才找得到。

### 解決方案
修改了首頁和 `useUpcomingMarkets` Hook 的日期篩選邏輯：

**修改檔案：**
- `app/page.tsx`
- `lib/db/hooks.ts`

**修改內容：**
```typescript
// 修改前：只檢查 startDate === today
const todayMarkets = allMarkets?.filter(market => 
  market.startDate === today && ...
)

// 修改後：檢查日期區間是否包含今天
const todayMarkets = allMarkets?.filter(market => 
  market.startDate <= today && 
  market.endDate >= today && ...
)
```

**效果：**
- 現在只要市集的日期區間包含今天，就會顯示在「今日市集」區塊
- `useUpcomingMarkets` 也改為檢查 `endDate >= today`，確保多天市集在整個期間都會顯示

---

## ✅ 問題 2：多天市集的每日收入記錄

### 問題描述
如果市集是多天數的，收入如何區分？例如 1/24 收入為多少、1/25 收入為多少，以天分開計算。

### 解決方案
實作了完整的每日收入記錄機制：

**1. 資料結構更新**
- 修改 `DealClosedPayload` 類型，添加 `dealDate` 欄位
- 修改檔案：`types/db.ts`

**2. 事件處理器更新**
- 更新 `deal_closed` 事件處理器，支持按交易日期記錄到 `dailyStats` 表
- 修改檔案：`lib/db/events.ts`

**3. 新增組件**
- 創建 `DailyRevenueStats` 組件，顯示多天市集的每日收入明細
- 檔案：`components/markets/DailyRevenueStats.tsx`

**4. 整合到市集詳情頁**
- 在市集詳情頁添加每日收入統計區塊
- 修改檔案：`app/markets/[id]/page.tsx`

**功能特點：**
- 自動生成市集日期範圍內的所有日期
- 顯示每日的收入、利潤、成交數
- 區分過去、今天、未來的日期（未來日期顯示為灰色）
- 顯示總計統計
- 單日市集不顯示此區塊

**UI 呈現：**
- 市集卡片中顯示「總收入」標籤（多天市集）
- 市集詳情頁的「即時統計」改為「總計統計」（多天市集）
- 新增「每日收入明細」區塊，列出每一天的收入

---

## ✅ 問題 3：補登收入功能

### 問題描述
如果 1/25 發現在 1/24 有少登錄的收入，應該如何補登收入？

### 解決方案
實作了完整的補登收入功能：

**1. 更新 recordDeal 函數**
- 添加 `dealDate` 參數，允許指定交易日期
- 修改檔案：`lib/db/hooks.ts`

```typescript
export async function recordDeal(
  data: DealClosedPayload, 
  dealDate?: string  // ✅ 新增參數
): Promise<void>
```

**2. 創建補登對話框組件**
- 創建 `AddRevenueDialog` 組件
- 檔案：`components/markets/AddRevenueDialog.tsx`

**功能特點：**
- 選擇商品並設定數量和價格
- 支持修改單價（處理折扣情況）
- 選擇支付方式（現金、刷卡、行動支付、其他）
- 添加備註
- 自動記錄到指定日期的統計

**使用方式：**
1. 在「每日收入明細」區塊，點擊任意日期的「補登」按鈕
2. 在對話框中選擇商品、設定數量和價格
3. 選擇支付方式
4. 確認補登

**注意事項：**
- 只能為過去或今天的日期補登（未來日期不顯示補登按鈕）
- 補登的收入會計入指定日期的統計
- 補登的交易會記錄在事件歷史中，包含 `dealDate` 欄位

---

## ✅ 問題 4：移除分析頁面的返回按鈕

### 問題描述
[分析] 頁的左上角返回功能可以移除掉。

### 解決方案
移除了分析頁面 Header 中的返回按鈕。

**修改檔案：**
- `app/analytics/page.tsx`

**修改內容：**
```typescript
// 移除前
<button onClick={() => router.push('/')}>
  <ArrowLeft className="w-6 h-6" />
</button>

// 移除後
// 直接移除整個按鈕元素
```

---

## 技術細節

### 資料庫變更
1. `DealClosedPayload` 新增 `dealDate?: string` 欄位
2. `dailyStats` 表按日期記錄收入（已有結構，無需變更）

### 事件溯源
- 所有補登的收入都會記錄為 `deal_closed` 事件
- 事件的 `payload` 包含 `dealDate` 欄位，標記交易日期
- 事件的 `timestamp` 仍然是實際記錄時間（用於審計）

### 向後兼容
- 如果 `dealDate` 未提供，自動使用當前日期
- 舊的成交記錄仍然有效，會使用事件時間戳的日期

---

## 測試建議

### 測試場景 1：多天市集顯示
1. 創建一個 1/24 - 1/26 的市集
2. 在 1/25 查看首頁，應該顯示在「今日市集」
3. 在 1/26 查看首頁，應該仍然顯示在「今日市集」

### 測試場景 2：每日收入記錄
1. 創建一個多天市集（例如 1/24 - 1/26）
2. 在 1/24 記錄一些成交
3. 在 1/25 記錄一些成交
4. 查看市集詳情頁，應該看到「每日收入明細」區塊
5. 每一天的收入應該分開顯示
6. 總計應該等於所有天數的總和

### 測試場景 3：補登收入
1. 在市集詳情頁，點擊某一天的「補登」按鈕
2. 選擇商品並設定數量
3. 確認補登
4. 檢查該日期的收入是否增加
5. 檢查總收入是否增加

### 測試場景 4：分析頁面
1. 進入分析頁面
2. 確認左上角沒有返回按鈕
3. 使用底部導航列返回首頁

---

## 檔案清單

### 新增檔案
- `components/markets/DailyRevenueStats.tsx` - 每日收入統計組件
- `components/markets/AddRevenueDialog.tsx` - 補登收入對話框
- `FIXES-SUMMARY.md` - 本文檔

### 修改檔案
- `types/db.ts` - 添加 `dealDate` 欄位
- `lib/db/events.ts` - 更新成交事件處理器
- `lib/db/hooks.ts` - 更新 `recordDeal` 和 `useUpcomingMarkets`
- `app/page.tsx` - 修復日期範圍篩選邏輯
- `app/analytics/page.tsx` - 移除返回按鈕
- `app/markets/[id]/page.tsx` - 整合每日收入統計和補登功能
- `components/markets/MarketCard.tsx` - 添加「總計」標籤

---

## 總結

所有四個問題都已完成修復：

✅ **問題 1**：首頁市集日期範圍顯示 - 已修復，現在會顯示日期區間內的所有市集  
✅ **問題 2**：多天市集的每日收入記錄 - 已實作，支持按日期分開統計  
✅ **問題 3**：補登收入功能 - 已實作，可以為任意日期補登收入  
✅ **問題 4**：移除分析頁面返回按鈕 - 已完成

所有修改都遵循現有的架構設計，使用事件溯源模式，確保資料一致性和可追溯性。
