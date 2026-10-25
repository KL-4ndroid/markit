/** Read-only REST schema checks. Migration 075 additionally checks role grants in SQL. */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) {
  console.error('Missing local Supabase URL/server key; never paste keys into chat.');
  process.exitCode = 1;
} else {
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  let ready = true;
  for (const table of ['markets', 'staff_accessible_markets']) {
    const response = await fetch(new URL(`/rest/v1/${table}?select=payment_deadline&limit=0`, base), { headers });
    console.log(`${response.ok ? 'PASS' : 'PENDING'} ${table}.payment_deadline (HTTP ${response.status})`);
    if (!response.ok) ready = false;
  }
  for (const [deadline, expected] of [
    [{ date: '2026-10-24', timeZone: 'Asia/Taipei', reminderEnabled: true }, true],
    [{ date: '2026-02-30', timeZone: 'Asia/Taipei' }, false], [null, true],
  ]) {
    const response = await fetch(new URL('/rest/v1/rpc/market_payment_deadline_is_valid', base), { method: 'POST', headers, body: JSON.stringify({ deadline }) });
    const valid = response.ok && await response.json() === expected;
    console.log(`${valid ? 'PASS' : 'PENDING'} read-only deadline validator (expected ${expected})`);
    if (!valid) ready = false;
  }
  console.log(ready ? 'Cloud schema checks passed; SQL grants and real account/UI verification remain separate evidence.' : 'Keep NEXT_PUBLIC_MARKET_PAYMENT_DEADLINE_ENABLED=false until 075 passes.');
  if (!ready) process.exitCode = 1;
}
