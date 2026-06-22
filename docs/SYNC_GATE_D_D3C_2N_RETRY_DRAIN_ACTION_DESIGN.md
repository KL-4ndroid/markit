# BoothBook Sync Gate D3c-2n Retry/Drain Action Design

Created: 2026-06-22
Status: design only; no runtime code, UI button, service wrapper, migration, RLS, worker, production execution, or feature-flag change is approved

## 0. Purpose

This document defines the safest next boundary for retrying a `failed_retryable` pending operation after stale recovery has reset it.

The next implementation would be high risk because it can call `drain_checklist_toggle_pending_operation`, which may create a final `events` row. This document does not approve that implementation.

## 1. Required Prerequisite

Do not implement or execute D3c-2n until D3c-2m has passed in local/staging.

Required D3c-2m evidence:
- one synthetic local/staging `processing` row was recovered;
- recovery returned `failed_retryable`;
- no final event was created during recovery;
- row has `last_error_code = 'stale_processing_reset'`;
- local/staging cleanup was completed or intentionally retained as test evidence.

## 2. Key Safety Finding

The existing drain RPC is actor-scoped:
- `public.drain_checklist_toggle_pending_operation(p_operation_id TEXT)`
- caller must be authenticated;
- caller must match `pending_operations.actor_id`;
- RPC processes only `pending` or `failed_retryable` rows.

Owner diagnostics can read owner-owned market rows, including rows created by staff. That read visibility does not mean the owner can safely drain staff-created rows through the existing RPC.

First safe action scope:
- owner can retry/drain only rows where `actor_id = auth.uid()`;
- staff-created rows remain diagnostics-only until a separate owner-on-behalf-of-staff drain design is approved.

## 3. Recommended First Implementation Slice

### D3c-2n-0: Design Only

Status:
- This document.
- Guardrail tests only.
- No runtime behavior.

### D3c-2n-1: Service Wrapper Draft

Allowed only after D3c-2m passes and explicit approval:
- add one client service function that calls `drain_checklist_toggle_pending_operation`;
- accept one `operationId`;
- require a caller-provided diagnostics row snapshot;
- refuse unless:
  - `status = 'failed_retryable'`;
  - `actorId === currentUser.id`;
  - operation is stale-recovered or otherwise retryable;
  - operation type is `checklist_item_toggle`;
  - entity type is `checklist_item`;
- refresh diagnostics after completion.

Not allowed:
- UI button;
- batch retry;
- worker;
- production flag default change;
- direct table insert/update/delete;
- service-role credentials;
- new RPC;
- owner draining staff rows.

### D3c-2n-2: Owner UI Button

Allowed only after D3c-2n-1 passes and explicit approval:
- show a single-row action only in owner-only `/recovery`;
- show only for `failed_retryable` rows where `actor_id = currentUser.id`;
- require explicit `window.confirm`;
- confirmation copy must say the action may create a final event;
- call only the approved service wrapper;
- refresh diagnostics after the RPC returns.

Not allowed:
- show action for `processing`, `pending`, `synced`, `failed_permanent`, or `blocked_permission`;
- show action for staff-created rows;
- call recovery and drain in the same click;
- run automatically on page load;
- batch selection.

### D3c-2n-3: Local/Staging Manual Verification

Allowed only after D3c-2n-2 passes and explicit approval:
- use local/staging only;
- use one owner-created `failed_retryable` pending row;
- confirm final event is created or the row remains retryable with a clear error;
- verify no duplicate event is created.

### D3c-2n-4: Production Disposable Verification

High-risk decision, not approved:
- must be separately approved;
- must use disposable production data only;
- must not use synthetic production data unless separately approved.

## 4. Allowed Row State

First retry/drain action may target only:
- `status = 'failed_retryable'`;
- `operation_type = 'checklist_item_toggle'`;
- `entity_type = 'checklist_item'`;
- `actor_id = current authenticated owner id`;
- market is owned by the current authenticated owner;
- operation id is one explicit id.

Not allowed:
- `pending`;
- `processing`;
- `synced`;
- `failed_permanent`;
- `blocked_permission`;
- staff actor rows;
- non-checklist-toggle rows.

## 5. Expected Drain Outcomes

The existing drain RPC may return the operation id on success.

After a successful call, diagnostics must be refreshed and the row should be one of:
- `synced`, if final event was created or already matched;
- `blocked_permission`, if live permission is no longer valid;
- `failed_permanent`, if payload/idempotency/event collision is invalid;
- `failed_retryable`, if the drain failed retryably.

The UI must not assume success means business completion until the refreshed diagnostics row is read.

## 6. Why Not Owner-On-Behalf-Of-Staff First

Owner-on-behalf-of-staff retry would require one of:
- changing the existing drain RPC actor rule;
- adding a new owner drain RPC;
- changing final event actor semantics;
- adding audit metadata that distinguishes original actor from repair actor.

Those are valid future topics, but they are higher risk than owner-created-row retry because they affect attribution, permission recheck, and audit interpretation.

Decision deferred:
- whether owner can drain staff-created pending rows;
- whether final event actor remains staff or becomes owner;
- how to audit owner-on-behalf-of-staff repair.

## 7. Guardrails For Future Code

Any future D3c-2n implementation must prove:
- no runtime import from `hooks/useSync.ts`;
- no automatic worker;
- no `setInterval`, `setTimeout`, or page-load retry;
- no direct `.insert()`, `.update()`, `.upsert()`, or `.delete()` against Supabase tables;
- no service-role key usage;
- no new public env flag;
- no localStorage/sessionStorage control plane;
- no batch loop over operation ids;
- no staff-visible retry UI.

## 8. Stop Conditions

Stop before implementation if:
- D3c-2m has not passed in local/staging;
- the desired first action includes staff-created rows;
- the desired first action includes production disposable verification;
- the desired first action requires new RPC semantics;
- the desired first action would auto-drain in background.

These are high-risk decision points and require explicit approval before code.

## 9. Rollback

Rollback for this design-only slice:
- remove this document;
- remove its guardrail test;
- leave runtime behavior and cloud data unchanged.

Rollback for future runtime code must be defined by that implementation slice.
