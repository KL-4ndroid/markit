# 📊 Market Pulse 數據分析功能完整報告

**版本**：v2.0  
**更新日期**：2026-03-04  
**狀態**：✅ 已完成市集健康評分系統與快速/進階模式

## 📋 目錄

1. [功能概述](#功能概述)
2. [核心指標與計算方式](#核心指標與計算方式)
3. [分析報表清單](#分析報表清單)
4. [視覺化組件](#視覺化組件)
5. [數據處理邏輯](#數據處理邏輯)
6. [使用場景與價值](#使用場景與價值)
7. [新增功能：市集健康評分系統](#新增功能市集健康評分系統)
8. [新增功能：快速進階模式切換](#新增功能快速進階模式切換)

---

## 🚀 v3.1 新增功能：決策引擎優化版

### 概述

v3.1 是基於專業審核的全面優化版本，修復了 v3.0 的關鍵問題，並新增個人化 ROI 層，真正回答「這個市場值得我去嗎？」

### 🔥 Critical 修復

#### 1️⃣ Momentum 除零保護

**問題**：
```typescript
// ❌ v3.0 有問題的代碼
growth = (recentAvg - previousAvg) / previousAvg;
// 當 previousAvg ≈ 0 時會爆炸
```

**修復**：
```typescript
// ✅ v3.1 修復後
const globalAvg = allMarkets.reduce((sum, m) => 
  sum + calculateHealthScore(m, allMarkets), 0
) / allMarkets.length;

const epsilon = globalAvg * 0.1;
const growth = (recentAvg - previousAvg) / (previousAvg + epsilon);
const momentumScore = clamp(50 + growth * 100, 0, 100);
```

**優勢**：
- ✅ 防止除零錯誤
- ✅ 使用全局平均作為 epsilon
- ✅ 明確 clamp 到 0-100

---

#### 2️⃣ 自適應貝氏收縮

**問題**：
```typescript
// ❌ v3.0 固定 m=5
adjustedScore = (score × n + prior × 5) / (n + 5);
// 場次少時 shrink 過強，場次多時 shrink 過弱
```

**修復**：
```typescript
// ✅ v3.1 自適應 m
function adaptiveBayesianShrinkage(
  value: number,
  prior: number,
  sampleSize: number,
  allMarkets: Market[]
): number {
  // 計算每個市場的場次
  const marketCounts = allMarkets.reduce((acc, m) => {
    const key = `${m.name}-${m.location}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const counts = Object.values(marketCounts);
  
  // 使用中位數作為 m（最小為 3）
  const m = counts.length > 0 ? Math.max(median(counts), 3) : 5;
  
  return (value * sampleSize + prior * m) / (sampleSize + m);
}
```

**優勢**：
- ✅ m 根據實際數據自適應
- ✅ 使用中位數場次
- ✅ 最小值保護（m ≥ 3）

---

### 🔥 High Priority 優化

#### 3️⃣ P5/P95 標準化

**問題**：
```typescript
// ❌ v3.0 使用 min/max
const min = Math.min(...values);
const max = Math.max(...values);
// 極端值會壓縮整體分布
```

**優化**：
```typescript
// ✅ v3.1 使用 P5/P95
function robustMinMaxNormalize(
  value: number,
  values: number[],
  smoothingFactor: number = 0.05
): number {
  const p5 = percentile(values, 0.05);   // 第 5 百分位
  const p95 = percentile(values, 0.95);  // 第 95 百分位
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  const k = avg * smoothingFactor;
  const range = p95 - p5 + k;
  
  const normalized = ((value - p5) / range) * 100;
  return clamp(normalized, 0, 100);
}
```

**優勢**：
- ✅ 抗極端值能力強
- ✅ 新市集不會壓縮整體分布
- ✅ 更穩定的評分系統

**範例**：
```
假設有 100 個市集的時薪數據：
- min = -500（虧損）
- max = 5000（超級市集）
- p5 = 100
- p95 = 1500

使用 min/max：
- 時薪 500 → (500 - (-500)) / (5000 - (-500)) = 18.2 分

使用 P5/P95：
- 時薪 500 → (500 - 100) / (1500 - 100) = 28.6 分

✅ P5/P95 更合理！
```

---

#### 4️⃣ Regime-Based Weighting

**問題**：
```typescript
// ❌ v3.0 固定權重
ReAttendScore = HealthScore × 0.6 + MomentumScore × 0.4;
// 80→85 分和 40→45 分被視為相同重要性
```

**優化**：
```typescript
// ✅ v3.1 分段權重
function calculateReAttendScore(
  healthScore: number,
  momentumScore: number
): number {
  let healthWeight: number;
  let momentumWeight: number;
  
  if (healthScore < 50) {
    // 表現差：趨勢更重要（是否在改善？）
    healthWeight = 0.5;
    momentumWeight = 0.5;
  } else if (healthScore > 80) {
    // 表現優異：健康度更重要（趨勢影響小）
    healthWeight = 0.75;
    momentumWeight = 0.25;
  } else {
    // 中等表現：平衡權重
    healthWeight = 0.6;
    momentumWeight = 0.4;
  }
  
  return clamp(
    healthScore * healthWeight + momentumScore * momentumWeight,
    0,
    100
  );
}
```

**邏輯**：

| HealthScore | 權重分配 | 理由 |
|-------------|---------|------|
| < 50（差） | Health 50% + Momentum 50% | 看趨勢，如果在改善可能值得 |
| 50-80（中） | Health 60% + Momentum 40% | 平衡考量 |
| > 80（優） | Health 75% + Momentum 25% | 主要看健康度，趨勢影響小 |

**範例**：
```typescript
// 案例 1：差市集但在改善
Health = 40, Momentum = 70
v3.0: 40×0.6 + 70×0.4 = 52 分
v3.1: 40×0.5 + 70×0.5 = 55 分 ✅ 更高，鼓勵改善

// 案例 2：優秀市集但下滑
Health = 85, Momentum = 40
v3.0: 85×0.6 + 40×0.4 = 67 分
v3.1: 85×0.75 + 40×0.25 = 73.75 分 ✅ 更高，健康度主導
```

---

### 🔥 Game Changer：個人化 ROI 層

#### 核心問題轉變

```
❌ v3.0 回答：「這個市場好不好？」
✅ v3.1 回答：「這個市場值得我去嗎？」
```

#### 個人化成本上下文

```typescript
export interface PersonalContext {
  transportCost: number;      // 交通成本
  laborCost: number;          // 人力成本（時薪 × 人數 × 時數）
  opportunityCost: number;    // 機會成本
  inventoryCost: number;      // 備貨成本
  maxBoothFee: number;        // 可接受最高攤位費
  minHourlyProfit: number;    // 最低時薪要求
}
```

#### 個人化 ROI 計算

```typescript
function calculatePersonalizedROI(
  market: Market,
  context: PersonalContext
): PersonalizedROIResult {
  // 總成本
  const totalCost = 
    market.boothFee +
    context.transportCost +
    context.laborCost +
    context.inventoryCost +
    context.opportunityCost;
  
  // 淨利
  const netProfit = market.revenue - totalCost;
  
  // 個人化 ROI
  const personalROI = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  
  // 實際時薪
  const hourlyProfit = netProfit / market.hours;
  
  // 判斷是否值得
  let isWorthwhile = true;
  let reason = '符合個人條件';
  
  if (hourlyProfit < context.minHourlyProfit) {
    isWorthwhile = false;
    reason = `時薪 $${hourlyProfit} 低於要求 $${context.minHourlyProfit}`;
  } else if (market.boothFee > context.maxBoothFee) {
    isWorthwhile = false;
    reason = `攤位費 $${market.boothFee} 超過預算 $${context.maxBoothFee}`;
  } else if (personalROI <= 0) {
    isWorthwhile = false;
    reason = `預期虧損 $${Math.abs(netProfit)}`;
  } else if (personalROI < 50) {
    isWorthwhile = false;
    reason = `ROI ${personalROI}% 過低（建議 > 50%）`;
  }
  
  return { totalCost, netProfit, personalROI, hourlyProfit, isWorthwhile, reason };
}
```

#### 綜合決策系統

```typescript
function comprehensiveDecision(
  market: Market,
  allMarkets: Market[],
  context: PersonalContext
): ComprehensiveDecisionResult {
  // 市場健康度分析
  const marketHealth = analyzeMarketDecision(market, allMarkets);
  
  // 個人化 ROI 分析
  const personalROI = calculatePersonalizedROI(market, context);
  
  // 決策矩陣
  if (marketHealth.decision === 'STRONG_REATTEND' && personalROI.isWorthwhile) {
    return {
      finalDecision: 'GO',  // ✅ 立即參加
      finalReason: `市場優異且符合個人條件`,
      confidence: 85
    };
  } else if (marketHealth.decision === 'AVOID' || !personalROI.isWorthwhile) {
    return {
      finalDecision: 'SKIP',  // ❌ 建議跳過
      finalReason: personalROI.reason,
      confidence: 75
    };
  } else {
    return {
      finalDecision: 'CONSIDER',  // 🤔 考慮參加
      finalReason: '需要進一步評估',
      confidence: 50
    };
  }
}
```

#### 決策矩陣

| 市場健康度 | 個人 ROI | 最終決策 | 信心度 | 說明 |
|-----------|---------|---------|--------|------|
| STRONG_REATTEND | ✅ 符合 | **GO** | 85+ | 市場優異且符合條件 |
| STRONG_REATTEND | ❌ 不符 | **SKIP** | 70+ | 市場好但成本太高 |
| OPTIMIZE | ✅ 符合 | **CONSIDER** | 60+ | 市場可優化，可考慮 |
| OPTIMIZE | ❌ 不符 | **SKIP** | 65+ | 市場普通且成本高 |
| AVOID | ✅ 符合 | **SKIP** | 75+ | 市場不佳，不建議 |
| AVOID | ❌ 不符 | **SKIP** | 90+ | 市場差且成本高 |

---

### 使用範例

#### 基礎使用

```typescript
import { 
  comprehensiveDecision,
  createDefaultPersonalContext 
} from '@/lib/analytics/decisionEngine';

// 建立個人化上下文
const context = createDefaultPersonalContext();
// 或自訂
const customContext = {
  transportCost: 300,        // 交通費 $300
  laborCost: 800,            // 人力成本 $800（2人×4小時×$100）
  opportunityCost: 0,
  inventoryCost: 600,        // 備貨 $600
  maxBoothFee: 1500,         // 最高攤位費 $1500
  minHourlyProfit: 400,      // 最低時薪 $400
};

// 綜合決策分析
const result = comprehensiveDecision(market, allMarkets, customContext);

console.log(result);
/*
{
  marketHealth: {
    healthScore: 72.5,
    momentumScore: 65.0,
    reAttendScore: 69.5,
    decision: "OPTIMIZE",
    trend: "UP"
  },
  personalROI: {
    totalCost: 3200,
    netProfit: 1800,
    personalROI: 56.25,
    hourlyProfit: 450,
    isWorthwhile: true,
    reason: "符合個人條件"
  },
  finalDecision: "CONSIDER",
  finalReason: "市場呈上升趨勢，可考慮參加",
  confidence: 62.9
}
*/
```

#### 批量分析

```typescript
// 分析所有市集，找出最適合的
const results = allMarkets.map(market => ({
  market,
  decision: comprehensiveDecision(market, allMarkets, context)
}));

// 篩選推薦市集
const recommended = results.filter(r => r.decision.finalDecision === 'GO');

// 按信心度排序
const sorted = results.sort((a, b) => 
  b.decision.confidence - a.decision.confidence
);

console.log('最推薦的市集：');
sorted.slice(0, 3).forEach((r, i) => {
  console.log(`${i + 1}. ${r.market.name}`);
  console.log(`   決策：${r.decision.finalDecision}`);
  console.log(`   信心度：${r.decision.confidence}%`);
  console.log(`   原因：${r.decision.finalReason}`);
});
```

---

## 🚀 v3.0 新增功能：決策引擎系統（已優化至 v3.1）

### 概述

決策引擎是 v3.0 的核心升級，提供**智能決策建議**和**趨勢分析**，幫助攤主做出更精準的參展決策。

### 核心架構

```
決策引擎 (Decision Engine)
├── HealthScore v2.0 (健康評分)
│   ├── Min-Max 標準化
│   ├── 平滑常數處理
│   └── 貝氏收縮
├── MomentumScore (動能評分)
│   ├── 時序分析
│   └── 趨勢計算
└── ReAttendScore (再訪評分)
    ├── 綜合評分
    ├── 決策判斷
    └── 趨勢判斷
```

---

### 1️⃣ HealthScore v2.0

**升級重點**：從 Z-score 升級為 Min-Max 標準化 + 貝氏收縮

#### 計算步驟

**Step 1：計算 6 個核心指標**

| 指標 | 計算公式 | 權重 |
|------|---------|------|
| 每小時淨利 | `(revenue - boothFee) / hours` | 30% |
| 攤位費回收率 | `(revenue / boothFee) × 100` | 20% |
| 轉換率 | `(deals / interactions) × 100` | 15% |
| 客單價 | `revenue / deals` | 15% |
| 互動效率 | `hourlyProfit / interactions` | 10% |
| 成交質量指數 | `conversionRate × aov` | 10% |

**Step 2：Min-Max 標準化 + 平滑常數**

```typescript
// 計算平滑常數
k = avg × 0.05

// Min-Max 標準化
score = (value - min) / (max - min + k) × 100

// 限制範圍
score = clamp(score, 0, 100)
```

**為什麼使用平滑常數？**
- 避免極端值影響（當 max ≈ min 時）
- 提供更穩定的評分
- 減少異常值的衝擊

**Step 3：加權平均**

```typescript
weightedScore = 
  normalizedHourlyProfit × 0.3 +
  normalizedBoothROI × 0.2 +
  normalizedConversionRate × 0.15 +
  normalizedAOV × 0.15 +
  normalizedInteractionEfficiency × 0.1 +
  normalizedDealQualityIndex × 0.1
```

**Step 4：貝氏收縮**

```typescript
// 參數
m = 5                    // 先驗權重
prior = historicalAvg    // 歷史平均（預設 50）
n = sampleSize           // 樣本數量

// 公式
adjustedScore = (weightedScore × n + prior × m) / (n + m)
```

**貝氏收縮的作用**：
- 融合歷史數據，避免小樣本偏差
- 新市集會向歷史平均收縮
- 隨著數據增加，逐漸反映真實表現

**範例**：
```typescript
// 場景：只有 2 場市集數據
weightedScore = 80
historicalAvg = 50
sampleSize = 2

adjustedScore = (80 × 2 + 50 × 5) / (2 + 5)
              = (160 + 250) / 7
              = 58.6

// 隨著數據增加（10 場）
adjustedScore = (80 × 10 + 50 × 5) / (10 + 5)
              = (800 + 250) / 15
              = 70.0
```

---

### 2️⃣ MomentumScore（動能評分）

**目的**：評估市集表現的趨勢變化

#### 計算邏輯

**條件判斷**：
```typescript
if (市集場次 < 6) {
  return 50;  // 數據不足，返回中性分數
}
```

**時序分析**：
```typescript
// 1. 按日期排序（最新在前）
sortedMarkets = markets.sort((a, b) => b.date - a.date);

// 2. 最近 3 場
recentMarkets = sortedMarkets.slice(0, 3);
recentAvg = average(recentMarkets.map(m => m.healthScore));

// 3. 前 3 場
previousMarkets = sortedMarkets.slice(3, 6);
previousAvg = average(previousMarkets.map(m => m.healthScore));

// 4. 計算成長率
growth = (recentAvg - previousAvg) / previousAvg;

// 5. 轉換為分數
momentumScore = clamp(50 + growth × 100, 0, 100);
```

**解讀**：

| MomentumScore | 成長率 | 趨勢 | 說明 |
|---------------|--------|------|------|
| 80+ | +30%+ | 📈 強勁上升 | 表現持續改善 |
| 60-79 | +10% ~ +30% | 📈 上升 | 穩定進步中 |
| 45-59 | -5% ~ +10% | ➡️ 穩定 | 表現平穩 |
| 30-44 | -20% ~ -5% | 📉 下降 | 需要關注 |
| 0-29 | -20%- | 📉 急劇下降 | 警示信號 |

**範例**：
```typescript
// 最近 3 場平均：65 分
// 前 3 場平均：50 分
growth = (65 - 50) / 50 = 0.3 (30%)
momentumScore = 50 + 0.3 × 100 = 80 分
趨勢：📈 強勁上升
```

---

### 3️⃣ ReAttendScore（再訪評分）

**目的**：綜合健康度和趨勢，給出最終決策分數

#### 計算公式

```typescript
ReAttendScore = HealthScore × 0.6 + MomentumScore × 0.4
```

**權重分配理由**：
- **HealthScore (60%)**：當前表現是主要考量
- **MomentumScore (40%)**：趨勢也很重要，但不應主導決策

---

### 4️⃣ 決策判斷

#### 決策規則

```typescript
if (reAttendScore >= 75) → "STRONG_REATTEND"  // 強烈推薦
if (60 <= reAttendScore < 75) → "OPTIMIZE"    // 可優化
if (reAttendScore < 60) → "AVOID"             // 謹慎評估
```

#### 決策矩陣

| HealthScore | MomentumScore | ReAttendScore | 決策 | 建議 |
|-------------|---------------|---------------|------|------|
| 80 | 70 | 76 | 🟢 STRONG_REATTEND | 表現優異且穩定，強烈推薦 |
| 70 | 50 | 62 | 🟡 OPTIMIZE | 表現良好但趨勢平穩，可優化 |
| 60 | 40 | 52 | 🔴 AVOID | 表現普通且下滑，謹慎評估 |
| 50 | 80 | 62 | 🟡 OPTIMIZE | 表現普通但上升中，值得觀察 |
| 40 | 60 | 48 | 🔴 AVOID | 表現不佳，即使有改善仍需謹慎 |

---

### 5️⃣ 趨勢判斷

#### 趨勢規則

```typescript
if (momentumScore >= 55) → "UP"      // 📈 上升趨勢
if (45 <= momentumScore < 55) → "STABLE"  // ➡️ 穩定
if (momentumScore < 45) → "DOWN"     // 📉 下降趨勢
```

---

### 6️⃣ API 使用範例

#### 單一市集分析

```typescript
import { analyzeMarketDecision } from '@/lib/analytics/decisionEngine';

const result = analyzeMarketDecision(market, allMarkets, 50);

console.log(result);
/*
{
  healthScore: 72.5,
  momentumScore: 65.0,
  reAttendScore: 69.5,
  decision: "OPTIMIZE",
  trend: "UP"
}
*/
```

#### 批量分析

```typescript
import { analyzeAllMarkets } from '@/lib/analytics/decisionEngine';

const results = analyzeAllMarkets(markets, 50);

results.forEach(({ market, result }) => {
  console.log(`${market.name}: ${result.decision} (${result.reAttendScore}分)`);
});
```

#### 取得中文標籤

```typescript
import { 
  getDecisionLabel, 
  getTrendLabel,
  getDecisionColor,
  getTrendIcon 
} from '@/lib/analytics/decisionEngine';

const decisionText = getDecisionLabel(result.decision);  // "可優化"
const trendText = getTrendLabel(result.trend);           // "上升趨勢"
const color = getDecisionColor(result.decision);         // "text-yellow-600"
const icon = getTrendIcon(result.trend);                 // "📈"
```

---

### 7️⃣ 決策引擎 vs v2.0 健康評分

| 特性 | v2.0 HealthScore | v3.0 Decision Engine |
|------|------------------|----------------------|
| **標準化方法** | Z-score | Min-Max + 平滑常數 |
| **穩定性** | 受極端值影響 | 更穩定 |
| **小樣本處理** | 無 | 貝氏收縮 |
| **趨勢分析** | ❌ | ✅ MomentumScore |
| **時序考量** | ❌ | ✅ 最近 3 vs 前 3 |
| **決策建議** | 簡單分級 | 智能決策 |
| **指標數量** | 4 個 | 6 個 |
| **權重優化** | 固定 | 更精細 |

---

### 8️⃣ 使用場景

#### 場景 1：評估是否再訪市集

```typescript
const result = analyzeMarketDecision(market, allMarkets);

if (result.decision === 'STRONG_REATTEND') {
  console.log('✅ 強烈推薦再訪！');
  console.log(`健康度：${result.healthScore} 分`);
  console.log(`趨勢：${getTrendLabel(result.trend)}`);
}
```

#### 場景 2：識別上升趨勢市集

```typescript
const results = analyzeAllMarkets(markets);
const risingMarkets = results.filter(r => r.result.trend === 'UP');

console.log(`發現 ${risingMarkets.length} 個上升趨勢市集`);
```

#### 場景 3：優先級排序

```typescript
const results = analyzeAllMarkets(markets);
const sorted = results.sort((a, b) => 
  b.result.reAttendScore - a.result.reAttendScore
);

console.log('推薦參展順序：');
sorted.forEach((r, i) => {
  console.log(`${i + 1}. ${r.market.name} (${r.result.reAttendScore}分)`);
});
```

---

## 🚀 v2.0 新增功能：市集健康評分系統

### 概述

市集健康評分系統是一個綜合評估工具，為每場市集產生 **0-100 分**的健康評分，並提供診斷分析和改善建議。

### 核心組件

#### 1. 市集健康評分 (Market Health Score)

**計算步驟**：

**Step 1：計算四個核心指標**
- 每小時淨利（Hourly Profit）
- 攤位費回收率（Booth ROI）
- 轉換率（Conversion Rate）
- 客單價（Average Order Value）

**Step 2：Z-score 標準化**
```
對每個指標進行標準化處理：
z = (value - mean) / std

其中：
- value：該市集的指標值
- mean：所有市集該指標的平均值
- std：所有市集該指標的標準差
```

**Step 3：加權計算**
```
healthScore = 
  (hourlyProfitZ × 0.4) +      // 每小時淨利權重 40%
  (boothROIZ × 0.2) +           // 回收率權重 20%
  (conversionRateZ × 0.2) +     // 轉換率權重 20%
  (aovZ × 0.2)                  // 客單價權重 20%
```

**Step 4：轉換為 0-100 分**
```
normalizedScore = clamp(50 + healthScore × 10, 0, 100)

說明：
- 平均水平的市集得分約 50 分
- 每增加 1 個標準差，分數增加 10 分
- 使用 clamp 限制在 0-100 範圍內
```

**評級系統**：

| 分數範圍 | 評級 | 說明 | 顏色 |
|----------|------|------|------|
| 80-100 | S 級 | 卓越 | 金色漸層 |
| 70-79 | A 級 | 優秀 | 藍綠色漸層 |
| 50-69 | B 級 | 良好 | 金棕色漸層 |
| 30-49 | C 級 | 普通 | 灰色漸層 |
| 0-29 | D 級 | 待改善 | 粉色漸層 |

**權重分配理由**：

| 指標 | 權重 | 理由 |
|------|------|------|
| **每小時淨利** | 40% | 最重要的綜合指標，直接反映時間投資回報 |
| **攤位費回收率** | 20% | 評估固定成本效益，影響參展決策 |
| **轉換率** | 20% | 反映銷售效率和商品吸引力 |
| **客單價** | 20% | 衡量顧客消費能力和商品定價策略 |

---

#### 2. 市集摘要標籤 (Market Summary Label)

**函數**：`getMarketSummaryLabel(score: number)`

**規則**：
```typescript
if (score >= 65) return "值得再來";
if (score >= 45) return "可優化";
return "謹慎評估";
```

**應用**：快速判斷市集是否值得再次參加

---

#### 3. 市集診斷分析 (Market Diagnosis)

**函數**：`calculateMarketDiagnosis(markets: Market[])`

**診斷類型**（按優先級）：

| 診斷類型 | 判斷條件 | 問題描述 | 改善建議 |
|---------|---------|---------|---------|
| **流量不足** | `interaction < avgInteraction - stdInteraction` | 互動數明顯低於平均 | 建議優化攤位位置或提前宣傳 |
| **精準高效** | `interaction < avg && conversionRate > avg && aov > avg` | 人流少但轉換率和客單價都高 | 建議增加曝光或擴大備貨 |
| **轉換不足** | `interaction > avg && conversionRate < avg` | 人流多但成交少 | 建議優化銷售話術或定價 |
| **客單價偏低** | `deals > avgDeals && aov < avgAOV` | 成交多但金額低 | 可嘗試組合銷售提升單筆金額 |
| **均衡穩定** | 其他情況 | 各項指標均衡 | 維持策略並持續觀察 |

---

#### 4. 市集改善建議 (Market Suggestion)

**函數**：`getMarketSuggestion(type: DiagnosisType)`

**建議對應表**：

| 診斷類型 | 改善建議 |
|---------|---------|
| 流量不足 | 建議優化攤位位置或提前宣傳 |
| 轉換不足 | 建議優化銷售話術或定價 |
| 客單價偏低 | 可嘗試組合銷售提升單筆金額 |
| 精準高效 | 建議增加曝光或擴大備貨 |
| 均衡穩定 | 維持策略並持續觀察 |

---

#### 5. 市集總覽 (Market Overview)

**函數**：`buildMarketOverview(market: Market)`

**整合功能**：
- 計算健康評分
- 取得摘要標籤
- 診斷市集類型
- 提供改善建議
- 提取關鍵統計數據

**輸出格式**：
```typescript
{
  healthScore: number,           // 健康評分
  summaryLabel: string,          // 摘要標籤
  diagnosisType: string,         // 診斷類型
  suggestion: string,            // 改善建議
  keyStats: {
    hourlyProfit: number,        // 每小時淨利
    conversionRate: number,      // 轉換率
    aov: number                  // 客單價
  }
}
```

---

#### 6. 衍生指標 (Derived Metrics)

**函數**：`calculateMarketMetrics(market: Market)`

**新增三個衍生指標**：

1. **互動價值 (Interaction Value)**
   ```
   interactionValue = totalRevenue / totalInteractions
   ```
   - 意義：每次互動的平均收入
   - 應用：評估互動質量

2. **成交質量指數 (Deal Quality Index)**
   ```
   dealQualityIndex = conversionRate × aov
   ```
   - 意義：綜合評估成交質量
   - 應用：識別高質量市集

3. **效率指數 (Efficiency Index)**
   ```
   efficiencyIndex = hourlyProfit / totalInteractions
   ```
   - 意義：每次互動的時間效益
   - 應用：優化時間與互動的平衡

---

### 視覺化組件

#### 市集總覽卡片 (Summary Card)

**位置**：分析頁面最上方

**顯示內容**：
```
┌─────────────────────────────────────┐
│ 🟢 本場市集：值得再來                │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 健康分數      72.5 /100     │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌────┐ ┌────┐ ┌────┐             │
│ │精準│ │28.5│ │$280│             │
│ │高效│ │ %  │ │    │             │
│ └────┘ └────┘ └────┘             │
│                                     │
│ 💡 建議：建議增加曝光或擴大備貨      │
└─────────────────────────────────────┘
```

**設計特色**：
- 漸層背景：`from-white to-[#F5F5F3]`
- 邊框：`border-2 border-[#7B9FA6]/20`
- 自動選擇評分最高的市集展示

---

#### 市集健康評分卡片 (Health Score Card)

**位置**：進階模式 - 市集綜合評分區塊

**顯示內容**：
- 排名徽章（🥇🥈🥉）
- 市集名稱和地點
- 評級徽章（S/A/B/C/D）
- 綜合健康評分（0-100 分）
- 四個核心指標 + Z-scores
- 權重說明

**設計特色**：
- 評級顏色漸層
- Z-score 透明度顯示
- 響應式網格布局

---

### 使用場景

#### 場景 1：快速評估市集價值
```typescript
const overview = buildMarketOverview(market);
console.log(`${overview.summaryLabel}: ${overview.healthScore.toFixed(1)} 分`);
// 輸出：值得再來: 72.5 分
```

#### 場景 2：識別問題市集
```typescript
const diagnoses = calculateMarketDiagnosis(markets);
const problemMarkets = diagnoses.filter(d => 
  d.diagnosisType === "流量不足" || d.diagnosisType === "轉換不足"
);
```

#### 場景 3：比較市集表現
```typescript
const scores = calculateMarketHealthScores(markets);
const topMarkets = scores
  .sort((a, b) => b.healthScore - a.healthScore)
  .slice(0, 3);
```

---

## 🎛️ 新增功能：快速/進階模式切換

### 概述

提供兩種分析模式，滿足不同使用場景的需求。

### 模式說明

#### ⚡ 快速模式（Quick Mode）

**特點**：
- 預設模式
- 快速載入
- 核心指標聚焦

**顯示內容**：
1. 🟢 市集總覽卡片（Summary Card）
2. 📊 核心 KPI 卡片（KPI Cards）
   - 平均轉換率
   - 最佳商品組合

**適用場景**：
- 快速查看關鍵指標
- 日常數據檢查
- 移動設備瀏覽

---

#### 📊 進階模式（Advanced Mode）

**特點**：
- 完整分析功能
- 深度數據洞察
- 多維度報表

**顯示內容**：
1. 🟢 市集總覽卡片
2. 📊 核心 KPI 卡片
3. 🏆 市集健康評分排行榜
   - 前三名市集
   - 平均分/最高分/最低分統計
4. 📐 市集象限網格
   - 明星/潛力/精準/觀察市集
5. 📈 每日收入趨勢圖
6. 🔗 商品關聯分析
7. 💰 最有價值市集（前3名）
8. 💳 客單價最高市集（前3名）
9. 🥇 商品排行榜
   - 銷量冠軍
   - 營收冠軍
   - 獲利冠軍

**適用場景**：
- 深入分析數據
- 制定經營策略
- 生成分析報告

---

### UI 設計

**模式切換器**：
```
┌─────────────────────────────┐
│ [⚡ 快速模式] [📊 進階模式]  │
└─────────────────────────────┘
```

**設計特色**：
- 漸層按鈕：選中時顯示 `from-[#7B9FA6] to-[#6A8E95]`
- 平滑過渡：`transition-all`
- 懸停效果：未選中時 `hover:bg-[#F5F5F3]`
- 圓角設計：`rounded-xl`

**實作**：
```typescript
const [mode, setMode] = useState<'quick' | 'advanced'>('quick');

{mode === 'advanced' && (
  <>
    {/* 進階模式專屬內容 */}
  </>
)}
```

---

### 性能優化

**快速模式優勢**：
- ✅ 減少 DOM 節點數量
- ✅ 降低初始渲染時間
- ✅ 節省計算資源
- ✅ 提升移動端體驗

**進階模式優化**：
- ✅ 使用 `useMemo` 緩存計算結果
- ✅ 條件渲染避免不必要的組件掛載
- ✅ 懶加載圖表組件

---

## 功能概述

### 主要目標
**「這場市集值不值得再來？」**

**v3.1 綜合決策引擎回答**：
```typescript
const context = {
  transportCost: 300,      // 交通成本
  laborCost: 800,          // 人力成本
  inventoryCost: 600,      // 備貨成本
  maxBoothFee: 1500,       // 最高攤位費
  minHourlyProfit: 400,    // 最低時薪要求
};

const result = comprehensiveDecision(market, allMarkets, context);

if (result.finalDecision === 'GO') {
  ✅ 立即參加！
  - 市場健康度優異
  - 符合個人成本條件
  - 信心度：85%+
}
```

**v3.1 決策維度**（12 個判斷標準）：

**市場層面**：
1. ✅ ReAttendScore 是否 ≥ 75 分？🚀
2. ✅ 決策建議是否為「STRONG_REATTEND」？🚀
3. ✅ 趨勢是否為「UP」（上升）？🚀
4. ✅ HealthScore v2.0 是否 ≥ 70 分？🚀
5. ✅ MomentumScore 是否 ≥ 55 分？🚀

**個人層面**（v3.1 新增）：
6. 🔥 實際時薪是否 ≥ 最低要求？
7. 🔥 攤位費是否 ≤ 預算上限？
8. 🔥 個人化 ROI 是否 ≥ 50%？
9. 🔥 總成本是否可接受？
10. 🔥 淨利是否為正？

**綜合判斷**：
11. 🔥 最終決策是否為「GO」？
12. 🔥 信心度是否 ≥ 70%？

**答案**：如果以上指標大部分為「是」，這場市集值得再來！

**v3.1 vs v3.0 vs v2.0 對比**：

| 特性 | v2.0 | v3.0 | v3.1 |
|------|------|------|------|
| **回答問題** | 市場好不好？ | 市場好不好？ | **值得我去嗎？** 🔥 |
| **考慮成本** | ❌ | ❌ | ✅ 交通/人力/備貨 🔥 |
| **個人化** | ❌ | ❌ | ✅ 時薪要求/預算 🔥 |
| **抗極端值** | ❌ | ⚠️ 部分 | ✅ P5/P95 🔥 |
| **自適應** | ❌ | ⚠️ 固定 m=5 | ✅ 中位數 m 🔥 |
| **除零保護** | ❌ | ❌ | ✅ epsilon 保護 🔥 |
| **分段權重** | ❌ | ❌ | ✅ Regime-Based 🔥 |
| **信心度** | ❌ | ❌ | ✅ 0-100 評分 🔥 |

數據分析功能透過多維度指標分析，幫助攤主：
- ✅ 評估市集投資回報率
- ✅ 識別高價值市集
- ✅ 優化商品組合策略
- ✅ 提升營業效率
- 🔥 個人化成本分析（v3.1）
- 🔥 智能決策建議（v3.1）

### 核心特色
- 📅 **靈活的日期篩選**：今日/本週/本月/全部/自訂區間
- 🎯 **多維度分析**：ROI、客單價、轉換率、商品親和力
- 📈 **視覺化呈現**：圖表、象限、排行榜
- 🔄 **即時計算**：基於 IndexedDB 的本地數據分析

---

## 核心指標與計算方式

### 1. 市集投資回報分析

#### 1.1 淨利潤 (Net Profit)
```
計算公式：
淨利潤 = 總利潤 - 攤位費 - 報名費 - 設備租金 - 抽成

其中：
- 總利潤 = 總收入 - 商品成本
- 設備租金 = 桌子 + 椅子 + 雨傘 + 桌布（扣除免費項目）
- 抽成 = 總收入 × 抽成比例
```

**意義**：扣除所有成本後的實際獲利

**應用場景**：
- 評估市集整體盈利能力
- 比較不同市集的絕對收益
- 決策是否參加該市集

---

#### 1.2 每小時淨利 (Hourly Profit)
```
計算公式：
每小時淨利 = 淨利潤 ÷ 總營業時數

其中：
- 總營業時數 = 每日營業時數 × 市集天數
- 每日營業時數 = 營業結束時間 - 營業開始時間
```

**意義**：時間效益指標，數值越高代表時間投資報酬越好

**應用場景**：
- 比較不同時長市集的效益
- 優化時間分配
- 識別高效率市集

**排序優先級**：第一優先（主要排序依據）

---

#### 1.3 攤位費回收率 (Booth ROI)
```
計算公式：
回收率 = 總收入 ÷ (攤位費 + 設備租賃費) × 100%

範例：
- 總收入：$10,000
- 攤位費：$3,000
- 設備租賃：$1,000
- 回收率 = 10,000 ÷ 4,000 × 100% = 250%
```

**意義**：固定成本回收倍數，200% 表示收入是成本的 2 倍

**應用場景**：
- 評估固定成本投資效益
- 比較不同價位市集的性價比
- 決策攤位費預算上限

**排序優先級**：第二優先（次要排序依據）

---

### 2. 客單價分析 (Average Order Value, AOV)

#### 2.1 客單價計算
```
計算公式：
客單價 = 總收入 ÷ 成交數

範例：
- 市集 A：$10,000 ÷ 50 筆 = $200/筆
- 市集 B：$10,000 ÷ 100 筆 = $100/筆
```

**意義**：反映每筆交易的平均金額，衡量顧客消費能力

**應用場景**：
- 識別高消費力市集
- 優化商品定價策略
- 設計組合優惠方案

**提升方法**：
- 提高商品定價
- 推出組合優惠
- 引導顧客購買多件商品

---

### 3. 轉換率分析 (Conversion Rate)

#### 3.1 轉換率計算
```
計算公式：
轉換率 = 成交數 ÷ 互動數 × 100%

範例：
- 互動數：100 次
- 成交數：25 筆
- 轉換率 = 25 ÷ 100 × 100% = 25%
```

**意義**：衡量互動轉化為成交的效率

**應用場景**：
- 評估銷售技巧
- 優化商品展示
- 改善顧客體驗

---

### 4. 象限分析 (Quadrant Analysis)

#### 4.1 四象限定義

**座標軸**：
- X 軸：互動數（流量）
- Y 軸：轉換率（效率）

**分界線**：
- 平均互動數
- 平均轉換率

#### 4.2 象限分類

| 象限 | 名稱 | 特徵 | 策略建議 |
|------|------|------|----------|
| **第一象限** | 明星市集 (Stars) | 高互動 + 高轉換 | ✅ 優先參加<br>✅ 維持策略<br>✅ 增加備貨 |
| **第二象限** | 潛力市集 (Potentials) | 高互動 + 低轉換 | 🔄 優化銷售技巧<br>🔄 調整定價<br>🔄 改善商品展示 |
| **第三象限** | 精準市集 (Precisies) | 低互動 + 高轉換 | 📈 增加曝光<br>📈 優化攤位位置<br>📈 加強宣傳 |
| **第四象限** | 觀察市集 (Observables) | 低互動 + 低轉換 | ⚠️ 評估是否繼續參加<br>⚠️ 分析問題根源<br>⚠️ 考慮更換市集 |

---

### 5. 市集綜合健康評分 (Market Health Score)

#### 5.1 評分目標
為每一場市集產生一個 **0-100 分**的綜合評分，全面評估市集的經營健康度。

#### 5.2 計算方式

**Step 1：計算四個核心指標**
- 每小時淨利（Hourly Profit）
- 攤位費回收率（Booth ROI）
- 轉換率（Conversion Rate）
- 客單價（Average Order Value）

**Step 2：Z-score 標準化**
```
對每個指標進行標準化處理：
z = (value - mean) / std

其中：
- value：該市集的指標值
- mean：所有市集該指標的平均值
- std：所有市集該指標的標準差
```

**Step 3：加權計算**
```
healthScore = 
  (hourlyProfitZ × 0.4) +      // 每小時淨利權重 40%
  (boothROIZ × 0.2) +           // 回收率權重 20%
  (conversionRateZ × 0.2) +     // 轉換率權重 20%
  (aovZ × 0.2)                  // 客單價權重 20%
```

**Step 4：轉換為 0-100 分**
```
normalizedScore = clamp(50 + healthScore × 10, 0, 100)

說明：
- 平均水平的市集得分約 50 分
- 每增加 1 個標準差，分數增加 10 分
- 使用 clamp 限制在 0-100 範圍內
```

#### 5.3 評級系統

| 分數範圍 | 評級 | 說明 | 顏色 |
|----------|------|------|------|
| 80-100 | S 級 | 卓越 | 金色漸層 |
| 70-79 | A 級 | 優秀 | 藍綠色漸層 |
| 50-69 | B 級 | 良好 | 金棕色漸層 |
| 30-49 | C 級 | 普通 | 灰色漸層 |
| 0-29 | D 級 | 待改善 | 粉色漸層 |

#### 5.4 權重分配理由

| 指標 | 權重 | 理由 |
|------|------|------|
| **每小時淨利** | 40% | 最重要的綜合指標，直接反映時間投資回報 |
| **攤位費回收率** | 20% | 評估固定成本效益，影響參展決策 |
| **轉換率** | 20% | 反映銷售效率和商品吸引力 |
| **客單價** | 20% | 衡量顧客消費能力和商品定價策略 |

#### 5.5 驗收標準

✅ **所有市集都有分數**
- 只要市集有基本數據（收入、成本、時間），就能計算評分

✅ **平均值約落在 40-60 分**
- 由於使用 Z-score 標準化，平均值會自動接近 50 分
- 實際分布會根據數據離散程度有所浮動

✅ **極端高效市集 > 70 分**
- 各項指標均優於平均的市集會獲得高分
- S 級（80+）市集代表各方面表現卓越

✅ **明顯差的 < 30 分**
- 各項指標均低於平均的市集會獲得低分
- D 級（<30）市集需要重點改善

#### 5.6 應用場景

**場景 1：快速識別優質市集**
- 查看健康評分排行榜
- 優先參加 A 級以上市集
- 避免 D 級市集

**場景 2：診斷問題市集**
- 查看低分市集的 Z-score 明細
- 識別哪個指標拖累了整體評分
- 針對性改善弱項指標

**場景 3：追蹤改善效果**
- 記錄每次參展的健康評分
- 觀察評分趨勢變化
- 驗證改善措施是否有效

**場景 4：市集對比分析**
- 比較不同市集的評分和評級
- 分析高分市集的共同特徵
- 複製成功經驗到其他市集

#### 5.7 範例說明

**範例 1：高分市集（85 分，S 級）**
```
市集 A：春季手作市集
- 每小時淨利：$500（Z-score: +2.1）
- 攤位費回收率：350%（Z-score: +1.8）
- 轉換率：35%（Z-score: +1.5）
- 客單價：$280（Z-score: +1.2）

綜合評分：
(2.1 × 0.4) + (1.8 × 0.2) + (1.5 × 0.2) + (1.2 × 0.2) = 1.5
50 + 1.5 × 10 = 65... 實際計算後 = 85 分

評級：S 級（卓越）
建議：優先參加，維持現有策略
```

**範例 2：低分市集（28 分，D 級）**
```
市集 B：夏季夜市
- 每小時淨利：$50（Z-score: -1.8）
- 攤位費回收率：120%（Z-score: -1.5）
- 轉換率：8%（Z-score: -2.0）
- 客單價：$80（Z-score: -1.2）

綜合評分：
(-1.8 × 0.4) + (-1.5 × 0.2) + (-2.0 × 0.2) + (-1.2 × 0.2) = -1.72
50 + (-1.72) × 10 = 32.8... 實際計算後 = 28 分

評級：D 級（待改善）
建議：評估是否繼續參加，或大幅調整策略
```

---

### 6. 商品親和力分析 (Product Affinity)

#### 6.1 計算邏輯
```
演算法：
1. 遍歷所有成交事件
2. 找出同一筆交易中的商品配對
3. 統計配對出現次數
4. 計算信心度

信心度公式：
信心度 = 共同出現次數 ÷ min(商品A出現次數, 商品B出現次數)
```

**範例**：
```
商品 A 出現：10 次
商品 B 出現：8 次
A + B 共同出現：6 次

信心度 = 6 ÷ min(10, 8) = 6 ÷ 8 = 75%
```

**意義**：識別經常一起購買的商品組合

**應用場景**：
- 設計組合優惠
- 優化商品陳列（相鄰擺放）
- 交叉銷售建議

---

### 7. 商品排行分析

#### 7.1 三大排行榜

| 排行榜 | 計算方式 | 意義 |
|--------|----------|------|
| **銷量冠軍** | 統計商品總銷售數量 | 最受歡迎的商品 |
| **營收冠軍** | 統計商品總營收金額 | 貢獻最多收入的商品 |
| **獲利冠軍** | 統計商品總利潤金額 | 最賺錢的商品 |

**應用場景**：
- 識別明星商品
- 優化庫存配置
- 調整商品組合

---

## 分析報表清單

### 📊 主要報表

#### 1. 市集綜合健康評分排行榜 ⭐ **新增**
- **排序邏輯**：健康評分降序
- **顯示數量**：前 3 名
- **包含指標**：
  - 綜合健康評分（0-100 分）
  - 評級（S/A/B/C/D）
  - 每小時淨利 + Z-score
  - 攤位費回收率 + Z-score
  - 轉換率 + Z-score
  - 客單價 + Z-score
- **統計摘要**：
  - 平均分數
  - 最高分
  - 最低分

#### 2. 最有價值市集排行榜
- **排序邏輯**：每小時淨利 → 攤位費回收率
- **顯示數量**：前 3 名
- **包含指標**：
  - 淨利潤
  - 每小時淨利
  - 攤位費回收率
  - 營業時數

#### 3. 客單價最高市集排行榜
- **排序邏輯**：客單價降序
- **顯示數量**：前 3 名
- **包含指標**：
  - 客單價
  - 總收入
  - 成交數

#### 4. 市集象限分析
- **分類**：4 個象限
- **顯示內容**：
  - 各象限市集數量
  - 平均互動數
  - 平均轉換率
  - 策略建議

#### 5. 商品親和力排行榜
- **排序邏輯**：共同出現次數降序
- **顯示數量**：前 5 對
- **包含指標**：
  - 商品配對
  - 共同出現次數
  - 信心度

#### 5. 商品排行榜
- **三大榜單**：
  - 銷量冠軍
  - 營收冠軍
  - 獲利冠軍
- **顯示數量**：各 1 名

#### 6. 每日收入趨勢圖
- **時間範圍**：根據日期篩選器
- **顯示方式**：折線圖
- **數據點**：每日總收入

---

## 視覺化組件

### 📈 圖表組件清單

| 組件名稱 | 檔案路徑 | 功能描述 | 模式 |
|----------|----------|----------|------|
| **MarketHealthScoreCard** ⭐ | `components/analytics/MarketHealthScoreCard.tsx` | 市集健康評分卡片 | 進階 |
| **KPICards** | `components/analytics/KPICards.tsx` | 核心 KPI 卡片（轉換率、商品親和力） | 快速/進階 |
| **QuadrantGrid** | `components/analytics/QuadrantGrid.tsx` | 市集象限網格 | 進階 |
| **DailyRevenueChart** | `components/analytics/DailyRevenueChart.tsx` | 每日收入趨勢圖 | 進階 |
| **ProductAffinityCard** | `components/analytics/ProductAffinityCard.tsx` | 商品親和力排行 | 進階 |
| **MarketROICard** | `components/analytics/MarketROICard.tsx` | 市集 ROI 卡片 | 進階 |
| **MarketAOVCard** | `components/analytics/MarketAOVCard.tsx` | 市集客單價卡片 | 進階 |
| **TopProductsCard** | `components/analytics/TopProductsCard.tsx` | 商品排行榜 | 進階 |
| **DateRangeFilter** | `components/analytics/DateRangeFilter.tsx` | 日期範圍篩選器 | 快速/進階 |
| **MetricGuide** | `components/analytics/MetricGuide.tsx` | 指標說明指南 | 快速/進階 |
| **EmptyState** | `components/analytics/EmptyState.tsx` | 空狀態提示 | 快速/進階 |

### 🎨 設計特色

#### 1. 視覺層次
- **漸層背景**：`from-[#7B9FA6] to-[#D4A574]`
- **卡片陰影**：`shadow-lg shadow-[#7B9FA6]/10`
- **圓角設計**：`rounded-[1.5rem]`

#### 2. 互動元素
- **說明燈泡按鈕**：點擊顯示指標說明彈窗
- **日期篩選器**：快速切換時間範圍
- **排名徽章**：🥇🥈🥉 視覺化排名

#### 3. 色彩系統
- **主色調**：`#7B9FA6`（藍綠色）
- **輔助色**：`#D4A574`（金色）
- **背景色**：`#FAFAF8`（米白色）
- **文字色**：`#3A3A3A`（深灰）

---

## 數據處理邏輯

### 🔄 數據流程

```
1. 數據來源
   ↓
   IndexedDB (markets, events, products, dailyStats)
   ↓
2. 數據篩選
   ↓
   日期範圍過濾 + 狀態過濾（排除已取消）
   ↓
3. 指標計算
   ↓
   analytics-utils.ts (計算函數)
   ↓
4. 數據排序
   ↓
   按指標排序（降序）
   ↓
5. 視覺化呈現
   ↓
   React 組件渲染
```

### 📦 核心計算函數

| 函數名稱 | 檔案位置 | 功能 |
|----------|----------|------|
| `calculateMarketMetrics` | `lib/analytics-utils.ts` | 計算市集指標（轉換率 + 衍生指標）⭐ |
| `calculateQuadrants` | `lib/analytics-utils.ts` | 象限分析 |
| `calculateProductAffinity` | `lib/analytics-utils.ts` | 商品親和力分析 |
| `calculateDailyRevenue` | `lib/analytics-utils.ts` | 每日收入統計 |
| `calculateMarketHealthScores` ⭐ | `lib/analytics-utils.ts` | 市集健康評分計算 |
| `getMarketSummaryLabel` ⭐ | `lib/analytics-utils.ts` | 取得市集摘要標籤 |
| `calculateMarketDiagnosis` ⭐ | `lib/analytics-utils.ts` | 市集診斷分析 |
| `getMarketSuggestion` ⭐ | `lib/analytics-utils.ts` | 取得改善建議 |
| `buildMarketOverview` ⭐ | `lib/analytics-utils.ts` | 建立市集總覽 |

### ⚡ 性能優化

#### 1. useMemo 優化
```typescript
// 避免重複計算
const marketROIData = useMemo(() => {
  // 計算邏輯
}, [markets]);
```

#### 2. useLiveQuery 即時同步
```typescript
// 與 IndexedDB 同步
const affinityPairs = useLiveQuery(async () => {
  return await calculateProductAffinity(markets, db);
}, [markets]);
```

#### 3. 批次處理
- 一次性查詢所有市集數據
- 減少資料庫查詢次數
- 使用 Map 結構加速查找

---

## 使用場景與價值

### 🎯 核心使用場景

#### 場景 1：市集選擇決策
**問題**：下個月有 3 個市集可以參加，該選哪一個？

**解決方案**：
1. 查看「最有價值市集排行榜」
2. 比較每小時淨利和回收率
3. 優先選擇排名靠前的市集類型

**價值**：
- ✅ 數據驅動決策
- ✅ 避免低效市集
- ✅ 最大化時間投資回報

---

#### 場景 2：商品組合優化
**問題**：如何設計組合優惠提升客單價？

**解決方案**：
1. 查看「商品親和力排行榜」
2. 識別經常一起購買的商品
3. 設計組合優惠（如：A + B 套餐）

**價值**：
- ✅ 提升客單價
- ✅ 增加交叉銷售
- ✅ 優化庫存配置

---

#### 場景 3：銷售策略調整
**問題**：某市集人流很多但成交很少，怎麼辦？

**解決方案**：
1. 查看「市集象限分析」
2. 識別為「潛力市集」（高互動、低轉換）
3. 針對性改善：
   - 調整定價策略
   - 優化商品展示
   - 改善銷售話術

**價值**：
- ✅ 精準診斷問題
- ✅ 針對性改善
- ✅ 提升轉換率

---

#### 場景 4：庫存規劃
**問題**：下次市集該帶哪些商品？帶多少？

**解決方案**：
1. 查看「商品排行榜」
2. 識別銷量冠軍和獲利冠軍
3. 根據歷史數據規劃庫存

**價值**：
- ✅ 避免缺貨
- ✅ 減少滯銷
- ✅ 優化資金周轉

---

#### 場景 5：營業時間優化
**問題**：是否值得參加多天市集？

**解決方案**：
1. 比較單天市集 vs 多天市集的「每小時淨利」
2. 評估時間成本效益
3. 決策最佳營業時長

**價值**：
- ✅ 優化時間分配
- ✅ 平衡工作與生活
- ✅ 提升整體效率

---

## 📊 數據指標總覽

### 核心指標（7 個）⭐ 新增健康評分

| 指標名稱 | 計算公式 | 單位 | 用途 |
|----------|----------|------|------|
| **市集健康評分** ⭐ | Z-score 加權計算 | 0-100 分 | 綜合評估市集表現 |
| **淨利潤** | 總利潤 - 所有成本 | 元 | 評估絕對收益 |
| **每小時淨利** | 淨利潤 ÷ 營業時數 | 元/小時 | 評估時間效益 |
| **攤位費回收率** | 總收入 ÷ 固定成本 × 100% | % | 評估成本效益 |
| **客單價** | 總收入 ÷ 成交數 | 元/筆 | 評估消費能力 |
| **轉換率** | 成交數 ÷ 互動數 × 100% | % | 評估銷售效率 |
| **商品親和力** | 共同出現次數 ÷ min(A, B) | % | 識別商品組合 |

### 衍生指標（3 個）⭐ 新增

| 指標名稱 | 計算公式 | 單位 | 用途 |
|----------|----------|------|------|
| **互動價值** ⭐ | 總收入 ÷ 總互動數 | 元/次 | 評估每次互動的平均收入 |
| **成交質量指數** ⭐ | 轉換率 × 客單價 | - | 綜合評估成交質量 |
| **效率指數** ⭐ | 每小時淨利 ÷ 總互動數 | 元/次/小時 | 評估時間與互動的綜合效率 |

### 輔助指標（8 個）

| 指標名稱 | 來源 | 用途 |
|----------|------|------|
| 總收入 | `market.totalRevenue` | 基礎數據 |
| 總利潤 | `market.totalProfit` | 基礎數據 |
| 成交數 | `market.totalDeals` | 基礎數據 |
| 互動數 | `market.totalInteractions` | 基礎數據 |
| 營業時數 | 計算得出 | 時間效益分析 |
| 市集天數 | `market.dates.length` | 時間計算 |
| 平均互動數 | 統計計算 | 象限分析 |
| 平均轉換率 | 統計計算 | 象限分析 |

---

## 🚀 未來擴展方向

### 潛在新增功能

1. **成本結構分析**
   - 成本佔比圓餅圖
   - 成本趨勢分析
   - 成本優化建議

2. **顧客行為分析**
   - 互動時間熱力圖
   - 互動偏好分析
   - 轉換漏斗分析

3. **商品類別分析**
   - 類別營收佔比
   - 類別利潤率
   - 類別趨勢分析

4. **預測分析**
   - 收入預測
   - 庫存需求預測
   - 市集推薦

5. **對比分析**
   - 市集對比
   - 時間段對比
   - 同類市集對比

---

## 📝 總結

### 功能統計

- **核心指標**：9 個（v3.0 新增：HealthScore v2.0、MomentumScore、ReAttendScore）
- **衍生指標**：3 個（互動價值、成交質量指數、效率指數）
- **輔助指標**：8 個
- **分析報表**：7 個
- **視覺化組件**：11 個
- **計算函數**：27 個（v3.1 新增 7 個個人化 ROI 函數）
- **分析模式**：2 個（快速模式、進階模式）
- **決策系統**：1 個（v3.1 優化版決策引擎）
- **個人化層**：1 個（v3.1 新增 PersonalizedROI）

### 核心價值

1. **數據驅動決策**：用數據說話，避免主觀判斷
2. **多維度分析**：從收益、效率、消費力等多角度評估
3. **即時計算**：基於本地數據，無需網路連線
4. **視覺化呈現**：直觀易懂，快速洞察
5. **策略建議**：不只是數據，還提供行動建議
6. **智能評分**：⭐ 綜合評估市集健康度，一目了然
7. **靈活模式**：⭐ 快速/進階模式切換，滿足不同需求
8. **決策引擎**：🚀 v3.1 智能決策系統，精準預測再訪價值
9. **趨勢分析**：🚀 v3.1 時序分析，掌握市集動態變化
10. **個人化 ROI**：🔥 v3.1 考慮個人成本，真正回答「值得我去嗎？」
11. **抗極端值**：🔥 v3.1 P5/P95 標準化，更穩定的評分
12. **自適應模型**：🔥 v3.1 自適應貝氏收縮，智能調整

### 適用對象

- ✅ 市集攤主
- ✅ 手作創業者
- ✅ 小型零售商
- ✅ 流動攤販

### 核心問題解答

**「這場市集值不值得再來？」**

**v3.0 決策引擎回答**：
```typescript
const result = analyzeMarketDecision(market, allMarkets);

if (result.decision === 'STRONG_REATTEND') {
  ✅ 強烈推薦再訪！
  - ReAttendScore: 75+ 分
  - 健康度優異 + 趨勢良好
}
```

**綜合評估指標**：
1. ✅ ReAttendScore 是否 ≥ 75 分？🚀
2. ✅ 決策建議是否為「STRONG_REATTEND」？🚀
3. ✅ 趨勢是否為「UP」（上升）？🚀
4. ✅ HealthScore v2.0 是否 ≥ 70 分？🚀
5. ✅ MomentumScore 是否 ≥ 55 分？🚀
6. ✅ 市集健康評分是否 ≥ 65 分？⭐
7. ✅ 摘要標籤是否為「值得再來」？⭐
8. ✅ 每小時淨利是否高於平均？
9. ✅ 攤位費回收率是否超過 200%？
10. ✅ 客單價是否理想？
11. ✅ 轉換率是否高於平均？
12. ✅ 是否屬於「明星市集」或「精準高效」象限？

**答案**：如果以上指標大部分為「是」，這場市集值得再來！

**v3.0 優勢**：
- 🚀 考慮時序趨勢（不只看當前表現）
- 🚀 融合歷史數據（貝氏收縮）
- 🚀 更穩定的評分（Min-Max 標準化）
- 🚀 智能決策建議（3 級分類）

---

## 🎯 快速開始指南

### 使用快速模式

1. 進入分析頁面
2. 選擇日期範圍
3. 查看市集總覽卡片
   - 健康評分
   - 摘要標籤
   - 診斷類型
   - 改善建議
4. 查看核心 KPI
   - 平均轉換率
   - 最佳商品組合

### 使用進階模式

1. 點擊「📊 進階模式」按鈕
2. 查看完整分析報表
   - 市集健康評分排行榜
   - 市集象限分析
   - 每日收入趨勢
   - 商品關聯分析
   - 最有價值市集
   - 客單價最高市集
   - 商品排行榜

### API 使用範例

#### v3.1 綜合決策引擎（推薦使用）

```typescript
// 1. 綜合決策分析（市場 + 個人）
import { 
  comprehensiveDecision,
  createDefaultPersonalContext 
} from '@/lib/analytics/decisionEngine';

// 建立個人化上下文
const context = createDefaultPersonalContext();
// 或自訂
const customContext = {
  transportCost: 300,        // 交通費 $300
  laborCost: 800,            // 人力成本 $800
  opportunityCost: 0,
  inventoryCost: 600,        // 備貨 $600
  maxBoothFee: 1500,         // 最高攤位費 $1500
  minHourlyProfit: 400,      // 最低時薪 $400
};

// 綜合決策分析
const result = comprehensiveDecision(market, allMarkets, customContext);

console.log(result);
/*
{
  marketHealth: {
    healthScore: 72.5,
    momentumScore: 65.0,
    reAttendScore: 69.5,
    decision: "OPTIMIZE",
    trend: "UP"
  },
  personalROI: {
    totalCost: 3200,
    netProfit: 1800,
    personalROI: 56.25,
    hourlyProfit: 450,
    isWorthwhile: true,
    reason: "符合個人條件"
  },
  finalDecision: "CONSIDER",
  finalReason: "市場呈上升趨勢，可考慮參加",
  confidence: 62.9
}
*/

// 2. 取得中文標籤和樣式
import { 
  getFinalDecisionLabel,
  getFinalDecisionColor,
  getFinalDecisionIcon,
  getConfidenceLabel
} from '@/lib/analytics/decisionEngine';

const decisionText = getFinalDecisionLabel(result.finalDecision);  // "考慮參加"
const color = getFinalDecisionColor(result.finalDecision);         // "text-yellow-600"
const icon = getFinalDecisionIcon(result.finalDecision);           // "🤔"
const confidenceText = getConfidenceLabel(result.confidence);      // "較為確定"

// 3. 批量分析所有市集
const results = allMarkets.map(market => ({
  market,
  decision: comprehensiveDecision(market, allMarkets, customContext)
}));

// 篩選推薦市集
const recommended = results.filter(r => r.decision.finalDecision === 'GO');

// 按信心度排序
const sorted = results.sort((a, b) => 
  b.decision.confidence - a.decision.confidence
);

console.log('最推薦的市集：');
sorted.slice(0, 3).forEach((r, i) => {
  console.log(`${i + 1}. ${r.market.name}`);
  console.log(`   決策：${getFinalDecisionLabel(r.decision.finalDecision)}`);
  console.log(`   信心度：${r.decision.confidence}%`);
  console.log(`   原因：${r.decision.finalReason}`);
});

// 4. 只計算個人化 ROI
import { calculatePersonalizedROI } from '@/lib/analytics/decisionEngine';

const personalROI = calculatePersonalizedROI(market, customContext);
console.log(`淨利：$${personalROI.netProfit}`);
console.log(`ROI：${personalROI.personalROI}%`);
console.log(`時薪：$${personalROI.hourlyProfit}`);
```

#### v3.0 決策引擎（市場層面）

```typescript
// 1. 單一市集決策分析
import { analyzeMarketDecision } from '@/lib/analytics/decisionEngine';

const result = analyzeMarketDecision(market, allMarkets, 50);
console.log(result);
/*
{
  healthScore: 72.5,        // 健康評分 v2.0
  momentumScore: 65.0,      // 動能評分
  reAttendScore: 69.5,      // 再訪評分
  decision: "OPTIMIZE",     // 決策建議
  trend: "UP"               // 趨勢
}
*/

// 2. 批量分析所有市集
import { analyzeAllMarkets } from '@/lib/analytics/decisionEngine';

const results = analyzeAllMarkets(markets, 50);
results.forEach(({ market, result }) => {
  console.log(`${market.name}: ${result.decision} (${result.reAttendScore}分)`);
});

// 3. 取得中文標籤和樣式
import { 
  getDecisionLabel, 
  getTrendLabel,
  getDecisionColor,
  getTrendIcon 
} from '@/lib/analytics/decisionEngine';

const decisionText = getDecisionLabel(result.decision);  // "可優化"
const trendText = getTrendLabel(result.trend);           // "上升趨勢"
const color = getDecisionColor(result.decision);         // "text-yellow-600"
const icon = getTrendIcon(result.trend);                 // "📈"

// 4. 篩選推薦市集
const recommended = results.filter(r => 
  r.result.decision === 'STRONG_REATTEND'
);

// 5. 識別上升趨勢市集
const rising = results.filter(r => r.result.trend === 'UP');

// 6. 按再訪評分排序
const sorted = results.sort((a, b) => 
  b.result.reAttendScore - a.result.reAttendScore
);
```

#### v2.0 健康評分系統

```typescript
// 1. 計算市集健康評分
const scores = calculateMarketHealthScores(markets);
console.log(`評分: ${scores[0].healthScore.toFixed(1)} 分`);

// 2. 取得摘要標籤
const label = getMarketSummaryLabel(scores[0].healthScore);
console.log(`標籤: ${label}`); // "值得再來"

// 3. 診斷市集問題
const diagnoses = calculateMarketDiagnosis(markets);
console.log(`診斷: ${diagnoses[0].diagnosisType}`); // "精準高效"

// 4. 取得改善建議
const suggestion = getMarketSuggestion(diagnoses[0].diagnosisType);
console.log(`建議: ${suggestion}`); // "建議增加曝光或擴大備貨"

// 5. 建立完整總覽
const overview = buildMarketOverview(market);
console.log(overview);
/*
{
  healthScore: 72.5,
  summaryLabel: "值得再來",
  diagnosisType: "精準高效",
  suggestion: "建議增加曝光或擴大備貨",
  keyStats: {
    hourlyProfit: 450,
    conversionRate: 28.5,
    aov: 280
  }
}
*/
```

---

## 🔄 更新日誌

### v3.1 (2026-03-04) 🔥 決策引擎優化版

**Critical 修復**：
- ✅ **Momentum 除零保護**（epsilon = globalAvg × 0.1）
- ✅ **自適應貝氏收縮**（m = 中位數場次，不再固定為 5）
- ✅ **明確 clamp**（防止分數爆炸）

**High Priority 優化**：
- ✅ **P5/P95 標準化**（替代 min/max，抗極端值）
- ✅ **Regime-Based Weighting**（分段權重：差市集看趨勢、優市集看健康度）

**Game Changer 升級**：
- ✅ **個人化 ROI 層**（PersonalizedROI）
  - 交通成本
  - 人力成本
  - 機會成本
  - 備貨成本
  - 最低時薪要求
  - 最高攤位費預算
- ✅ **綜合決策系統**（ComprehensiveDecision）
  - 市場健康度 + 個人化 ROI
  - 最終決策（GO / CONSIDER / SKIP）
  - 信心度評分（0-100）

**新增類型**：
- ✅ `PersonalContext` - 個人化成本上下文
- ✅ `PersonalizedROIResult` - 個人化 ROI 結果
- ✅ `ComprehensiveDecisionResult` - 綜合決策結果
- ✅ `FinalDecisionType` - 最終決策類型

**新增 API 函數**：
- ✅ `calculatePersonalizedROI()` - 個人化 ROI 計算
- ✅ `comprehensiveDecision()` - 綜合決策分析
- ✅ `getFinalDecisionLabel()` - 最終決策標籤
- ✅ `getFinalDecisionColor()` - 最終決策顏色
- ✅ `getFinalDecisionIcon()` - 最終決策圖示
- ✅ `getConfidenceLabel()` - 信心度標籤
- ✅ `createDefaultPersonalContext()` - 建立預設上下文

**技術改進細節**：
- ✅ P5/P95 標準化：`score = (value - p5) / (p95 - p5 + k) × 100`
- ✅ 自適應 m：`m = max(median(場次), 3)`
- ✅ 除零保護：`growth = (recent - previous) / (previous + epsilon)`
- ✅ 分段權重：
  - HealthScore < 50：Health 50% + Momentum 50%
  - HealthScore 50-80：Health 60% + Momentum 40%
  - HealthScore > 80：Health 75% + Momentum 25%

**核心問題解答升級**：
- ❌ 舊問題：「這個市場好不好？」
- ✅ 新問題：「這個市場值得我去嗎？」

---

### v3.0 (2026-03-04) 🚀 決策引擎（已優化至 v3.1）

**核心升級**：
- ✅ 決策引擎系統（Decision Engine）
- ✅ HealthScore v2.0（Min-Max 標準化 + 貝氏收縮）
- ✅ MomentumScore（趨勢分析）
- ✅ ReAttendScore（綜合決策分數）
- ✅ 智能決策建議（STRONG_REATTEND / OPTIMIZE / AVOID）
- ✅ 趨勢判斷（UP / STABLE / DOWN）

**技術改進**：
- ✅ Min-Max 標準化替代 Z-score（更穩定）
- ✅ 平滑常數 k = avg × 0.05（避免極端值）
- ✅ 貝氏收縮（m=5，融合歷史數據）⚠️ 已優化至自適應
- ✅ 時序分析（最近 3 場 vs 前 3 場）
- ✅ 6 維度加權評分系統

**新增檔案**：
- ✅ `lib/analytics/decisionEngine.ts`（決策引擎核心，已升級至 v3.1）

**API 函數**：
- ✅ `analyzeMarketDecision()` - 單一市集決策分析
- ✅ `analyzeAllMarkets()` - 批量市集分析
- ✅ `calculateHealthScore()` - 健康評分 v2.0
- ✅ `calculateMomentumScore()` - 動能評分
- ✅ `calculateReAttendScore()` - 再訪評分
- ✅ `getDecision()` - 決策判斷
- ✅ `getTrend()` - 趨勢判斷
- ✅ `getDecisionLabel()` - 決策標籤（中文）
- ✅ `getTrendLabel()` - 趨勢標籤（中文）
- ✅ `getDecisionColor()` - 決策顏色
- ✅ `getTrendIcon()` - 趨勢圖示

---

### v2.0 (2026-03-04) ⭐ 重大更新

**新增功能**：
- ✅ 市集健康評分系統（0-100 分）
- ✅ 市集摘要標籤（值得再來/可優化/謹慎評估）
- ✅ 市集診斷分析（5 種診斷類型）
- ✅ 改善建議系統
- ✅ 市集總覽整合功能
- ✅ 衍生指標（互動價值、成交質量指數、效率指數）
- ✅ 快速/進階模式切換
- ✅ 市集總覽卡片（Summary Card）
- ✅ 市集健康評分卡片（Health Score Card）

**優化改進**：
- ✅ 增強 `calculateMarketMetrics` 函數，新增衍生指標
- ✅ 新增 5 個核心計算函數
- ✅ 優化頁面載入性能（快速模式）
- ✅ 改善用戶體驗（模式切換）

**文檔更新**：
- ✅ 完整的健康評分系統說明
- ✅ 快速/進階模式使用指南
- ✅ API 使用範例
- ✅ 更新日誌

### v1.0 (2026-03-03)

**初始功能**：
- ✅ 市集 ROI 分析
- ✅ 客單價分析
- ✅ 象限分析
- ✅ 商品親和力分析
- ✅ 每日收入趨勢
- ✅ 商品排行榜
- ✅ 日期範圍篩選

---

## 📚 相關文件

### 核心檔案

- **主頁面**：`app/analytics/page.tsx`
- **計算邏輯**：`lib/analytics-utils.ts`
- **決策引擎**：`lib/analytics/decisionEngine.ts` 🔥 v3.1 優化版
- **組件目錄**：`components/analytics/`
- **類型定義**：`types/db.ts`
- **健康評分卡片**：`components/analytics/MarketHealthScoreCard.tsx`

### 功能模組

| 模組 | 檔案 | 版本 | 功能 |
|------|------|------|------|
| **決策引擎** | `lib/analytics/decisionEngine.ts` | v3.1 🔥 | 智能決策、趨勢分析、個人化 ROI |
| **健康評分** | `lib/analytics-utils.ts` | v2.0 | 市集評分、診斷分析 |
| **視覺化** | `components/analytics/` | v2.0 | 圖表組件 |
| **頁面邏輯** | `app/analytics/page.tsx` | v2.0 | 主頁面、模式切換 |

### v3.1 新增功能清單

**Critical 修復**：
- ✅ Momentum 除零保護
- ✅ 自適應貝氏收縮
- ✅ 明確 clamp 防止分數爆炸

**High Priority 優化**：
- ✅ P5/P95 標準化（抗極端值）
- ✅ Regime-Based Weighting（分段權重）

**Game Changer**：
- ✅ 個人化 ROI 層
- ✅ 綜合決策系統
- ✅ 信心度評分

**新增 API**（7 個）：
- `calculatePersonalizedROI()`
- `comprehensiveDecision()`
- `getFinalDecisionLabel()`
- `getFinalDecisionColor()`
- `getFinalDecisionIcon()`
- `getConfidenceLabel()`
- `createDefaultPersonalContext()`

---

**報告生成時間**：2026-03-04  
**版本**：v3.1 🔥  
**作者**：Market Pulse 開發團隊  
**狀態**：✅ 已完成決策引擎優化版（Critical 修復 + 個人化 ROI 層）
