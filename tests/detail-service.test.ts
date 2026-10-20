import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { getMarketDetail } from '../lib/markets/detail-service';
import { getProductDetail } from '../lib/products/detail-service';
import type { Market, Product } from '../types/db';

type GetById<T> = (id: string) => Promise<T | undefined>;

async function main(): Promise<void> {
  const originalMarketGet = db.markets.get.bind(db.markets);
  const originalProductGet = db.products.get.bind(db.products);

  const marketIds: string[] = [];
  const productIds: string[] = [];

  try {
    db.markets.get = (async (id: string) => {
      marketIds.push(id);
      return { id, name: 'Night Market' } as Market;
    }) as typeof db.markets.get;

    db.products.get = (async (id: string) => {
      productIds.push(id);
      return {
        id,
        name: 'Tea',
        category: 'food',
        price: 120,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Product;
    }) as typeof db.products.get;

    assert.equal(await getMarketDetail('   '), undefined);
    assert.equal(await getProductDetail(''), undefined);
    assert.deepEqual(marketIds, []);
    assert.deepEqual(productIds, []);

    assert.equal((await getMarketDetail('market-1'))?.id, 'market-1');
    assert.equal((await getProductDetail('product-1'))?.id, 'product-1');
    assert.deepEqual(marketIds, ['market-1']);
    assert.deepEqual(productIds, ['product-1']);
  } finally {
    db.markets.get = originalMarketGet as GetById<Market> as typeof db.markets.get;
    db.products.get = originalProductGet as GetById<Product> as typeof db.products.get;
  }

  console.log('PASS detail read services reject blank IDs');
}

main().catch((error) => {
  console.error('FAIL detail read services reject blank IDs');
  throw error;
});
