# 小燈泡提示功能實作完成

## ✅ 完成內容

### 1. InfoTooltip 組件

**檔案**：`components/analytics/InfoTooltip.tsx`

**功能**：
- 💡 小燈泡圖示按鈕
- 使用 Headless UI Popover
- 點擊顯示提示面板
- 包含：標題、說明、公式、範例、解讀

**設計**：
```
┌─────────────────────────────────┐
│ 💡 健康評分                      │
├─────────────────────────────────┤
│ 綜合評估市集的整體表現...        │
│                                 │
│ 📐 計算公式                      │
│ healthScore = 70 + weighted × 15│
│                                 │
│ 📝 範例                          │
│ 如果各項指標都是平均...          │
│                                 │
│ 🎯 如何解讀                      │
│ S 級（≥85）：金牌市集...         │
└─────────────────────────────────┘
```

### 2. 預設提示內容

已為 10 個分析項目準備完整說明：

1. **健康評分** - 綜合評分計算方式
2. **時薪** - 每小時淨利計算
3. **成交率** - 轉換率計算（含 Laplace 平滑）
4. **客單價** - AOV 計算
5. **攤位費回收率** - ROI 計算
6. **有效互動人數** - uniqueEngaged 計算邏輯
7. **數據可靠度** - Confidence Score
8. **診斷分析** - 5 種診斷類型邏輯
9. **商品親和力** - Lift 指標計算
10. **Winsorization** - 極端值修正

### 3. 已整合到的組件

✅ **DiagnosticCards.tsx**
- 市集健康總覽
- 時薪分析卡片
- 成交效率卡片
- 客單價分析卡片
- 攤位費回收卡片
- 診斷處方箋
- 數據可靠度

✅ **ProductRecommendationsCard.tsx**
- 商品推薦卡片

---

## 🎨 視覺效果

### 小燈泡按鈕

**未點擊**：
- 灰色背景 `bg-gray-200`
- 灰色圖示 `text-gray-600`
- Hover 變藍色 `hover:bg-blue-100`

**已點擊**：
- 藍色背景 `bg-blue-500`
- 白色圖示 `text-white`
- 放大效果 `scale-110`

### 提示面板

**結構**：
```
┌─────────────────────────────────┐
│ 💡 標題                          │  白色背景
├─────────────────────────────────┤
│ 說明文字                         │
│                                 │
│ 📐 計算公式（藍色區塊）          │
│                                 │
│ 📝 範例（綠色區塊）              │
│                                 │
│ 🎯 如何解讀（黃色區塊）          │
├─────────────────────────────────┤
│ 點擊外部關閉                     │  灰色背景
└─────────────────────────────────┘
```

**動畫**：
- 淡入淡出效果
- 從上往下滑入
- 200ms 過渡時間

---

## 📦 安裝依賴

需要安裝 Headless UI：

```bash
npm install @headlessui/react
```

或

```bash
yarn add @headlessui/react
```

---

## 🚀 使用方式

### 基本使用

```typescript
import InfoTooltip, { tooltipContent } from './InfoTooltip';

// 使用預設內容
<InfoTooltip {...tooltipContent.healthScore} />

// 自訂內容
<InfoTooltip
  title="自訂標題"
  description="自訂說明"
  formula="自訂公式"
  example="自訂範例"
  interpretation="自訂解讀"
/>
```

### 整合到卡片

```typescript
<div className="flex items-center gap-2">
  <h3 className="text-xl font-bold">健康評分</h3>
  <InfoTooltip {...tooltipContent.healthScore} />
</div>
```

---

## 📝 提示內容範例

### 健康評分

```typescript
{
  title: '健康評分',
  description: '綜合評估市集的整體表現，分數越高表示市集越值得參加。',
  formula: `healthScore = 70 + weightedScore × 15

weightedScore = 
  hourlyProfitZ × 0.4 +
  boothROIZ × 0.2 +
  conversionRateZ × 0.2 +
  aovZ × 0.2`,
  example: '如果各項指標都是平均水準，評分會是 70 分。',
  interpretation: 'S 級（≥85）：金牌市集，強烈推薦'
}
```

### 成交率

```typescript
{
  title: '成交率',
  description: '有多少比例的客人最後會買單。',
  formula: `成交率 = 成交人數 / 互動人數

使用 Laplace 平滑：
成交率 = (成交數 + 1) / (互動數 + 2)`,
  example: '如果 30 人互動，9 人買單，成交率是 30%。',
  interpretation: '成交率 > 30%：很好\n20-30%：正常\n< 20%：需改善'
}
```

---

## 🎯 已整合位置

### DiagnosticCards.tsx

1. **市集健康總覽** - 標題旁
2. **時薪分析** - 卡片標題旁
3. **成交效率** - 卡片標題旁
4. **客單價分析** - 卡片標題旁
5. **攤位費回收** - 標題旁
6. **診斷處方箋** - 標題旁
7. **數據可靠度** - 標題旁

### ProductRecommendationsCard.tsx

8. **商品推薦** - 標題旁

---

## 💡 提示內容清單

| 項目 | 說明 | 公式 | 範例 | 解讀 |
|------|------|------|------|------|
| healthScore | ✅ | ✅ | ✅ | ✅ |
| hourlyProfit | ✅ | ✅ | ✅ | ✅ |
| conversionRate | ✅ | ✅ | ✅ | ✅ |
| aov | ✅ | ✅ | ✅ | ✅ |
| boothROI | ✅ | ✅ | ✅ | ✅ |
| uniqueEngaged | ✅ | ✅ | ✅ | ✅ |
| confidenceScore | ✅ | ✅ | ✅ | ✅ |
| diagnosis | ✅ | ✅ | ✅ | ✅ |
| productAffinity | ✅ | ✅ | ✅ | ✅ |
| winsorization | ✅ | ✅ | ✅ | ✅ |

---

## 🎨 自訂樣式

### 修改按鈕顏色

```typescript
// 在 InfoTooltip.tsx 中修改
className={`
  ${open 
    ? 'bg-purple-500 text-white'  // 改成紫色
    : 'bg-gray-200 text-gray-600'
  }
`}
```

### 修改面板寬度

```typescript
// 在 Popover.Panel 中修改
className="absolute z-50 w-96 px-4 mt-3..."  // 改成 w-96
```

### 修改區塊顏色

```typescript
// 公式區塊
className="p-3 bg-purple-50 rounded-lg border border-purple-200"

// 範例區塊
className="p-3 bg-blue-50 rounded-lg border border-blue-200"

// 解讀區塊
className="p-3 bg-orange-50 rounded-lg border border-orange-200"
```

---

## 🔧 新增自訂提示

### 步驟 1：在 tooltipContent 中新增

```typescript
export const tooltipContent = {
  // ... 現有內容
  
  myCustomMetric: {
    title: '我的自訂指標',
    description: '這是自訂指標的說明',
    formula: '計算公式',
    example: '範例說明',
    interpretation: '如何解讀',
  },
};
```

### 步驟 2：在組件中使用

```typescript
<InfoTooltip {...tooltipContent.myCustomMetric} />
```

---

## ✅ 完成檢查清單

- ✅ 創建 InfoTooltip 組件
- ✅ 準備 10 個提示內容
- ✅ 整合到 DiagnosticCards（7 個位置）
- ✅ 整合到 ProductRecommendationsCard（1 個位置）
- ✅ 使用 Headless UI Popover
- ✅ 添加動畫效果
- ✅ 響應式設計
- ✅ 顏色區分（藍/綠/黃）

---

## 🎉 效果預覽

### 點擊前
```
🌟 金牌市集 💡
```

### 點擊後
```
🌟 金牌市集 💡 (藍色)
         ↓
┌─────────────────────────────────┐
│ 💡 健康評分                      │
│                                 │
│ 綜合評估市集的整體表現...        │
│                                 │
│ 📐 計算公式                      │
│ healthScore = 70 + weighted × 15│
│                                 │
│ 📝 範例                          │
│ 如果各項指標都是平均水準...      │
│                                 │
│ 🎯 如何解讀                      │
│ S 級（≥85）：金牌市集...         │
│                                 │
│ 點擊外部關閉                     │
└─────────────────────────────────┘
```

---

## 📚 參考資料

- [Headless UI Popover](https://headlessui.com/react/popover)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🚀 下一步

可選優化：
1. 添加鍵盤快捷鍵（ESC 關閉）
2. 添加「複製公式」按鈕
3. 添加「查看更多」連結
4. 添加動態計算範例（帶入實際數據）
5. 添加視覺化圖表說明

老闆現在可以點擊小燈泡，了解每個指標的計算方式！💡
