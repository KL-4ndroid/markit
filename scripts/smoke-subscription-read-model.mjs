import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false, quiet: true });

const requiredEnvironment = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
];

for (const key of requiredEnvironment) {
  if (!process.env[key]?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  clientOptions,
);
const anonymous = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  clientOptions,
);

const results = [];
let hasFailure = false;

function record(check, status, detail) {
  results.push({ check, status, detail });
  if (status === 'FAIL') hasFailure = true;
}

function safeError(error) {
  return String(error?.code || error?.name || error?.message || 'unknown_error').slice(0, 80);
}

const profilesResult = await service.from('profiles').select('id').limit(30);
if (profilesResult.error) {
  record('service profile read', 'FAIL', safeError(profilesResult.error));
}

const profiles = profilesResult.data ?? [];
const ownerId = profiles[0]?.id ?? randomUUID();
const ownerRpc = await service.rpc('read_subscription_account_for_actor', {
  p_actor_id: ownerId,
  p_owner_id: ownerId,
});

if (ownerRpc.error) {
  record('owner RPC', 'FAIL', safeError(ownerRpc.error));
} else if (
  !Array.isArray(ownerRpc.data)
  || ownerRpc.data.length !== 1
  || ownerRpc.data[0]?.access_allowed !== true
) {
  record('owner RPC', 'FAIL', 'unexpected response shape');
} else {
  record(
    'owner RPC',
    'PASS',
    ownerRpc.data[0].account_exists ? 'explicit account row' : 'missing-row Free',
  );
}

const anonTable = await anonymous.from('subscription_accounts').select('owner_id').limit(1);
record(
  'anonymous table read',
  anonTable.error ? 'PASS' : 'FAIL',
  anonTable.error ? `denied: ${safeError(anonTable.error)}` : 'unexpectedly readable',
);

const anonRpc = await anonymous.rpc('read_subscription_account_for_actor', {
  p_actor_id: ownerId,
  p_owner_id: ownerId,
});
record(
  'anonymous RPC execute',
  anonRpc.error ? 'PASS' : 'FAIL',
  anonRpc.error ? `denied: ${safeError(anonRpc.error)}` : 'unexpectedly executable',
);

const relationshipsResult = await service
  .from('staff_relationships')
  .select('owner_id,staff_id,status')
  .limit(200);

if (relationshipsResult.error) {
  record('staff fixture read', 'FAIL', safeError(relationshipsResult.error));
} else {
  const relationships = relationshipsResult.data ?? [];
  const activeRelationship = relationships.find(row => row.status === 'active');
  if (activeRelationship) {
    const activeRpc = await service.rpc('read_subscription_account_for_actor', {
      p_actor_id: activeRelationship.staff_id,
      p_owner_id: activeRelationship.owner_id,
    });
    record(
      'active staff RPC',
      !activeRpc.error
        && Array.isArray(activeRpc.data)
        && activeRpc.data.length === 1
        && activeRpc.data[0]?.access_allowed === true
        ? 'PASS'
        : 'FAIL',
      activeRpc.error ? safeError(activeRpc.error) : 'authorized relationship check',
    );
  } else {
    record('active staff RPC', 'SKIP', 'no active fixture');
  }

  const inactiveRelationship = relationships.find(row => row.status !== 'active');
  if (inactiveRelationship) {
    const inactiveRpc = await service.rpc('read_subscription_account_for_actor', {
      p_actor_id: inactiveRelationship.staff_id,
      p_owner_id: inactiveRelationship.owner_id,
    });
    record(
      'inactive staff RPC',
      !inactiveRpc.error && Array.isArray(inactiveRpc.data) && inactiveRpc.data.length === 0
        ? 'PASS'
        : 'FAIL',
      inactiveRpc.error ? safeError(inactiveRpc.error) : 'empty result required',
    );
  } else {
    record('inactive staff RPC', 'SKIP', 'no inactive fixture');
  }

  const activePairs = new Set(
    relationships
      .filter(row => row.status === 'active')
      .map(row => `${row.staff_id}:${row.owner_id}`),
  );
  let foreignActorId = null;
  let foreignOwnerId = null;
  for (const actor of profiles) {
    for (const owner of profiles) {
      if (actor.id !== owner.id && !activePairs.has(`${actor.id}:${owner.id}`)) {
        foreignActorId = actor.id;
        foreignOwnerId = owner.id;
        break;
      }
    }
    if (foreignActorId) break;
  }

  const foreignRpc = await service.rpc('read_subscription_account_for_actor', {
    p_actor_id: foreignActorId ?? randomUUID(),
    p_owner_id: foreignOwnerId ?? ownerId,
  });
  record(
    'foreign actor RPC',
    !foreignRpc.error && Array.isArray(foreignRpc.data) && foreignRpc.data.length === 0
      ? 'PASS'
      : 'FAIL',
    foreignRpc.error ? safeError(foreignRpc.error) : 'empty result required',
  );
}

const accountsResult = await service
  .from('subscription_accounts')
  .select('plan_code,plan_source,entitlement_status')
  .limit(100);

if (accountsResult.error) {
  record('subscription state coverage', 'FAIL', safeError(accountsResult.error));
} else {
  const counts = new Map();
  for (const row of accountsResult.data ?? []) {
    const key = `${row.plan_source}:${row.plan_code}:${row.entitlement_status}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  record(
    'subscription state coverage',
    'PASS',
    counts.size > 0
      ? [...counts.entries()].map(([key, count]) => `${key}=${count}`).join(', ')
      : 'no explicit rows; default Free only',
  );
}

console.table(results);
if (hasFailure) process.exit(1);
