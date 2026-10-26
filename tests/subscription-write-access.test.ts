import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkServerSubscriptionWrite, cloudSubscriptionTestSwitch } from '../lib/subscription/write-access.server';
import { parseSubscriptionWriteDecision } from '../lib/subscription/write-access';
import { resolveSubscriptionSimulationForRequest, setSubscriptionSimulation, clearSubscriptionSimulation } from '../lib/subscription/subscription-simulation.server';

const owner = '11111111-1111-4111-8111-111111111111';
async function main() {
  const input = { actorId: owner, ownerId: owner, feature: 'sales_photo' as const };
  let calls = 0;
  const rpc = async (name: string, args: Record<string, unknown>) => {
    calls++;
    assert.equal(name, 'check_subscription_write_for_actor');
    assert.deepEqual(args, { p_actor: owner, p_owner: owner, p_feature: 'sales_photo' });
    return { data: { enabled: true, allowed: false, reason: 'plan_required' }, error: null };
  };
  assert.equal((await checkServerSubscriptionWrite(input, { enabled: false, client: { rpc } })).allowed, true);
  assert.equal(calls, 0, 'disabled rollout does not call cloud');
  assert.equal((await checkServerSubscriptionWrite(input, { enabled: true, client: { rpc } })).reason, 'plan_required');
  assert.equal(calls, 1);
  for (const client of [null, { rpc: async () => ({ data: null, error: new Error('offline') }) }, { rpc: async () => { throw new Error('timeout'); } }, { rpc: async () => ({ data: { allowed: true }, error: null }) }]) {
    const decision = await checkServerSubscriptionWrite(input, { enabled: true, client });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'entitlement_unavailable');
  }
  for (const invalid of [null, {}, { enabled: true, allowed: true, reason: 'plan_required' }, { enabled: false, allowed: true, reason: 'allowed' }, { enabled: true, allowed: true, reason: 'pilot_not_enabled' }]) assert.equal(parseSubscriptionWriteDecision(invalid), null);
  assert.equal(parseSubscriptionWriteDecision({ enabled: true, allowed: true, reason: 'allowed' })?.allowed, true);

  const state = { enabled: true, planCode: 'team', expiresAt: '2099-01-01T00:00:00Z', cloudBacked: true };
  assert.deepEqual(await cloudSubscriptionTestSwitch(owner, { enabled: true, planCode: 'team' }, {
    async rpc(name, args) {
      assert.equal(name, 'set_subscription_test_switch');
      assert.deepEqual(args, { p_actor: owner, p_plan: 'team', p_enabled: true });
      return { data: state, error: null };
    },
  }), state);
  await cloudSubscriptionTestSwitch(owner, { enabled: false }, {
    async rpc(name, args) {
      assert.equal(name, 'set_subscription_test_switch');
      assert.deepEqual(args, { p_actor: owner, p_plan: null, p_enabled: false });
      return { data: { enabled: false, planCode: null, expiresAt: null, cloudBacked: true }, error: null };
    },
  });
  for (const data of [{ ...state, cloudBacked: false }, { ...state, expiresAt: 'bad' }, { ...state, planCode: 'admin' }]) {
    await assert.rejects(cloudSubscriptionTestSwitch(owner, undefined, { rpc: async () => ({ data, error: null }) }), /unavailable/);
  }
  await assert.rejects(cloudSubscriptionTestSwitch(owner, undefined, null), /unavailable/);
  await assert.rejects(cloudSubscriptionTestSwitch(owner, undefined, { rpc: async () => ({ data: state, error: new Error('allowlist denied') }) }), /unavailable/);

  const old = process.env.SUBSCRIPTION_SIMULATION_CLOUD_ENABLED;
  const oldEnforcement = process.env.SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED;
  try {
    setSubscriptionSimulation(owner, 'team');
    process.env.SUBSCRIPTION_SIMULATION_CLOUD_ENABLED = '1';
    assert.equal(resolveSubscriptionSimulationForRequest({ request: new Request('http://localhost:3000'), actorId: owner, ownerId: owner, nowMs: Date.now() }), null, 'cloud mode never falls back to local fake capabilities');
    delete process.env.SUBSCRIPTION_SIMULATION_CLOUD_ENABLED;
    process.env.SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED = '1';
    assert.equal(resolveSubscriptionSimulationForRequest({ request: new Request('http://localhost:3000'), actorId: owner, ownerId: owner, nowMs: Date.now() }), null);
  } finally {
    if (oldEnforcement === undefined) delete process.env.SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED;
    else process.env.SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED = oldEnforcement;
    clearSubscriptionSimulation(owner);
    if (old === undefined) delete process.env.SUBSCRIPTION_SIMULATION_CLOUD_ENABLED;
    else process.env.SUBSCRIPTION_SIMULATION_CLOUD_ENABLED = old;
  }
  for (const path of ['app/api/product-cover-photo/upload/route.ts', 'app/api/sales-photo-evidence/upload/route.ts']) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /checkServerSubscriptionWrite/);
    assert.match(source, /entitlement_changed/);
  }
  console.log('PASS subscription write access: rollout, fail-closed RPC, cloud switch and no local fallback');
}
void main();
