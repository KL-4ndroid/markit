/**
 * R9 Staff Relationship Selection
 *
 * Ensures the active staff relationship picked by runtime role checks is
 * deterministic when historical duplicate active rows exist.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    failures.push(name);
    failed++;
  }
}

const useUserRoleSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/hooks/useUserRole.ts',
  'utf-8'
);

const useStaffStatusMonitorSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/hooks/useStaffStatusMonitor.ts',
  'utf-8'
);

function extractRelationshipQuery(source: string, tableStart: string): string {
  const start = source.indexOf(tableStart);
  assert.notEqual(start, -1, `missing query start: ${tableStart}`);

  const end = source.indexOf('.limit(1)', start);
  assert.notEqual(end, -1, 'missing .limit(1)');

  return source.slice(start, end + '.limit(1)'.length);
}

function assertDeterministicActiveRelationshipQuery(query: string): void {
  assert.match(query, /\.from\(['"]staff_relationships['"]\)/);
  assert.match(query, /\.eq\(['"]staff_id['"]/);
  assert.match(query, /\.eq\(['"]status['"],\s*['"]active['"]\)/);
  assert.match(query, /\.order\(['"]updated_at['"],\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(query, /\.order\(['"]created_at['"],\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(query, /\.order\(['"]id['"],\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(query, /\.limit\(1\)/);

  const updatedAtIndex = query.indexOf(".order('updated_at'");
  const createdAtIndex = query.indexOf(".order('created_at'");
  const idIndex = query.indexOf(".order('id'");
  const limitIndex = query.indexOf('.limit(1)');

  assert.ok(updatedAtIndex < createdAtIndex, 'updated_at should be the primary sort');
  assert.ok(createdAtIndex < idIndex, 'created_at should be the secondary sort');
  assert.ok(idIndex < limitIndex, 'id tie-breaker should be before limit(1)');
}

console.log('\n=== R9 staff relationship deterministic selection ===');

runTest('useUserRole selects active staff relationship deterministically', () => {
  const query = extractRelationshipQuery(
    useUserRoleSource,
    ".from('staff_relationships')"
  );
  assertDeterministicActiveRelationshipQuery(query);
});

runTest('useStaffStatusMonitor selects active staff relationship deterministically', () => {
  const query = extractRelationshipQuery(
    useStaffStatusMonitorSource,
    ".from('staff_relationships')"
  );
  assertDeterministicActiveRelationshipQuery(query);
  assert.match(query, /\.eq\(['"]owner_id['"]/);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
