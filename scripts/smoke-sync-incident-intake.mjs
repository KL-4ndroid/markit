import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false, quiet: true });

const ISOLATED_FIXTURE_CONFIRMATION = 'isolated-fixture-only';
const EXISTING_TEST_ACCOUNT_CONFIRMATION = 'existing-test-account-only';
const EXPECTED_COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;
const MAX_PAGE_BYTES = 512 * 1024;
const MAX_SCRIPT_COUNT = 40;
const MAX_SCRIPT_BYTES = 3 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 12 * 1024 * 1024;
const args = process.argv.slice(2);

function readOption(name) {
  const prefix = `${name}=`;
  const inline = args.find(argument => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] ?? '').trim() : '';
}

function requireHttpsOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('base_url_invalid');
  }
  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('base_url_invalid');
  }
  return parsed.origin;
}

function requireEnvironment(names) {
  for (const name of names) {
    if (!process.env[name]?.trim()) throw new Error(`missing_environment:${name}`);
  }
}

const executeConfirmation = readOption('--execute');
const usesIsolatedFixture = executeConfirmation === ISOLATED_FIXTURE_CONFIRMATION;
const usesExistingTestAccount = executeConfirmation === EXISTING_TEST_ACCOUNT_CONFIRMATION;
if (!usesIsolatedFixture && !usesExistingTestAccount) {
  throw new Error('execution_confirmation_required');
}

const requestedProjectRef = readOption('--project-ref');
const baseUrl = requireHttpsOrigin(readOption('--base-url'));
const expectedCommit = readOption('--expected-commit').toLowerCase();
const cleanupLeftover = args.includes('--cleanup-leftover');
if (!EXPECTED_COMMIT_PATTERN.test(expectedCommit)) {
  throw new Error('expected_commit_invalid');
}
if (usesExistingTestAccount && (requestedProjectRef || cleanupLeftover)) {
  throw new Error('existing_account_option_invalid');
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const results = [];
let runFailure = null;
let cleanupFailure = null;
let authenticatedClient = null;
let supabaseUrl = null;
let service = null;
let actualProjectRef = null;
let statePath = null;
let state = null;

if (usesIsolatedFixture) {
  requireEnvironment([
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SECRET_KEY',
  ]);
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
  const hostname = new URL(supabaseUrl).hostname;
  actualProjectRef = hostname.endsWith('.supabase.co') ? hostname.split('.')[0] : '';
  if (!actualProjectRef || requestedProjectRef !== actualProjectRef) {
    throw new Error('project_ref_mismatch');
  }
  statePath = join(tmpdir(), `boothbook-sync-incident-smoke-${actualProjectRef}.json`);
  state = {
    version: 1,
    projectRef: actualProjectRef,
    createdAt: new Date().toISOString(),
    userId: null,
  };
  service = createClient(
    supabaseUrl,
    process.env.SUPABASE_SECRET_KEY,
    clientOptions,
  );
} else {
  requireEnvironment([
    'SYNC_INCIDENT_SMOKE_USER_EMAIL',
    'SYNC_INCIDENT_SMOKE_USER_PASSWORD',
  ]);
}

function record(check, status, detail) {
  results.push({ check, status, detail });
}

function safeErrorCode(error) {
  return String(error?.code || error?.name || 'unknown_error').slice(0, 80);
}

function requireCheck(check, condition, detail) {
  record(check, condition ? 'PASS' : 'FAIL', detail);
  if (!condition) throw new Error(`${check}:assertion_failed`);
}

function persistState() {
  if (!statePath || !state) throw new Error('fixture_state_unavailable');
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function readPersistedState() {
  if (!statePath) throw new Error('fixture_state_unavailable');
  const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
  if (
    parsed?.version !== 1
    || parsed?.projectRef !== actualProjectRef
    || (parsed.userId !== null && typeof parsed.userId !== 'string')
  ) {
    throw new Error('leftover_state_invalid');
  }
  return parsed;
}

async function deleteFixtureUser(userId) {
  if (!userId) return null;
  if (!service) return 'fixture_service_unavailable';
  const response = await service.auth.admin.deleteUser(userId);
  if (!response.error || response.error.status === 404 || response.error.code === 'user_not_found') {
    return null;
  }
  return safeErrorCode(response.error);
}

async function cleanupFixture(targetState) {
  const failure = await deleteFixtureUser(targetState?.userId);
  if (!failure && statePath) rmSync(statePath, { force: true });
  return failure;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readBoundedText(url, maximumBytes) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'BoothBook guarded sync incident smoke' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('public_config_fetch_failed');
  const contentLength = Number(response.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new Error('public_config_too_large');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maximumBytes) throw new Error('public_config_too_large');
  return new TextDecoder().decode(bytes);
}

async function discoverProductionPublicAuthConfig() {
  const html = await readBoundedText(baseUrl, MAX_PAGE_BYTES);
  const scriptUrls = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map(match => new URL(match[1], baseUrl))
    .filter(url => url.origin === baseUrl && url.pathname.startsWith('/_next/static/'));
  const uniqueScriptUrls = [...new Set(scriptUrls.map(url => url.href))];
  if (uniqueScriptUrls.length === 0 || uniqueScriptUrls.length > MAX_SCRIPT_COUNT) {
    throw new Error('public_config_script_count_invalid');
  }

  const parts = [];
  let totalBytes = 0;
  for (const url of uniqueScriptUrls) {
    const part = await readBoundedText(url, MAX_SCRIPT_BYTES);
    totalBytes += Buffer.byteLength(part, 'utf8');
    if (totalBytes > MAX_BUNDLE_BYTES) throw new Error('public_config_too_large');
    parts.push(part);
  }
  const bundle = parts.join('\n');
  const urls = new Set(bundle.match(/https:\/\/[a-z0-9-]+\.supabase\.co/gi) ?? []);
  const keys = new Set(bundle.match(/sb_publishable_[A-Za-z0-9_-]+/g) ?? []);
  if (urls.size !== 1 || keys.size !== 1) {
    throw new Error('public_config_ambiguous');
  }
  return {
    url: [...urls][0],
    publicKey: [...keys][0],
  };
}

async function authenticateForSmoke() {
  const productionConfig = await discoverProductionPublicAuthConfig();
  record('resolve exact-release public auth config', 'PASS', 'one bounded config observed');

  if (usesIsolatedFixture) {
    requireCheck(
      'target auth project matches isolated fixture project',
      new URL(productionConfig.url).hostname === new URL(supabaseUrl).hostname,
      'value-free project comparison completed',
    );
    const runId = randomUUID().replaceAll('-', '');
    const email = `boothbook-sync-incident-smoke-${runId}@example.com`;
    const password = `${randomBytes(24).toString('base64url')}Aa1!`;
    const creation = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { boothbook_test_fixture: true },
    });
    requireCheck(
      'create isolated auth fixture',
      !creation.error && Boolean(creation.data?.user?.id),
      creation.error ? safeErrorCode(creation.error) : 'fixture created',
    );
    state.userId = creation.data.user.id;
    persistState();
    authenticatedClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      clientOptions,
    );
    const signIn = await authenticatedClient.auth.signInWithPassword({ email, password });
    const accessToken = signIn.data?.session?.access_token;
    requireCheck(
      'authenticate isolated fixture',
      !signIn.error && typeof accessToken === 'string' && accessToken.length > 0,
      signIn.error ? safeErrorCode(signIn.error) : 'authenticated',
    );
    return accessToken;
  }

  authenticatedClient = createClient(
    productionConfig.url,
    productionConfig.publicKey,
    clientOptions,
  );
  const signIn = await authenticatedClient.auth.signInWithPassword({
    email: process.env.SYNC_INCIDENT_SMOKE_USER_EMAIL,
    password: process.env.SYNC_INCIDENT_SMOKE_USER_PASSWORD,
  });
  const accessToken = signIn.data?.session?.access_token;
  requireCheck(
    'authenticate existing test account',
    !signIn.error && typeof accessToken === 'string' && accessToken.length > 0,
    signIn.error ? safeErrorCode(signIn.error) : 'authenticated',
  );
  return accessToken;
}

async function runSmoke() {
  const healthResponse = await fetch(`${baseUrl}/api/health`, {
    headers: { 'User-Agent': 'BoothBook guarded sync incident smoke' },
    cache: 'no-store',
  });
  const health = await readJson(healthResponse);
  requireCheck(
    'release identity matches before authentication',
    healthResponse.ok
      && health?.status === 'healthy'
      && health?.release?.commitSha === expectedCommit.slice(0, 7),
    healthResponse.ok ? 'exact release observed' : `status:${healthResponse.status}`,
  );

  const accessToken = await authenticateForSmoke();
  const malformedResponse = await fetch(`${baseUrl}/api/operational-events/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      schemaVersion: 1,
      kind: 'unexpected_failure',
      pendingCount: 0,
      message: 'must be rejected',
    }),
  });
  const malformedBody = await readJson(malformedResponse);
  requireCheck(
    'authenticated extra-field report is rejected',
    malformedResponse.status === 400 && malformedBody?.code === 'sync_incident_invalid',
    `status:${malformedResponse.status}`,
  );

  const acceptedResponse = await fetch(`${baseUrl}/api/operational-events/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      schemaVersion: 1,
      kind: 'unexpected_failure',
      pendingCount: 0,
    }),
  });
  const acceptedBody = await readJson(acceptedResponse);
  requireCheck(
    'authenticated fixed report is accepted',
    acceptedResponse.status === 202 && acceptedBody?.ok === true,
    `status:${acceptedResponse.status}`,
  );
}

if (cleanupLeftover) {
  if (!usesIsolatedFixture || !statePath || !existsSync(statePath)) {
    throw new Error('leftover_state_missing');
  }
  const failure = await cleanupFixture(readPersistedState());
  record(
    'leftover fixture cleanup',
    failure ? 'FAIL' : 'PASS',
    failure ?? 'isolated auth fixture removed',
  );
  console.table(results);
  process.exit(failure ? 1 : 0);
}

if (usesIsolatedFixture && statePath && existsSync(statePath)) {
  throw new Error('leftover_state_exists');
}

try {
  if (usesIsolatedFixture) persistState();
  await runSmoke();
} catch (error) {
  runFailure = error;
  if (!results.some(result => result.status === 'FAIL')) {
    record('sync incident intake smoke', 'FAIL', safeErrorCode(error));
  }
} finally {
  let sessionFailure = null;
  if (authenticatedClient) {
    const signOut = await authenticatedClient.auth.signOut();
    sessionFailure = signOut.error ? safeErrorCode(signOut.error) : null;
  }
  const fixtureFailure = usesIsolatedFixture ? await cleanupFixture(state) : null;
  cleanupFailure = sessionFailure ?? fixtureFailure;
  record(
    usesIsolatedFixture ? 'session and isolated fixture cleanup' : 'test account session cleanup',
    cleanupFailure ? 'FAIL' : 'PASS',
    cleanupFailure ?? (usesIsolatedFixture ? 'session and auth fixture removed' : 'session signed out'),
  );
}

console.table(results);
if (runFailure || cleanupFailure) process.exit(1);
