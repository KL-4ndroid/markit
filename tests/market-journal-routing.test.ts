import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Test the actual legacy redirect pattern, including reserved static routes.
const config = readFileSync('next.config.mjs','utf8');
const pattern = config.match(/source: '\/markets\/:id\(([^\n]+)\)',/)!;
assert.ok(pattern);
const legacyId = new RegExp(`^(?:${pattern[1]})$`);
for (const reserved of ['detail','schedules','journals','regions']) assert.equal(legacyId.test(reserved),false,reserved);
assert.equal(legacyId.test('d7b88518-a3e6-4a42-9969-06680418ee19'),true);
assert.equal(legacyId.test('journals/something'),false);
console.log('PASS static journal and region routes are excluded from the legacy market-ID redirect');
