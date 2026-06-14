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

runTest('保留費用資訊（攤位費 / 設備 / 保證金）', () => {
  // 員工仍可看見費用資訊
  assert.match(source, /費用資訊/, '應保留「費用資訊」區塊');
  assert.match(source, /攤位費/, '應保留「攤位費」');
  assert.match(source, /保證金/, '應保留「保證金」');
});

runTest('保留營業狀態卡片', () => {
  assert.match(source, /營業狀態/, '應保留「營業狀態」區塊');
});

runTest('保留員工核心工作功能（互動 / 交易 / 流水帳）', () => {
  assert.match(source, /InteractionButtons/, '應保留 InteractionButtons');
  assert.match(source, /QuickInteractionButtons/, '應保留 QuickInteractionButtons');
  assert.match(source, /QuickTransactionGrid/, '應保留 QuickTransactionGrid');
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
