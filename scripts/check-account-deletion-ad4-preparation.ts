import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseNativeExternalAccountReadiness } from '../lib/deployment/native-external-account-readiness';
import { evaluateAccountDeletionAd4Readiness, hasCompleteNativeStoreRuntime } from '../lib/subscription/account-deletion-ad4-readiness';
import { ACCOUNT_DELETION_REQUEST_WORKFLOW_RELEASE_READY } from '../lib/subscription/account-deletion-workflow-gate';
import {ACCOUNT_DELETION_ENGINE_RELEASE_READY} from '../lib/subscription/account-deletion-engine.server';
import {candidateSourceHashes} from './lib/account-deletion-candidate-sources';

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
  const report = evaluateAccountDeletionAd4Readiness({
    capacitorGate2Complete: gates.gates.find(gate => gate.id === 'CAPACITOR-GATE2')?.status === 'complete',
    nativeProjectsPresent: hasNonEmptyDirectory('ios') && hasNonEmptyDirectory('android'),
    nativeStoreAdaptersPresent: hasCompleteNativeStoreRuntime(gates.gates)
      && Object.keys(dependencies).some(name => name.startsWith('@capacitor/'))
      && hasNonEmptyDirectory('lib/platform/capacitor'),
    publicDeletionResourcePresent: hasFile('app/account-deletion/page.tsx'),
    authenticatedDeletionEntryPresent: ACCOUNT_DELETION_REQUEST_WORKFLOW_RELEASE_READY && settings.includes('href="/settings/account/deletion"'),
    confirmationRoutePresent: ACCOUNT_DELETION_REQUEST_WORKFLOW_RELEASE_READY && hasFile('app/api/account-deletion/confirm/route.ts'),
    cancellationRoutePresent: ACCOUNT_DELETION_REQUEST_WORKFLOW_RELEASE_READY && hasFile('app/api/account-deletion/cancel/route.ts'),
    cleanupExecutorPresent: ACCOUNT_DELETION_ENGINE_RELEASE_READY&&hasFile('lib/subscription/account-deletion-engine.server.ts'),
    billingDetachmentPresent: ACCOUNT_DELETION_ENGINE_RELEASE_READY&&hasFile('lib/subscription/account-deletion-billing-engine.server.ts'),
    realR2PurgePresent: ACCOUNT_DELETION_ENGINE_RELEASE_READY&&hasFile('docs/subscription/ACCOUNT_DELETION_AD4_RELEASE_CANDIDATE_EVIDENCE.json'),
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

  const scopes=[
    {id:'request_workflow',sources:['app/api/account-deletion/confirm/route.ts','app/api/account-deletion/cancel/route.ts','components/settings/AccountDeletionPanel.tsx'],isolated:'docs/subscription/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.md'},
    {id:'cleanup_engine',sources:['lib/subscription/account-deletion-engine.server.ts'],isolated:'docs/subscription/ACCOUNT_DELETION_ENGINE_2026_11_02.md'},
    {id:'billing_retention',sources:['lib/subscription/account-deletion-billing-engine.server.ts'],isolated:'docs/subscription/ACCOUNT_DELETION_BILLING_ENGINE_2026_11_02.md'},
    {id:'upload_receipts',sources:['lib/subscription/account-deletion-terminal-put.server.ts','lib/subscription/photo-upload-readback.server.ts'],isolated:'docs/subscription/evidence/account-deletion-integrated-candidate-2026-11-02.json',staging:'docs/subscription/evidence/account-deletion-terminal-put-staging-2026-11-02.json'},
    {id:'public_resource',sources:['app/account-deletion/page.tsx'],isolated:undefined},
  ];
  const delivery=scopes.map(item=>({id:item.id,implemented:item.sources.every(hasFile),isolatedEvidenceRecorded:!!item.isolated&&hasFile(item.isolated),
    stagingEvidenceRecorded:'staging'in item&&!!item.staging&&hasFile(item.staging),productionReleased:false,
    evidenceMeaning:'Recorded evidence has its own scope/date; it is not proof of this production version.'}));
  let candidateSourceVerified=false;
  const candidateEvidence='docs/subscription/evidence/account-deletion-integrated-candidate-2026-11-02.json';
  if(hasFile(candidateEvidence)){try{const e=JSON.parse(read(candidateEvidence));candidateSourceVerified=e.focus===null&&e.checks.length>=22&&JSON.stringify(e.sourceHashes)===JSON.stringify(candidateSourceHashes());}catch{}}
  process.stdout.write(`${JSON.stringify({ ok: true, report,delivery,candidateSourceVerified,blockerMeaning:'Release prerequisites, not a count of unimplemented features.' })}\n`);
  if (args.includes('--require-ready') && !report.ready) process.exitCode = 1;
}

main();
