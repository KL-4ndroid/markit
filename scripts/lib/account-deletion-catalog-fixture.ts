// Test/build tooling only. Literal catalog input, never a hosted DB target.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ACCOUNT_DELETION_RELATION_POLICIES, evaluateDeletionCatalogCoverage } from '../../lib/subscription/account-deletion-data-policy';

export type CatalogColumn={name:string;type:string;nullable:boolean};
export type CatalogRelation={kind:string;columns:CatalogColumn[];constraints:{name:string;definition:string}[];triggers:{name:string;definition:string}[]};
type Catalog={projectRef:string;rows:{category:string;identity:string;detail:CatalogRelation}[]};
export const quoteSql=(s:string)=>`'${s.replaceAll("'","''")}'`;
export const quoteIdentifier=(s:string)=>`"${s.replaceAll('"','""')}"`;
export function capturedDeletionCatalog() {
  const data=JSON.parse(readFileSync('docs/subscription/evidence/account-deletion-catalog-2026-11-02.json','utf8')) as Catalog;
  if(data.projectRef!=='fgejncfsvvsayiequubm')throw new Error('Unexpected captured project');
  const relations=data.rows.filter(r=>r.category==='relation');
  const coverage=evaluateDeletionCatalogCoverage(relations.map(r=>r.identity));
  if(coverage.unclassified.length||coverage.missing.length||coverage.duplicate.length)throw new Error('Deletion catalog classification incomplete');
  return relations;
}
const foundation=['account_deletion_requests','account_deletion_cleanup_steps','account_deletion_transition_audit'];
export function capturedOperationalFixtureDdl() {
  const tables=capturedDeletionCatalog().filter(r=>r.detail.kind==='r'&&!foundation.includes(r.identity.replace('public.','')));
  const chunks=[`DO $$BEGIN IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'Disposable DB required';END IF;END$$;`,
    `CREATE TYPE public.sync_status AS ENUM ('pending','synced','local_only','error');`];
  const guards=capturedGuardDefinitions();
  for(const name of ['market_region_code_is_valid','market_payment_deadline_is_valid']){
    const definition=guards.rows.find(r=>r.category==='routine'&&r.identity===name)?.detail;
    if(!definition)throw new Error('Missing deployed constraint function');chunks.push(definition+';');
  }
  for(const r of tables)chunks.push(`CREATE TABLE ${r.identity} (${r.detail.columns.map(c=>`${quoteIdentifier(c.name)} ${c.type}${c.nullable?'':' NOT NULL'}`).join(',')});`);
  for(const foreign of [false,true])for(const r of tables)for(const c of r.detail.constraints) {
    if(c.definition.startsWith('FOREIGN KEY')!==foreign)continue;
    chunks.push(`ALTER TABLE ${r.identity} ADD CONSTRAINT ${quoteIdentifier(c.name)} ${c.definition};`);
  }
  return chunks.join('\n');
}
/** Approved fields come from a checked-in capture; changes require a new review. */
export function approvedOperationalColumnsDdl() {
  const rows=capturedDeletionCatalog().filter(r=>r.detail.kind==='r').flatMap(r=>r.detail.columns.map(c=>{
    const name=r.identity.replace('public.','');
    const nullable=c.nullable||(['events','events_archive','preparation_template_applications'].includes(name)&&c.name==='actor_id');
    return `(${[name,c.name,c.type].map(quoteSql).join(',')},${nullable})`;
  }));
  return `CREATE TABLE deletion_engine_private.approved_columns(table_name text,column_name text,type_name text,nullable boolean,PRIMARY KEY(table_name,column_name));
    REVOKE ALL ON deletion_engine_private.approved_columns FROM PUBLIC,anon,authenticated,service_role;
    INSERT INTO deletion_engine_private.approved_columns VALUES ${rows.join(',')};`;
}
/** Preserve deployed guard bodies and add only a narrowly fenced cleanup branch. */
export function deployedEventGuardsDdl() {
  const capture=capturedGuardDefinitions();
  const names=['enforce_event_actor_authorization','enforce_subscription_event_write'];
  const definitions=names.map(name=>{
    const raw=capture.rows.find(r=>r.category==='routine'&&r.identity===name)?.detail.replaceAll('\r','');
    if(!raw||!raw.includes(`FUNCTION public.${name}()`))throw new Error('Missing deployed event guard');
    const marker=/\bBEGIN\b/;if(!marker.test(raw))throw new Error('Unsupported event guard shape');
    return raw.replace(marker,`BEGIN
      IF TG_OP IN ('UPDATE','DELETE') AND deletion_engine_private.authorize_event_change(to_jsonb(OLD),CASE WHEN TG_OP='UPDATE' THEN to_jsonb(NEW) ELSE NULL END,TG_OP) THEN
        IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
      END IF;`);
  });
  return definitions.join(';\n')+`;\n
    CREATE TRIGGER a00_event_actor_authorization BEFORE INSERT OR UPDATE OR DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION public.enforce_event_actor_authorization();
    CREATE TRIGGER subscription_event_write BEFORE INSERT OR UPDATE OR DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_event_write();`;
}

export function capturedGuardDefinitions(){
  const guards=JSON.parse(readFileSync('docs/subscription/evidence/account-deletion-guards-2026-11-02.json','utf8')) as {rows:{identity:string;category:string;detail:string}[]};
  const catalog=JSON.parse(readFileSync('docs/subscription/evidence/account-deletion-catalog-2026-11-02.json','utf8')) as {rows:{category:string;identity:string;detail:{definitionMd5?:string}}[]};
  for(const r of guards.rows.filter(r=>r.category==='routine')){
    const expected=catalog.rows.find(c=>c.category==='routine'&&c.identity.startsWith(`public.${r.identity}(`))?.detail.definitionMd5;
    if(!expected||createHash('md5').update(r.detail).digest('hex')!==expected)throw new Error('Captured guard differs from captured catalog fingerprint');
  }
  return guards;
}

export function deployedBillingGuardsDdl(detachmentException=false){
  const names=['reject_billing_customer_link_mutation','enforce_billing_subscription_snapshot_write',
    'enforce_billing_transaction_write','enforce_billing_event_inbox_write','enforce_billing_reconciliation_run_write',
    'enforce_subscription_price_assignment_write','prevent_f3b_billing_ledger_delete',
    'enforce_subscription_price_version_update','enforce_billing_storefront_mapping_update'];
  const definitions=names.map(name=>{
    const raw=capturedGuardDefinitions().rows.find(r=>r.category==='routine'&&r.identity===name)?.detail.replaceAll('\r','');
    if(!raw)throw new Error('Missing deployed billing guard');
    if(!detachmentException||!['reject_billing_customer_link_mutation','enforce_billing_transaction_write','prevent_f3b_billing_ledger_delete'].includes(name))return raw+';';
    return raw.replace(/\bBEGIN\b/,`BEGIN
      IF TG_OP='DELETE' THEN
        IF deletion_billing_private.authorize_delete(TG_TABLE_NAME,to_jsonb(OLD)) THEN RETURN OLD;END IF;
      END IF;`)+`;\nREVOKE ALL ON FUNCTION public.${name}() FROM PUBLIC,anon,authenticated,service_role;`;
  });
  const triggers=capturedDeletionCatalog().filter(r=>r.detail.kind==='r'&&(
    r.identity.startsWith('public.billing_')||r.identity==='public.subscription_price_assignments'||r.identity==='public.subscription_price_versions'))
    .flatMap(r=>r.detail.triggers.map(t=>t.definition+';'));
  return definitions.join('\n')+'\n'+triggers.join('\n');
}

export function deletionPolicyMarkdown() {
  return Object.entries(ACCOUNT_DELETION_RELATION_POLICIES).map(([name,p])=>`| ${name} | ${p.dataClass} | ${p.owner} | ${p.staff} |`).join('\n');
}
