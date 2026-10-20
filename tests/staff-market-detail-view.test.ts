/**
 * StaffMarketDetailView 結構契約測試
 *
 * 用途：驗證 StaffMarketDetailView（員工市集詳情頁）符合 C2.30 員工權限與
 * 對齊老闆頁的設計契約。由於本 codebase 採用純函式 + assert 模式
 * （無 React Testing Library），本測試改用「讀檔案 + 字串匹配」方式驗證。
 *
 * 驗證項目：
 * 1. DailyRevenueStats 引入（員工頁可看每日收入明細）
 * 2. hideProfit={true}（員工物理隱藏利潤）
 * 3. 拿掉原「成交統計 (2 格)」區塊（改由 DailyRevenueStats 取代）
 * 4. 不顯示「刪除記錄」按鈕
 * 5. 不顯示「報名狀態 Stepper」
 * 6. 不渲染顧客行為分析區塊
 * 7. useMarketStatsFromProjection 引入（員工數據走 dailyStats）
 * 8. AddRevenueDialog / DailyDealsModal 引入（員工可補登 / 看每日成交）
 * 9. 不引入 TotalStats 4 格區塊
 * 10. 不直接讀 market.totalRevenue（避免 C3.4 reset 後永遠 0）
 *
 * 對應文件：components/markets/StaffMarketDetailView.tsx
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const sourcePath = join(projectRoot, 'components/markets/StaffMarketDetailView.tsx');
const source = readFileSync(sourcePath, 'utf-8');

runTest('引入 DailyRevenueStats 組件', () => {
  assert.match(
    source,
    /import\s*\{[^}]*DailyRevenueStats[^}]*\}\s*from\s*['"]@\/components\/markets\/DailyRevenueStats['"]/,
    'StaffMarketDetailView 應引入 DailyRevenueStats'
  );
});

runTest('DailyRevenueStats 呼叫點傳 hideProfit={true}', () => {
  assert.match(
    source,
    /<DailyRevenueStats[\s\S]*?hideProfit=\{true\}/,
    'DailyRevenueStats 應傳 hideProfit={true}（員工物理隱藏利潤）'
  );
});

runTest('DailyRevenueStats 呼叫點傳 onAddRevenue handler', () => {
  assert.match(
    source,
    /<DailyRevenueStats[\s\S]*?onAddRevenue=/,
    'DailyRevenueStats 應傳 onAddRevenue（員工可補登收入）'
  );
});

runTest('DailyRevenueStats 呼叫點傳 onDateClick handler', () => {
  assert.match(
    source,
    /<DailyRevenueStats[\s\S]*?onDateClick=/,
    'DailyRevenueStats 應傳 onDateClick（員工可看每日成交記錄）'
  );
});

runTest('拿掉原「成交統計 (2 格)」區塊（成交次數/總收入直接讀 market 欄位）', () => {
  // 原本的 2 格區塊：直接讀 market.totalDeals 與 market.totalRevenue
  // 員工路徑下 market.total* 已被 C3.4 reset 為 0，會永遠顯示 0
  // 改由 DailyRevenueStats 取代
  const oldTwoGridBlock = /\{market\.totalDeals\s*\|\|\s*0\}/;
  assert.ok(
    !oldTwoGridBlock.test(source),
    '不應再直接讀 market.totalDeals（會被 C3.4 reset 為 0）'
  );
  const oldTwoGridRevenue = /\{formatCurrency\(market\.totalRevenue\s*\|\|\s*0\)\}/;
  assert.ok(
    !oldTwoGridRevenue.test(source),
    '不應再直接讀 market.totalRevenue（會被 C3.4 reset 為 0）'
  );
});

runTest('不顯示「刪除記錄」按鈕', () => {
  // 員工沒有刪除權限（C2.24A）
  assert.ok(
    !/刪除記錄/.test(source),
    'StaffMarketDetailView 不應出現「刪除記錄」按鈕文字'
  );
});

runTest('不顯示「報名狀態」Stepper', () => {
  // 員工不需要看到報名狀態管理
  // 只檢查 JSX 渲染區，不檢查檔頭註解
  // 移除檔頭註解區塊（從 /** 開始到 */）後再 grep
  const sourceWithoutHeader = source.replace(/\/\*\*[\s\S]*?\*\//g, '');
  assert.ok(
    !/報名狀態/.test(sourceWithoutHeader),
    'StaffMarketDetailView JSX 不應出現「報名狀態」Stepper 區塊'
  );
});

runTest('不渲染顧客行為分析區塊（互動偏好圖表）', () => {
  // 員工不需要看到 BehaviorInsightCard / InteractionPreferenceChart
  assert.ok(
    !/BehaviorInsightCard/.test(source) &&
    !/InteractionPreferenceChart/.test(source) &&
    !/InteractionTimeHeatmap/.test(source),
    'StaffMarketDetailView 不應引入行為分析相關 component'
  );
});

runTest('引入 useMarketStatsFromProjection（員工數據走 dailyStats）', () => {
  assert.match(
    source,
    /import\s*\{[^}]*useMarketStatsFromProjection[^}]*\}\s*from\s*['"]@\/lib\/db\/hooks['"]/,
    'StaffMarketDetailView 應引入 useMarketStatsFromProjection'
  );
});

runTest('引入 AddRevenueDialog（員工可補登收入）', () => {
  assert.match(
    source,
    /import\s*\{[^}]*AddRevenueDialog[^}]*\}\s*from\s*['"]@\/components\/markets\/AddRevenueDialog['"]/,
    'StaffMarketDetailView 應引入 AddRevenueDialog'
  );
});

runTest('引入 DailyDealsModal（員工可看每日成交記錄）', () => {
  assert.match(
    source,
    /import\s*\{[^}]*DailyDealsModal[^}]*\}\s*from\s*['"]@\/components\/markets\/DailyDealsModal['"]/,
    'StaffMarketDetailView 應引入 DailyDealsModal'
  );
});

runTest('不引入「總計統計」4 格區塊（被 DailyRevenueStats 底部總計取代）', () => {
  // 老闆頁 4 格：總收入 / 淨利潤 / 成交數 / 總支出
  // 員工頁不應出現這 4 格
  assert.ok(
    !/總支出/.test(source),
    'StaffMarketDetailView 不應出現「總支出」（4 格總計的組成之一）'
  );
  assert.ok(
    !/淨利潤/.test(source),
    'StaffMarketDetailView 不應出現「淨利潤」（4 格總計的組成之一）'
  );
});

runTest('保留承租設備資訊（設備狀態 / 保證金）', () => {
  // 員工只看現場需要的設備狀態，不看老闆的攤位成本
  assert.match(source, /承租設備/, '應保留「承租設備」區塊');
  assert.match(source, /桌子/, '應保留設備提供狀態');
  assert.match(source, /保證金/, '應保留「保證金」');
});

runTest('保留營業狀態卡片', () => {
  assert.match(source, /營業狀態/, '應保留「營業狀態」區塊');
});

runTest('保留員工核心工作功能（互動 / 交易 / 流水帳）', () => {
  assert.match(source, /InteractionButtons/, '應保留 InteractionButtons');
  assert.match(source, /TransactionWorkspace/, '應保留統一交易工作區');
  assert.match(source, /salesPhotoEvidenceRequired=\{salesPhotoEvidenceRequired\}/, '交易工作區應顯示本場照片規則');
  assert.match(source, /DailyTransactionLog/, '應保留 DailyTransactionLog');
});

runTest('不直接讀 market.totalProfit（員工不該看到利潤）', () => {
  // 員工頁不應使用 market.totalProfit
  assert.ok(
    !/market\.totalProfit/.test(source),
    'StaffMarketDetailView 不應直接讀 market.totalProfit（員工物理隱藏）'
  );
});

runTest('員工頁不直接讀 market.totalInteractions（已由 useMarketStatsFromProjection 取代）', () => {
  // 員工頁不再需要「互動次數總計」區塊
  assert.ok(
    !/market\.totalInteractions/.test(source),
    'StaffMarketDetailView 不應直接讀 market.totalInteractions（避免 C3.4 reset 影響）'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// C2.27 收尾補強（2026-06-15）：租金 / 攤位費金額不渲染
// 員工仍可在「承租設備」卡片看到「已承租 / 免費提供 / 自備」標籤，
// 但不可看到具體金額。理由：租金與攤位費是純粹成本資訊，
// 對員工現場工作無關；保證金則仍可看到（產品決策選項 A）。
// ─────────────────────────────────────────────────────────────────────────────

runTest('員工頁不渲染攤位費金額（boothCost）', () => {
  // commit c5cacfa 已將 boothCost 完全移出 StaffMarketDetailView
  assert.ok(
    !/market\.boothCost/.test(source),
    'StaffMarketDetailView 不應出現 market.boothCost（員工不看攤位費金額）'
  );
  assert.ok(
    !/formatCurrency\(market\.boothCost/.test(source),
    'StaffMarketDetailView 不應呼叫 formatCurrency(market.boothCost)'
  );
});

runTest('員工頁不渲染桌子租金金額（tableRental 金額）', () => {
  // 員工只看到「已承租/免費提供/自備」標籤，不可看到金額
  // tableRental 仍可用於條件判斷（> 0 判定是否承租）
  assert.ok(
    !/formatCurrency\(market\.tableRental/.test(source),
    'StaffMarketDetailView 不應呼叫 formatCurrency(market.tableRental)'
  );
});

runTest('員工頁不渲染椅子租金金額（chairRental 金額）', () => {
  assert.ok(
    !/formatCurrency\(market\.chairRental/.test(source),
    'StaffMarketDetailView 不應呼叫 formatCurrency(market.chairRental)'
  );
});

runTest('員工頁不渲染傘架租金金額（umbrellaRental 金額）', () => {
  assert.ok(
    !/formatCurrency\(market\.umbrellaRental/.test(source),
    'StaffMarketDetailView 不應呼叫 formatCurrency(market.umbrellaRental)'
  );
});

runTest('員工頁不渲染 totalCost', () => {
  assert.ok(
    !/market\.totalCost/.test(source),
    'StaffMarketDetailView 不應出現 market.totalCost'
  );
});

runTest('員工頁仍可看到保證金金額（產品決策選項 A）', () => {
  // 員工需要知道保證金存在以避免誤處置（不退還給客人、當收入計入）
  // 詳見 docs/C2.27_REANALYSIS_2026_06_15.md §3
  assert.match(
    source,
    /formatCurrency\(market\.deposit\)/,
    'StaffMarketDetailView 應仍渲染保證金金額（選項 A：Staff 可看保證金提醒）'
  );
});

runTest('「承租設備」標題與註解一致', () => {
  // 確保沒有遺留「費用資訊」孤兒註解
  assert.match(source, /承租設備/, '應出現「承租設備」標題');
  // 「費用資訊」字串不應在 JSX 渲染區出現（已改為「承租設備」）
  const sourceWithoutHeader = source.replace(/\/\*\*[\s\S]*?\*\//g, '');
  assert.ok(
    !/費用資訊/.test(sourceWithoutHeader),
    'StaffMarketDetailView JSX 不應出現「費用資訊」（已改為「承租設備」）'
  );
});

let passed = 0;
let failed = 0;

async function main() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
      passed++;
    } catch (error) {
      console.error(`FAIL ${name}`);
      console.error(error);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} staff-market-detail-view tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
