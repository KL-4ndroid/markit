import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'lib/db/events.ts'), 'utf8');
const rebuild = source.slice(source.indexOf('export async function rebuildSnapshots'));
assert.match(rebuild, /db\.venues\.clear\(\)/);
assert.match(rebuild, /db\.operationSchedules\.clear\(\)/);
assert.match(rebuild, /orderBy\('timestamp'\)/);
assert.match(rebuild, /await handler\(event, db\)/);
assert.match(rebuild, /checkBackupIntegrity/);
console.log('recurring operations replay tests passed');
