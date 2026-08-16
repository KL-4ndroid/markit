import { createClient } from '@supabase/supabase-js';

const REQUIRED_CONFIRMATION = 'D3c-2e read-only preflight';
const ALLOWED_TARGETS = new Set(['local', 'staging', 'production-disposable']);
const CHECKLIST_EVENT_TYPES = new Set([
  'checklist_item_created',
  'checklist_item_updated',
  'checklist_item_deleted',
]);

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function assertSafeInputs() {
  const target = requireEnv('GATE_D_PREFLIGHT_TARGET');
  const confirmation = requireEnv('GATE_D_PREFLIGHT_CONFIRM');

  if (!ALLOWED_TARGETS.has(target)) {
    throw new Error(
      `GATE_D_PREFLIGHT_TARGET must be one of: ${Array.from(ALLOWED_TARGETS).join(', ')}.`
    );
  }

  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(`GATE_D_PREFLIGHT_CONFIRM must be exactly: ${REQUIRED_CONFIRMATION}`);
  }

  if (target === 'production-disposable') {
    const productionConfirmation = requireEnv('GATE_D_PREFLIGHT_PRODUCTION_CONFIRM');
    if (productionConfirmation !== 'I am checking disposable production checklist data') {
      throw new Error(
        'GATE_D_PREFLIGHT_PRODUCTION_CONFIRM must be exactly: I am checking disposable production checklist data'
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
  const email = requireEnv('GATE_D_PREFLIGHT_EMAIL');
  const password = requireEnv('GATE_D_PREFLIGHT_PASSWORD');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Preflight sign-in did not return a user.');
  }

  return data.user;
}

async function fetchChecklistEvents(supabase, marketId) {
  const { data, error } = await supabase
    .from('events')
    .select('id, type, payload, actor_id, market_id, timestamp, created_at, metadata')
    .eq('market_id', marketId)
    .in('type', Array.from(CHECKLIST_EVENT_TYPES))
    .order('timestamp', { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchPendingOperations(supabase, marketId, itemId) {
  const { data, error } = await supabase
    .from('pending_operations')
    .select(
      'operation_id, operation_type, entity_type, entity_id, market_id, status, actor_id, created_at, updated_at, last_error_code, last_error_message'
    )
    .eq('market_id', marketId)
    .eq('entity_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function summarizeChecklistItem(events, marketId, itemId) {
  const itemEvents = events.filter(event => {
    return event.market_id === marketId && event.payload?.itemId === itemId;
  });

  if (itemEvents.length === 0) {
    throw new Error('No checklist events found for the target item.');
  }

  let exists = false;
  let completed = false;
  let text = null;
  let lastEvent = null;

  for (const event of itemEvents) {
    lastEvent = event;

    if (event.type === 'checklist_item_created') {
      exists = true;
      completed = event.payload?.completed === true;
      text = typeof event.payload?.text === 'string' ? event.payload.text : text;
      continue;
    }

    if (event.type === 'checklist_item_updated') {
      if (typeof event.payload?.completed === 'boolean') {
        completed = event.payload.completed;
      }
      if (typeof event.payload?.text === 'string') {
        text = event.payload.text;
      }
      continue;
    }

    if (event.type === 'checklist_item_deleted') {
      exists = false;
    }
  }

  if (!exists) {
    throw new Error('Target checklist item appears deleted; choose a disposable active item.');
  }

  return {
    eventCount: itemEvents.length,
    completed,
    text,
    lastEvent,
    hasPendingDerivedEvent: itemEvents.some(
      event => event.metadata?.source === 'pending_operations'
    ),
  };
}

function assertNoBlockingPendingRows(pendingOperations) {
  const blockingStatuses = new Set(['pending', 'processing', 'failed_retryable']);
  const blockingRows = pendingOperations.filter(operation => {
    return (
      operation.operation_type === 'checklist_item_toggle' &&
      blockingStatuses.has(operation.status)
    );
  });

  if (blockingRows.length > 0) {
    throw new Error(
      `Found ${blockingRows.length} active/retryable pending rows for this item; inspect before smoke test.`
    );
  }
}

async function main() {
  assertSafeInputs();

  const marketId = requireEnv('GATE_D_PREFLIGHT_MARKET_ID');
  const itemId = requireEnv('GATE_D_PREFLIGHT_CHECKLIST_ITEM_ID');
  const supabase = createSupabaseClient();
  const user = await signIn(supabase);

  console.log(`[gate-d-preflight] signed in as ${user.id}`);

  const events = await fetchChecklistEvents(supabase, marketId);
  const itemSummary = summarizeChecklistItem(events, marketId, itemId);
  const pendingOperations = await fetchPendingOperations(supabase, marketId, itemId);

  assertNoBlockingPendingRows(pendingOperations);

  console.log(`[gate-d-preflight] checklist item is active: ${itemId}`);
  console.log(`[gate-d-preflight] current completed=${itemSummary.completed}`);
  console.log(`[gate-d-preflight] event count for item=${itemSummary.eventCount}`);
  console.log(`[gate-d-preflight] pending rows for item=${pendingOperations.length}`);

  if (itemSummary.hasPendingDerivedEvent) {
    console.warn(
      '[gate-d-preflight] warning: this item already has a pending_operations-derived event.'
    );
  }

  console.log('[gate-d-preflight] PASS read-only target validation completed.');
}

main().catch(error => {
  console.error('[gate-d-preflight] FAIL');
  console.error(error);
  process.exitCode = 1;
});
