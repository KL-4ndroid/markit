import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..');
const sql = readFileSync(
  join(projectRoot, 'supabase/migrations/068_add_daily_market_operation_sessions.sql'),
  'utf8'
);

assert.match(sql, /ADD COLUMN IF NOT EXISTS operation_session_date DATE/i);
assert.match(sql, /update_market_operation_session_read_model/i);
assert.match(sql, /v_updates \? 'operation_phase'/i);
assert.match(sql, /v_updates \? 'operation_session_date'/i);
assert.match(sql, /AFTER INSERT ON public\.events/i);
assert.match(sql, /CREATE OR REPLACE VIEW public\.staff_accessible_markets/i);
assert.equal((sql.match(/m\.operation_session_date/g) ?? []).length, 2);

assert.match(sql, /NULL::numeric\(10,2\) AS registration_fee/i);
assert.match(sql, /NULL::numeric\(10,2\) AS booth_cost/i);
assert.match(sql, /NULL::numeric\(10,2\) AS total_profit/i);
assert.match(sql, /m\.registration_fee/i);
assert.match(sql, /m\.total_profit/i);

console.log('Supabase market operation session migration tests passed');
