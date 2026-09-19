import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

import {
  ACCOUNT_DELETION_AD4_BLOCKER_IDS,
  evaluateAccountDeletionAd4Readiness,
  type AccountDeletionAd4Facts,
} from '../lib/subscription/account-deletion-ad4-readiness';

const allReady = Object.freeze({
  capacitorGate2Complete: true,
  nativeProjectsPresent: true,
  nativeStoreAdaptersPresent: true,
  publicDeletionResourcePresent: true,
  authenticatedDeletionEntryPresent: true,
  confirmationRoutePresent: true,
  cancellationRoutePresent: true,
  cleanupExecutorPresent: true,
  billingDetachmentPresent: true,
  realR2PurgePresent: true,
  externalAccountsComplete: true,
  publicLegalSupportComplete: true,
  remoteMigrationStrategyApproved: true,
  releaseCandidatePresent: true,
} satisfies AccountDeletionAd4Facts);

assert.deepEqual(evaluateAccountDeletionAd4Readiness(allReady), {
  ready: true,
  blockerCount: 0,
  blockers: [],
  productionRuntimeMustRemainDisabled: true,
});

const allBlocked = evaluateAccountDeletionAd4Readiness(Object.fromEntries(
  Object.keys(allReady).map(key => [key, false]),
) as unknown as AccountDeletionAd4Facts);
assert.equal(allBlocked.ready, false);
assert.equal(allBlocked.blockerCount, ACCOUNT_DELETION_AD4_BLOCKER_IDS.length);
assert.deepEqual(allBlocked.blockers, ACCOUNT_DELETION_AD4_BLOCKER_IDS);

const require = createRequire(import.meta.url);
const tsxCli = require.resolve('tsx/cli');
const output = execFileSync(process.execPath, [
  tsxCli,
  'scripts/check-account-deletion-ad4-preparation.ts',
], { cwd: process.cwd(), encoding: 'utf8' });
const current = JSON.parse(output) as {
  ok: boolean;
  report: { ready: boolean; blockers: string[]; productionRuntimeMustRemainDisabled: boolean };
};
assert.equal(current.ok, true);
assert.equal(current.report.ready, false);
assert.equal(current.report.productionRuntimeMustRemainDisabled, true);
assert.equal(current.report.blockers.includes('capacitor_gate2_open'), false);
for (const blocker of ACCOUNT_DELETION_AD4_BLOCKER_IDS.filter(
  blocker => blocker !== 'capacitor_gate2_open',
)) {
  assert.ok(current.report.blockers.includes(blocker), `missing current blocker: ${blocker}`);
}

console.log('PASS account deletion AD4 readiness remains fail closed and machine-checkable');
