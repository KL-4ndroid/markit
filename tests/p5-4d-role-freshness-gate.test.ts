import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ROLE_FRESHNESS_MAX_AGE_MS,
  RoleFreshnessError,
  assertFreshStaffCapability,
  getRequiredCapabilityForEvent,
  parseCachedRoleSnapshot,
} from '../lib/permissions/role-freshness';

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

function roleCache(args: {
  userId?: string;
  isStaff: boolean;
  staffRole?: string | null;
  timestamp: number;
}): string {
  return JSON.stringify({
    userId: args.userId ?? 'user-A',
    role: {
      isStaff: args.isStaff,
      staffRole: args.staffRole,
    },
    timestamp: args.timestamp,
  });
}

function assertThrowsCode(name: string, fn: () => void, code: string): void {
  runTest(name, () => {
    assert.throws(
      fn,
      (error) => error instanceof RoleFreshnessError && error.code === code
    );
  });
}

const now = 1_000_000;

console.log('\n=== P5-4d role freshness helper ===');

runTest('parseCachedRoleSnapshot reads staff role cache', () => {
  assert.deepEqual(
    parseCachedRoleSnapshot(roleCache({
      isStaff: true,
      staffRole: 'operator',
      timestamp: now,
    })),
    {
      userId: 'user-A',
      isStaff: true,
      staffRole: 'operator',
      timestamp: now,
    }
  );
});

runTest('parseCachedRoleSnapshot fail-closes unknown staff role to null', () => {
  assert.deepEqual(
    parseCachedRoleSnapshot(roleCache({
      isStaff: true,
      staffRole: 'admin',
      timestamp: now,
    }))?.staffRole,
    null
  );
});

runTest('required event capabilities are explicit', () => {
  assert.equal(getRequiredCapabilityForEvent('interaction_recorded'), 'canRecordInteraction');
  assert.equal(getRequiredCapabilityForEvent('deal_closed'), 'canRecordDeal');
  assert.equal(getRequiredCapabilityForEvent('market_updated'), 'canEditMarketBasic');
  assert.equal(getRequiredCapabilityForEvent('product_updated'), 'canEditProductBasic');
  assert.equal(getRequiredCapabilityForEvent('settings_updated'), null);
});

runTest('owner cache bypasses staff freshness gate', () => {
  assert.doesNotThrow(() => {
    assertFreshStaffCapability({
      userId: 'user-A',
      eventType: 'deal_closed',
      now,
      rawCache: roleCache({ isStaff: false, staffRole: null, timestamp: now - 999_999 }),
    });
  });
});

runTest('missing cache preserves existing owner/local write flow', () => {
  assert.doesNotThrow(() => {
    assertFreshStaffCapability({
      userId: 'user-A',
      eventType: 'deal_closed',
      now,
      rawCache: null,
    });
  });
});

runTest('operator can record fresh interaction', () => {
  assert.doesNotThrow(() => {
    assertFreshStaffCapability({
      userId: 'user-A',
      eventType: 'interaction_recorded',
      now,
      rawCache: roleCache({ isStaff: true, staffRole: 'operator', timestamp: now }),
    });
  });
});

runTest('manager can record fresh deal', () => {
  assert.doesNotThrow(() => {
    assertFreshStaffCapability({
      userId: 'user-A',
      eventType: 'deal_closed',
      now,
      rawCache: roleCache({ isStaff: true, staffRole: 'manager', timestamp: now }),
    });
  });
});

assertThrowsCode(
  'stale staff cache blocks write',
  () => assertFreshStaffCapability({
    userId: 'user-A',
    eventType: 'interaction_recorded',
    now,
    rawCache: roleCache({
      isStaff: true,
      staffRole: 'operator',
      timestamp: now - ROLE_FRESHNESS_MAX_AGE_MS - 1,
    }),
  }),
  'staff_role_cache_stale'
);

assertThrowsCode(
  'viewer cannot record interaction',
  () => assertFreshStaffCapability({
    userId: 'user-A',
    eventType: 'interaction_recorded',
    now,
    rawCache: roleCache({ isStaff: true, staffRole: 'viewer', timestamp: now }),
  }),
  'staff_role_capability_denied'
);

assertThrowsCode(
  'operator cannot record deal',
  () => assertFreshStaffCapability({
    userId: 'user-A',
    eventType: 'deal_closed',
    now,
    rawCache: roleCache({ isStaff: true, staffRole: 'operator', timestamp: now }),
  }),
  'staff_role_capability_denied'
);

console.log('\n=== P5-4d recordEvent static wiring ===');

const eventsSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/lib/db/events.ts',
  'utf-8'
);

runTest('recordEvent imports role freshness helper', () => {
  assert.match(eventsSource, /assertFreshStaffCapability/);
});

runTest('recordEvent gates after auth user resolution and before payload validation', () => {
  const gateIndex = eventsSource.indexOf('assertFreshStaffCapability');
  const validateIndex = eventsSource.indexOf('validateEventPayload(type, payload)');
  assert.ok(gateIndex > -1, 'gate found');
  assert.ok(validateIndex > -1, 'validate call found');
  assert.ok(gateIndex < validateIndex, 'gate before local event write validation');
});

setImmediate(() => {
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.error('Failures:');
    for (const name of failures) console.error(`  - ${name}`);
    process.exit(1);
  }
});
