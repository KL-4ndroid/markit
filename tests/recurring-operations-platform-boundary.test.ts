import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const materializer = readFileSync('lib/recurring-operations/scheduled-market-materializer.ts', 'utf8');
const start = readFileSync('lib/recurring-operations/scheduled-market-start.ts', 'utf8');
const gate = readFileSync('components/recurring-operations/RecurringOperationsMaterializationGate.tsx', 'utf8');

assert.doesNotMatch(materializer, /window\.|document\.|navigator\.|@capacitor/i);
assert.doesNotMatch(start, /window\.|document\.|navigator\.|@capacitor|Dexie|supabase/i);
assert.match(gate, /getLifecyclePort\(\)\.subscribe/);
assert.doesNotMatch(gate, /window\.|document\.|visibilitychange|setInterval/);
console.log('recurring operations platform boundary tests passed');
