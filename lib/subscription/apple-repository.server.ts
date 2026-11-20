import 'server-only';
import type { Pool, PoolClient } from 'pg';
import type { NativeReconciliationRepository, NativeReconciliationTransaction } from './native-reconciliation.server';
import type { NativeStoreVerificationContext, VerifiedNativeStoreSubscription } from './native-store-verification-contract';
import type { ReconciliationMapping, NativeReconciliationState } from './native-reconciliation-decision';

export function createApplePostgresRepository(pool: Pool, environment: 'sandbox' | 'production') {
  async function command(client: PoolClient, op: string, owner: string | null, input: object): Promise<unknown> {
    return (await client.query('SELECT native_billing_private.command($1,$2::uuid,$3::jsonb) AS value',[op,owner,JSON.stringify(input)])).rows[0].value;
  }
  async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL ROLE stallight_billing_writer; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='5s'; SET LOCAL idle_in_transaction_session_timeout='8s'");
      const value = await work(client);
      await client.query('COMMIT'); return value;
    } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; }
    finally { client.release(); }
  }
  const call = (op: string, owner: string | null, input: object) => transaction(c => command(c,op,owner,input));
  const key = '0'.repeat(64);
  const repository: NativeReconciliationRepository = {
    priceCatalog: 'database',
    withOwnerTransaction: (owner, work) => transaction(async client => {
      let readSnapshot: VerifiedNativeStoreSubscription | null = null;
      let readKey = '';
      const tx: NativeReconciliationTransaction = {
        async readState(snapshot,k) {
          if(snapshot.ownerId!==owner || snapshot.environment!==environment)throw new Error('apple_scope');
          readSnapshot=snapshot;readKey=k;
          return await command(client,'state',owner,{snapshot,key:k}) as NativeReconciliationState;
        },
        async readMapping(snapshot) {
          const mapping = await command(client,'mapping',owner,{snapshot,key:readKey || key}) as ReconciliationMapping | null;
          return mapping && {...mapping,price:{...mapping.price,effectiveAt:mapping.price.effectiveAt ? new Date(mapping.price.effectiveAt).toISOString() : null}};
        },
        async recordDecision(input) {
          if(input.snapshot!==readSnapshot || input.reconciliationKey!==readKey)throw new Error('apple_transaction_scope');
          await command(client,'record',owner,{snapshot:input.snapshot,key:readKey,decision:input.decision});
        },
        async applyBillingProjection(input) {
          if(input.snapshot!==readSnapshot)throw new Error('apple_transaction_scope');
          await command(client,'apply',owner,{snapshot:input.snapshot,key:readKey,decision:input.decision});
        },
      };
      return work(tx);
    }),
  };
  return {
    repository,
    async context(owner: string): Promise<NativeStoreVerificationContext> {
      const token = await call('binding',owner,{});
      if(typeof token!=='string')throw new Error('apple_binding');
      return {authenticatedOwnerId:owner,expectedAccountBindingToken:token,environment};
    },
    async lookupBinding(token: string): Promise<string | null> {
      return await call('lookup_binding',null,{token}) as string | null;
    },
    async mapping(context: NativeStoreVerificationContext,productId: string) {
      const mapping=await call('mapping',context.authenticatedOwnerId,{key,snapshot:{ownerId:context.authenticatedOwnerId,environment,origin:'apple_app_store',providerSubscriptionRef:'0',snapshotHash:key,productId}}) as ReconciliationMapping | null;
      return mapping && {...mapping,price:{...mapping.price,effectiveAt:mapping.price.effectiveAt ? new Date(mapping.price.effectiveAt).toISOString() : null}};
    },
    async eventClaim(input: {event: string; hash: string; occurredAt: string}) {
      return await call('event_claim',null,{...input,environment}) as {duplicate?:boolean;busy?:boolean;lease?:string};
    },
    async eventFinish(input: {event: string;lease:string;result:'done'|'retry'|'review'}) {await call('event_finish',null,{...input,environment});},
  };
}
