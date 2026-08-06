# iOS Phase 2 Gate 2 Compensation Runbook

Date: 2026-08-06

Status: manual Production evidence required; Gate 2 remains open

## Purpose

This runbook closes the one remaining Phase 2 Gate 2 evidence gap by exercising the
already-deployed, disabled-by-default sales-photo upload fault gate. It does not add a
second probe, route, adapter, cleanup worker, or verifier. The implementation and
deterministic tests already exist in:

- `lib/sales/photo-evidence-fault-injection.server.ts`;
- `app/api/sales-photo-evidence/upload/route.ts`;
- `lib/sales/photo-evidence-r2-upload-adapter.server.ts`;
- `tests/sales-photo-evidence-fault-injection-server.test.ts`;
- `tests/sales-photo-evidence-upload-route-disabled.test.ts`.

Gate 2 can close only after both approved failure modes have complete, secret-free
evidence and the deployment has returned to its normal disabled configuration.

## Safety Boundary

- Use only an authenticated owner, an isolated test market, two isolated test sales,
  and a non-sensitive image.
- Use one fresh sale for each fault mode. Do not reuse a customer transaction.
- Configure one mode at a time through the approved deployment secret channel.
- Never put a token, full owner/market/sale identifier, R2 object key, Supabase project
  reference, account credential, or environment value in Git, chat, screenshots, or
  the evidence record.
- Do not change RLS, grants, migrations, upload code, retry policy, or R2 lifecycle.
- Do not run the fault gate for staff, unrelated users, broad market scopes, or a
  Production sale that cannot be safely retried.
- Stop immediately if the deployed revision, account, market, sale, environment, or
  pending-payload ownership is uncertain.

## Existing Exact-scope Controls

The following existing server-only variables must all be supplied privately for the
single targeted probe and removed immediately afterward:

```text
SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ENABLED
SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ALLOW_PRODUCTION
SALES_PHOTO_EVIDENCE_FAULT_INJECTION_TOKEN
SALES_PHOTO_EVIDENCE_FAULT_INJECTION_OWNER_ID
SALES_PHOTO_EVIDENCE_FAULT_INJECTION_MARKET_ID
SALES_PHOTO_EVIDENCE_FAULT_INJECTION_SALE_ID
SALES_PHOTO_EVIDENCE_FAULT_INJECTION_AUTOMATIC_MODE
```

The only approved automatic modes are:

```text
thumbnail_upload_failed
metadata_finalize_failed
```

An unrelated request remains unaffected. A non-owner actor, incomplete configuration,
wrong scope, malformed token, disabled gate, or unapproved Production flag fails
closed under the existing resolver.

## Preconditions

Record only masked or hashed references in the evidence template.

1. Confirm `main` is clean and the selected deployment exposes the expected release
   identity through the existing health/release smoke.
2. Confirm all seven fault variables are absent from the active safe deployment.
3. Confirm the owner can open the isolated test market and both target photo tasks.
4. Confirm normal sync is idle and unrelated pending writes are zero.
5. Confirm each target sale is Cloud-visible, owned by the authenticated owner, has no
   completed photo evidence, and retains one local pending photo payload after image
   selection.
6. Confirm the private R2 read-only inspection method can report object existence
   without printing object keys or credentials.
7. Prepare the evidence template before enabling any fault variable.

## Probe A: Thumbnail Upload Failure

1. Select the first isolated sale and privately capture its exact owner, market, and
   canonical sale identifiers.
2. Configure the seven existing variables for that exact scope, using
   `thumbnail_upload_failed` as the automatic mode. Mark every value Sensitive and
   Production-only in the deployment provider.
3. Deploy and confirm the exact expected release identity before opening the task.
4. In the authenticated owner UI, attach the non-sensitive image to that exact pending
   task and submit once. Do not manually retry while the fault deployment is active.
5. Confirm the response is `r2_thumbnail_upload_failed`, `cleanupIncomplete` is false,
   and the client retains the local payload for retry.
6. Confirm the metadata row records an upload failure without becoming `uploaded`.
7. Confirm the image object created by this attempt is physically absent in R2. The
   thumbnail write is intentionally skipped by this mode.
8. Record only booleans, bounded decision codes, timestamps, the release SHA, and
   masked target references in the evidence template.
9. Remove all seven variables, trigger a safe deployment, and confirm the safe release
   identity before continuing.
10. Retry the retained task normally. Confirm one successful metadata row, readable
    private image evidence, pending count zero, and no duplicate row or object pair.

## Probe B: Metadata Finalize Failure

Use the second isolated sale and repeat the same deployment discipline with
`metadata_finalize_failed` as the automatic mode.

Required observations:

1. The response is `metadata_finalize_failed` and `cleanupIncomplete` is false.
2. The local payload remains available for retry and the metadata row does not become
   `uploaded`.
3. Both the image and thumbnail objects created by this attempt are physically absent
   in R2.
4. The finalize mutation is not accepted for the injected attempt; the bounded failure
   state is recorded instead.
5. All seven variables are removed and a safe deployment is confirmed before the
   normal retry.
6. The normal retry succeeds once, clears the local pending task, produces one readable
   private image, and creates no duplicate evidence.

## Safe-deployment Checks

After each probe and again after both probes:

```powershell
$env:APP_API_SMOKE_BASE_URL='https://<selected-host>'
npm.cmd run smoke:api:staging
```

Also run the existing commit-bound release smoke required by the current deployment
runbook. Do not place secret values in shell history or an exported environment file.
The deployment provider must show all seven temporary variables removed before the
safe deployment is treated as complete.

## Gate 2 Exit Criteria

Gate 2 remains open unless every item below is proven for both probes:

- exact release identity before fault execution and after safe cleanup;
- authenticated owner and exact-scope execution only;
- expected bounded failure code;
- `cleanupIncomplete=false`;
- failed metadata state without a false `uploaded` state;
- local payload retained until normal retry succeeds;
- physical absence of every same-attempt object that should be compensated;
- all temporary variables removed;
- normal retry succeeds after the safe deployment;
- no duplicate evidence row, object pair, or pending task;
- no secret, object key, full identifier, or customer data in committed evidence.

Passing local tests or proving only one mode does not close Gate 2. Gate 2 evidence is
Production behavior evidence, not authorization for Capacitor packages, native
projects, store SDKs, signing, or subscription runtime.
