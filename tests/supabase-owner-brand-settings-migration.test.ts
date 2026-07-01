import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const migrationSource = readFileSync(
  join(projectRoot, 'supabase/migrations/054_add_user_settings_brand_name.sql'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Supabase owner brand settings migration ===');

runTest('054 migration only adds nullable brand_name to user_settings', () => {
  assert.match(migrationSource, /ALTER TABLE public\.user_settings/);
  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS brand_name TEXT/);
  assert.doesNotMatch(migrationSource, /NOT NULL/i);
  assert.doesNotMatch(migrationSource, /DEFAULT/i);
});

runTest('054 migration does not change policies data or existing sync tables', () => {
  assert.doesNotMatch(migrationSource, /CREATE POLICY|DROP POLICY|ALTER POLICY/i);
  assert.doesNotMatch(migrationSource, /DELETE FROM|UPDATE public|INSERT INTO|TRUNCATE/i);
  assert.doesNotMatch(migrationSource, /events|markets|products|daily_stats|pending_operations/i);
});

runTest('full test suite includes owner brand migration guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/supabase-owner-brand-settings-migration\.test\.ts/);
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
    throw new Error(`${failed} owner brand migration tests failed`);
  }
}

main();
