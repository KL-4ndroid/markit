import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isStaffLocalProjectionRecord } from '../lib/db/clear-user-data';

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

const clearUserDataSource = readFileSync(
  join(__dirname, '..', 'lib/db/clear-user-data.ts'),
  'utf-8'
);

const staffStatusMonitorSource = readFileSync(
  join(__dirname, '..', 'hooks/useStaffStatusMonitor.ts'),
  'utf-8'
);

function getClearStaffLocalProjectionsSource(): string {
  const start = clearUserDataSource.indexOf('export async function clearStaffLocalProjections');
  const end = clearUserDataSource.indexOf('export async function clearUserData', start);
  assert.notEqual(start, -1, 'helper source start found');
  assert.notEqual(end, -1, 'helper source end found');
  return clearUserDataSource.slice(start, end);
}

console.log('\n=== P5-4c staff projection predicate ===');

runTest('staff projection record matches access_type staff and owner id', () => {
  assert.equal(
    isStaffLocalProjectionRecord(
      { access_type: 'staff', relationship_owner_id: 'owner-A', owner_id: 'owner-A' },
      'owner-A'
    ),
    true
  );
});

runTest('staff projection record rejects owner rows', () => {
  assert.equal(
    isStaffLocalProjectionRecord(
      { access_type: 'owner', relationship_owner_id: 'owner-A', owner_id: 'owner-A' },
      'owner-A'
    ),
    false
  );
});

runTest('staff projection record rejects another owner relationship', () => {
  assert.equal(
    isStaffLocalProjectionRecord(
      { access_type: 'staff', relationship_owner_id: 'owner-B', owner_id: 'owner-B' },
      'owner-A'
    ),
    false
  );
});

runTest('staff projection record can match any staff row when owner id omitted', () => {
  assert.equal(
    isStaffLocalProjectionRecord({ access_type: 'staff', relationship_owner_id: 'owner-B' }),
    true
  );
});

console.log('\n=== P5-4c clearStaffLocalProjections static gates ===');

runTest('clearStaffLocalProjections is exported', () => {
  assert.match(clearUserDataSource, /export async function clearStaffLocalProjections/);
});

runTest('clearStaffLocalProjections targets projection tables only', () => {
  assert.match(clearUserDataSource, /db\.markets/);
  assert.match(clearUserDataSource, /db\.products/);
  assert.match(clearUserDataSource, /db\.events/);
  assert.match(clearUserDataSource, /db\.dailyStats/);
});

runTest('clearStaffLocalProjections preserves settings and syncQueue', () => {
  const helperSource = getClearStaffLocalProjectionsSource();
  assert.doesNotMatch(helperSource, /db\.settings\.(clear|delete|bulkDelete)/);
  assert.doesNotMatch(helperSource, /db\.syncQueue\.(clear|delete|bulkDelete)/);
});

runTest('clearStaffLocalProjections does not delete database or reload', () => {
  const helperSource = getClearStaffLocalProjectionsSource();
  assert.doesNotMatch(helperSource, /deleteDatabase/);
  assert.doesNotMatch(helperSource, /location\.href|location\.reload|window\.location/);
});

console.log('\n=== P5-4c downgrade wiring static gates ===');

runTest('useStaffStatusMonitor imports clearStaffLocalProjections', () => {
  assert.match(staffStatusMonitorSource, /clearStaffLocalProjections/);
});

runTest('downgrade path clears projections and triggers sync', () => {
  assert.match(staffStatusMonitorSource, /void handleDowngrade\(from, to\)/);
  assert.match(staffStatusMonitorSource, /clearStaffLocalProjections\(\{/);
  assert.match(staffStatusMonitorSource, /dispatchEvent\(new Event\('trigger-sync'\)\)/);
});

setImmediate(() => {
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.error('Failures:');
    for (const name of failures) console.error(`  - ${name}`);
    process.exit(1);
  }
});
