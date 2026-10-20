/**
 * Daily Log 刪除權限 Helper 測試（C2.27 收尾補強）
 *
 * 用途：驗證 `canDeleteDailyLogEntry` 的 boolean 嚴格等於行為
 *
 * 重點：
 * - 只有 `true` 才回傳 true（strict equal，無 truthy 寬鬆）
 * - undefined / false / null / 其他型別一律回傳 false
 * - 對 owner 與 staff 角色切換場景的容錯（避免員工誤刪）
 */

import assert from 'node:assert/strict';
import { canDeleteDailyLogEntry } from '../lib/markets/daily-log-permissions';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    failures.push(name);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 基本行為（沿用既有測試）
// ─────────────────────────────────────────────────────────────────────────────

runTest('undefined 輸入 → false', () => {
  assert.equal(canDeleteDailyLogEntry(undefined), false);
});

runTest('false 輸入 → false', () => {
  assert.equal(canDeleteDailyLogEntry(false), false);
});

runTest('true 輸入 → true', () => {
  assert.equal(canDeleteDailyLogEntry(true), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 邊界型別（新增 C2.27 補強）
// ─────────────────────────────────────────────────────────────────────────────

runTest('null 輸入 → false', () => {
  // cast 為 boolean 以通過型別簽名（runtime 仍驗證 null 行為）
  assert.equal(canDeleteDailyLogEntry(null as unknown as boolean), false);
});

runTest('"true" 字串輸入 → false（strict equal，不寬鬆 truthy）', () => {
  // 防止 caller 誤傳字串 "true" 而誤觸發刪除
  assert.equal(canDeleteDailyLogEntry('true' as unknown as boolean), false);
});

runTest('數字 1 輸入 → false（strict equal，不寬鬆 truthy）', () => {
  // 防止 caller 誤傳數字 1 而誤觸發刪除
  assert.equal(canDeleteDailyLogEntry(1 as unknown as boolean), false);
});

runTest('數字 0 輸入 → false', () => {
  assert.equal(canDeleteDailyLogEntry(0 as unknown as boolean), false);
});

runTest('空字串輸入 → false', () => {
  assert.equal(canDeleteDailyLogEntry('' as unknown as boolean), false);
});

runTest('空物件輸入 → false', () => {
  assert.equal(canDeleteDailyLogEntry({} as unknown as boolean), false);
});

runTest('空陣列輸入 → false', () => {
  // 注意：[] 在 JS 為 truthy，但 helper 用 strict equal 應仍回傳 false
  assert.equal(canDeleteDailyLogEntry([] as unknown as boolean), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 結果總結
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n失敗測試：${failures.join(', ')}`);
  process.exit(1);
}
