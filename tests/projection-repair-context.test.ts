import assert from 'node:assert/strict';
import {
  shouldAutoRepairForContext,
  type ProjectionReconciliationContext,
} from '../lib/sync/projection-reconciliation';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ============ shouldAutoRepairForContext: 直接 unit test ============

runTest('shouldAutoRepairForContext: owner-full allows auto-repair', () => {
  assert.equal(shouldAutoRepairForContext('owner-full'), true);
});

runTest('shouldAutoRepairForContext: owner-incremental allows auto-repair', () => {
  assert.equal(shouldAutoRepairForContext('owner-incremental'), true);
});

runTest('shouldAutoRepairForContext: manual allows auto-repair (Recovery tool explicit trigger)', () => {
  assert.equal(shouldAutoRepairForContext('manual'), true);
});

runTest('shouldAutoRepairForContext: staff-view blocks auto-repair (partial events risk)', () => {
  assert.equal(shouldAutoRepairForContext('staff-view'), false);
});

runTest('shouldAutoRepairForContext: snapshot blocks auto-repair (complex logic)', () => {
  assert.equal(shouldAutoRepairForContext('snapshot'), false);
});

// ============ Integration: 模擬 reconcileTouchedMarketProjections 在不同 context 下的行為 ============
// 重現 lib/sync/projection-reconciliation.ts 中 reconcileTouchedMarketProjections
// 的核心決策邏輯（從 production source 觀察重寫），但 wrap 在 mock framework。
//
// 這個 integration test 不直接 import reconcileTouchedMarketProjections，
// 因為它的 import 會拉進 Dexie 等複雜依賴。改以「如果 shouldAutoRepairForContext 為 true
// 且 status === 'inflated'，呼叫 rebuild 函式」這個可觀察的合約來測試。

interface MockResult {
  repaired: string[];
  skippedDryRun: string[];
  skippedStatus: Array<{ marketId: string; status: string }>;
  errors: Array<{ marketId: string; message: string }>;
}

async function simulateReconcile(
  context: ProjectionReconciliationContext,
  comparisons: Array<{ marketId: string; status: string }>
): Promise<MockResult> {
  const result: MockResult = {
    repaired: [],
    skippedDryRun: [],
    skippedStatus: [],
    errors: [],
  };
  const dryRun = !shouldAutoRepairForContext(context);

  for (const { marketId, status } of comparisons) {
    if (status === 'inflated') {
      if (dryRun) {
        result.skippedDryRun.push(marketId);
      } else {
        result.repaired.push(marketId);
      }
    } else {
      result.skippedStatus.push({ marketId, status });
    }
  }
  return result;
}

runTest('integration: owner-full + inflated → calls rebuild', async () => {
  const result = await simulateReconcile('owner-full', [
    { marketId: 'm1', status: 'inflated' },
  ]);
  assert.deepEqual(result.repaired, ['m1']);
  assert.deepEqual(result.skippedDryRun, []);
});

runTest('integration: owner-incremental + inflated → calls rebuild', async () => {
  const result = await simulateReconcile('owner-incremental', [
    { marketId: 'm1', status: 'inflated' },
  ]);
  assert.deepEqual(result.repaired, ['m1']);
  assert.deepEqual(result.skippedDryRun, []);
});

runTest('integration: manual + inflated → calls rebuild (Recovery tool)', async () => {
  const result = await simulateReconcile('manual', [
    { marketId: 'm1', status: 'inflated' },
  ]);
  assert.deepEqual(result.repaired, ['m1']);
  assert.deepEqual(result.skippedDryRun, []);
});

runTest('integration: staff-view + inflated → dry-run (no rebuild)', async () => {
  const result = await simulateReconcile('staff-view', [
    { marketId: 'm1', status: 'inflated' },
  ]);
  assert.deepEqual(result.repaired, []);
  assert.deepEqual(result.skippedDryRun, ['m1']);
});

runTest('integration: snapshot + inflated → dry-run (no rebuild)', async () => {
  const result = await simulateReconcile('snapshot', [
    { marketId: 'm1', status: 'inflated' },
  ]);
  assert.deepEqual(result.repaired, []);
  assert.deepEqual(result.skippedDryRun, ['m1']);
});

runTest('integration: any context + consistent → not repaired (already correct)', async () => {
  const contexts: ProjectionReconciliationContext[] = [
    'owner-full',
    'owner-incremental',
    'staff-view',
    'snapshot',
    'manual',
  ];
  for (const context of contexts) {
    const result = await simulateReconcile(context, [
      { marketId: 'm1', status: 'consistent' },
    ]);
    assert.deepEqual(result.repaired, [], `context=${context} should not repair consistent`);
    assert.deepEqual(result.skippedStatus, [{ marketId: 'm1', status: 'consistent' }]);
  }
});

runTest('integration: any context + lower_than_events → not repaired (first version conservative)', async () => {
  const contexts: ProjectionReconciliationContext[] = [
    'owner-full',
    'owner-incremental',
    'staff-view',
    'snapshot',
    'manual',
  ];
  for (const context of contexts) {
    const result = await simulateReconcile(context, [
      { marketId: 'm1', status: 'lower_than_events' },
    ]);
    assert.deepEqual(result.repaired, [], `context=${context} should not repair lower_than_events`);
  }
});

runTest('integration: any context + local_events_incomplete → not repaired (safety net)', async () => {
  // 這條規則寫在 reconcileTouchedMarketProjections 的 production code 內，
  // 但 shouldAutoRepairForContext 的語意已守住：staff-view 不 repair，owner 雖 repair
  // 但若 status 是 local_events_incomplete 也不 repair（這是更下層的判斷）。
  const contexts: ProjectionReconciliationContext[] = [
    'owner-full',
    'owner-incremental',
    'staff-view',
    'snapshot',
    'manual',
  ];
  for (const context of contexts) {
    const result = await simulateReconcile(context, [
      { marketId: 'm1', status: 'local_events_incomplete' },
    ]);
    assert.deepEqual(result.repaired, [], `context=${context} should not repair incomplete`);
  }
});

runTest('integration: water market scenario — owner-full + inflated triggers repair', async () => {
  // 水水市集：C3.4 老用戶在 P1 修好前已累積污染值
  // 場景：user 升級到 P1+P2 修好的版本後，第一次同步
  // P1 把雲端 hydrate 的 totalRevenue reset 為 0
  // P1 後 replay 雲端 events 應得到正確值
  // 但若 P1 之前的歷史污染值仍在 db.markets，P2 偵測到 inflated 並 rebuild
  const result = await simulateReconcile('owner-full', [
    { marketId: 'water-market', status: 'inflated' }, // 已被 P1 + 既有污染偵測到
  ]);
  assert.deepEqual(result.repaired, ['water-market']);
});

runTest('integration: water market scenario — staff-view + inflated does NOT trigger repair', async () => {
  // 員工端 partial events，絕對不能 destructive rebuild
  const result = await simulateReconcile('staff-view', [
    { marketId: 'water-market', status: 'inflated' },
  ]);
  assert.deepEqual(result.repaired, []);
  assert.deepEqual(result.skippedDryRun, ['water-market']);
});

async function main() {
  let passed = 0;
  let failed = 0;
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
    throw new Error(`${failed} projection-repair-context tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
