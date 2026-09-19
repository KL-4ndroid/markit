import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const appChrome = read('components/AppChrome.tsx');
const authGuard = read('components/auth/AuthGuard.tsx');
const welcomeScreen = read('components/auth/WelcomeScreen.tsx');
const publicRoutes = read('lib/navigation/public-route.ts');

const welcomeOpeningMainCount = welcomeScreen.match(/<main(?:\s|>)/g)?.length ?? 0;
const welcomeClosingMainCount = welcomeScreen.match(/<\/main>/g)?.length ?? 0;

assert.equal(welcomeOpeningMainCount, 1, 'unauthenticated welcome must expose one main');
assert.equal(welcomeClosingMainCount, 1, 'unauthenticated welcome main must be balanced');
assert.match(
  authGuard,
  /if \(user\)[\s\S]*?return \([\s\S]*?\{children\}[\s\S]*?\);[\s\S]*?return <WelcomeScreen onGetStarted=\{handleGetStarted\} \/>/,
  'authenticated children and unauthenticated welcome must remain mutually exclusive',
);
assert.doesNotMatch(authGuard, /<\/?main(?:\s|>)/, 'AuthGuard must not nest a main landmark');

const protectedShell = appChrome.match(/<AuthGuard>([\s\S]*?)<\/AuthGuard>/)?.[1] ?? '';
assert.equal(
  protectedShell.match(/<main(?:\s|>)/g)?.length ?? 0,
  1,
  'authenticated representative shell must contain one main',
);
assert.match(publicRoutes, /STANDALONE_PUBLIC_ROUTES[\s\S]*['"]\/demo['"]/, '/demo must remain standalone');
assert.match(
  appChrome,
  /if \(isStandalonePublicRoute\)[\s\S]*?<main[^>]*>\{children\}<\/main>/,
  'public demo representative shell must contain one main',
);

console.log('PASS unauthenticated, public demo, and authenticated main-landmark contracts');
