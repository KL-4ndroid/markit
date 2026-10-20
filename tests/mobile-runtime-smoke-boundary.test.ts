import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const readProjectFile = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

const pageSource = readProjectFile('app/mobile-runtime-smoke/page.smoke.tsx');
const configSource = readProjectFile('next.config.mjs');
const buildSource = readProjectFile('scripts/build-mobile.mjs');
const verifierSource = readProjectFile('scripts/verify-mobile-static-output.mjs');
const chromeSource = readProjectFile('components/AppChrome.tsx');

assert.match(pageSource, /Dexie\.delete\(SMOKE_DATABASE_NAME\)/);
assert.match(pageSource, /probes\.put\(/);
assert.match(pageSource, /probes\.get\(/);
assert.match(pageSource, /probes\.delete\(/);
assert.match(pageSource, /testSupabaseConnection\(\)/);
assert.match(pageSource, /<BottomNavigation\s*\/>/);
assert.match(pageSource, /data-testid="dexie-runtime-status"/);
assert.match(pageSource, /data-testid="supabase-runtime-status"/);

assert.match(configSource, /isMobileRuntimeSmokeBuild/);
assert.match(configSource, /['"]smoke\.tsx['"]/);
assert.match(buildSource, /--runtime-smoke/);
assert.match(verifierSource, /mobile-runtime-smoke/);
assert.match(chromeSource, /NEXT_PUBLIC_APP_RUNTIME_SMOKE/);

console.log('PASS isolated mobile runtime smoke boundary');
