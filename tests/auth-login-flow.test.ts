import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const authManagerSource = readProjectFile('components/auth/AuthManager.tsx');
const loginModalSource = readProjectFile('components/auth/LoginModal.tsx');
const migrationSource = readProjectFile('lib/supabase/migration.ts');

console.log('\n=== Auth login flow ===');

runTest('normal login passes no invitation metadata unless an invitation token exists', () => {
  assert.match(loginModalSource, /const invitationToken = sessionStorage\.getItem\('invitation_token'\)/);
  assert.match(
    loginModalSource,
    /onLoginSuccess\(\s*data\.user\.id,\s*data\.user\.email \|\| normalizedEmail,\s*invitationToken \? \{ invitationLogin: true \} : undefined\s*\)/
  );
});

runTest('normal login schedules anonymous-data detection after auth success', () => {
  const successIndex = authManagerSource.indexOf('window.dispatchEvent(new CustomEvent');
  const invitationFastPathIndex = authManagerSource.indexOf('if (meta?.invitationAccepted)');
  const scheduleIndex = authManagerSource.indexOf('scheduleAnonymousDataDetection(userId, email)');

  assert.ok(successIndex > 0, 'login success event must still dispatch');
  assert.ok(invitationFastPathIndex > successIndex, 'invitation fast path must be checked after login success');
  assert.ok(scheduleIndex > invitationFastPathIndex, 'normal login must use scheduled migration detection');
});

runTest('anonymous-data detection runs through idle callback or short timeout', () => {
  assert.match(authManagerSource, /typeof window\.requestIdleCallback === ['"]function['"]/);
  assert.match(authManagerSource, /window\.requestIdleCallback\([\s\S]*timeout:\s*2000/);
  assert.match(authManagerSource, /window\.setTimeout\([\s\S]*250/);
  assert.match(authManagerSource, /requestId !== migrationDetectionRequestRef\.current/);
});

runTest('invitation success cancels stale scheduled anonymous-data detection before redirect', () => {
  const acceptedIndex = authManagerSource.indexOf('if (meta?.invitationAccepted)');
  const cancelIndex = authManagerSource.indexOf('migrationDetectionRequestRef.current += 1', acceptedIndex);
  const replaceIndex = authManagerSource.indexOf("router.replace('/')", acceptedIndex);
  const scheduleIndex = authManagerSource.indexOf('scheduleAnonymousDataDetection(userId, email)', acceptedIndex);

  assert.ok(cancelIndex > acceptedIndex, 'invitation success must invalidate pending migration detection');
  assert.ok(replaceIndex > cancelIndex, 'redirect should happen after invalidation');
  assert.ok(scheduleIndex > replaceIndex, 'normal-login schedule must remain outside invitation fast path');
});

runTest('invitation login skips anonymous-data detection without auto-accepting the invitation', () => {
  const invitationLoginIndex = authManagerSource.indexOf('if (meta?.invitationLogin)');
  const cancelIndex = authManagerSource.indexOf('migrationDetectionRequestRef.current += 1', invitationLoginIndex);
  const returnIndex = authManagerSource.indexOf('return;', cancelIndex);
  const scheduleIndex = authManagerSource.indexOf('scheduleAnonymousDataDetection(userId, email)', invitationLoginIndex);

  assert.ok(invitationLoginIndex > 0, 'AuthManager must recognize invitation login metadata');
  assert.ok(cancelIndex > invitationLoginIndex, 'invitation login must cancel pending migration detection');
  assert.ok(returnIndex > cancelIndex, 'invitation login must stop before normal-login detection');
  assert.ok(scheduleIndex > returnIndex, 'normal-login schedule must remain outside invitation-login fast path');
  assert.doesNotMatch(authManagerSource, /acceptInvitationAndBind/);
});

runTest('detectAnonymousData counts records without materializing full tables', () => {
  const detectStart = migrationSource.indexOf('export async function detectAnonymousData');
  const detectEnd = migrationSource.indexOf('export enum MigrationOption');
  const detectSource = migrationSource.slice(detectStart, detectEnd);

  assert.ok(detectStart >= 0 && detectEnd > detectStart, 'detectAnonymousData source must be found');
  assert.doesNotMatch(detectSource, /\.toArray\(\)/);
  assert.match(detectSource, /db\.markets[\s\S]*\.filter\([\s\S]*\.count\(\)/);
  assert.match(detectSource, /db\.events[\s\S]*\.filter\([\s\S]*\.count\(\)/);
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
    throw new Error(`${failed} auth login flow tests failed`);
  }
}

main();
