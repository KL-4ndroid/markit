import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const candidateSourcePaths=[
 'supabase/migrations/071_add_account_deletion_request_foundation.sql',
 ...['REQUEST_WORKFLOW_2026_11_01','ENGINE_2026_11_02','OPERATIONAL_COVERAGE_2026_11_02','BILLING_RETENTION_2026_11_02','ACCESS_FENCE_2026_11_02','UPLOAD_BARRIER_2026_11_02','UPLOAD_RECONCILIATION_2026_11_02','TERMINAL_PUT_2026_11_02','PHOTO_READBACK_2026_11_02'].map(n=>`docs/subscription/drafts/ACCOUNT_DELETION_${n}.sql`),
 ...['engine.server','engine-adapters.server','upload-barrier.server','terminal-put.server','workflow-gate','request-workflow.server','billing-engine.server','billing-retention.server','saga.server','access-policy','data-policy'].map(n=>`lib/subscription/account-deletion-${n}.ts`),
 'lib/subscription/photo-upload-readback.server.ts','app/api/product-cover-photo/upload/route.ts','app/api/sales-photo-evidence/upload/route.ts',
 'scripts/lib/account-deletion-candidate-sources.ts','scripts/lib/account-deletion-catalog-fixture.ts','scripts/lib/account-deletion-access-fixture.ts','scripts/lib/account-deletion-candidate-services.ts','scripts/lib/account-deletion-photo-handler-checks.ts','scripts/verify-account-deletion-upload-race.ts',
 'docs/subscription/evidence/account-deletion-guards-2026-11-02.json',
 'docs/subscription/evidence/account-deletion-access-definitions-2026-11-02.json','docs/subscription/evidence/account-deletion-catalog-2026-11-02.json',
];
export function candidateSourceHashes(){return candidateSourcePaths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path,'utf8').replaceAll('\r\n','\n')).digest('hex')}));}
