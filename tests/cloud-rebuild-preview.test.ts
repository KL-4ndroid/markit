import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCloudRebuildPreview } from '../lib/sync/cloud-rebuild-preview';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const previewSource = readFileSync(join(projectRoot, 'lib/sync/cloud-rebuild-preview.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function baseInput() {
  return {
    actorId: 'owner-1',
    actorRole: 'owner' as const,
    scope: 'owner-full' as const,
    checkedAt: '2026-06-30T12:00:00.000Z',
    localTables: [
      { table: 'markets' as const, rowCount: 3 },
      { table: 'products' as const, rowCount: 8 },
      { table: 'events' as const, rowCount: 50 },
    ],
    cloudSources: [
      { source: 'events', rowCount: 55 },
      { source: 'staff_accessible_markets', rowCount: 0 },
    ],
    pendingPreClear: {
      decision: 'allowed' as const,
      blockingReasonCodes: [],
      unresolvedOperationIds: [],
    },
    localUnsyncedRowCount: 0,
    localOnlyRowCount: 0,
  };
}

console.log('\n=== Cloud rebuild preview ===');

runTest('builds non-mutating owner preview summary from provided inputs', () => {
  const input = baseInput();
  const before = JSON.stringify(input);
  const preview = buildCloudRebuildPreview(input);

  assert.equal(preview.actorId, 'owner-1');
  assert.equal(preview.actorRole, 'owner');
  assert.equal(preview.scope, 'owner-full');
  assert.equal(preview.localRowCount, 61);
  assert.equal(preview.cloudRowCount, 55);
  assert.equal(preview.protectedLocalRowCount, 0);
  assert.deepEqual(preview.blockingReasonCodes, []);
  assert.equal(preview.isBlocked, false);
  assert.equal(preview.canProceedToExecute, false);
  assert.equal(JSON.stringify(input), before);
});

runTest('blocks when pending operations pre-clear report is blocked unknown or unresolved', () => {
  const blocked = buildCloudRebuildPreview({
    ...baseInput(),
    pendingPreClear: {
      decision: 'blocked',
      blockingReasonCodes: ['pending_operations_not_clear'],
      unresolvedOperationIds: ['operation-1'],
    },
  });

  assert.equal(blocked.isBlocked, true);
  assert.deepEqual(blocked.blockingReasonCodes, [
    'pending_operations_not_clear',
    'pending_operations_unresolved',
  ]);

  const unknown = buildCloudRebuildPreview({
    ...baseInput(),
    pendingPreClear: {
      decision: 'unknown',
      blockingReasonCodes: [],
      unresolvedOperationIds: [],
    },
  });

  assert.equal(unknown.isBlocked, true);
  assert.deepEqual(unknown.blockingReasonCodes, ['pending_operations_not_clear']);
});

runTest('blocks local unsynced local-only protected and cloud read error states', () => {
  const preview = buildCloudRebuildPreview({
    ...baseInput(),
    localUnsyncedRowCount: 2,
    localOnlyRowCount: 1,
    localTables: [
      { table: 'events', rowCount: 50, protectedRowCount: 3 },
    ],
    cloudSources: [
      { source: 'events', rowCount: 55, error: 'permission denied' },
    ],
  });

  assert.equal(preview.isBlocked, true);
  assert.deepEqual(preview.blockingReasonCodes, [
    'cloud_read_errors',
    'local_only_rows',
    'local_unsynced_rows',
    'protected_local_rows',
  ]);
  assert.deepEqual(preview.warnings, ['cloud source events has read error']);
});

runTest('blocks non-owner and non-owner-full scopes from execution path', () => {
  const manager = buildCloudRebuildPreview({
    ...baseInput(),
    actorRole: 'manager',
    scope: 'manager-market-scope',
  });

  assert.equal(manager.isBlocked, true);
  assert.equal(manager.blockingReasonCodes.includes('actor_not_owner'), true);
  assert.equal(manager.blockingReasonCodes.includes('non_owner_full_scope_execute_not_approved'), true);
  assert.equal(manager.canProceedToExecute, false);

  const staff = buildCloudRebuildPreview({
    ...baseInput(),
    actorRole: 'operator',
    scope: 'staff-view',
  });

  assert.equal(staff.isBlocked, true);
  assert.equal(staff.canProceedToExecute, false);
});

runTest('blocks empty cloud rows without empty account proof', () => {
  const preview = buildCloudRebuildPreview({
    ...baseInput(),
    cloudSources: [
      { source: 'events', rowCount: 0 },
      { source: 'markets', rowCount: 0 },
    ],
  });

  assert.equal(preview.isBlocked, true);
  assert.deepEqual(preview.blockingReasonCodes, ['cloud_rows_empty_without_empty_account_proof']);
});

runTest('preview model has no Supabase Dexie db React or recovery UI dependencies', () => {
  assert.doesNotMatch(previewSource, /from ['"]@\/lib\/supabase|from ['"].*supabase|supabase\./);
  assert.doesNotMatch(previewSource, /from ['"]@\/lib\/db|from ['"].*dexie|db\./i);
  assert.doesNotMatch(previewSource, /from ['"]react|use[A-Z]/);
  assert.doesNotMatch(previewSource, /recovery|DatabaseRecoveryPanel|OwnerPendingOperationDiagnosticsPanel/);
  assert.doesNotMatch(previewSource, /delete\(|clear\(|bulkDelete|bulkAdd/);
});

runTest('production sync and recovery UI paths do not import cloud rebuild preview', () => {
  const productionFiles = [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/local-cache-writer.ts',
    'app/recovery/page.tsx',
    'components/common/DatabaseRecoveryPanel.tsx',
    'components/common/OwnerPendingOperationDiagnosticsPanel.tsx',
  ];

  const matches = productionFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /cloud-rebuild-preview|buildCloudRebuildPreview/.test(source);
  });

  assert.deepEqual(matches, []);
});

runTest('full test suite includes cloud rebuild preview guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/cloud-rebuild-preview\.test\.ts/);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} cloud rebuild preview tests failed`);
  }
}

main();
