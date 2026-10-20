/**
 * P5-4a Downgrade Detection 測試
 *
 * 目標：驗證 useStaffStatusMonitor 在 P5-4a 新增的 role downgrade 偵測邏輯：
 * 1. classifyStaffRoleChange 純函式語意正確
 * 2. readKnownRoleCache / writeKnownRoleCache localStorage 隔離
 * 3. handleRoleChangeDetection 純 helper 行為正確（含 downgrade 觸發 onDowngrade）
 * 4. downgrade 後寫入新 knownRoleCache，第二次 poll 不再觸發 onDowngrade
 * 5. upgrade 僅更新 cache，不觸發 onDowngrade
 * 6. baseline 寫入 + same 寫入 timestamp 行為
 * 7. userId / ownerId mismatch / invalid JSON / 非法 role fail-closed
 * 8. readInfoLevelFromPermissions 從任意 permissions 物件安全讀取 infoLevel
 *
 * 測試範圍刻意限制在純 helper 層（不直接 mount React hook）；
 * hook 整合測試需 React Testing Library，本倉庫現有測試只用 npx tsx + node:assert，
 * 故以純 helper 為主。
 */

import assert from 'node:assert/strict';
import {
  STAFF_STATUS_KNOWN_ROLE_KEY,
  classifyStaffRoleChange,
  handleRoleChangeDetection,
  readInfoLevelFromPermissions,
  readKnownRoleCache,
  writeKnownRoleCache,
  type StaffStatusKnownRoleCache,
} from '../hooks/useStaffStatusMonitor';
import type { StaffRole } from '../types/staff';

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

// ─── 共用 fixture ────────────────────────────────────────────────────────

const USER_A = 'user-A';
const USER_B = 'user-B';
const OWNER_X = 'owner-X';
const OWNER_Y = 'owner-Y';

function makeBaseline(role: StaffRole | null, infoLevel: number | null = 2): StaffStatusKnownRoleCache {
  return {
    userId: USER_A,
    ownerId: OWNER_X,
    role,
    infoLevel,
    timestamp: 1000,
  };
}

function makeLoggerMock() {
  return {
    info: (...args: unknown[]) => undefined,
    warn: (...args: unknown[]) => undefined,
    infoCalls: [] as unknown[][],
    warnCalls: [] as unknown[][],
  };
}

// ─── 1. classifyStaffRoleChange 純函式語意 ──────────────────────────────

console.log('\n=== 1. classifyStaffRoleChange ===');

runTest('operator → viewer = downgrade', () => {
  assert.equal(classifyStaffRoleChange('operator', 'viewer'), 'downgrade');
});

runTest('manager → viewer = downgrade', () => {
  assert.equal(classifyStaffRoleChange('manager', 'viewer'), 'downgrade');
});

runTest('manager → operator = downgrade', () => {
  assert.equal(classifyStaffRoleChange('manager', 'operator'), 'downgrade');
});

runTest('viewer → operator = upgrade', () => {
  assert.equal(classifyStaffRoleChange('viewer', 'operator'), 'upgrade');
});

runTest('viewer → manager = upgrade', () => {
  assert.equal(classifyStaffRoleChange('viewer', 'manager'), 'upgrade');
});

runTest('operator → manager = upgrade', () => {
  assert.equal(classifyStaffRoleChange('operator', 'manager'), 'upgrade');
});

runTest('operator → operator = same', () => {
  assert.equal(classifyStaffRoleChange('operator', 'operator'), 'same');
});

runTest('manager → manager = same', () => {
  assert.equal(classifyStaffRoleChange('manager', 'manager'), 'same');
});

runTest('viewer → viewer = same', () => {
  assert.equal(classifyStaffRoleChange('viewer', 'viewer'), 'same');
});

runTest('previous null → unknown', () => {
  assert.equal(classifyStaffRoleChange(null, 'operator'), 'unknown');
});

runTest('current null → unknown', () => {
  assert.equal(classifyStaffRoleChange('operator', null), 'unknown');
});

runTest('both null → unknown', () => {
  assert.equal(classifyStaffRoleChange(null, null), 'unknown');
});

runTest('previous undefined → unknown', () => {
  assert.equal(classifyStaffRoleChange(undefined, 'operator'), 'unknown');
});

// ─── 2. readInfoLevelFromPermissions ───────────────────────────────────

console.log('\n=== 2. readInfoLevelFromPermissions ===');

runTest('合法 number infoLevel', () => {
  assert.equal(readInfoLevelFromPermissions({ infoLevel: 2 }), 2);
});

runTest('null permissions → null', () => {
  assert.equal(readInfoLevelFromPermissions(null), null);
});

runTest('undefined permissions → null', () => {
  assert.equal(readInfoLevelFromPermissions(undefined), null);
});

runTest('string infoLevel → null（拒絕非 number）', () => {
  assert.equal(readInfoLevelFromPermissions({ infoLevel: '2' }), null);
});

runTest('NaN infoLevel → null', () => {
  assert.equal(readInfoLevelFromPermissions({ infoLevel: Number.NaN }), null);
});

runTest('missing infoLevel → null', () => {
  assert.equal(readInfoLevelFromPermissions({ can_view: true }), null);
});

runTest('infoLevel=0 視為合法', () => {
  assert.equal(readInfoLevelFromPermissions({ infoLevel: 0 }), 0);
});

runTest('infoLevel=3 視為合法', () => {
  assert.equal(readInfoLevelFromPermissions({ infoLevel: 3 }), 3);
});

// ─── 3. readKnownRoleCache / writeKnownRoleCache ───────────────────────

console.log('\n=== 3. readKnownRoleCache / writeKnownRoleCache ===');

runTest('empty store → null', () => {
  mockLs.reset();
  assert.equal(readKnownRoleCache(USER_A, OWNER_X), null);
});

runTest('write + read roundtrip', () => {
  mockLs.reset();
  const cache = makeBaseline('operator', 2);
  writeKnownRoleCache(cache);
  const read = readKnownRoleCache(USER_A, OWNER_X);
  assert.ok(read !== null);
  assert.equal(read!.userId, USER_A);
  assert.equal(read!.ownerId, OWNER_X);
  assert.equal(read!.role, 'operator');
  assert.equal(read!.infoLevel, 2);
  assert.equal(read!.timestamp, 1000);
});

runTest('userId mismatch → null', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('operator'));
  assert.equal(readKnownRoleCache(USER_B, OWNER_X), null);
});

runTest('ownerId mismatch → null', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('operator'));
  assert.equal(readKnownRoleCache(USER_A, OWNER_Y), null);
});

runTest('invalid JSON → null', () => {
  mockLs.reset();
  mockLs.store[STAFF_STATUS_KNOWN_ROLE_KEY] = '{not valid json';
  assert.equal(readKnownRoleCache(USER_A, OWNER_X), null);
});

runTest('non-object JSON → null', () => {
  mockLs.reset();
  mockLs.store[STAFF_STATUS_KNOWN_ROLE_KEY] = '123';
  assert.equal(readKnownRoleCache(USER_A, OWNER_X), null);
});

runTest('null JSON → null', () => {
  mockLs.reset();
  mockLs.store[STAFF_STATUS_KNOWN_ROLE_KEY] = 'null';
  assert.equal(readKnownRoleCache(USER_A, OWNER_X), null);
});

runTest('非法 role → null', () => {
  mockLs.reset();
  mockLs.store[STAFF_STATUS_KNOWN_ROLE_KEY] = JSON.stringify({
    userId: USER_A,
    ownerId: OWNER_X,
    role: 'admin',
    infoLevel: 2,
    timestamp: 1,
  });
  assert.equal(readKnownRoleCache(USER_A, OWNER_X), null);
});

runTest('null role 視為合法（fail-closed baseline）', () => {
  mockLs.reset();
  mockLs.store[STAFF_STATUS_KNOWN_ROLE_KEY] = JSON.stringify({
    userId: USER_A,
    ownerId: OWNER_X,
    role: null,
    infoLevel: null,
    timestamp: 1,
  });
  const read = readKnownRoleCache(USER_A, OWNER_X);
  assert.ok(read !== null);
  assert.equal(read!.role, null);
  assert.equal(read!.infoLevel, null);
});

runTest('infoLevel 非 number → null', () => {
  mockLs.reset();
  mockLs.store[STAFF_STATUS_KNOWN_ROLE_KEY] = JSON.stringify({
    userId: USER_A,
    ownerId: OWNER_X,
    role: 'operator',
    infoLevel: 'two',
    timestamp: 1,
  });
  const read = readKnownRoleCache(USER_A, OWNER_X);
  assert.ok(read !== null);
  assert.equal(read!.infoLevel, null);
});

runTest('timestamp 非 number → fallback Date.now()', () => {
  mockLs.reset();
  mockLs.store[STAFF_STATUS_KNOWN_ROLE_KEY] = JSON.stringify({
    userId: USER_A,
    ownerId: OWNER_X,
    role: 'operator',
    infoLevel: 2,
    timestamp: 'never',
  });
  const read = readKnownRoleCache(USER_A, OWNER_X);
  assert.ok(read !== null);
  assert.equal(typeof read!.timestamp, 'number');
});

// ─── 4. handleRoleChangeDetection ──────────────────────────────────────

console.log('\n=== 4. handleRoleChangeDetection ===');

runTest('first poll no cache + current operator → write baseline, no onDowngrade', () => {
  mockLs.reset();
  let persisted: StaffStatusKnownRoleCache | null = null;
  let downgradeCalled = false;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: undefined,
    currentRole: 'operator',
    currentInfoLevel: 2,
    persist: (c) => {
      persisted = c;
    },
    onDowngrade: () => {
      downgradeCalled = true;
    },
  });
  assert.equal(result, 'baseline');
  assert.equal(downgradeCalled, false);
  assert.ok(persisted !== null);
  assert.equal(persisted!.role, 'operator');
  assert.equal(persisted!.infoLevel, 2);
});

runTest('active staff role unchanged → no invalidate', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('operator', 2));
  let downgradeCalled = false;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'operator',
    currentRole: 'operator',
    currentInfoLevel: 2,
    persist: () => undefined,
    onDowngrade: () => {
      downgradeCalled = true;
    },
  });
  assert.equal(result, 'same');
  assert.equal(downgradeCalled, false);
});

runTest('viewer → operator → upgrade, no onDowngrade', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('viewer', 0));
  let downgradeCalled = false;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'viewer',
    currentRole: 'operator',
    currentInfoLevel: 2,
    persist: () => undefined,
    onDowngrade: () => {
      downgradeCalled = true;
    },
  });
  assert.equal(result, 'upgrade');
  assert.equal(downgradeCalled, false);
});

runTest('operator → manager → upgrade, no onDowngrade', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('operator', 2));
  let downgradeCalled = false;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'operator',
    currentRole: 'manager',
    currentInfoLevel: 2,
    persist: () => undefined,
    onDowngrade: () => {
      downgradeCalled = true;
    },
  });
  assert.equal(result, 'upgrade');
  assert.equal(downgradeCalled, false);
});

runTest('operator → viewer → downgrade, onDowngrade called', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('operator', 2));
  let downgradeFromTo: [StaffRole, StaffRole] | null = null;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'operator',
    currentRole: 'viewer',
    currentInfoLevel: 0,
    persist: () => undefined,
    onDowngrade: (from, to) => {
      downgradeFromTo = [from, to];
    },
  });
  assert.equal(result, 'downgrade');
  assert.deepEqual(downgradeFromTo, ['operator', 'viewer']);
});

runTest('manager → viewer → downgrade, onDowngrade called', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('manager', 2));
  let downgradeFromTo: [StaffRole, StaffRole] | null = null;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'manager',
    currentRole: 'viewer',
    currentInfoLevel: 0,
    persist: () => undefined,
    onDowngrade: (from, to) => {
      downgradeFromTo = [from, to];
    },
  });
  assert.equal(result, 'downgrade');
  assert.deepEqual(downgradeFromTo, ['manager', 'viewer']);
});

runTest('manager → operator → downgrade, onDowngrade called', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('manager', 2));
  let downgradeFromTo: [StaffRole, StaffRole] | null = null;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'manager',
    currentRole: 'operator',
    currentInfoLevel: 2,
    persist: () => undefined,
    onDowngrade: (from, to) => {
      downgradeFromTo = [from, to];
    },
  });
  assert.equal(result, 'downgrade');
  assert.deepEqual(downgradeFromTo, ['manager', 'operator']);
});

runTest('downgrade updates knownRole to current role', () => {
  mockLs.reset();
  let persisted: StaffStatusKnownRoleCache | null = null;
  handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'operator',
    currentRole: 'viewer',
    currentInfoLevel: 0,
    persist: (c) => {
      persisted = c;
    },
    onDowngrade: () => undefined,
  });
  assert.ok(persisted !== null);
  assert.equal(persisted!.role, 'viewer');
  assert.equal(persisted!.infoLevel, 0);
  // roundtrip via writeKnownRoleCache
  writeKnownRoleCache(persisted!);
  const read = readKnownRoleCache(USER_A, OWNER_X);
  assert.ok(read !== null);
  assert.equal(read!.role, 'viewer');
});

runTest('repeated poll after downgrade does not trigger onDowngrade again', () => {
  mockLs.reset();
  // 模擬：第一次 poll 偵測到 downgrade 並寫入 baseline='viewer'
  writeKnownRoleCache(makeBaseline('viewer', 0));
  let downgradeCalled = 0;
  // 第二次 poll：previous=viewer, current=viewer → same
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: readKnownRoleCache(USER_A, OWNER_X)?.role,
    currentRole: 'viewer',
    currentInfoLevel: 0,
    persist: () => undefined,
    onDowngrade: () => {
      downgradeCalled++;
    },
  });
  assert.equal(result, 'same');
  assert.equal(downgradeCalled, 0);
});

runTest('current null → noop（不觸發 downgrade / 不寫 cache）', () => {
  mockLs.reset();
  let downgradeCalled = false;
  let persisted = false;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'operator',
    currentRole: null,
    currentInfoLevel: null,
    persist: () => {
      persisted = true;
    },
    onDowngrade: () => {
      downgradeCalled = true;
    },
  });
  assert.equal(result, 'noop');
  assert.equal(downgradeCalled, false);
  assert.equal(persisted, false);
});

runTest('downgrade with logger.warn', () => {
  mockLs.reset();
  const logger = makeLoggerMock();
  let infoCalled = 0;
  let warnCalled = 0;
  logger.info = () => {
    infoCalled++;
  };
  logger.warn = () => {
    warnCalled++;
  };
  handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'operator',
    currentRole: 'viewer',
    currentInfoLevel: 0,
    persist: () => undefined,
    onDowngrade: () => undefined,
    logger,
  });
  assert.equal(infoCalled, 0);
  assert.equal(warnCalled, 1);
});

runTest('upgrade with logger.info, no warn', () => {
  mockLs.reset();
  const logger = makeLoggerMock();
  let infoCalled = 0;
  let warnCalled = 0;
  logger.info = () => {
    infoCalled++;
  };
  logger.warn = () => {
    warnCalled++;
  };
  handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: 'viewer',
    currentRole: 'operator',
    currentInfoLevel: 2,
    persist: () => undefined,
    onDowngrade: () => undefined,
    logger,
  });
  assert.equal(infoCalled, 1);
  assert.equal(warnCalled, 0);
});

runTest('previousRole null + currentRole valid → baseline', () => {
  mockLs.reset();
  let persisted: StaffStatusKnownRoleCache | null = null;
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: null,
    currentRole: 'operator',
    currentInfoLevel: 2,
    persist: (c) => {
      persisted = c;
    },
    onDowngrade: () => undefined,
  });
  assert.equal(result, 'baseline');
  assert.ok(persisted !== null);
  assert.equal(persisted!.role, 'operator');
});

// ─── 5. 整合：downgrade 端到端（用 mock localStorage + mock onDowngrade） ─

console.log('\n=== 5. 整合 ===');

runTest('整合：operator 首次 → baseline；第二次 viewer → downgrade + invalidate', () => {
  mockLs.reset();
  let invalidateCount = 0;
  const mockInvalidate = () => {
    invalidateCount++;
  };

  // 第一次 poll：無 cache, previous=undefined, current=operator → baseline
  const r1 = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: undefined,
    currentRole: 'operator',
    currentInfoLevel: 2,
    persist: writeKnownRoleCache,
    onDowngrade: mockInvalidate,
  });
  assert.equal(r1, 'baseline');
  assert.equal(invalidateCount, 0);

  // 第二次 poll：current 變 viewer，previous 從 cache 讀
  const cached = readKnownRoleCache(USER_A, OWNER_X);
  assert.ok(cached !== null);
  const r2 = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: cached!.role,
    currentRole: 'viewer',
    currentInfoLevel: 0,
    persist: writeKnownRoleCache,
    onDowngrade: mockInvalidate,
  });
  assert.equal(r2, 'downgrade');
  assert.equal(invalidateCount, 1);

  // 第三次 poll：current 仍 viewer → same，不觸發
  const cached2 = readKnownRoleCache(USER_A, OWNER_X);
  const r3 = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: cached2!.role,
    currentRole: 'viewer',
    currentInfoLevel: 0,
    persist: writeKnownRoleCache,
    onDowngrade: mockInvalidate,
  });
  assert.equal(r3, 'same');
  assert.equal(invalidateCount, 1);
});

runTest('整合：userId mismatch → ignore stale cache, write new baseline', () => {
  mockLs.reset();
  // 寫入 USER_A 的 cache
  writeKnownRoleCache(makeBaseline('operator', 2));
  // 用 USER_B 讀 → null（userId mismatch）
  const cached = readKnownRoleCache(USER_B, OWNER_X);
  assert.equal(cached, null);
  // 然後用 USER_B 走 detect → baseline
  const result = handleRoleChangeDetection({
    userId: USER_B,
    ownerId: OWNER_X,
    previousRole: undefined,
    currentRole: 'manager',
    currentInfoLevel: 2,
    persist: writeKnownRoleCache,
    onDowngrade: () => undefined,
  });
  assert.equal(result, 'baseline');
  // 確認 USER_B 的 cache 已建立
  const ubCache = readKnownRoleCache(USER_B, OWNER_X);
  assert.ok(ubCache !== null);
  assert.equal(ubCache!.role, 'manager');
  // 已知限制：localStorage 單一 key，write 端會覆蓋同 key。
  // 對 USER_A 而言，自己 key 的 cache 已被 USER_B 覆蓋，
  // readKnownRoleCache(USER_A, OWNER_X) 因 userId 不匹配而回傳 null（fail-closed）。
  const uaCache = readKnownRoleCache(USER_A, OWNER_X);
  assert.equal(uaCache, null);
});

runTest('整合：ownerId mismatch → ignore stale cache', () => {
  mockLs.reset();
  writeKnownRoleCache(makeBaseline('operator', 2));
  const cached = readKnownRoleCache(USER_A, OWNER_Y);
  assert.equal(cached, null);
});

runTest('整合：invalid JSON cache → ignore and write new baseline', () => {
  mockLs.reset();
  mockLs.store[STAFF_STATUS_KNOWN_ROLE_KEY] = '{garbage';
  const cached = readKnownRoleCache(USER_A, OWNER_X);
  assert.equal(cached, null);
  const result = handleRoleChangeDetection({
    userId: USER_A,
    ownerId: OWNER_X,
    previousRole: undefined,
    currentRole: 'operator',
    currentInfoLevel: 2,
    persist: writeKnownRoleCache,
    onDowngrade: () => undefined,
  });
  assert.equal(result, 'baseline');
});

// ─── 總結 ───────────────────────────────────────────────────────────────

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
