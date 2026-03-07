# 啟發式數據拆解 (Heuristic Deconstruction) 設計文件

## 🎯 問題描述

當使用者使用「補登」功能記錄大額收入時（例如：一筆 $5,000 的補登），如果只記錄為 1 次成交，會導致：

1. **轉換率失真** - 看起來只有 1% 成交率（實際可能是 10 筆小額交易）
2. **客單價異常** - 客單價 $5,000（實際可能是 10 筆 $500）
3. **健康評分偏差** - 因為成交次數太少，評分會偏低

---

## 💡 解決方案：啟發式數據拆解

### 核心概念

當偵測到「補登」且金額異常時，系統自動：
1. 計算歷史平均客單價
2. 預估實際成交次數 = 補登總額 / 歷史平均客單價
3. 使用預估次數計算轉換率和健康評分
4. 在 UI 上誠實告知使用者精準度受影響

---

## 🔍 偵測邏輯

### A. 偵測「不合理客單價」

```typescript
/**
 * 偵測是否為批次補登（大額補登）
 * 
 * 判斷標準：
 * 1. 是補登數據（isBackfill = true）
 * 2. 成交次數極少（≤ 3 筆）
 * 3. 單筆金額 > 歷史中位數客單價的 N 倍（預設 5 倍）
 */
interface BatchEntryDetectionResult {
  isBatchEntry: boolean;           // 是否為批次補登
  estimatedDealCount: number;      // 預估成交次數
  historicalMedianAOV: number;     // 歷史中位數客單價
  actualAmount: number;            // 實際補登金額
  confidence: 'high' | 'medium' | 'low'; // 預估信心度
  reason: string;                  // 偵測原因
}

function detectBatchEntry(
  dealEvent: Event<DealClosedPayload>,
  historicalDeals: Event<DealClosedPayload>[],
  options?: {
    multiplierThreshold?: number;  // 倍數閾值（預設 5）
    minHistoricalDeals?: number;   // 最少歷史記錄（預設 10）
  }
): BatchEntryDetectionResult {
  const payload = dealEvent.payload;
  const multiplier = options?.multiplierThreshold || 5;
  const minDeals = options?.minHistoricalDeals || 10;
  
  // 預設結果
  const defaultResult: BatchEntryDetectionResult = {
    isBatchEntry: false,
    estimatedDealCount: payload.manualDealCount || 1,
    historicalMedianAOV: 0,
    actualAmount: payload.totalAmount,
    confidence: 'high',
    reason: '正常交易'
  };
  
  // 1. 必須是補登數據
  if (!payload.isBackfill) {
    return defaultResult;
  }
  
  // 2. 必須是手動輸入（簡化模式）
  if (!payload.isManualEntry) {
    return defaultResult;
  }
  
  // 3. 成交次數必須極少（≤ 3 筆）
  const dealCount = payload.manualDealCount || 1;
  if (dealCount > 3) {
    return defaultResult;
  }
  
  // 4. 必須有足夠的歷史數據
  if (historicalDeals.length < minDeals) {
    return {
      ...defaultResult,
      reason: `歷史數據不足（需要至少 ${minDeals} 筆，目前 ${historicalDeals.length} 筆）`
    };
  }
  
  // 5. 計算歷史中位數客單價
  const historicalAOVs = historicalDeals
    .filter(e => {
      const p = e.payload;
      // 排除其他補登數據，只用正常交易計算
      return !p.isBackfill && p.totalAmount > 0;
    })
    .map(e => {
      const p = e.payload;
      const amount = p.totalAmount;
      const count = p.manualDealCount || p.items?.length || 1;
      return amount / count;
    })
    .sort((a, b) => a - b);
  
  if (historicalAOVs.length === 0) {
    return {
      ...defaultResult,
      reason: '無有效歷史數據（所有歷史記錄都是補登）'
    };
  }
  
  // 計算中位數
  const medianIndex = Math.floor(historicalAOVs.length / 2);
  const medianAOV = historicalAOVs.length % 2 === 0
    ? (historicalAOVs[medianIndex - 1] + historicalAOVs[medianIndex]) / 2
    : historicalAOVs[medianIndex];
  
  // 6. 計算當前客單價
  const currentAOV = payload.totalAmount / dealCount;
  
  // 7. 判斷是否異常（超過歷史中位數的 N 倍）
  const ratio = currentAOV / medianAOV;
  
  if (ratio > multiplier) {
    // 偵測到批次補登
    const estimatedCount = Math.round(payload.totalAmount / medianAOV);
    
    // 計算信心度
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (historicalAOVs.length >= 30 && ratio > 10) {
      confidence = 'high';
    } else if (historicalAOVs.length < 15 || ratio < 7) {
      confidence = 'low';
    }
    
    return {
      isBatchEntry: true,
      estimatedDealCount: estimatedCount,
      historicalMedianAOV: medianAOV,
      actualAmount: payload.totalAmount,
      confidence,
      reason: `單筆金額 $${currentAOV.toFixed(0)} 是歷史中位數 $${medianAOV.toFixed(0)} 的 ${ratio.toFixed(1)} 倍`
    };
  }
  
  return defaultResult;
}
```

---

## 📊 整合到分析引擎

### 修改 `calculateMarketMetrics` 函數

```typescript
/**
 * 計算市集指標（含批次補登修正）
 */
export function calculateMarketMetrics(
  market: Market,
  allMarkets?: Market[],  // 用於計算歷史數據
  options?: { 
    useCache?: boolean; 
    verbose?: boolean;
    enableBatchEntryCorrection?: boolean;  // 啟用批次補登修正（預設 true）
  }
): MarketMetrics & { batchEntryWarnings?: BatchEntryWarning[] } {
  const enableCorrection = options?.enableBatchEntryCorrection ?? true;
  
  // ... 原有的計算邏輯
  
  // 🔥 新增：批次補登偵測與修正
  let adjustedTotalDeals = totalDeals;
  let batchEntryWarnings: BatchEntryWarning[] = [];
  
  if (enableCorrection && allMarkets && allMarkets.length > 1) {
    // 獲取歷史成交事件
    const historicalDeals = await getHistoricalDeals(allMarkets, market.id);
    
    // 獲取當前市集的成交事件
    const currentDeals = await db.events
      .where('market_id')
      .equals(market.id!)
      .and(e => e.type === 'deal_closed')
      .toArray();
    
    // 偵測每筆補登
    for (const dealEvent of currentDeals) {
      const detection = detectBatchEntry(dealEvent, historicalDeals);
      
      if (detection.isBatchEntry) {
        // 調整成交次數
        const originalCount = dealEvent.payload.manualDealCount || 1;
        const adjustment = detection.estimatedDealCount - originalCount;
        adjustedTotalDeals += adjustment;
        
        // 記錄警告
        batchEntryWarnings.push({
          eventId: dealEvent.id!,
          originalDealCount: originalCount,
          estimatedDealCount: detection.estimatedDealCount,
          amount: detection.actualAmount,
          historicalMedianAOV: detection.historicalMedianAOV,
          confidence: detection.confidence,
          reason: detection.reason
        });
        
        if (options?.verbose) {
          console.log(`🔍 偵測到批次補登:`, {
            金額: `$${detection.actualAmount}`,
            原始次數: originalCount,
            預估次數: detection.estimatedDealCount,
            歷史中位數客單價: `$${detection.historicalMedianAOV.toFixed(0)}`,
            信心度: detection.confidence
          });
        }
      }
    }
  }
  
  // 使用調整後的成交次數計算轉換率
  const conversionRate = uniqueEngaged > 0 
    ? adjustedTotalDeals / uniqueEngaged 
    : 0;
  
  const conversionRateRaw = uniqueEngaged > 0 
    ? adjustedTotalDeals / uniqueEngaged 
    : 0;
  
  // 使用調整後的成交次數計算客單價
  const aov = adjustedTotalDeals > 0 
    ? totalRevenue / adjustedTotalDeals 
    : 0;
  
  return {
    // ... 原有的指標
    totalDeals: adjustedTotalDeals,  // 使用調整後的次數
    conversionRate,
    conversionRateRaw,
    aov,
    
    // 新增：批次補登警告
    batchEntryWarnings: batchEntryWarnings.length > 0 ? batchEntryWarnings : undefined
  };
}
```

---

## 🎨 UI 顯示設計

### 1. 數據可靠度警告（擴展）

```typescript
// 在 DiagnosticCards.tsx 中
export default function DiagnosticCards({ analytics }: DiagnosticCardsProps) {
  const { metrics } = analytics;
  const hasBatchEntryWarnings = metrics.batchEntryWarnings && metrics.batchEntryWarnings.length > 0;
  
  return (
    <div className="space-y-6">
      {/* ... 其他卡片 */}
      
      {/* 批次補登警告 */}
      {hasBatchEntryWarnings && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-xl font-bold text-yellow-800">
                數據精準度提醒
              </h3>
              <p className="text-sm text-yellow-700">
                偵測到大額補登記錄，系統已自動調整分析結果
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 mb-3">
              <strong>為什麼會有這個提醒？</strong>
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              系統偵測到您使用「補登」功能記錄了大額收入（例如：一筆 $5,000），
              但只記錄為 1 次成交。這可能是多筆小額交易的總和。
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              為了讓分析更準確，系統根據您的<strong>歷史平均客單價</strong>，
              自動預估了實際成交次數。
            </p>
          </div>
          
          {/* 詳細資訊 */}
          <div className="space-y-3">
            {metrics.batchEntryWarnings.map((warning, index) => (
              <div key={index} className="bg-yellow-100 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      補登金額：${warning.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {warning.reason}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    warning.confidence === 'high' ? 'bg-green-200 text-green-800' :
                    warning.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-orange-200 text-orange-800'
                  }`}>
                    {warning.confidence === 'high' ? '高信心度' :
                     warning.confidence === 'medium' ? '中信心度' :
                     '低信心度'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-600">原始記錄</p>
                    <p className="text-lg font-bold text-gray-800">
                      {warning.originalDealCount} 筆
                    </p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-600">系統預估</p>
                    <p className="text-lg font-bold text-blue-600">
                      {warning.estimatedDealCount} 筆
                    </p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-600">歷史客單價</p>
                    <p className="text-lg font-bold text-gray-800">
                      ${warning.historicalMedianAOV.toFixed(0)}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs text-gray-600">
                    💡 <strong>計算方式：</strong>
                    預估次數 = ${warning.amount.toLocaleString()} ÷ ${warning.historicalMedianAOV.toFixed(0)} 
                    ≈ {warning.estimatedDealCount} 筆
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>📊 對分析結果的影響：</strong>
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>轉換率</strong>：使用預估次數計算，更接近實際情況</li>
              <li>• <strong>客單價</strong>：使用預估次數計算，避免異常偏高</li>
              <li>• <strong>健康評分</strong>：基於調整後的數據，更準確</li>
            </ul>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800 mb-2">
              <strong>💡 如何提升精準度？</strong>
            </p>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• 補登時盡量記錄實際成交次數（不要只記錄總額）</li>
              <li>• 市集進行中即時記錄，減少事後補登</li>
              <li>• 如果是多筆交易，可以分開補登</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. 簡化版警告（在市集總覽卡片）

```typescript
// 在 MarketOverviewCard.tsx 中
export default function MarketOverviewCard({ analytics }: Props) {
  const hasBatchEntry = analytics.metrics.batchEntryWarnings?.length > 0;
  
  return (
    <div className="...">
      {/* ... 其他內容 */}
      
      {hasBatchEntry && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              數據已自動調整
            </p>
            <p className="text-xs text-yellow-700">
              偵測到大額補登，系統已根據歷史數據預估實際成交次數
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📈 實際範例

### 場景：市集結束後補登 $5,000

#### 原始數據（未修正）

```typescript
{
  totalRevenue: 5000,
  totalDeals: 1,           // ❌ 只記錄 1 筆
  conversionRate: 0.01,    // ❌ 1% (1/100)
  aov: 5000,               // ❌ 客單價 $5,000
  healthScore: 45          // ❌ 評分偏低（成交次數太少）
}
```

#### 修正後數據

```typescript
// 系統偵測：
// - 歷史中位數客單價：$500
// - 當前客單價：$5,000 (10倍)
// - 預估成交次數：$5,000 / $500 = 10 筆

{
  totalRevenue: 5000,
  totalDeals: 10,          // ✅ 調整為 10 筆
  conversionRate: 0.10,    // ✅ 10% (10/100)
  aov: 500,                // ✅ 客單價 $500
  healthScore: 72,         // ✅ 評分正常
  batchEntryWarnings: [{
    originalDealCount: 1,
    estimatedDealCount: 10,
    amount: 5000,
    historicalMedianAOV: 500,
    confidence: 'high',
    reason: '單筆金額 $5000 是歷史中位數 $500 的 10.0 倍'
  }]
}
```

---

## 🔧 設定選項

### 使用者可調整的參數

```typescript
interface HeuristicDeconstructionOptions {
  enabled: boolean;                // 是否啟用（預設 true）
  multiplierThreshold: number;     // 倍數閾值（預設 5）
  minHistoricalDeals: number;      // 最少歷史記錄（預設 10）
  confidenceThreshold: 'high' | 'medium' | 'low'; // 最低信心度（預設 'medium'）
}

// 在設定頁面
<SettingsSection title="數據分析設定">
  <Toggle
    label="啟用批次補登自動修正"
    description="當偵測到大額補登時，自動預估實際成交次數"
    value={settings.heuristicDeconstruction.enabled}
    onChange={(v) => updateSettings({ heuristicDeconstruction: { enabled: v } })}
  />
  
  <Slider
    label="異常倍數閾值"
    description="當客單價超過歷史中位數的幾倍時觸發修正"
    min={3}
    max={10}
    value={settings.heuristicDeconstruction.multiplierThreshold}
    onChange={(v) => updateSettings({ heuristicDeconstruction: { multiplierThreshold: v } })}
  />
</SettingsSection>
```

---

## 🎯 型別定義

```typescript
// 在 types/analytics.ts 中新增

/**
 * 批次補登警告
 */
export interface BatchEntryWarning {
  eventId: string;                 // 事件 ID
  originalDealCount: number;       // 原始記錄的成交次數
  estimatedDealCount: number;      // 系統預估的成交次數
  amount: number;                  // 補登金額
  historicalMedianAOV: number;     // 歷史中位數客單價
  confidence: 'high' | 'medium' | 'low'; // 預估信心度
  reason: string;                  // 偵測原因
}

/**
 * 擴展 MarketMetrics 介面
 */
export interface MarketMetrics {
  // ... 原有欄位
  
  // 新增：批次補登警告
  batchEntryWarnings?: BatchEntryWarning[];
  
  // 新增：是否使用了啟發式修正
  usedHeuristicCorrection?: boolean;
}
```

---

## 📊 統計報告

### 在分析報告中顯示修正統計

```typescript
// 在 AnalyticsSummary 中
interface AnalyticsSummary {
  // ... 原有欄位
  
  // 新增：批次補登統計
  batchEntryStats?: {
    totalBatchEntries: number;           // 總批次補登數
    totalAdjustedDeals: number;          // 總調整的成交次數
    averageConfidence: number;           // 平均信心度
    marketsAffected: number;             // 受影響的市集數
  };
}

// 顯示在 UI
<div className="stats-card">
  <h3>數據修正統計</h3>
  <p>偵測到 {stats.totalBatchEntries} 筆大額補登</p>
  <p>調整了 {stats.totalAdjustedDeals} 筆成交記錄</p>
  <p>平均信心度：{(stats.averageConfidence * 100).toFixed(0)}%</p>
</div>
```

---

## 🧪 測試案例

```typescript
describe('Heuristic Deconstruction', () => {
  it('應該偵測到批次補登', () => {
    const historicalDeals = generateMockDeals(20, { avgAOV: 500 });
    const batchEntry = {
      payload: {
        isBackfill: true,
        isManualEntry: true,
        totalAmount: 5000,
        manualDealCount: 1
      }
    };
    
    const result = detectBatchEntry(batchEntry, historicalDeals);
    
    expect(result.isBatchEntry).toBe(true);
    expect(result.estimatedDealCount).toBe(10);
    expect(result.confidence).toBe('high');
  });
  
  it('不應該誤判正常交易', () => {
    const historicalDeals = generateMockDeals(20, { avgAOV: 500 });
    const normalDeal = {
      payload: {
        isBackfill: false,
        totalAmount: 600,
        items: [{ productId: 'p1', quantity: 1, price: 600 }]
      }
    };
    
    const result = detectBatchEntry(normalDeal, historicalDeals);
    
    expect(result.isBatchEntry).toBe(false);
  });
});
```

---

## 🎉 總結

### 功能特色

1. ✅ **自動偵測** - 無需手動標記，系統自動識別異常
2. ✅ **智能修正** - 基於歷史數據預估實際次數
3. ✅ **信心度評估** - 告訴使用者預估的可靠程度
4. ✅ **透明溝通** - 在 UI 上誠實告知修正原因
5. ✅ **可調整** - 使用者可以調整偵測參數
6. ✅ **不破壞原始數據** - 只在分析時調整，不修改原始記錄

### 價值

- 🎯 **提升轉換率準確度** - 避免因補登導致轉換率失真
- 📊 **改善健康評分** - 基於更真實的成交次數
- 💡 **教育使用者** - 引導更好的記帳習慣
- 🔍 **數據透明** - 讓使用者了解分析的局限性

### 實作優先級

1. **Phase 1** (核心功能)
   - 實作 `detectBatchEntry` 函數
   - 整合到 `calculateMarketMetrics`
   - 基本 UI 警告

2. **Phase 2** (UI 優化)
   - 詳細警告卡片
   - 信心度顯示
   - 計算方式說明

3. **Phase 3** (進階功能)
   - 使用者設定選項
   - 統計報告
   - A/B 測試效果

這個設計讓系統更智能，同時保持對使用者的誠實和透明！🎯
