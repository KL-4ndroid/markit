/** Supplemental metric explanations; calculation content stays owned by the caller. */
'use client';

import { ContextHelp } from '@/components/ui/ContextHelp';

interface InfoTooltipProps {
  title: string;
  description: string;
  formula?: string;
  example?: string;
  interpretation?: string;
}

export default function InfoTooltip({ title, description, formula, example, interpretation }: InfoTooltipProps) {
  return <ContextHelp label={`${title}說明`} title={title} iconOnly>
    <p>{description}</p>
    {formula && <section><h3 className="mb-2 font-semibold">計算公式</h3><pre className="whitespace-pre-wrap break-words rounded-xl bg-background p-3 font-mono text-sm leading-6">{formula}</pre></section>}
    {example && <section><h3 className="mb-2 font-semibold">範例</h3><p>{example}</p></section>}
    {interpretation && <section><h3 className="mb-2 font-semibold">如何解讀</h3><p className="whitespace-pre-line">{interpretation}</p></section>}
  </ContextHelp>;
}

// ==================== 預設提示內容 ====================

export const tooltipContent = {
  healthScore: {
    title: '健康評分',
    description: '綜合評估市集的整體表現，分數越高表示市集越值得參加。評分考慮了時薪、攤位費回收率、成交率和客單價四個維度。',
    formula: `healthScore = 70 + weightedScore × 15

weightedScore = 
  hourlyProfitZ × 0.4 +
  boothROIZ × 0.2 +
  conversionRateZ × 0.2 +
  aovZ × 0.2

Z = (你的值 - 平均值) / 標準差`,
    example: '如果你的時薪、成交率、客單價都是平均水準，評分會是 70 分。如果各項指標都優於平均 1 個標準差，評分會是 85 分（S 級）。',
    interpretation: 'S 級（≥85）：金牌市集，強烈推薦\nA 級（≥75）：優質市集，值得再來\nB 級（≥60）：穩定市集，可以考慮\nC 級（≥45）：待改善市集，需要優化\nD 級（<45）：不推薦市集，謹慎評估',
  },
  
  hourlyProfit: {
    title: '時薪',
    description: '每小時能賺多少淨利。這是最直接反映市集賺錢效率的指標，扣除了所有成本（攤位費、租金、抽成等）。',
    formula: `時薪 = 淨利 / 營業時數

淨利 = 總利潤 - 攤位費 - 報名費 - 租金 - 抽成

營業時數 = 每日時數 × 天數`,
    example: '如果你在市集賺了 $1,200 淨利，營業 8 小時，時薪就是 $150/小時。',
    interpretation: '時薪越高越好。如果時薪低於你的目標（例如時薪 $100），可能需要考慮換市集或優化策略。',
  },
  
  conversionRate: {
    title: '成交率',
    description: '有多少比例的客人最後會買單。這反映了你的商品吸引力和銷售能力。',
    formula: `成交率 = 成交人數 / 互動人數

使用 Laplace 平滑處理小樣本：
成交率 = (成交數 + 1) / (互動數 + 2)`,
    example: '如果有 100 人經過你的攤位，其中 30 人停下來看（互動），最後 9 人買單，成交率就是 9/30 = 30%，也就是每 10 個客人有 3 個買單。',
    interpretation: '成交率 > 30%：很好，銷售能力強\n成交率 20-30%：正常水準\n成交率 < 20%：需要改善銷售話術或定價',
  },
  
  aov: {
    title: '客單價',
    description: '平均每筆訂單的金額。客單價越高，表示客人願意花更多錢，或你的向上銷售做得好。',
    formula: `客單價 = 總收入 / 成交筆數`,
    example: '如果你賣了 20 筆訂單，總收入 $8,000，客單價就是 $400。',
    interpretation: '客單價偏低時，可以嘗試：\n• 推組合包（買 A 送 B）\n• 向上銷售（推薦更高價商品）\n• 設定滿額優惠（滿 $500 送贈品）',
  },
  
  boothROI: {
    title: '攤位費回收率',
    description: '評估攤位費是否划算。回收率越高，表示你花的攤位費越值得。',
    formula: `回收率 = (總收入 / 總固定成本) × 100%

總固定成本 = 攤位費 + 桌椅租金 + 其他租金`,
    example: '如果你花了 $1,000（攤位費 + 租金），賺了 $3,500 營收，回收率就是 350%，也就是賺了 3.5 倍。',
    interpretation: '回收率 > 300%：很划算\n回收率 200-300%：划算\n回收率 100-200%：勉強回本\n回收率 < 100%：虧本，不推薦',
  },
  
  uniqueEngaged: {
    title: '有效互動人數',
    description: '實際與你互動的客人數量。這個數字會排除重複計算（同一個人多次互動只算一次）。',
    formula: `behaviorMax = max(
  拿起商品次數,
  詢問次數,
  成為粉絲次數
)

uniqueEngaged = min(
  總互動次數,
  max(behaviorMax, 成交數)
)`,
    example: '如果有客人拿起商品 2 次、詢問 1 次，系統會算成 1 個人互動（不是 3 次）。',
    interpretation: '這個數字越大，表示你的攤位吸引力越強。如果互動人數少，可能需要優化攤位位置或布置。',
  },
  
  confidenceScore: {
    title: '數據可靠度',
    description: '評估分析結果的可信程度。數據量越多，分析越準確。',
    formula: `可靠度 = min(
  互動數 / 50,
  成交數 / 20
)

高：≥ 0.7（互動 ≥ 35 次，成交 ≥ 14 筆）
中：0.4-0.7
低：< 0.4`,
    example: '如果你只參加過 1 次市集，互動 10 次，成交 3 筆，可靠度會是「低」，建議多參加幾次再下結論。',
    interpretation: '數據量少時，評分可能不準確。建議至少參加 3-5 次市集，累積足夠數據後再做決策。',
  },
  
  diagnosis: {
    title: '診斷分析',
    description: '自動診斷市集的經營問題，並提供改善建議。系統會分析你的數據，找出最需要優化的地方。',
    formula: `診斷邏輯：
1. 流量不足：互動數 < 平均 - 標準差
2. 精準高效：互動少但轉換率高、客單價高
3. 轉換不足：互動多但轉換率低
4. 客單價偏低：成交多但客單價低
5. 均衡穩定：其他情況`,
    example: '如果你的攤位有 80 人經過，但只有 8 人買單（成交率 10%），系統會診斷為「轉換不足」，建議改善銷售話術。',
    interpretation: '每種診斷都有對應的處方箋，包含 3 個具體行動建議和預期效果。',
  },
  
  productAffinity: {
    title: '商品親和力',
    description: '分析哪些商品經常一起被購買，幫助你做組合包或交叉銷售。使用 Lift 指標衡量關聯強度。',
    formula: `Lift = P(A,B) / (P(A) × P(B))

P(A) = 商品 A 出現的機率
P(B) = 商品 B 出現的機率
P(A,B) = A 和 B 同時出現的機率

Lift > 1.2：強關聯
Lift ≈ 1.0：無關聯
Lift < 0.8：負關聯`,
    example: '如果商品 A 出現 30 次，商品 B 出現 20 次，A+B 同時出現 15 次（總共 100 筆交易），Lift = 0.15 / (0.3 × 0.2) = 2.5，表示買 A 的人有 2.5 倍機率也會買 B。',
    interpretation: 'Lift > 1.2 的商品組合建議做成組合包，可以提升客單價。',
  },
  
  winsorization: {
    title: 'Winsorization（極端值修正）',
    description: '自動修正異常數據，避免單一極端值（如一筆超高價訂單）扭曲整體評分。',
    formula: `如果數據超過 ±2.5 個標準差：

Z = (值 - 平均) / 標準差

if Z > 2.5:
  修正值 = 平均 + 2.5 × 標準差
if Z < -2.5:
  修正值 = 平均 - 2.5 × 標準差`,
    example: '如果你的客單價通常是 $100-200，但有一筆 $99,999 的訂單（可能是誤輸入），系統會自動將它拉回到合理範圍（約 $400），避免評分失真。',
    interpretation: '如果看到「已修正異常數據」的提示，表示系統偵測到極端值並自動處理了，評分會更準確。',
  },
};
