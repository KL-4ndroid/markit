import { createHmac } from 'node:crypto';
import type { BillingRetentionFingerprint } from './account-deletion-billing-retention';

/** Dedicated explicit key; never read fallback app/service credentials or expose key to a client. */
export function createBillingRetentionFingerprint(key:Uint8Array,keyVersion:string):BillingRetentionFingerprint{
  if(key.byteLength<32||!/^[a-z0-9_-]{1,32}$/.test(keyVersion))throw new Error('Dedicated retention key required.');
  const secret=Buffer.from(key);
  return Object.freeze(Object.assign((purpose:string,value:string)=>createHmac('sha256',secret)
    .update(JSON.stringify(['billing-detachment-v1',keyVersion,purpose,value])).digest('hex'),{keyVersion}));
}
