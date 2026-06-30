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

const appChromeSource = readProjectFile('components/AppChrome.tsx');
const authGuardSource = readProjectFile('components/auth/AuthGuard.tsx');
const roleGuardSource = readProjectFile('components/auth/RoleGuard.tsx');
const authManagerSource = readProjectFile('components/auth/AuthManager.tsx');
const loginModalSource = readProjectFile('components/auth/LoginModal.tsx');

console.log('\n=== Invitation auth flow ===');

runTest('join route uses the lightweight auth-flow shell with AuthManager mounted', () => {
  assert.match(appChromeSource, /const AUTH_FLOW_PUBLIC_ROUTES = \[['"]\/join['"]\]/);
  assert.match(appChromeSource, /const isAuthFlowPublicRoute = AUTH_FLOW_PUBLIC_ROUTES\.some/);
  assert.match(
    appChromeSource,
    /if \(isAuthFlowPublicRoute\)[\s\S]*<main>\{children\}<\/main>[\s\S]*<AppToaster \/>[\s\S]*<AuthManager \/>[\s\S]*<SessionExpiredHandler \/>/
  );
});

runTest('join route remains allowlisted if it ever passes through AuthGuard or RoleGuard', () => {
  assert.match(authGuardSource, /const PUBLIC_ROUTES = \[[^\]]*['"]\/join['"]/);
  assert.match(roleGuardSource, /const PUBLIC_ROUTES = \[[^\]]*['"]\/join['"]/);
});

runTest('invitation signup invalidates role cache before reporting invitation success', () => {
  const successIndex = loginModalSource.indexOf('if (result.success)');
  const invalidateIndex = loginModalSource.indexOf('invalidateRoleCache()', successIndex);
  const acceptedIndex = loginModalSource.indexOf('invitationAccepted = true', successIndex);
  const removeTokenIndex = loginModalSource.indexOf("sessionStorage.removeItem('invitation_token')", successIndex);

  assert.ok(successIndex > 0, 'signup path must inspect invitation bind success');
  assert.ok(invalidateIndex > successIndex, 'role cache must be invalidated after bind success');
  assert.ok(acceptedIndex > invalidateIndex, 'invitation success metadata must be set after invalidation');
  assert.ok(removeTokenIndex > acceptedIndex, 'token must be removed after invitation success is recorded');
});

runTest('only signup success passes invitation metadata to AuthManager', () => {
  const loginSuccessCall = "onLoginSuccess(data.user.id, data.user.email || normalizedEmail);";
  const signupSuccessCall = "onLoginSuccess(data.user.id, data.user.email || normalizedEmail, { invitationAccepted });";

  assert.ok(loginModalSource.includes(loginSuccessCall), 'login branch must keep the original success callback');
  assert.ok(loginModalSource.includes(signupSuccessCall), 'signup branch must pass invitation metadata');
});

runTest('accepted invitation signup skips anonymous-data scan and redirects home', () => {
  assert.match(authManagerSource, /type LoginSuccessMeta = \{\s*invitationAccepted\?: boolean;\s*\}/);

  const acceptedIndex = authManagerSource.indexOf('if (meta?.invitationAccepted)');
  const replaceIndex = authManagerSource.indexOf("router.replace('/')", acceptedIndex);
  const returnIndex = authManagerSource.indexOf('return;', replaceIndex);
  const detectIndex = authManagerSource.indexOf('detectAnonymousData(userId)');

  assert.ok(acceptedIndex > 0, 'AuthManager must branch on invitation success metadata');
  assert.ok(replaceIndex > acceptedIndex, 'accepted invitation must redirect home');
  assert.ok(returnIndex > replaceIndex, 'accepted invitation must stop before migration detection');
  assert.ok(detectIndex > returnIndex, 'anonymous-data detection must remain outside invitation fast path');
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
    throw new Error(`${failed} invitation auth flow tests failed`);
  }
}

main();
