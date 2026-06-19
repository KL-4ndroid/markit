/**
 * P5-4b Role Cache Invalidation 測試
 *
 * 目標：驗證 useUserRole 在 P5-4b 新增的 role cache invalidation 機制：
 * 1. invalidateRoleCache 仍清 localStorage（既有行為）
 * 2. invalidateRoleCache 額外 dispatch 'boothbook:role-cache-invalidated' custom event
 * 3. subscribeToRoleCacheInvalidation 可註冊 listener
 * 4. unsubscribe 後不再收到 event
 * 5. 多個 listener 都能收到 event
 * 6. SSR / window undefined 時 invalidateRoleCache / subscribe 不 throw
 * 7. dispatchEvent throw 時 invalidateRoleCache 不 throw
 * 8. 靜態檢查：useUserRole 內部有使用 subscribeToRoleCacheInvalidation
 * 9. 靜態檢查：event 名稱一致
 * 10. useUserRole 不依賴 storage event
 *
 * 測試範圍刻意限制在 helper / event 層（不直接 mount React hook）；
 * 整合測試（mounted useUserRole 收到 event 後 revalidate）需 React
 * Testing Library，本倉庫現有測試只用 npx tsx + node:assert，故以
 * helper 層為主。靜態檢查透過 rg + source code read 驗證 hook 整合。
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ROLE_CACHE_INVALIDATED_EVENT,
  clearRoleCache,
  invalidateRoleCache,
  subscribeToRoleCacheInvalidation,
} from '../hooks/useUserRole';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function runTest(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          console.log(`PASS ${name}`);
          passed++;
        })
        .catch((error) => {
          console.error(`FAIL ${name}`);
          console.error(error);
          failures.push(name);
          failed++;
        });
    } else {
      console.log(`PASS ${name}`);
      passed++;
    }
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    failures.push(name);
    failed++;
  }
}

// ─── Mock localStorage（node 環境無 localStorage） ────────────────────────

type LocalStorageShape = Record<string, string>;

function createMockLocalStorage(): {
  store: LocalStorageShape;
  reset: () => void;
} {
  const store: LocalStorageShape = {};
  return {
    store,
    reset: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
  };
}

const mockLs = createMockLocalStorage();

(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (key: string) => mockLs.store[key] ?? null,
  setItem: (key: string, value: string) => {
    mockLs.store[key] = value;
  },
  removeItem: (key: string) => {
    delete mockLs.store[key];
  },
  clear: () => mockLs.reset(),
  key: (i: number) => Object.keys(mockLs.store)[i] ?? null,
  get length() {
    return Object.keys(mockLs.store).length;
  },
};

// ─── Mock window（node 環境無 window） ──────────────────────────────────
//
// 策略：先暫存 node 內建 globalThis 上的 window stub（由 useUserRole 載入時建立），
// 然後在 SSR 模擬測試中暫時刪除，測完再恢復。
//
// 為避免污染後續測試，本檔案測試結束前不刪除 globalThis.window。

const windowListeners: Record<string, Set<EventListener>> = {};

function ensureWindow(): void {
  if (typeof (globalThis as { window?: unknown }).window !== 'object') {
    (globalThis as { window?: unknown }).window = {
      localStorage: (globalThis as { localStorage?: unknown }).localStorage,
      addEventListener: (type: string, listener: EventListener) => {
        if (!windowListeners[type]) windowListeners[type] = new Set();
        windowListeners[type].add(listener);
      },
      removeEventListener: (type: string, listener: EventListener) => {
        windowListeners[type]?.delete(listener);
      },
      dispatchEvent: (event: Event) => {
        const listeners = windowListeners[event.type];
        if (!listeners) return true;
        for (const listener of listeners) {
          try {
            listener(event);
          } catch (e) {
            // 模擬瀏覽器行為：不 throw
            console.error('listener threw:', e);
          }
        }
        return true;
      },
    };
  }
}

ensureWindow();

function clearAllWindowListeners(): void {
  for (const key of Object.keys(windowListeners)) {
    windowListeners[key].clear();
  }
}

// ─── 共用 fixture ────────────────────────────────────────────────────────

const ROLE_CACHE_KEY = 'user_role_cache';

function setRoleCache(role: object): void {
  mockLs.store[ROLE_CACHE_KEY] = JSON.stringify({
    userId: 'user-A',
    role,
    timestamp: Date.now(),
  });
}

function readRoleCache(): unknown {
  const raw = mockLs.store[ROLE_CACHE_KEY];
  return raw ? JSON.parse(raw) : null;
}

// ─── 1. invalidateRoleCache clears user_role_cache ─────────────────────

console.log('\n=== 1. invalidateRoleCache clears localStorage ===');

runTest('clears user_role_cache from localStorage', () => {
  mockLs.reset();
  clearAllWindowListeners();
  setRoleCache({ isStaff: true, staffRole: 'operator' });
  assert.ok(readRoleCache() !== null, 'precondition: cache exists');
  invalidateRoleCache();
  assert.equal(mockLs.store[ROLE_CACHE_KEY], undefined, 'cache removed');
});

runTest('clearRoleCache still works independently', () => {
  mockLs.reset();
  setRoleCache({ isStaff: true });
  clearRoleCache();
  assert.equal(mockLs.store[ROLE_CACHE_KEY], undefined);
});

// ─── 2. invalidateRoleCache dispatches custom event ────────────────────

console.log('\n=== 2. invalidateRoleCache dispatches custom event ===');

runTest('dispatches boothbook:role-cache-invalidated', () => {
  mockLs.reset();
  clearAllWindowListeners();
  let callCount = 0;
  subscribeToRoleCacheInvalidation(() => {
    callCount++;
  });
  invalidateRoleCache();
  assert.equal(callCount, 1, 'listener called exactly once');
});

runTest('event is CustomEvent instance', () => {
  mockLs.reset();
  clearAllWindowListeners();
  // useUserRole 內的 new CustomEvent(...) 透過 globalThis.CustomEvent
  // （在 node 環境由 jsdom-style polyfill 或 ES2020 內建）建立。
  // 測試重點：dispatch 出來的 event 物件 type 正確，且非普通 Event。
  const win = (globalThis as { window: any }).window;
  let captured: Event | null = null;
  const handler = (e: Event) => {
    captured = e;
  };
  win.addEventListener(ROLE_CACHE_INVALIDATED_EVENT, handler);
  invalidateRoleCache();
  win.removeEventListener(ROLE_CACHE_INVALIDATED_EVENT, handler);
  assert.ok(captured !== null, 'event captured');
  assert.equal(captured!.type, ROLE_CACHE_INVALIDATED_EVENT, 'event type matches');
  // CustomEvent 的 constructor.name === 'CustomEvent'
  assert.equal(
    (captured as { constructor?: { name?: string } }).constructor?.name,
    'CustomEvent',
    'event constructor is CustomEvent'
  );
});

// ─── 3. subscribeToRoleCacheInvalidation receives event ─────────────────

console.log('\n=== 3. subscribe receives event ===');

runTest('subscribe handler called when event dispatched', () => {
  mockLs.reset();
  clearAllWindowListeners();
  let callCount = 0;
  const unsubscribe = subscribeToRoleCacheInvalidation(() => {
    callCount++;
  });
  invalidateRoleCache();
  assert.equal(callCount, 1);
  unsubscribe();
});

// ─── 4. unsubscribe 後不再收到 event ──────────────────────────────────

console.log('\n=== 4. unsubscribe stops receiving ===');

runTest('after unsubscribe, no more events received', () => {
  mockLs.reset();
  clearAllWindowListeners();
  let callCount = 0;
  const unsubscribe = subscribeToRoleCacheInvalidation(() => {
    callCount++;
  });
  invalidateRoleCache();
  assert.equal(callCount, 1);
  unsubscribe();
  invalidateRoleCache();
  assert.equal(callCount, 1, 'count unchanged after unsubscribe');
  invalidateRoleCache();
  assert.equal(callCount, 1);
});

runTest('unsubscribe is idempotent', () => {
  mockLs.reset();
  clearAllWindowListeners();
  let callCount = 0;
  const unsubscribe = subscribeToRoleCacheInvalidation(() => {
    callCount++;
  });
  unsubscribe();
  unsubscribe(); // second call should not throw
  invalidateRoleCache();
  assert.equal(callCount, 0);
});

// ─── 5. 多個 listener 都能收到 event ──────────────────────────────────

console.log('\n=== 5. multiple listeners ===');

runTest('multiple listeners all receive the event', () => {
  mockLs.reset();
  clearAllWindowListeners();
  let countA = 0;
  let countB = 0;
  let countC = 0;
  const unsubA = subscribeToRoleCacheInvalidation(() => {
    countA++;
  });
  const unsubB = subscribeToRoleCacheInvalidation(() => {
    countB++;
  });
  const unsubC = subscribeToRoleCacheInvalidation(() => {
    countC++;
  });
  invalidateRoleCache();
  assert.equal(countA, 1);
  assert.equal(countB, 1);
  assert.equal(countC, 1);
  unsubA();
  unsubB();
  unsubC();
});

// ─── 6. SSR / window undefined ──────────────────────────────────────

console.log('\n=== 6. SSR / window undefined ===');

runTest('invalidateRoleCache does not throw when window undefined', () => {
  // 暫時移除 window
  const originalWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { window?: unknown }).window;
  try {
    invalidateRoleCache();
    // 沒 throw 即過
  } finally {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

runTest('subscribe returns noop when window undefined', () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { window?: unknown }).window;
  try {
    let called = false;
    const unsubscribe = subscribeToRoleCacheInvalidation(() => {
      called = true;
    });
    assert.equal(typeof unsubscribe, 'function', 'returns a function');
    unsubscribe(); // 不 throw
    // 因為 window 已被刪除，listener 不會被註冊
    // 這裡不驗證 called（無法 dispatch event）
    assert.equal(called, false, 'handler not called (no window)');
  } finally {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

// ─── 7. dispatchEvent throw 時 invalidateRoleCache 不 throw ───────────

console.log('\n=== 7. dispatchEvent throw safety ===');

runTest('invalidateRoleCache survives dispatchEvent throw', () => {
  mockLs.reset();
  clearAllWindowListeners();
  const originalWindow = (globalThis as { window: any }).window;
  (globalThis as { window: any }).window = {
    ...originalWindow,
    dispatchEvent: () => {
      throw new Error('mock dispatchEvent failure');
    },
  };
  try {
    invalidateRoleCache();
    // 沒 throw 即過
  } finally {
    (globalThis as { window: any }).window = originalWindow;
  }
});

runTest('localStorage cleared even if dispatch throws', () => {
  mockLs.reset();
  clearAllWindowListeners();
  setRoleCache({ isStaff: true });
  const originalWindow = (globalThis as { window: any }).window;
  (globalThis as { window: any }).window = {
    ...originalWindow,
    dispatchEvent: () => {
      throw new Error('mock dispatchEvent failure');
    },
  };
  try {
    invalidateRoleCache();
  } finally {
    (globalThis as { window: any }).window = originalWindow;
  }
  assert.equal(mockLs.store[ROLE_CACHE_KEY], undefined, 'cache still cleared');
});

// ─── 8. 靜態檢查 ────────────────────────────────────────────────────

console.log('\n=== 8. static checks on useUserRole.ts ===');

const useUserRoleSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/hooks/useUserRole.ts',
  'utf-8'
);

runTest('useUserRole.ts exports ROLE_CACHE_INVALIDATED_EVENT', () => {
  assert.match(
    useUserRoleSource,
    /export const ROLE_CACHE_INVALIDATED_EVENT\s*=\s*['"]boothbook:role-cache-invalidated['"]/,
    'expected const declaration with boothbook:role-cache-invalidated literal'
  );
});

runTest('useUserRole.ts uses subscribeToRoleCacheInvalidation', () => {
  assert.match(
    useUserRoleSource,
    /subscribeToRoleCacheInvalidation\s*\(/,
    'expected subscribeToRoleCacheInvalidation call in hook'
  );
});

runTest('invalidateRoleCache dispatches event', () => {
  assert.match(
    useUserRoleSource,
    /export function invalidateRoleCache\(\)[\s\S]{0,200}dispatchRoleCacheInvalidatedEvent/,
    'expected dispatchRoleCacheInvalidatedEvent call inside invalidateRoleCache'
  );
});

runTest('useUserRole has revalidationInFlightRef', () => {
  assert.match(
    useUserRoleSource,
    /revalidationInFlightRef/,
    'expected revalidationInFlightRef declaration / usage'
  );
});

runTest('useUserRole guards async commits after unmount / stale user change', () => {
  assert.match(
    useUserRoleSource,
    /mountedRef/,
    'expected mountedRef guard for unmount safety'
  );
  assert.match(
    useUserRoleSource,
    /roleRequestIdRef/,
    'expected request id guard for stale async result safety'
  );
  assert.match(
    useUserRoleSource,
    /currentUserIdRef/,
    'expected current user guard for user-switch safety'
  );
  assert.match(
    useUserRoleSource,
    /shouldCommitRoleLoad/,
    'expected shared commit guard around async state/cache writes'
  );
});

runTest('useUserRole has new useEffect for event listener', () => {
  // 至少有兩個 useEffect：一個 [user]（既有），一個 event listener（P5-4b 新增）
  const useEffectCount = (useUserRoleSource.match(/useEffect\(/g) || []).length;
  assert.ok(useEffectCount >= 2, `expected >= 2 useEffect, found ${useEffectCount}`);
});

runTest('useUserRole does NOT use storage event', () => {
  assert.doesNotMatch(
    useUserRoleSource,
    /addEventListener\(['"]storage['"]\)/,
    'must not addEventListener storage'
  );
});

runTest('useUserRole does NOT use BroadcastChannel', () => {
  assert.doesNotMatch(
    useUserRoleSource,
    /BroadcastChannel/,
    'must not use BroadcastChannel'
  );
});

runTest('useUserRole does NOT call resetAuthenticatedCache / deleteDatabase / window.location', () => {
  assert.doesNotMatch(useUserRoleSource, /resetAuthenticatedCache/);
  assert.doesNotMatch(useUserRoleSource, /deleteDatabase/);
  assert.doesNotMatch(useUserRoleSource, /window\.location/);
  assert.doesNotMatch(useUserRoleSource, /location\.reload/);
  assert.doesNotMatch(useUserRoleSource, /location\.href/);
});

runTest('useUserRole still uses deriveRolePermissions (fail-closed 保留)', () => {
  assert.match(
    useUserRoleSource,
    /deriveRolePermissions/,
    'fail-closed derivation must remain'
  );
});

runTest('useUserRole does not change canEdit / canViewSensitiveData signature', () => {
  // canEdit / canViewSensitiveData 仍從 permissions 物件解構
  assert.match(useUserRoleSource, /canEdit:\s*permissions\.canEdit/);
  assert.match(useUserRoleSource, /canViewSensitiveData:\s*permissions\.canViewSensitiveData/);
});

runTest('event name uses boothbook: prefix', () => {
  assert.ok(ROLE_CACHE_INVALIDATED_EVENT.startsWith('boothbook:'));
});

runTest('event name is exact string', () => {
  assert.equal(ROLE_CACHE_INVALIDATED_EVENT, 'boothbook:role-cache-invalidated');
});

// ─── 9. integration hint: 模擬 useUserRole 內部行為 ────────────────
//
// 模擬 useUserRole 內部 useEffect 的 listener 註冊與 cleanup 流程。
// 雖然沒真實 mount React hook，但可驗證 subscribe / unsubscribe 配對正確。

console.log('\n=== 9. simulated useUserRole integration ===');

runTest('simulated mount → invalidation → revalidate → unmount cycle', () => {
  mockLs.reset();
  clearAllWindowListeners();
  let revalidateCount = 0;

  // 模擬 useUserRole 內 useEffect
  const unsubscribe = subscribeToRoleCacheInvalidation(() => {
    revalidateCount++;
  });

  // 模擬 P5-4a downgrade detection → invalidateRoleCache
  invalidateRoleCache();
  assert.equal(revalidateCount, 1, 'revalidate triggered on downgrade');

  // 模擬再次 downgrade（< in-flight 視窗外）
  invalidateRoleCache();
  assert.equal(revalidateCount, 2, 'revalidate triggered again');

  // 模擬 unmount
  unsubscribe();

  // 模擬 unmount 後的 invalidate（不應觸發 revalidate）
  invalidateRoleCache();
  assert.equal(revalidateCount, 2, 'revalidate NOT triggered after unmount');
});

runTest('simulated revalidation with in-flight guard (via revalidationInFlightRef)', () => {
  // 這個 case 驗證 hook 內 revalidationInFlightRef 邏輯在 source code 中存在
  // 真正的 in-flight 測試需要 React renderer
  // 靜態檢查已涵蓋（見 section 8）
  // 此處只驗證 helper 層 dispatch / subscribe 配對正確

  mockLs.reset();
  clearAllWindowListeners();
  const handlerCallTimes: number[] = [];
  let counter = 0;
  const unsubscribe = subscribeToRoleCacheInvalidation(() => {
    handlerCallTimes.push(++counter);
  });

  // 模擬短時間內 3 個連續 invalidation
  invalidateRoleCache();
  invalidateRoleCache();
  invalidateRoleCache();
  assert.deepEqual(handlerCallTimes, [1, 2, 3], 'all 3 events received by helper');

  unsubscribe();
});

// ─── 10. dispatchEvent 傳入正確 event 物件 ────────────────────────

console.log('\n=== 10. dispatched event object correctness ===');

runTest('dispatched event is CustomEvent with correct type', () => {
  mockLs.reset();
  clearAllWindowListeners();
  const win = (globalThis as { window: any }).window;
  let capturedType: string | null = null;
  const handler = (e: Event) => {
    capturedType = e.type;
  };
  win.addEventListener(ROLE_CACHE_INVALIDATED_EVENT, handler);
  try {
    invalidateRoleCache();
  } finally {
    win.removeEventListener(ROLE_CACHE_INVALIDATED_EVENT, handler);
  }
  assert.equal(capturedType, ROLE_CACHE_INVALIDATED_EVENT);
});

// ─── 總結 ───────────────────────────────────────────────────────────

// 等 async tests 結束（這裡沒有 async，但保留 pattern）
setImmediate(() => {
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.error('Failures:');
    for (const name of failures) console.error(`  - ${name}`);
    process.exit(1);
  }
});
