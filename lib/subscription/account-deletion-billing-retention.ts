/** Pure minimization contract. It never mutates a ledger, cancels billing or grants entitlement. */
export const DETACHABLE_BILLING_TABLES = [
  'billing_customer_links','billing_subscriptions','billing_transactions',
  'billing_reconciliation_runs','subscription_price_assignments',
] as const;
export type DetachableBillingTable=typeof DETACHABLE_BILLING_TABLES[number];
export type BillingRetentionFingerprint=((purpose:string,value:string)=>string)&Readonly<{keyVersion:string}>;
export type DetachedBillingEvidence=Readonly<{
  billingSubjectId:string;sourceTable:DetachableBillingTable|'billing_event_inbox';recordRef:string;
  detachedAt:string;retainUntil:string;keyVersion:string;
  facts:Readonly<Record<string,string|number|boolean|null>>;
  refs:Readonly<Record<string,string>>;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const origin=['newebpay_web','ecpay_web','apple_app_store','google_play'];
function fail():never{throw new Error('Billing evidence requires classification or valid source data.');}
function timestamp(value:unknown):string{
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))return fail();
  return new Date(value).toISOString();
}
function integer(value:unknown):number{
  if(typeof value==='string'&&/^\d+$/.test(value))value=Number(value);
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)return fail();return value;
}
function member(value:unknown,values:readonly string[]):string{
  if(typeof value!=='string'||!values.includes(value))return fail();return value;
}

export function buildDetachedBillingEvidence(input:{
  table:DetachableBillingTable;row:Readonly<Record<string,unknown>>;actorId:string;
  billingSubjectId:string;detachedAt:string;retainUntil:string;keyVersion:string;
  fingerprint:BillingRetentionFingerprint;
}):DetachedBillingEvidence{
  const {table,row}=input;
  if(!DETACHABLE_BILLING_TABLES.includes(table)||!UUID.test(input.actorId)||row.owner_id!==input.actorId
    ||typeof row.id!=='string'||!UUID.test(row.id)||!UUID.test(input.billingSubjectId)
    ||!/^[a-z0-9_-]{1,32}$/.test(input.keyVersion)||input.fingerprint.keyVersion!==input.keyVersion)return fail();
  const detachedAt=timestamp(input.detachedAt),retainUntil=timestamp(input.retainUntil);
  if(Date.parse(retainUntil)<=Date.parse(detachedAt))return fail();
  const refs:Record<string,string>={},facts:Record<string,string|number|boolean|null>={};
  const digest=(purpose:string,value:unknown)=>{
    if(typeof value!=='string'||!value||value.length>1000)return fail();
    const result=input.fingerprint(purpose,value);if(!HASH.test(result))return fail();return result;
  };
  const billingOrigin=table==='subscription_price_assignments'?null:member(row.billing_origin,origin);
  const environment=table==='subscription_price_assignments'?null:member(row.provider_environment,['sandbox','production']);
  if(billingOrigin){facts.billing_origin=billingOrigin;facts.provider_environment=environment;}
  const provider=(field:string,kind:string)=>{
    if(row[field]!==null&&row[field]!==undefined)refs[field]=digest(`provider:${billingOrigin}:${environment}:${kind}`,row[field]);
  };
  const linked=(field:string,target:DetachableBillingTable)=>{
    if(row[field]!==null&&row[field]!==undefined){if(typeof row[field]!=='string'||!UUID.test(row[field]))return fail();refs[field]=digest(`record:${target}`,row[field]);}
  };
  const date=(field:string)=>{facts[field]=row[field]===null||row[field]===undefined?null:timestamp(row[field]);};
  const requiredDate=(field:string)=>{facts[field]=timestamp(row[field]);};
  if(table==='billing_customer_links'){
    if(!row.provider_customer_ref)return fail();provider('provider_customer_ref','customer');requiredDate('created_at');
  }else if(table==='billing_subscriptions'){
    if(!row.provider_subscription_ref||!row.billing_customer_link_id)return fail();
    provider('provider_subscription_ref','subscription');linked('billing_customer_link_id','billing_customer_links');
    facts.normalized_plan_code=member(row.normalized_plan_code,['pro','team']);
    facts.normalized_cadence=member(row.normalized_cadence,['monthly','annual']);
    facts.normalized_billing_status=member(row.normalized_billing_status,['trialing','active','past_due','cancelled','expired','paused','refunded','disputed','unknown']);
    if(typeof row.cancel_at_period_end!=='boolean')return fail();facts.cancel_at_period_end=row.cancel_at_period_end;
    date('current_period_starts_at');date('current_period_ends_at');requiredDate('provider_observed_at');
  }else if(table==='billing_transactions'){
    if(!row.provider_transaction_ref)return fail();provider('provider_transaction_ref','transaction');provider('provider_parent_transaction_ref','transaction');
    linked('billing_subscription_id','billing_subscriptions');
    facts.transaction_kind=member(row.transaction_kind,['charge','refund','credit','dispute','chargeback','reversal']);
    facts.transaction_status=member(row.transaction_status,['pending','authorized','succeeded','settled','failed','cancelled','reversed','unknown']);
    if(typeof row.currency!=='string'||!/^[A-Z]{3}$/.test(row.currency))return fail();facts.currency=row.currency;
    facts.amount_minor=integer(row.amount_minor);requiredDate('provider_effective_at');date('settled_at');requiredDate('provider_observed_at');
  }else if(table==='billing_reconciliation_runs'){
    // Raw payload references, snapshots and opaque free text are intentionally excluded.
    facts.trigger_kind=member(row.trigger_kind,['event','scheduled','support','recovery']);
    facts.status=member(row.status,['running','succeeded','no_change','failed']);requiredDate('started_at');date('completed_at');
    if(row.trigger_event_inbox_id!==null&&row.trigger_event_inbox_id!==undefined)refs.trigger_event_inbox_id=digest('record:billing_event_inbox',row.trigger_event_inbox_id);
  }else{
    facts.assigned_plan_code=member(row.assigned_plan_code,['pro','team']);
    facts.assigned_cadence=member(row.assigned_cadence,['monthly','annual']);facts.assigned_currency=member(row.assigned_currency,['TWD']);
    facts.assigned_amount_minor=integer(row.assigned_amount_minor);if(facts.assigned_amount_minor===0)return fail();
    facts.price_policy=member(row.price_policy,['standard','founder_locked']);
    requiredDate('assigned_at');requiredDate('continuity_started_at');date('dormant_at');date('forfeited_at');date('superseded_at');
    if(row.source_reference)refs.source_reference=digest('assignment-evidence',row.source_reference);
  }
  return Object.freeze({billingSubjectId:input.billingSubjectId,sourceTable:table,
    recordRef:digest(`record:${table}`,row.id),detachedAt,retainUntil,keyVersion:input.keyVersion,
    facts:Object.freeze(facts),refs:Object.freeze(refs)});
}
