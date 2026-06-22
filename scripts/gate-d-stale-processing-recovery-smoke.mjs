import { createClient } from '@supabase/supabase-js';

const REQUIRED_CONFIRMATION = 'D3c-2l recover one stale processing pending operation';
const ALLOWED_TARGETS = new Set(['local', 'staging', 'production-disposable']);
const STALE_PROCESSING_THRESHOLD_MS = 15 * 60 * 1000;
const ALLOWED_RESULTS = new Set(['synced', 'failed_permanent', 'failed_retryable']);

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function assertSafeInputs() {
  const target = requireEnv('GATE_D_STALE_RECOVERY_TARGET');
  const confirmation = requireEnv('GATE_D_STALE_RECOVERY_CONFIRM');

  if (!ALLOWED_TARGETS.has(target)) {
    throw new Error(
      `GATE_D_STALE_RECOVERY_TARGET must be one of: ${Array.from(ALLOWED_TARGETS).join(', ')}.`
    );
  }

  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(`GATE_D_STALE_RECOVERY_CONFIRM must be exactly: ${REQUIRED_CONFIRMATION}`);
  }

  if (target === 'production-disposable') {
    const productionConfirmation = requireEnv('GATE_D_STALE_RECOVERY_PRODUCTION_CONFIRM');
    if (productionConfirmation !== 'I am using a disposable stale processing pending operation') {
      throw new Error(
        'GATE_D_STALE_RECOVERY_PRODUCTION_CONFIRM must be exactly: I am using a disposable stale processing pending operation'
      );
    }
  }
}

function createSupabaseClient() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (/service[_-]?role/i.test(supabaseAnonKey)) {
    throw new Error('Refusing to run with a service-role-looking key.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signIn(supabase) {
  const email = requireEnv('GATE_D_STALE_RECOVERY_EMAIL');
  const password = requireEnv('GATE_D_STALE_RECOVERY_PASSWORD');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Recovery smoke sign-in did not return a user.');
  }

  return data.user;
}

async function fetchSinglePendingOperation(supabase, operationId) {
  const { data, error } = await supabase
    .from('pending_operations')
    .select(
      'operation_id, operation_type, entity_type, entity_id, market_id, status, actor_id, retry_count, updated_at, last_error_code, last_error_message'
    )
    .eq('operation_id', operationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function assertRecoverableBefore(operation, operationId) {
  if (!operation) {
    throw new Error('Target pending operation was not readable.');
  }

  if (operation.operation_id !== operationId) {
    throw new Error('Pending operation id mismatch.');
  }

  if (operation.status !== 'processing') {
    throw new Error(`Expected status "processing"; got "${operation.status}".`);
  }

  const updatedAtMs = Date.parse(operation.updated_at);
  if (!Number.isFinite(updatedAtMs)) {
    throw new Error('updated_at is not a valid timestamp.');
  }

  if (Date.now() - updatedAtMs < STALE_PROCESSING_THRESHOLD_MS) {
    throw new Error('Target pending operation is not stale enough for recovery.');
  }
}

function assertRecoveredAfter(operation, operationId, rpcResult) {
  if (!operation) {
    throw new Error('Target pending operation was not readable after recovery.');
  }

  if (operation.operation_id !== operationId) {
    throw new Error('Pending operation id mismatch after recovery.');
  }

  if (!ALLOWED_RESULTS.has(rpcResult)) {
    throw new Error(`Unexpected recovery RPC result: ${rpcResult}`);
  }

  if (operation.status !== rpcResult) {
    throw new Error(
      `Expected pending operation status to match RPC result "${rpcResult}"; got "${operation.status}".`
    );
  }
}

async function main() {
  assertSafeInputs();

  const operationId = requireEnv('GATE_D_STALE_RECOVERY_OPERATION_ID');
  const supabase = createSupabaseClient();
  const user = await signIn(supabase);

  console.log(`[gate-d-stale-recovery] signed in as ${user.id}`);
  console.log(`[gate-d-stale-recovery] operation_id=${operationId}`);

  const before = await fetchSinglePendingOperation(supabase, operationId);
  assertRecoverableBefore(before, operationId);

  const { data: recoveryResult, error: recoveryError } = await supabase.rpc(
    'recover_stale_processing_pending_operation',
    {
      p_operation_id: operationId,
    }
  );

  if (recoveryError) {
    throw recoveryError;
  }

  const after = await fetchSinglePendingOperation(supabase, operationId);
  assertRecoveredAfter(after, operationId, recoveryResult);

  console.log(`[gate-d-stale-recovery] recovery result=${recoveryResult}`);
  console.log('[gate-d-stale-recovery] PASS stale processing recovery verified.');
}

main().catch(error => {
  console.error('[gate-d-stale-recovery] FAIL');
  console.error(error);
  process.exitCode = 1;
});
