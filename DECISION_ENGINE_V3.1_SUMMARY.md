# 決策引擎 v3.1 優化總結

## 🎯 優化目標

基於專業審核，修復 v3.0 的關鍵問題，並新增個人化 ROI 層。

---

## ✅ 已完成優化

### 🔥 Critical 修復（立即修復）

#### 1. Momentum 除零保護
**問題**：`growth = (recent - previous) / previous` 當 previous ≈ 0 時會爆炸

**修復**：
```typescript
const epsilon = globalAvg * 0.1;
const growth = (recentAvg - previousAvg) / (previousAvg + epsilon);
const momentumScore = clamp(50 + growth * 100, 0, 100);
```

#### 2. 自適應貝氏收縮
**問題**：固定 m=5，場次少時 shrink 過強，場次多時 shrink 過弱

**修復**：
```typescript
const m = Math.max(median(市場場次), 3);  // 使用中位數，最小為 3
adjustedScore = (score * n + prior * m) / (n + m);
```

---

### 🔥 High Priority 優化（短期優化）

#### 3. P5/P95 標準化
**問題**：min/max 被極端值影響，新市集會壓縮整體分布

**優化**：
```typescript
const p5 = percentile(values, 0.05);
const p95 = percentile(values, 0.95);
score = (value - p5) / (p95 - p5 + k) * 100;
```

**優勢**：抗極端值能力強，更穩定的評分系統

#### 4. Regime-Based Weighting
**問題**：固定權重，80→85 分和 40→45 分被視為相同重要性

**優化**：
```typescript
if (healthScore < 50) {
  // 差市集：趨勢更重要
  healthWeight = 0.5, momentumWeight = 0.5;
} else if (healthScore > 80) {
  // 優秀市集：健康度更重要
  healthWeight = 0.75, momentumWeight = 0.25;
} else {
  // 中等市集：平衡權重
  healthWeight = 0.6, momentumWeight = 0.4;
}
```

---

### 🔥 Game Changer（中期升級）

#### 5. 個人化 ROI 層

**核心問題轉變**：
- ❌ v3.0：「這個市場好不好？」
- ✅ v3.1：「這個市場值得我去嗎？」

**新增維度**：
```typescript
interface PersonalContext {
  transportCost: number;      // 交通成本
  laborCost: number;          // 人力成本
  opportunityCost: number;    // 機會成本
  inventoryCost: number;      // 備貨成本
  maxBoothFee: number;        // 最高攤位費
  minHourlyProfit: number;    // 最低時薪要求
}
```

**計算邏輯**：
```typescript
totalCost = boothFee + transportCost + laborCost + inventoryCost + opportunityCost;
netProfit = revenue - totalCost;
personalROI = (netProfit / totalCost) * 100;
hourlyProfit = netProfit / hours;

// 判斷是否值得
isWorthwhile = 
  hourlyProfit >= minHourlyProfit &&
  boothFee <= maxBoothFee &&
  personalROI >= 50;
```

#### 6. 綜合決策系統

**決策矩陣**：

| 市場健康度 | 個人 ROI | 最終決策 | 說明 |
|-----------|---------|---------|------|
| STRONG_REATTEND | ✅ 符合 | **GO** ✅ | 市場優異且符合條件 |
| STRONG_REATTEND | ❌ 不符 | **SKIP** ❌ | 市場好但成本太高 |
| OPTIMIZE | ✅ 符合 | **CONSIDER** 🤔 | 市場可優化，可考慮 |
| OPTIMIZE | ❌ 不符 | **SKIP** ❌ | 市場普通且成本高 |
| AVOID | ✅ 符合 | **SKIP** ❌ | 市場不佳，不建議 |
| AVOID | ❌ 不符 | **SKIP** ❌ | 市場差且成本高 |

**信心度評分**：
```typescript
if (finalDecision === 'GO') {
  confidence = (marketHealth.reAttendScore + personalROI.personalROI) / 2;
} else if (finalDecision === 'SKIP') {
  confidence = 100 - (marketHealth.reAttendScore + personalROI.personalROI) / 2;
} else {
  confidence = (marketHealth.reAttendScore + personalROI.personalROI) / 2;
}
```

---

## 📊 技術改進對比

| 特性 | v3.0 | v3.1 | 改進 |
|------|------|------|------|
| **標準化方法** | min/max | P5/P95 | ✅ 抗極端值 |
| **貝氏收縮** | 固定 m=5 | 自適應 m | ✅ 智能調整 |
| **除零保護** | ❌ | ✅ epsilon | ✅ 防止爆炸 |
| **權重策略** | 固定 | 分段 | ✅ 更合理 |
| **成本考量** | ❌ | ✅ 5 維度 | ✅ 個人化 |
| **決策層級** | 1 層 | 2 層 | ✅ 市場+個人 |
| **信心度** | ❌ | ✅ 0-100 | ✅ 量化信心 |

---

## 🚀 使用範例

### 基礎使用

```typescript
import { 
  comprehensiveDecision,
  createDefaultPersonalContext 
} from '@/lib/analytics/decisionEngine';

// 建立個人化上下文
const context = {
  transportCost: 300,
  laborCost: 800,
  inventoryCost: 600,
  maxBoothFee: 1500,
  minHourlyProfit: 400,
  opportunityCost: 0,
};

// 綜合決策分析
const result = comprehensiveDecision(market, allMarkets, context);

console.log(`決策：${result.finalDecision}`);        // "GO" / "CONSIDER" / "SKIP"
console.log(`原因：${result.finalReason}`);
console.log(`信心度：${result.confidence}%`);
console.log(`市場健康度：${result.marketHealth.healthScore}`);
console.log(`個人 ROI：${result.personalROI.personalROI}%`);
console.log(`實際時薪：$${result.personalROI.hourlyProfit}`);
```

### 批量分析

```typescript
// 分析所有市集
const results = allMarkets.map(market => ({
  market,
  decision: comprehensiveDecision(market, allMarkets, context)
}));

// 篩選推薦市集
const recommended = results
  .filter(r => r.decision.finalDecision === 'GO')
  .sort((a, b) => b.decision.confidence - a.decision.confidence);

console.log('推薦參加的市集：');
recommended.forEach((r, i) => {
  console.log(`${i + 1}. ${r.market.name}`);
  console.log(`   信心度：${r.decision.confidence}%`);
  console.log(`   時薪：$${r.decision.personalROI.hourlyProfit}`);
  console.log(`   ROI：${r.decision.personalROI.personalROI}%`);
});
```

---

## 📈 效果預期

### 穩定性提升
- ✅ 極端值不再影響整體評分
- ✅ 除零錯誤完全消除
- ✅ 分數範圍嚴格控制在 0-100

### 準確性提升
- ✅ 自適應 shrink 更符合實際
- ✅ 分段權重更合理
- ✅ 考慮個人成本更實用

### 用戶體驗提升
- ✅ 回答真正的問題：「值得我去嗎？」
- ✅ 提供信心度評分
- ✅ 給出具體原因說明

---

## 📝 新增 API

### 個人化 ROI
- `calculatePersonalizedROI(market, context)` - 計算個人化 ROI
- `createDefaultPersonalContext()` - 建立預設上下文

### 綜合決策
- `comprehensiveDecision(market, allMarkets, context)` - 綜合決策分析

### 輔助函數
- `getFinalDecisionLabel(decision)` - 取得決策標籤
- `getFinalDecisionColor(decision)` - 取得決策顏色
- `getFinalDecisionIcon(decision)` - 取得決策圖示
- `getConfidenceLabel(confidence)` - 取得信心度標籤

---

## 🎯 核心價值

**v3.1 真正回答了攤主最關心的問題**：

> 「考慮我的交通成本、人力成本、備貨成本，以及我的時薪要求和預算限制，這個市集值得我去嗎？」

而不只是：

> 「這個市集好不好？」

---

**版本**：v3.1  
**完成日期**：2026-03-04  
**狀態**：✅ 所有優化已完成  
**檔案**：`lib/analytics/decisionEngine.ts`
