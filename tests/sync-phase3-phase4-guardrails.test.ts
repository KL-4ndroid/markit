import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const phasePlanSource = readFileSync(
  join(projectRoot, 'docs/SYNC_PHASE3_PHASE4_RISK_REDUCTION_PLAN.md'),
  'utf8'
);
const safetyPlanSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_SAFETY_AND_SLICE_PLAN.md'),
  'utf8'
);
const preflightPlanSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_PREFLIGHT_DECISION_PLAN.md'),
  'utf8'
);
const decisionDraftSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_DECISION_RECORD_DRAFT.md'),
  'utf8'
);

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
    'supabase/migrations/051_list_owner_pending_operation_diagnostics.sql',
    'supabase/migrations/052_recover_stale_processing_pending_operation.sql',
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

runTest('planning docs keep explicit approval as the boundary before retry drain verification', () => {
  assert.match(phasePlanSource, /D3c-2m local\/staging synthetic stale recovery execution passed on 2026-06-26 Asia\/Taipei/);
  assert.match(phasePlanSource, /D3c-2n-1 owner-only single-row service wrapper draft is implemented/);
  assert.match(phasePlanSource, /D3c-2n-2 owner UI button is implemented/);
  assert.match(phasePlanSource, /D3c-2n-3 local\/staging manual verification passed on 2026-06-29 Asia\/Taipei/);
  assert.match(phasePlanSource, /Do not proceed into D3c-2n-4 production disposable verification until explicit high-risk approval/);

  assert.match(safetyPlanSource, /Status: active decision plan after D3c-2n-3 local\/staging manual retry\/drain verification/);
  assert.match(safetyPlanSource, /D3c-2m staging verification passed on 2026-06-26 Asia\/Taipei/);
  assert.match(safetyPlanSource, /D3c-2n-1 service wrapper is implemented/);
  assert.match(safetyPlanSource, /D3c-2n-2 owner UI button is implemented/);
  assert.match(safetyPlanSource, /D3c-2n-3 staging verification passed on 2026-06-29 Asia\/Taipei/);
  assert.match(safetyPlanSource, /Plan Validation Before Further Execution/);
  assert.match(safetyPlanSource, /Pre-execution validation required before any future D3c-2n-4 verification/);
  assert.match(safetyPlanSource, /Risk Decision Points Before D3c-2n-4/);
  assert.match(safetyPlanSource, /Decision A: Should D3c-2n-4 production disposable verification be approved/);
  assert.match(safetyPlanSource, /Decision D: Should current completed work be committed before D3c-2n-4/);
  assert.match(safetyPlanSource, /Future Reliable Outbox \/ Auto-Retry Plan/);
  assert.match(safetyPlanSource, /Stable event\/operation id/);
  assert.match(safetyPlanSource, /Idempotent drain RPC behavior/);
  assert.match(safetyPlanSource, /retry state machine/);
  assert.match(safetyPlanSource, /No automatic worker is approved by this future plan/);
  assert.match(safetyPlanSource, /No revenue, inventory, product, market, cost, or `deal_closed` migration is approved/);

  assert.match(preflightPlanSource, /historical pre-implementation decision plan/);
  assert.match(preflightPlanSource, /D3c-2m local\/staging synthetic stale recovery execution passed on 2026-06-26 Asia\/Taipei/);
  assert.match(preflightPlanSource, /Treat D3c-2n-1 owner-only single-row service wrapper as complete/);
  assert.match(preflightPlanSource, /Keep D3c-2n-2 owner UI button blocked until explicit high-risk approval/);

  assert.match(decisionDraftSource, /historical D2a decision draft/);
  assert.match(decisionDraftSource, /Use `SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD\.md` for the current D3c-2m pass evidence/);
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
