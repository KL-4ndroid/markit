import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseNativeExternalAccountReadiness } from '../lib/deployment/native-external-account-readiness';
import { evaluateAccountDeletionAd4Readiness } from '../lib/subscription/account-deletion-ad4-readiness';

const root = process.cwd();
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');
const hasNonEmptyDirectory = (path: string): boolean => {
  const target = resolve(root, path);
  return existsSync(target) && statSync(target).isDirectory() && readdirSync(target).length > 0;
};
const hasFile = (path: string): boolean => existsSync(resolve(root, path));

function main(): void {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--require-ready')) {
    process.stderr.write(`${JSON.stringify({ ok: false, code: 'argument_invalid' })}\n`);
    process.exitCode = 64;
    return;
  }

  const gates = JSON.parse(
    read('docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json'),
  ) as { gates: Array<{ id: string; status: string }> };
  const external = parseNativeExternalAccountReadiness(JSON.parse(
    read('docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json'),
  ));
  const packageJson = JSON.parse(read('package.json')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const settings = read('app/settings/account/page.tsx');
  const status = read('docs/MANUAL_LAUNCH_ITEM_STATUS_2026_08_17.json');
  const migration = read('supabase/migrations/071_add_account_deletion_request_foundation.sql');
  const subscriptionFiles = [
    read('lib/subscription/account-deletion-saga.server.ts'),
    read('lib/subscription/account-deletion-storage.server.ts'),
  ].join('\n');

  const report = evaluateAccountDeletionAd4Readiness({
    capacitorGate2Complete: gates.gates.find(gate => gate.id === 'CAPACITOR-GATE2')?.status === 'complete',
    nativeProjectsPresent: hasNonEmptyDirectory('ios') && hasNonEmptyDirectory('android'),
    nativeStoreAdaptersPresent: Object.keys(dependencies).some(name => name.startsWith('@capacitor/'))
      && hasNonEmptyDirectory('lib/platform/capacitor'),
    publicDeletionResourcePresent: hasFile('app/account-deletion/page.tsx'),
    authenticatedDeletionEntryPresent: settings.includes('/account-deletion'),
    confirmationRoutePresent: hasFile('app/api/account-deletion/confirm/route.ts'),
    cancellationRoutePresent: hasFile('app/api/account-deletion/cancel/route.ts'),
    cleanupExecutorPresent: /executeAccountDeletionCleanupStep/u.test(subscriptionFiles),
    billingDetachmentPresent: /CREATE TABLE public\.account_deletion_billing_subjects/u.test(migration),
    realR2PurgePresent: /deleteAccountDeletionR2Objects/u.test(subscriptionFiles),
    externalAccountsComplete: external.checks.every(check => (
      check.status === 'complete' || check.status === 'not_applicable'
    )),
    publicLegalSupportComplete: /"id": "legal\.published-smoke", "status": "approved"/u.test(status)
      && /"id": "support\.mailbox", "status": "approved"/u.test(status),
    remoteMigrationStrategyApproved: hasFile(
      'docs/subscription/ACCOUNT_DELETION_REMOTE_MIGRATION_STRATEGY_APPROVAL.md',
    ),
    releaseCandidatePresent: hasFile('docs/subscription/ACCOUNT_DELETION_AD4_RELEASE_CANDIDATE_EVIDENCE.json'),
  });

  process.stdout.write(`${JSON.stringify({ ok: true, report })}\n`);
  if (args.includes('--require-ready') && !report.ready) process.exitCode = 1;
}

main();
