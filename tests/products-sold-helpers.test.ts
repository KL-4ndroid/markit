import assert from 'node:assert/strict';
import { mergeProductsSold, subtractProductsSold } from '../lib/db/events';
import type { DailyStats } from '../types/db';

type Entry = DailyStats['productsSold'][number];

function entry(productId: string, quantity: number, revenue: number): Entry {
  return { productId, quantity, revenue };
}

async function main(): Promise<void> {
  // ===== mergeProductsSold =====

  assert.deepEqual(mergeProductsSold([], []), [], 'empty + empty → []');

  assert.deepEqual(
    mergeProductsSold([entry('p1', 3, 300)], []),
    [entry('p1', 3, 300)],
    'only existing → preserved',
  );

  assert.deepEqual(
    mergeProductsSold([entry('p1', 3, 300)], [entry('p1', 2, 200)]),
    [entry('p1', 5, 500)],
    'same productId merges quantity and revenue',
  );

  assert.deepEqual(
    mergeProductsSold(
      [entry('p1', 1, 100), entry('p2', 2, 200)],
      [entry('p1', 3, 300), entry('p3', 4, 400)],
    ),
    [entry('p1', 4, 400), entry('p2', 2, 200), entry('p3', 4, 400)],
    'multiple productIds each merged independently',
  );

  assert.deepEqual(
    mergeProductsSold([entry('p1', 1, 100)], [entry('p1', -1, -50)]),
    [entry('p1', 0, 50)],
    'negative addition: quantity clamped to 0 via ||, revenue unchanged',
  );

  assert.deepEqual(
    mergeProductsSold([entry('p1', 0, 0)], [entry('p1', 0, 0)]),
    [entry('p1', 0, 0)],
    'zero values stay zero',
  );

  console.log('PASS mergeProductsSold');

  // ===== subtractProductsSold =====

  assert.deepEqual(subtractProductsSold([], []), [], 'empty + empty → []');

  assert.deepEqual(
    subtractProductsSold([entry('p1', 3, 300)], []),
    [entry('p1', 3, 300)],
    'only existing → preserved',
  );

  assert.deepEqual(
    subtractProductsSold([entry('p1', 5, 500)], [entry('p1', 2, 200)]),
    [entry('p1', 3, 300)],
    'partial subtraction',
  );

  assert.deepEqual(
    subtractProductsSold([entry('p1', 5, 500)], [entry('p1', 5, 500)]),
    [],
    'full subtraction removes the productId entirely',
  );

  assert.deepEqual(
    subtractProductsSold([entry('p1', 2, 200)], [entry('p1', 5, 500)]),
    [],
    'over-subtraction clamps to 0, key is removed when both values reach 0',
  );

  assert.deepEqual(
    subtractProductsSold([entry('p1', 3, 300)], [entry('p2', 1, 100)]),
    [entry('p1', 3, 300)],
    'non-existent productId in removals does not affect existing',
  );

  assert.deepEqual(
    subtractProductsSold([entry('p1', 1, 100), entry('p2', 2, 200)], [entry('p1', 1, 100)]),
    [entry('p2', 2, 200)],
    'only the matched productId is removed, others preserved',
  );

  console.log('PASS subtractProductsSold');
}

main().catch((error) => {
  console.error('FAIL products sold helpers');
  throw error;
});
