import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'lib/db/index.ts'), 'utf8');
assert.match(source, /this\.version\(8\)\.stores/);
assert.match(source, /venues: 'id, owner_id, status, sync_status'/);
assert.match(source, /operationSchedules: 'id, owner_id, venueId, status, sync_status/);
assert.match(source, /&scheduleOccurrenceKey/);
assert.doesNotMatch(source.match(/this\.version\(8\)\.stores\([\s\S]*?\n\s*}\);/)?.[0] ?? '', /\.clear\(/);
console.log('recurring operations Dexie migration tests passed');
