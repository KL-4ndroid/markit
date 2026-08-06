import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const splashSource = readFileSync(join(projectRoot, 'components/PWASplashScreen.tsx'), 'utf8');
const authSource = readFileSync(join(projectRoot, 'lib/supabase/auth-context.tsx'), 'utf8');
const nextConfigSource = readFileSync(join(projectRoot, 'next.config.mjs'), 'utf8');

assert.match(
  nextConfigSource,
  /allowedDevOrigins:\s*\[['"]127\.0\.0\.1['"]\]/,
  'Local development must allow the 127.0.0.1 origin used by the preview URL.',
);
assert.match(
  nextConfigSource,
  /reactDebugChannel:\s*false/,
  'The optional React Flight debug channel must not block hydration when dev WebSockets fail.',
);

assert.doesNotMatch(
  splashSource,
  /addEventListener\(['"]load['"]/,
  'The PWA splash exit must not depend on a window.load event that hydration can miss.',
);
assert.match(splashSource, /const exitTimer = window\.setTimeout/);
assert.match(splashSource, /const hideTimer = window\.setTimeout/);
assert.match(splashSource, /window\.clearTimeout\(exitTimer\)/);
assert.match(splashSource, /window\.clearTimeout\(hideTimer\)/);
assert.match(splashSource, /data-app-splash-failsafe/);
assert.match(splashSource, /feria-splash-failsafe-hide 1600ms ease-out forwards/);
assert.match(splashSource, /visibility: hidden/);
assert.match(splashSource, /pointer-events: none/);

const storageFallbackStart = authSource.indexOf("window.addEventListener('storage'");
const initialSessionStart = authSource.indexOf('supabase.auth.getSession()');

assert.ok(storageFallbackStart >= 0, 'Expected a storage-event fallback for cross-tab auth.');
assert.ok(initialSessionStart > storageFallbackStart, 'Session initialization must follow cross-tab setup.');
assert.doesNotMatch(
  authSource.slice(storageFallbackStart, initialSessionStart),
  /return\s*\(\)\s*=>/,
  'The storage fallback must not return before initial session setup runs.',
);
assert.match(authSource, /removeStorageListener\?\.\(\)/);
assert.match(
  authSource,
  /\.catch\(error => \{[\s\S]*?setSession\(null\);[\s\S]*?setUser\(null\);[\s\S]*?setLoading\(false\);/,
  'A rejected session initialization must release the global loading state.',
);

console.log('App startup resilience tests passed.');
