import assert from 'node:assert/strict';
import {
  collectProjectionMarketId,
  reconcileTouchedMarketProjections,
} from '../lib/sync/projection-reconciliation';
import type { MarketProjectionComparison } from '../lib/projections/market-projection-service';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function comparison(
  marketId: string,
  status: MarketProjectionComparison['status']
): MarketProjectionComparison {
  return { marketId, status };
}

runTest('reconciles unique nonblank market ids only once', async () => {
  const checked: string[] = [];
  const result = await reconcileTouchedMarketProjections(
    ['market-1', '', 'market-1', 'market-2'],
    {
      context: 'manual',
      compare: async (marketId) => {
        checked.push(marketId);
        return comparison(marketId, 'consistent');
      },
      rebuild: async () => {
        throw new Error('should not rebuild consistent projections');
      },
    }
  );

  assert.deepEqual(checked, ['market-1', 'market-2']);
  assert.deepEqual(result.checked, ['market-1', 'market-2']);
  assert.deepEqual(result.repaired, []);
  assert.deepEqual(result.skipped, [
    { marketId: 'market-1', reason: 'consistent' },
    { marketId: 'market-2', reason: 'consistent' },
  ]);
});

runTest('repairs inflated projections', async () => {
  const rebuilt: string[] = [];
  const result = await reconcileTouchedMarketProjections(
    ['market-1'],
    {
      context: 'owner-full',
      compare: async (marketId) => comparison(marketId, 'inflated'),
      rebuild: async (marketId) => {
        rebuilt.push(marketId);
      },
    }
  );

  assert.deepEqual(rebuilt, ['market-1']);
  assert.deepEqual(result.repaired, [{ marketId: 'market-1', status: 'inflated' }]);
  assert.deepEqual(result.skipped, []);
});

runTest('dry-run does not repair inflated projections', async () => {
  const rebuilt: string[] = [];
  const result = await reconcileTouchedMarketProjections(
    ['market-1'],
    {
      context: 'staff-view',
      dryRun: true,
      compare: async (marketId) => comparison(marketId, 'inflated'),
      rebuild: async (marketId) => {
        rebuilt.push(marketId);
      },
    }
  );

  assert.deepEqual(rebuilt, []);
  assert.deepEqual(result.repaired, []);
  assert.deepEqual(result.skipped, [{ marketId: 'market-1', reason: 'dry_run' }]);
});

runTest('does not repair lower_than_events or missing projections', async () => {
  const result = await reconcileTouchedMarketProjections(
    ['market-low', 'market-missing'],
    {
      context: 'owner-incremental',
      compare: async (marketId) =>
        comparison(marketId, marketId === 'market-low' ? 'lower_than_events' : 'missing_or_no_events'),
      rebuild: async () => {
        throw new Error('should not rebuild skipped projections');
      },
    }
  );

  assert.deepEqual(result.repaired, []);
  assert.deepEqual(result.skipped, [
    { marketId: 'market-low', reason: 'lower_than_events' },
    { marketId: 'market-missing', reason: 'missing_or_no_events' },
  ]);
});

runTest('captures per-market errors without throwing', async () => {
  const result = await reconcileTouchedMarketProjections(
    ['market-error', 'market-ok'],
    {
      context: 'snapshot',
      compare: async (marketId) => {
        if (marketId === 'market-error') throw new Error('boom');
        return comparison(marketId, 'consistent');
      },
    }
  );

  assert.deepEqual(result.errors, [{ marketId: 'market-error', message: 'boom' }]);
  assert.deepEqual(result.skipped, [{ marketId: 'market-ok', reason: 'consistent' }]);
});

runTest('collectProjectionMarketId collects only projection-affecting event types', () => {
  const marketIds = new Set<string>();

  collectProjectionMarketId(marketIds, { type: 'deal_closed', market_id: 'market-1' });
  collectProjectionMarketId(marketIds, { type: 'deal_deleted', payload: { market_id: 'market-2' } });
  collectProjectionMarketId(marketIds, { type: 'interaction_recorded', payload: { marketId: 'market-3' } });
  collectProjectionMarketId(marketIds, { type: 'product_updated', market_id: 'market-4' });
  collectProjectionMarketId(marketIds, { type: 'deal_closed', market_id: '' });

  assert.deepEqual(Array.from(marketIds), ['market-1', 'market-2', 'market-3']);
});

async function main(): Promise<void> {
  let failed = 0;
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sync reconciliation tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
