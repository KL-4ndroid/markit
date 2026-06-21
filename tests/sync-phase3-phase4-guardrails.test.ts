import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function collectFiles(root: string, extensions = ['.ts', '.tsx', '.sql']): string[] {
  if (!existsSync(root)) return [];

  const results: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      results.push(...collectFiles(path, extensions));
      continue;
    }

    if (extensions.some(extension => path.endsWith(extension))) {
      results.push(path);
    }
  }

  return results;
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function formatMatches(paths: string[], pattern: RegExp): string {
  return paths
    .filter(path => pattern.test(read(path)))
    .map(path => relative(projectRoot, path))
    .join(', ');
}

function matchingRelativePaths(paths: string[], pattern: RegExp): string[] {
  return paths
    .filter(path => pattern.test(read(path)))
    .map(path => relative(projectRoot, path).replace(/\\/g, '/'));
}

function productionSyncFiles(): string[] {
  return [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/local-cache-writer.ts',
  ].map(path => join(projectRoot, path));
}

runTest('Phase 3 guardrail: pending_operations only appears in approved Gate D migrations', () => {
  const scannedRoots = ['supabase/migrations', 'app', 'components', 'hooks', 'lib']
    .map(path => join(projectRoot, path));
  const files = scannedRoots.flatMap(root => collectFiles(root));
  const matches = matchingRelativePaths(files, /\bpending_operations\b/);
  const approvedMatches = new Set([
    'supabase/migrations/048_add_pending_operations_schema.sql',
    'supabase/migrations/049_enqueue_checklist_toggle_pending_operation.sql',
    'supabase/migrations/050_drain_checklist_toggle_pending_operation.sql',
  ]);
  const unexpectedMatches = matches.filter(path => !approvedMatches.has(path));

  assert.deepEqual(
    unexpectedMatches,
    [],
    `pending_operations must stay out of production code and unapproved migrations. Matches: ${matches.join(', ')}`
  );
});

runTest('Phase 4 guardrail: replace-cache is not connected to production sync paths', () => {
  const matches = formatMatches(productionSyncFiles(), /replace[-_]?cache|replaceCache|previewReplace/i);

  assert.equal(
    matches,
    '',
    `replace-cache must stay out of production sync until explicit approval. Matches: ${matches}`
  );
});

runTest('Gate D guardrail: production sync does not import pending operation or cache preview helpers', () => {
  const matches = formatMatches(
    productionSyncFiles(),
    /pending-operation-model|cache-replacement-preview/
  );

  assert.equal(
    matches,
    '',
    `Gate D helpers must stay out of production sync until explicit approval. Matches: ${matches}`
  );
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
    throw new Error(`${failed} Phase 3/4 guardrail tests failed`);
  }
}

main();
