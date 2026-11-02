// Test infrastructure only. Never imported by app/client code. No dotenv or hosted target support.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const PROJECT = 'deletion-request-real-20261101';
export const LOCAL_API = 'http://127.0.0.1:55381';
export const INTEGRATION_ORIGIN = 'http://127.0.0.1:41082';
export const TEST_PASSWORD = 'Synthetic-Delete-Only-20261101!';
const KEYS = '.codex-artifacts/deletion-real-keys.private.json';
const STATE = '.codex-artifacts/deletion-real-state.private.json';
const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } as const;
export const docker = (args: string[], input?: string): string => execFileSync('docker', ['--context', 'desktop-linux', ...args], {
  input, encoding: 'utf8', timeout: 20000, maxBuffer: 4 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
});
type Container = { Config: { Labels: Record<string, string> }; HostConfig: { PortBindings: Record<string, { HostIp: string; HostPort: string }[]> }; Name: string };
export function assertLocalDeletionStack() {
  if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT) throw new Error('Docker overrides prohibited');
  if (docker(['context', 'inspect', 'desktop-linux', '--format', '{{.Endpoints.docker.Host}}']).trim() !== 'npipe:////./pipe/dockerDesktopLinuxEngine') throw new Error('Not local Docker Desktop');
  for (const [service, port, external] of [['db', '5432/tcp', '55382'], ['kong', '8000/tcp', '55381']] as const) {
    const name = `supabase_${service}_${PROJECT}`;
    const row = (JSON.parse(docker(['inspect', name])) as Container[])[0];
    if (row.Name !== `/${name}` || row.Config.Labels['com.supabase.cli.project'] !== PROJECT
      || resolve(row.Config.Labels['com.supabase.cli.workdir']) !== resolve('.codex-artifacts/deletion-real-supabase')) throw new Error('Disposable target mismatch');
    const bindings = row.HostConfig.PortBindings[port];
    if (!bindings?.length || bindings.some(p => p.HostIp !== '127.0.0.1' || p.HostPort !== external)) throw new Error('Test services must bind only to loopback');
  }
  const config = readFileSync('.codex-artifacts/deletion-real-supabase/supabase/config.toml', 'utf8');
  if (!config.includes(`project_id = "${PROJECT}"`)) throw new Error('Disposable config mismatch');
}
export function localDeletionKeys() {
  const keys = JSON.parse(readFileSync(KEYS, 'utf8').replace(/^\uFEFF/, '')) as Record<string, string>;
  if (keys.API_URL !== LOCAL_API || !keys.SECRET_KEY?.startsWith('sb_secret_') || !keys.PUBLISHABLE_KEY?.startsWith('sb_publishable_')) throw new Error('Local modern API keys required');
  const db = new URL(keys.DB_URL);
  if (db.hostname !== '127.0.0.1' || db.port !== '55382') throw new Error('Not local database');
  return keys;
}
export function sql(text: string): string {
  return docker(['exec', '-i', `supabase_db_${PROJECT}`, 'psql', '-XAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], text).trim();
}
export type LocalDeletionState = { owner: { id: string; email: string }; staff: { id: string; email: string }; hmac: string };
export function localDeletionState(): LocalDeletionState {
  const data = JSON.parse(readFileSync(STATE, 'utf8')) as LocalDeletionState;
  for (const item of [data.owner, data.staff]) {
    if (!/^[0-9a-f-]{36}$/.test(item.id) || !/^deletion-(owner|staff)-20261101@example\.test$/.test(item.email)) throw new Error('Non-synthetic identity refused');
  }
  return data;
}
export async function prepareLocalDeletionFixture() {
  assertLocalDeletionStack();
  if (sql("SELECT to_regclass('public.account_deletion_requests') IS NULL;") !== 't') throw new Error('Prepare requires a fresh disposable schema; no reset will be performed');
  const keys = localDeletionKeys();
  sql(`CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id));
    CREATE TABLE public.markets(owner_id uuid NOT NULL REFERENCES public.profiles(id));
    CREATE TABLE public.subscription_accounts(owner_id uuid NOT NULL REFERENCES public.profiles(id));
    CREATE TABLE public.staff_relationships(owner_id uuid NOT NULL REFERENCES public.profiles(id), staff_id uuid NOT NULL REFERENCES public.profiles(id));
    CREATE FUNCTION public.delete_current_user_app_data() RETURNS void LANGUAGE sql AS 'SELECT';
    REVOKE ALL ON FUNCTION public.delete_current_user_app_data() FROM PUBLIC,anon,authenticated,service_role;`);
  sql(readFileSync('supabase/migrations/071_add_account_deletion_request_foundation.sql', 'utf8'));
  const draft = readFileSync('docs/subscription/drafts/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.sql', 'utf8');
  if (!/ROLLBACK;\s*$/.test(draft)) throw new Error('Expected rollback draft');
  sql(draft.replace(/ROLLBACK;\s*$/, 'COMMIT;') + "\nNOTIFY pgrst, 'reload schema';");
  const admin = createClient(LOCAL_API, keys.SECRET_KEY, opts);
  async function user(kind: 'owner' | 'staff') {
    const email = `deletion-${kind}-20261101@example.test`;
    const result = await admin.auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true });
    if (result.error || !result.data.user) throw new Error('Local synthetic user creation failed');
    return { id: result.data.user.id, email };
  }
  const owner = await user('owner'); const staff = await user('staff');
  sql(`INSERT INTO public.profiles VALUES ('${owner.id}'),('${staff.id}');
    INSERT INTO public.markets VALUES ('${owner.id}');
    INSERT INTO public.staff_relationships VALUES ('${owner.id}','${staff.id}');`);
  writeFileSync(STATE, JSON.stringify({ owner, staff, hmac: randomBytes(48).toString('hex') }));
  console.log('PASS prepared two synthetic Auth identities and request-only schema on verified loopback Supabase');
}
export function configureLocalDeletionServer() {
  assertLocalDeletionStack();
  const keys = localDeletionKeys(); const state = localDeletionState();
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') throw new Error('Deployed runtime refused');
  Object.assign(process.env, { NODE_ENV: 'test', APP_ENV: 'test', NEXT_PUBLIC_SUPABASE_URL: LOCAL_API,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: keys.PUBLISHABLE_KEY, SUPABASE_SECRET_KEY: keys.SECRET_KEY,
    ACCOUNT_DELETION_ROUTE_ENABLED: '1', ACCOUNT_DELETION_AD2_REPOSITORY_READY: '1',
    ACCOUNT_DELETION_REQUEST_WORKFLOW_ENABLED: '1', ACCOUNT_DELETION_HMAC_SECRET: state.hmac,
  });
  return { keys, state };
}
export async function ageSyntheticSession(token: string): Promise<void> {
  const keys = localDeletionKeys(); const state = localDeletionState();
  const auth = createClient(LOCAL_API, keys.PUBLISHABLE_KEY, opts);
  const verified = await auth.auth.getUser(token);
  const actor = verified.data.user?.id;
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { session_id?: string };
  if (verified.error || !actor || ![state.owner.id, state.staff.id].includes(actor) || !/^[0-9a-f-]{36}$/.test(claims.session_id ?? '')) throw new Error('Synthetic current session required');
  sql(`UPDATE auth.mfa_amr_claims SET created_at=clock_timestamp()-interval '10 minutes', updated_at=clock_timestamp()-interval '10 minutes'
    WHERE session_id='${claims.session_id}' AND EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id='${claims.session_id}' AND s.user_id='${actor}');`);
}
export function localDeletionPreservationProof() {
  return JSON.parse(sql(`SELECT json_build_object('authUsers',(SELECT count(*) FROM auth.users), 'profiles',(SELECT count(*) FROM public.profiles),
    'markets',(SELECT count(*) FROM public.markets),'staffRelations',(SELECT count(*) FROM public.staff_relationships),
    'startedCleanup',(SELECT count(*) FROM public.account_deletion_cleanup_steps WHERE status <> 'pending'));`)) as {
    authUsers: number; profiles: number; markets: number; staffRelations: number; startedCleanup: number;
  };
}
