import assert from 'node:assert/strict';
import {
  normalizeProductsSold,
  toNonNegativeNumber,
  toNumber,
} from '../lib/db/recovery';

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('normalizeProductsSold: valid array is preserved', () => {
  const input = [
    { productId: 'prod-1', quantity: 3, revenue: 500 },
    { productId: 'prod-2', quantity: 1, revenue: 200 },
  ];
  const result = normalizeProductsSold(input);
  assert.equal(result.length, 2);
  assert.equal(result[0].productId, 'prod-1');
  assert.equal(result[0].quantity, 3);
  assert.equal(result[0].revenue, 500);
  assert.equal(result[1].productId, 'prod-2');
  assert.equal(result[1].quantity, 1);
  assert.equal(result[1].revenue, 200);
});

runTest('normalizeProductsSold: missing / null / non-array returns empty array', () => {
  assert.deepEqual(normalizeProductsSold(undefined), []);
  assert.deepEqual(normalizeProductsSold(null), []);
  assert.deepEqual(normalizeProductsSold(undefined), []);
  assert.deepEqual(normalizeProductsSold('string'), []);
  assert.deepEqual(normalizeProductsSold(123), []);
  assert.deepEqual(normalizeProductsSold({}), []);
  assert.deepEqual(normalizeProductsSold(NaN), []);
});

runTest('normalizeProductsSold: null / empty / whitespace-only productId is filtered out', () => {
  const input = [
    { productId: null, quantity: 1, revenue: 100 },
    { productId: '', quantity: 2, revenue: 200 },
    { productId: '  ', quantity: 3, revenue: 300 },
    { productId: 'valid', quantity: 4, revenue: 400 },
  ];
  const result = normalizeProductsSold(input);
  assert.equal(result.length, 1, 'only valid productId should remain');
  assert.equal(result[0].productId, 'valid');
  assert.equal(result[0].quantity, 4);
  assert.equal(result[0].revenue, 400);
});

runTest('normalizeProductsSold: quantity/revenue NaN or negative are normalized to 0', () => {
  const input = [
    { productId: 'prod-1', quantity: NaN, revenue: NaN },
    { productId: 'prod-2', quantity: -5, revenue: -100 },
  ];
  const result = normalizeProductsSold(input);
  assert.equal(result.length, 2);
  assert.equal(result[0].productId, 'prod-1');
  assert.equal(result[0].quantity, 0);
  assert.equal(result[0].revenue, 0);
  assert.equal(result[1].productId, 'prod-2');
  assert.equal(result[1].quantity, 0);
  assert.equal(result[1].revenue, 0);
});

runTest('normalizeProductsSold: non-object items in array are filtered out', () => {
  const input = [
    { productId: 'valid', quantity: 1, revenue: 100 },
    null,
    'string',
    42,
    { productId: 'also-valid', quantity: 2, revenue: 200 },
  ];
  const result = normalizeProductsSold(input);
  assert.equal(result.length, 2);
  assert.equal(result[0].productId, 'valid');
  assert.equal(result[1].productId, 'also-valid');
});

runTest('toNonNegativeNumber: valid non-negative numbers return as-is', () => {
  assert.equal(toNonNegativeNumber(0), 0);
  assert.equal(toNonNegativeNumber(1), 1);
  assert.equal(toNonNegativeNumber(99.5), 99.5);
  assert.equal(toNonNegativeNumber(1_000_000), 1_000_000);
});

runTest('toNonNegativeNumber: undefined / null / NaN fall back to 0', () => {
  assert.equal(toNonNegativeNumber(undefined), 0);
  assert.equal(toNonNegativeNumber(null), 0);
  assert.equal(toNonNegativeNumber(NaN), 0);
});

runTest('toNonNegativeNumber: negative numbers fall back to 0', () => {
  assert.equal(toNonNegativeNumber(-1), 0);
  assert.equal(toNonNegativeNumber(-0.01), 0);
  assert.equal(toNonNegativeNumber(-999), 0);
});

runTest('toNonNegativeNumber: non-numeric types fall back to 0', () => {
  assert.equal(toNonNegativeNumber('42'), 0);
  assert.equal(toNonNegativeNumber('hello'), 0);
  assert.equal(toNonNegativeNumber(true), 0);
  assert.equal(toNonNegativeNumber(false), 0);
  assert.equal(toNonNegativeNumber({}), 0);
});

runTest('toNonNegativeNumber: Infinity falls back to 0', () => {
  assert.equal(toNonNegativeNumber(Infinity), 0);
  assert.equal(toNonNegativeNumber(-Infinity), 0);
});

runTest('toNonNegativeNumber: custom fallback is used when value is invalid', () => {
  assert.equal(toNonNegativeNumber(undefined, 99), 99);
  assert.equal(toNonNegativeNumber(null, 77), 77);
  assert.equal(toNonNegativeNumber(NaN, 55), 55);
  assert.equal(toNonNegativeNumber(-10, 33), 33);
  assert.equal(toNonNegativeNumber('abc', 11), 11);
});

runTest('toNonNegativeNumber: custom fallback is ignored when value is valid', () => {
  assert.equal(toNonNegativeNumber(42, 99), 42);
  assert.equal(toNonNegativeNumber(0, 99), 0);
});

runTest('toNumber: valid finite numbers return as-is', () => {
  assert.equal(toNumber(0), 0);
  assert.equal(toNumber(1), 1);
  assert.equal(toNumber(-42), -42);
  assert.equal(toNumber(99.9), 99.9);
  assert.equal(toNumber(-0.001), -0.001);
});

runTest('toNumber: undefined / null / NaN fall back to 0', () => {
  assert.equal(toNumber(undefined), 0);
  assert.equal(toNumber(null), 0);
  assert.equal(toNumber(NaN), 0);
});

runTest('toNumber: Infinity falls back to 0', () => {
  assert.equal(toNumber(Infinity), 0);
  assert.equal(toNumber(-Infinity), 0);
});

runTest('toNumber: non-numeric types fall back to 0', () => {
  assert.equal(toNumber('42'), 0);
  assert.equal(toNumber('hello'), 0);
  assert.equal(toNumber(true), 0);
  assert.equal(toNumber(false), 0);
});

runTest('toNumber: custom fallback is used when value is invalid', () => {
  assert.equal(toNumber(undefined, 99), 99);
  assert.equal(toNumber(null, 77), 77);
  assert.equal(toNumber(NaN, 55), 55);
  assert.equal(toNumber(Infinity, 33), 33);
  assert.equal(toNumber('abc', 11), 11);
});

runTest('toNumber: custom fallback is ignored when value is valid', () => {
  assert.equal(toNumber(42, 99), 42);
  assert.equal(toNumber(-7, 99), -7);
  assert.equal(toNumber(0, 99), 0);
});
