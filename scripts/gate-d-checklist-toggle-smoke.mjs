import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_CONFIRMATION = 'D3c-2e writes one checklist toggle pending operation';
const ALLOWED_TARGETS = new Set(['local', 'staging', 'production-disposable']);

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function requireBooleanEnv(name) {
  const value = requireEnv(name).toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be "true" or "false".`);
}

function assertSafeInputs() {
  const target = requireEnv('GATE_D_SMOKE_TARGET');
  const confirmation = requireEnv('GATE_D_SMOKE_CONFIRM');

  if (!ALLOWED_TARGETS.has(target)) {
    throw new Error(
      `GATE_D_SMOKE_TARGET must be one of: ${Array.from(ALLOWED_TARGETS).join(', ')}.`
    );
  }

  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(`GATE_D_SMOKE_CONFIRM must be exactly: ${REQUIRED_CONFIRMATION}`);
  }

  if (target === 'production-disposable') {
    const productionConfirmation = requireEnv('GATE_D_SMOKE_PRODUCTION_CONFIRM');
    if (productionConfirmation !== 'I am using disposable production checklist data') {
      throw new Error(
        'GATE_D_SMOKE_PRODUCTION_CONFIRM must be exactly: I am using disposable production checklist data'
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
  const email = requireEnv('GATE_D_SMOKE_EMAIL');
  const password = requireEnv('GATE_D_SMOKE_PASSWORD');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Smoke test sign-in did not return a user.');
  }

  return data.user;
}

async function fetchSinglePendingOperation(supabase, operationId) {
  const { data, error } = await supabase
    .from('pending_operations')
    .select('operation_id, operation_type, entity_type, entity_id, market_id, status, actor_id, retry_count, last_error_code, last_error_message')
    .eq('operation_id', operationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchSingleEvent(supabase, operationId) {
  const { data, error } = await supabase
    .from('events')
    .select('id, type, payload, actor_id, market_id, metadata')
    .eq('id', operationId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

function assertPendingOperation(pendingOperation, operationId, marketId, itemId, actorId) {
  if (!pendingOperation) {
    throw new Error('Expected pending operation was not readable after drain.');
  }

  if (pendingOperation.operation_id !== operationId) {
    throw new Error('Pending operation id mismatch.');
  }

  if (pendingOperation.operation_type !== 'checklist_item_toggle') {
    throw new Error(`Unexpected operation_type: ${pendingOperation.operation_type}`);
  }

  if (pendingOperation.entity_type !== 'checklist_item') {
    throw new Error(`Unexpected entity_type: ${pendingOperation.entity_type}`);
  }

  if (pendingOperation.entity_id !== itemId) {
    throw new Error('Pending operation entity_id mismatch.');
  }

  if (pendingOperation.market_id !== marketId) {
    throw new Error('Pending operation market_id mismatch.');
  }

  if (pendingOperation.actor_id !== actorId) {
    throw new Error('Pending operation actor_id mismatch.');
  }

  if (pendingOperation.status !== 'synced') {
    throw new Error(
      `Expected pending operation status "synced"; got "${pendingOperation.status}" (${pendingOperation.last_error_code ?? 'no error code'}).`
    );
  }
}

function assertEvent(event, operationId, marketId, itemId, completed, actorId) {
  if (!event) {
    throw new Error('Expected final checklist event was not readable after drain.');
  }

  if (event.id !== operationId) {
    throw new Error('Final event id mismatch.');
  }

  if (event.type !== 'checklist_item_updated') {
    throw new Error(`Unexpected event type: ${event.type}`);
  }

  if (event.actor_id !== actorId) {
    throw new Error('Final event actor_id mismatch.');
  }

  if (event.market_id !== marketId) {
    throw new Error('Final event market_id mismatch.');
  }

  if (event.payload?.market_id !== marketId) {
    throw new Error('Final event payload.market_id mismatch.');
  }

  if (event.payload?.itemId !== itemId) {
    throw new Error('Final event payload.itemId mismatch.');
  }

  if (event.payload?.completed !== completed) {
    throw new Error('Final event payload.completed mismatch.');
  }

  if (event.payload?.text !== undefined) {
    throw new Error('Final event payload must not include checklist text.');
  }
}

async function main() {
  assertSafeInputs();

  const marketId = requireEnv('GATE_D_SMOKE_MARKET_ID');
  const itemId = requireEnv('GATE_D_SMOKE_CHECKLIST_ITEM_ID');
  const completed = requireBooleanEnv('GATE_D_SMOKE_COMPLETED');
  const operationId = randomUUID();
  const idempotencyKey = `manual-smoke:checklist-toggle:${operationId}`;
  const supabase = createSupabaseClient();
  const user = await signIn(supabase);

  console.log(`[gate-d-smoke] signed in as ${user.id}`);
  console.log(`[gate-d-smoke] operation_id=${operationId}`);

  const { data: enqueueData, error: enqueueError } = await supabase.rpc(
    'enqueue_checklist_toggle_pending_operation',
    {
      p_operation_id: operationId,
      p_market_id: marketId,
      p_item_id: itemId,
      p_completed: completed,
      p_idempotency_key: idempotencyKey,
    }
  );

  if (enqueueError) {
    throw enqueueError;
  }

  if (enqueueData !== operationId) {
    throw new Error(`Unexpected enqueue result: ${enqueueData}`);
  }

  const { data: drainData, error: drainError } = await supabase.rpc(
    'drain_checklist_toggle_pending_operation',
    {
      p_operation_id: operationId,
    }
  );

  if (drainError) {
    throw drainError;
  }

  if (drainData !== operationId) {
    throw new Error(`Unexpected drain result: ${drainData}`);
  }

  const pendingOperation = await fetchSinglePendingOperation(supabase, operationId);
  assertPendingOperation(pendingOperation, operationId, marketId, itemId, user.id);

  const { data: event, error: eventReadError } = await fetchSingleEvent(supabase, operationId);
  if (eventReadError) {
    throw new Error(`Final event read failed: ${eventReadError.message}`);
  }

  assertEvent(event, operationId, marketId, itemId, completed, user.id);

  console.log('[gate-d-smoke] PASS pending operation synced and final checklist event verified.');
}

main().catch(error => {
  console.error('[gate-d-smoke] FAIL');
  console.error(error);
  process.exitCode = 1;
});
