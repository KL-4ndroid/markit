import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const types = fs.readFileSync(path.join(process.cwd(), 'types/db.ts'), 'utf8');
const handlers = fs.readFileSync(path.join(process.cwd(), 'lib/db/events.ts'), 'utf8');
for (const type of [
  'venue_created', 'venue_updated', 'venue_archived',
  'operation_schedule_created', 'operation_schedule_updated',
  'operation_schedule_paused', 'operation_schedule_resumed', 'operation_schedule_archived',
]) {
  assert.match(types, new RegExp(`'${type}'`));
  assert.match(handlers, new RegExp(`registerEventHandler\\('${type}'`));
}
console.log('recurring operations event tests passed');
