import assert from 'node:assert/strict';
import { createWebSessionStatePort } from '../lib/platform/web/session-state';
import { getSessionStatePort, installSessionStatePort } from '../lib/platform/session-state-capability';

const memory = new Map<string, string>();
const port = createWebSessionStatePort(() => ({
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => { memory.set(key, value); },
}));
const state = JSON.stringify({ view: 'preparing', preparationFilter: 'payment_due', searchQuery: '台南', scrollY: 280 });
port.write('list', state);
assert.equal(port.read('list'), state);
assert.equal(port.read('missing'), null);

for (const blocked of [
  createWebSessionStatePort(() => null),
  createWebSessionStatePort(() => { throw new Error('storage access denied'); }),
  createWebSessionStatePort(() => ({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota exceeded'); } })),
]) {
  assert.equal(blocked.read('list'), null);
  assert.doesNotThrow(() => blocked.write('list', state), 'private mode or unavailable storage must not block navigation');
}

const original = getSessionStatePort();
const restore = installSessionStatePort(port);
assert.equal(getSessionStatePort().read('list'), state);
restore();
assert.equal(getSessionStatePort(), original);
console.log('PASS transient view state portability and blocked-storage navigation');
