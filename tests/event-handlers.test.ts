import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { eventHandlers } from '../lib/db/events';
import type { Event } from '../types/db';

const TS = 1_700_000_000_000;

function productDeletedEvent(productId: string): Event<{ productId: string }> {
  return {
    id: `evt-delete-${productId}`,
    type: 'product_deleted',
    payload: { productId },
    timestamp: TS,
    actor_id: 'user-1',
    market_id: 'market-1',
  };
}

async function main(): Promise<void> {
  const handler = eventHandlers.product_deleted;
  assert.ok(handler, 'product_deleted handler should be registered');

  const originalUpdate = db.products.update.bind(db.products);
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];

  try {
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };

    db.products.update = ((_id: string, _changes: Record<string, unknown>) =>
      Promise.resolve(0)) as typeof db.products.update;

    await handler(productDeletedEvent('missing-product'), db);

    assert.equal(warnings.length, 1, 'missing product tombstone should warn once');
    assert.match(
      String(warnings[0][0]),
      /Product not found for product_deleted/,
      'warning should describe the idempotent tombstone',
    );

    console.log('PASS product_deleted missing product is idempotent');

    let updatedId: unknown;
    let updatedChanges: Record<string, unknown> | undefined;

    db.products.update = ((id: string, changes: Record<string, unknown>) => {
      updatedId = id;
      updatedChanges = changes;
      return Promise.resolve(1);
    }) as typeof db.products.update;

    await handler(productDeletedEvent('product-1'), db);

    assert.equal(updatedId, 'product-1', 'existing product should be updated');
    assert.deepEqual(
      updatedChanges,
      { isActive: false, updatedAt: TS },
      'product_deleted should mark an existing product inactive',
    );

    console.log('PASS product_deleted existing product marks inactive');
  } finally {
    db.products.update = originalUpdate;
    console.warn = originalWarn;
  }
}

main().catch((error) => {
  console.error('FAIL event handlers');
  throw error;
});
