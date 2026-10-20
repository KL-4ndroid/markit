import assert from 'node:assert/strict';
import {
  preflightStaffEventImport,
  type StaffEventPreflightContext,
} from '../lib/sync/staff-event-preflight';

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function context(markets: string[] = [], products: string[] = []): StaffEventPreflightContext {
  const marketSet = new Set(markets);
  const productSet = new Set(products);

  return {
    hasMarket: async (marketId) => marketSet.has(marketId),
    hasProduct: async (productId) => productSet.has(productId),
  };
}

async function main(): Promise<void> {
  await runTest('allows market-scoped event when market exists', async () => {
    const result = await preflightStaffEventImport(
      {
        type: 'interaction_recorded',
        market_id: 'market-1',
        payload: { marketId: 'market-1', type: 'touch' },
      },
      context(['market-1'])
    );

    assert.equal(result.shouldImport, true);
  });

  await runTest('skips market-scoped event when market is unavailable', async () => {
    const result = await preflightStaffEventImport(
      {
        type: 'interaction_recorded',
        market_id: 'market-1',
        payload: { marketId: 'market-1', type: 'touch' },
      },
      context([])
    );

    assert.deepEqual(result, {
      shouldImport: false,
      reason: 'market_not_available',
      referenceId: 'market-1',
    });
  });

  await runTest('skips market-scoped event when market id is missing', async () => {
    const result = await preflightStaffEventImport(
      {
        type: 'interaction_recorded',
        payload: { type: 'touch' },
      },
      context(['market-1'])
    );

    assert.deepEqual(result, {
      shouldImport: false,
      reason: 'missing_market_id',
    });
  });

  await runTest('allows deal_deleted when market exists even if target event is absent', async () => {
    const result = await preflightStaffEventImport(
      {
        type: 'deal_deleted',
        market_id: 'market-1',
        payload: { marketId: 'market-1', eventId: 'missing-deal-1' },
      },
      context(['market-1'])
    );

    assert.equal(result.shouldImport, true);
  });

  await runTest('skips product_deleted when product is unavailable', async () => {
    const result = await preflightStaffEventImport(
      {
        type: 'product_deleted',
        market_id: 'market-1',
        payload: { productId: 'product-1' },
      },
      context(['market-1'], [])
    );

    assert.deepEqual(result, {
      shouldImport: false,
      reason: 'product_not_available',
      referenceId: 'product-1',
    });
  });

  await runTest('allows product_deleted when product exists', async () => {
    const result = await preflightStaffEventImport(
      {
        type: 'product_deleted',
        market_id: 'market-1',
        payload: { productId: 'product-1' },
      },
      context(['market-1'], ['product-1'])
    );

    assert.equal(result.shouldImport, true);
  });

  await runTest('allows global event types without market or product references', async () => {
    const result = await preflightStaffEventImport(
      {
        type: 'settings_updated',
        payload: { theme: 'dark' },
      },
      context()
    );

    assert.equal(result.shouldImport, true);
  });

  await runTest('allows deal_closed with unavailable item product when market exists', async () => {
    const result = await preflightStaffEventImport(
      {
        type: 'deal_closed',
        market_id: 'market-1',
        payload: {
          marketId: 'market-1',
          totalAmount: 100,
          items: [{ productId: 'missing-product-1', quantity: 1, price: 100 }],
        },
      },
      context(['market-1'])
    );

    assert.equal(result.shouldImport, true);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
