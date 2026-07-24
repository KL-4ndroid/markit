import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const baselinePath = join(root, 'docs/WEB_UIUX_BASELINE_2026_07_23.md');
const executionPlanPath = join(root, 'docs/WEB_UIUX_SCORE_IMPROVEMENT_EXECUTION_PLAN_2026_07_23.md');

assert.equal(existsSync(baselinePath), true);
assert.equal(existsSync(executionPlanPath), true);

const baseline = readFileSync(baselinePath, 'utf8');
assert.match(baseline, /631 x 689/);
assert.match(baseline, /1440 x 900/);
assert.match(baseline, /Home and Today workflow/);
assert.match(baseline, /Subscription/);
assert.match(baseline, /future iOS and Android packaging/);
assert.match(baseline, /fail-closed/);

console.log('PASS web UIUX baseline contract');
