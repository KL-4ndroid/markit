/**
 * DailyRevenueStats hideProfit prop 契約測試
 *
 * 用途：驗證 DailyRevenueStats 在 hideProfit 模式下的 UI 行為契約。
 * 由於本 codebase 採用純函式 + assert 模式（無 React Testing Library），
 * 本測試改用「讀檔案 + 字串匹配」方式驗證：
 * 1. prop interface 包含 hideProfit
 * 2. hideProfit=true 時 grid-cols 為 2
 * 3. hideProfit=false（預設）時 grid-cols 為 3
 * 4. 函式簽名接受 hideProfit 參數
 * 5. 老闆模式（不傳 hideProfit）行為不變
 *
 * 為什麼需要這個測試：UI 層脫敏（員工隱藏利潤）散落在 JSX 條件渲染，
 * 沒有純函式可測；改用靜態契約驗證是務實折衷。
 *
 * 對應文件：
 * - components/markets/DailyRevenueStats.tsx
 * - lib/ui/daily-revenue-totals.ts（computeDailyTotals 純函式，無 hideProfit 概念）
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
const sourcePath = join(projectRoot, 'components/markets/DailyRevenueStats.tsx');
const source = readFileSync(sourcePath, 'utf-8');

runTest('prop interface 包含 hideProfit?: boolean', () => {
  // 驗證 prop interface 有宣告 hideProfit
  assert.match(
    source,
    /interface\s+DailyRevenueStatsProps\s*\{[\s\S]*hideProfit\?:\s*boolean[\s\S]*\}/,
    'DailyRevenueStatsProps 應包含 hideProfit?: boolean'
  );
});

runTest('hideProfit 預設值為 false（老闆模式行為不變）', () => {
  // 驗證函式簽名 hideProfit 預設 false
  assert.match(
    source,
    /\{[^}]*hideProfit\s*=\s*false[^}]*\}\s*:\s*DailyRevenueStatsProps/,
    '函式解構應有 hideProfit = false 預設值'
  );
});

runTest('hideProfit=true 時 grid 為 grid-cols-2（每日卡片）', () => {
  // 驗證每日卡片 grid 用動態 grid-cols-${hideProfit ? 2 : 3}
  // 兩種寫法都可接受：template literal 或 className 字串拼接
  const hasTemplateLiteral = /grid\s+\$\{hideProfit\s*\?\s*'grid-cols-2'\s*:\s*'grid-cols-3'\}/.test(source);
  const hasConditionalClass = /\$\{hideProfit\s*\?\s*'grid-cols-2'\s*:\s*'grid-cols-3'\}/.test(source);
  assert.ok(
    hasTemplateLiteral || hasConditionalClass,
    '每日卡片 grid 應根據 hideProfit 動態切換 grid-cols-2 / grid-cols-3'
  );
});

runTest('hideProfit=true 時不渲染「利潤」文字（每日卡片）', () => {
  // 驗證每日卡片的「利潤」div 被條件渲染包住
  // 找 pattern: {hideProfit ? null : ( ... 利潤 ... )}
  const dailyCardProfitBlock = /\{hideProfit\s*\?\s*null\s*:\s*\(\s*[\s\S]*?利潤[\s\S]*?\)\s*\}/;
  assert.match(
    source,
    dailyCardProfitBlock,
    '每日卡片的「利潤」div 應被 {hideProfit ? null : ...} 包住'
  );
});

runTest('hideProfit=true 時底部總計 grid 為 grid-cols-2（多日市集）', () => {
  // 底部總計區塊也應該用動態 grid-cols
  // 找第二個 grid-cols-2 / grid-cols-3 的條件渲染（在總計區塊）
  const matches = source.match(/\$\{hideProfit\s*\?\s*'grid-cols-2'\s*:\s*'grid-cols-3'\}/g);
  assert.ok(
    matches && matches.length >= 2,
    `底部總計也應有動態 grid-cols（每日卡片 + 總計 = 至少 2 處）`
  );
});

runTest('hideProfit=true 時不渲染「總利潤」文字（底部總計）', () => {
  // 驗證總計區塊的「總利潤」div 也被條件渲染包住
  const summaryProfitBlock = /\{hideProfit\s*\?\s*null\s*:\s*\(\s*[\s\S]*?總利潤[\s\S]*?\)\s*\}/;
  assert.match(
    source,
    summaryProfitBlock,
    '底部總計的「總利潤」div 應被 {hideProfit ? null : ...} 包住'
  );
});

runTest('computeDailyTotals 純函式未受 hideProfit 影響（仍算 totalProfit）', () => {
  // 驗證 lib/ui/daily-revenue-totals.ts 沒有任何 hideProfit 邏輯
  const totalsPath = join(projectRoot, 'lib/ui/daily-revenue-totals.ts');
  const totalsSource = readFileSync(totalsPath, 'utf-8');
  assert.ok(
    !/hideProfit/.test(totalsSource),
    'lib/ui/daily-revenue-totals.ts 為純函式，不應有 hideProfit 邏輯'
  );
  // 確認 totalProfit 仍被計算（沒有被條件刪除）
  assert.match(
    totalsSource,
    /totalProfit:\s*dailyData\.reduce/,
    'computeDailyTotals 仍應計算 totalProfit（UI 層脫敏而非資料層）'
  );
});

runTest('老闆模式 DailyRevenueStats 呼叫點未傳 hideProfit（行為 0 變化）', () => {
  // 驗證 app/markets/[id]/page.tsx 內 DailyRevenueStats 呼叫沒傳 hideProfit
  // 確保老闆模式仍是 hideProfit=false（預設值）
  const ownerPagePath = join(projectRoot, 'app/markets/[id]/page.tsx');
  const ownerPageSource = readFileSync(ownerPagePath, 'utf-8');
  // 找 <DailyRevenueStats ... /> 標籤（單行）並確認沒有 hideProfit
  const match = ownerPageSource.match(/<DailyRevenueStats[^>]*\/>/);
  assert.ok(match, '老闆頁應該呼叫 <DailyRevenueStats>');
  assert.ok(
    !/hideProfit/.test(match[0]),
    '老闆頁不應傳 hideProfit prop（保持 hideProfit=false 預設行為）'
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
    throw new Error(`${failed} daily-revenue-stats-hide-profit tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
