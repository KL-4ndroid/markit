// Disposable request-state SQL verification. No .env, cloud connection, cleanup executor or volume mounts.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';

assert.deepEqual(process.argv.slice(2), ['--isolated'], 'Explicit --isolated required');
assert.ok(!process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT, 'Docker overrides prohibited');
const docker = (args, input) => spawnSync('docker', ['--context', 'desktop-linux', ...args], {
  input, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024,
});
assert.equal(docker(['context', 'inspect', 'desktop-linux', '--format', '{{.Endpoints.docker.Host}}']).stdout.trim(), 'npipe:////./pipe/dockerDesktopLinuxEngine');
const container = `feria-deletion-request-${randomUUID()}`;
const psql = ['exec', '-i', container, 'psql', '-XAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-U', 'postgres'];
const query = sql => { const r = docker(psql, sql); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const denied = (sql, code) => { const r = docker(psql, sql); assert.notEqual(r.status, 0); assert.ok(r.stderr.includes(code), r.stderr); };
const hash = value => createHash('sha256').update(value).digest('hex');
let passed = 0;
const pass = name => { passed++; console.log(`PASS ${name}`); };
async function lockedRace(leaderSql, followerSql) {
  const leader = spawn('docker', ['--context', 'desktop-linux', ...psql], { stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '', err = '', follower;
  let timeout;
  const result = await new Promise((resolve, reject) => {
    timeout = setTimeout(() => { leader.kill(); reject(new Error('isolated race timed out')); }, 10000);
    leader.stdout.on('data', chunk => {
      out += chunk;
      if (out.includes('LOCK_READY') && !follower) follower = new Promise((done, fail) => {
        const child = spawn('docker', ['--context', 'desktop-linux', ...psql]);
        let stdout = '', stderr = '';
        child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
        child.on('error', fail); child.on('close', status => done({ status, stdout, stderr })); child.stdin.end(followerSql);
      });
    });
    leader.stderr.on('data', chunk => { err += chunk; });
    leader.on('error', reject);
    leader.on('close', async status => {
      try { assert.equal(status, 0, err); assert.ok(follower); resolve(await follower); } catch (error) { reject(error); }
    });
    leader.stdin.end(leaderSql);
  }).finally(() => clearTimeout(timeout));
  return result;
}

try {
  const start = docker(['run', '--rm', '-d', '--network', 'none', '--name', container,
    '--label', 'feria-purpose=account-deletion-request-isolated', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']);
  assert.equal(start.status, 0, start.stderr);
  let ready = false;
  for (let n = 0; n < 40; n++) {
    if (docker(['exec', container, 'pg_isready', '-U', 'postgres']).status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Disposable PostgreSQL failed to start');
  query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE profiles(id uuid PRIMARY KEY); CREATE TABLE markets(owner_id uuid);
    CREATE TABLE subscription_accounts(owner_id uuid); CREATE TABLE staff_relationships(owner_id uuid,staff_id uuid);
    CREATE FUNCTION delete_current_user_app_data() RETURNS void LANGUAGE sql AS 'SELECT';`);
  query(readFileSync('supabase/migrations/071_add_account_deletion_request_foundation.sql', 'utf8'));
  const draft = readFileSync('docs/subscription/drafts/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.sql', 'utf8');
  assert.match(draft, /ROLLBACK;\s*$/);
  // Only the disposable DB receives a committed copy. The source draft remains ROLLBACK.
  query(draft.replace(/ROLLBACK;\s*$/, 'COMMIT;'));
  const outsider = randomUUID(); query(`INSERT INTO profiles VALUES ('${outsider}');`);
  const seed = () => {
    const actor = randomUUID(); query(`INSERT INTO profiles VALUES ('${actor}');`);
    const key = hash(actor);
    const row = JSON.parse(query(`SELECT row_to_json(r) FROM bff_create_account_deletion_request('${actor}','${key}','${key}','2026-08-17','clean') r;`));
    return { actor, id: row.request_id, key };
  };
  const call = (action, r, expected) => `SELECT row_to_json(x) FROM bff_${action}_account_deletion_request('${r.actor}','${r.id}','${expected}') x;`;
  const state = r => query(`SELECT status FROM account_deletion_requests WHERE id='${r.id}';`);
  const one = seed();
  assert.equal(JSON.parse(query(call('confirm', one, 'requested'))).status, 'identity_confirmed');
  assert.equal(JSON.parse(query(call('confirm', one, 'requested'))).status, 'identity_confirmed');
  pass('confirm is actor-bound and idempotent');
  denied(`SELECT * FROM bff_cancel_account_deletion_request('${outsider}','${one.id}','identity_confirmed');`, 'P0002');
  denied(`SELECT * FROM bff_confirm_account_deletion_request('${outsider}','${one.id}','requested');`, 'P0002');
  pass('cross-actor confirm and cancel reveal no request');
  denied(call('cancel', one, 'requested'), '55000');
  assert.equal(state(one), 'identity_confirmed'); pass('stale status cannot withdraw a changed request');
  assert.equal(JSON.parse(query(call('cancel', one, 'identity_confirmed'))).status, 'cancelled');
  assert.equal(JSON.parse(query(call('cancel', one, 'identity_confirmed'))).status, 'cancelled');
  assert.equal(JSON.parse(query(`SELECT row_to_json(r) FROM bff_read_account_deletion_request('${one.actor}') r;`)).status, 'cancelled');
  denied(call('confirm', one, 'requested'), '55000'); pass('withdrawal is durable, idempotent and terminal');
  const staffActor = randomUUID();
  query(`INSERT INTO profiles VALUES ('${staffActor}'); INSERT INTO staff_relationships VALUES ('${one.actor}','${staffActor}');`);
  const staffKey = hash(staffActor);
  const staffRow = JSON.parse(query(`SELECT row_to_json(r) FROM bff_create_account_deletion_request('${staffActor}','${staffKey}','${staffKey}','2026-08-17','clean') r;`));
  const staff = { actor: staffActor, id: staffRow.request_id };
  assert.equal(query(`SELECT account_kind FROM account_deletion_requests WHERE id='${staff.id}';`), 'staff');
  query(call('confirm', staff, 'requested')); query(call('cancel', staff, 'identity_confirmed'));
  assert.equal(state(staff), 'cancelled'); assert.equal(state(one), 'cancelled');
  pass('staff self-request confirmation and withdrawal leave owner request unchanged');
  const duplicate = seed();
  const repeat = query(`SELECT request_id FROM bff_create_account_deletion_request('${duplicate.actor}','${duplicate.key}','${duplicate.key}','2026-08-17','clean');`);
  assert.equal(repeat, duplicate.id);
  denied(`SELECT * FROM bff_create_account_deletion_request('${duplicate.actor}','${hash('another')}','${hash('another')}','2026-08-17','clean');`, '23505');
  pass('idempotency and one active request remain enforced');
  for (const role of ['anon', 'authenticated']) {
    for (const op of ['confirm', 'cancel']) denied(`SET ROLE ${role}; ${call(op, duplicate, 'requested')}`, '42501');
  }
  assert.equal(query("SELECT has_table_privilege('service_role','account_deletion_requests','SELECT');"), 'f');
  pass('client RPC and direct service table access stay denied');
  const dirty = seed();
  query(`UPDATE account_deletion_cleanup_steps SET status='processing' WHERE request_id='${dirty.id}' AND step_code='access_frozen';`);
  denied(call('cancel', dirty, 'requested'), '55000'); pass('any started cleanup step blocks withdrawal');
  const cancelFirst = seed(); query(call('confirm', cancelFirst, 'requested'));
  const notClaimed = await lockedRace(`BEGIN; SELECT id FROM account_deletion_requests WHERE id='${cancelFirst.id}' FOR UPDATE;
    SELECT 'LOCK_READY'; SELECT pg_sleep(0.5); ${call('cancel', cancelFirst, 'identity_confirmed')} COMMIT;`,
    `SELECT bff_claim_account_deletion_lease('${cancelFirst.id}','synthetic-worker',clock_timestamp(),30)->>'claimed';`);
  assert.equal(notClaimed.status, 0, notClaimed.stderr); assert.equal(notClaimed.stdout.trim(), 'false');
  assert.equal(state(cancelFirst), 'cancelled'); pass('real two-session race: withdrawal first prevents lease');
  const workerFirst = seed(); query(call('confirm', workerFirst, 'requested'));
  const noCancel = await lockedRace(`BEGIN; SELECT bff_claim_account_deletion_lease('${workerFirst.id}','synthetic-worker',clock_timestamp(),30);
    SELECT 'LOCK_READY'; SELECT pg_sleep(0.5); COMMIT;`, call('cancel', workerFirst, 'identity_confirmed'));
  assert.notEqual(noCancel.status, 0); assert.ok(noCancel.stderr.includes('55000')); assert.equal(state(workerFirst), 'processing');
  pass('real two-session race: lease first rejects withdrawal');
  assert.equal(query("SELECT count(*) FROM account_deletion_cleanup_steps WHERE status='completed';"), '0');
  assert.equal(query('SELECT count(*) FROM markets;'), '0');
  pass('no cleanup step, workspace, R2, billing or auth deletion executed');
  console.log(`${passed} isolated PostgreSQL workflow checks passed; no published database or credentials used.`);
} finally {
  // Exact generated name, local context, no shared container or mounted workspace.
  docker(['rm', '-f', '-v', container]);
}
