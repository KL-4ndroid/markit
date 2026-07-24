import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const doc = readFileSync(
  join(__dirname, '..', 'docs/p5-4-downgrade-safety-test-plan.md'),
  'utf-8'
);

const requiredPatterns = [
  /tests\/p5-4a-downgrade-detection\.test\.ts/,
  /tests\/p5-4b-role-cache-invalidation\.test\.ts/,
  /tests\/p5-4c-dexie-projection-cleanup\.test\.ts/,
  /tests\/p5-4d-role-freshness-gate\.test\.ts/,
  /Known Limitations/,
  /Multi-tab invalidation is not implemented/,
  /P5-5 Entry Gate/,
  /no operator\/manager UI write surface was enabled/i,
];

let passed = 0;
let failed = 0;

for (const pattern of requiredPatterns) {
  try {
    assert.match(doc, pattern);
    console.log(`PASS ${pattern}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${pattern}`);
    console.error(error);
    failed++;
  }
}

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
