# Pending Operations Pre-Clear Check Design

Date: 2026-06-30

Status: design and static guardrail phase.

Scope: define the read-only pending-operations check that must run before any future clear-local-and-resync or cloud rebuild execute path. This document does not approve pending operation discard, drain, retry, stale reset, cleanup, automatic worker behavior, local IndexedDB deletion, replace-cache execute, or Supabase mutation.

## 1. Purpose

`pending_operations` represents cloud delivery work that may not have produced final durable `events` rows yet. Clearing local IndexedDB while these rows are unresolved can make the UI look clean while the cloud write state is still incomplete or ambiguous.

The pre-clear check exists to answer one question:

> Is it safe to even consider clearing local cache right now?

If the answer is not clearly safe, the report must block clear-local-and-resync.

## 2. Relationship To Existing Gate D Work

This design reuses the existing Gate D concepts:

- owner-only pending operation diagnostics;
- status classification;
- stale `processing` awareness;
- one-row manual stale recovery;
- one-row owner-created checklist-toggle retry/drain;
- worker model guardrails.

It does not create a new worker, cleanup system, or retry policy.

The pre-clear report is stricter than diagnostics:

- Diagnostics can display all statuses.
- Pre-clear only decides whether local clear is blocked.
- Any unresolved, retryable, unknown, or ambiguous pending row blocks local clear.

## 3. Required Report Shape

A future read-only pre-clear report must include:

- actor id;
- actor role;
- checked at timestamp;
- rebuild scope;
- total pending operation count;
- count by `status`;
- count by `operation_type`;
- count by `entity_type`;
- count by `market_id`;
- unresolved operation ids;
- stale processing operation ids;
- retryable operation ids;
- blocked-permission operation ids;
- permanent failure operation ids;
- unknown status operation ids;
- unsupported operation type ids;
- final event missing warnings;
- final event mismatch warnings;
- clear-local decision: `allowed` or `blocked`;
- blocking reason codes.

The report must not include arbitrary operation payloads, checklist text, field note body text, product cost, supplier, booth cost, revenue, profit, or owner-only finance fields.

## 4. Blocking Status Policy

Clear-local-and-resync must be blocked when any row in the relevant cloud scope has one of these statuses:

- `queued`;
- `pending`;
- `processing`;
- `failed_retryable`;
- `failed_permanent`;
- `blocked_permission`;
- empty status;
- unknown status.

`synced` rows are not blocking only when:

- the final event exists when expected;
- the final event type matches the operation contract;
- the row status is inside the actor's authorized scope.

## 5. Scope Policy

Owner pre-clear:

- May inspect rows for markets owned by the owner.
- Must include owner-created and staff-created rows in those markets.
- Must block local clear if any unresolved row exists in owned markets.

Manager pre-clear:

- May be preview-only in future.
- Must inspect only authorized market scope.
- Must never allow clearing unrelated owner cache.
- Must block if the scoped report cannot prove outside-scope data is irrelevant.

Operator and viewer:

- No clear-local pre-clear execute path.
- No pending operation cleanup or discard control.

## 6. Safe Handling Guidance

When the report is blocked:

- show the blocking reason;
- show operation ids and safe metadata only;
- recommend owner diagnostics review;
- keep local IndexedDB unchanged;
- keep sync cursors unchanged;
- do not retry, drain, reset, abandon, delete, or modify rows automatically.

When the report is clean:

- it only permits moving to cloud rebuild preview;
- it does not approve local deletion;
- it does not approve replace-cache execute;
- it does not approve automatic rebuild.

## 7. Future Implementation Boundary

The first implementation should be a pure/read-only boundary:

- input: diagnostics rows or explicit read-only RPC result;
- output: pre-clear report;
- no Supabase writes;
- no IndexedDB writes;
- no RPC calls that mutate state;
- no calls to `drain_checklist_toggle_pending_operation`;
- no calls to `recover_stale_processing_pending_operation`;
- no background timers;
- no batch action;
- no feature flag default enablement.

## 8. Stop Conditions

Stop for explicit approval before:

- adding a discard or abandon action;
- adding a drain or retry action;
- adding automatic retry;
- adding a pending operation worker;
- allowing manager execute;
- allowing staff-visible diagnostics;
- clearing local IndexedDB after a clean report;
- wiring the report to a destructive button.

## 9. Step 3 Result

This step completes the pending-operations pre-clear design only.

Approved now:

- documentation;
- static guardrail tests;
- future read-only report planning.

Still not approved:

- discard;
- drain;
- retry;
- stale reset;
- cleanup;
- worker;
- local IndexedDB deletion;
- replace-cache execute;
- Supabase mutation.
