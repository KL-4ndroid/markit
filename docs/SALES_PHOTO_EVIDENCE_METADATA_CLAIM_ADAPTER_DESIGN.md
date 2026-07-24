# Sales Photo Evidence Metadata Claim Adapter Design

Date: 2026-07-07
Status: design-only. This document defines the future Supabase metadata claim adapter boundary. It does not implement a Supabase client, metadata writes, route wiring, R2 upload, signed URLs, queue drain wiring, cleanup execution, or production recovery behavior.

## Goal

Bridge the pure metadata claim plan model to future server-side Supabase writes without letting the upload route grow into an untestable cloud-write path.

The adapter must stay narrow:

1. Read the current authenticated actor.
2. Read the target sale event and active evidence row.
3. Build a `createSalesPhotoEvidenceMetadataClaimPlan()` decision.
4. If the decision is approved and the feature is enabled in a later slice, perform exactly one metadata claim action.
5. Return the claim result to the upload route.

## Required Inputs

The future adapter should receive all dependencies by injection:

- authenticated actor id and role;
- Supabase-like repository object;
- clock function;
- optional id generator for a new evidence row;
- feature gate for write enablement.

The adapter must not create a global Supabase client internally.

## Repository Boundary

The future repository should expose only these operations:

```ts
type SalesPhotoEvidenceMetadataClaimRepository = {
  getSaleEventForEvidenceClaim(input): Promise<SaleEvent | null>;
  getActiveEvidenceForSale(input): Promise<EvidenceRow | null>;
  isStaffRelationshipActive(input): Promise<boolean>;
  createEvidenceUploadingClaim(input): Promise<EvidenceRow>;
  markEvidenceUploading(input): Promise<EvidenceRow>;
};
```

Blocked repository behavior:

- no R2 object upload;
- no signed URL issuance;
- no local IndexedDB access;
- no payload deletion;
- no queue drain;
- no cleanup execution;
- no broad event replay or sync writes.

## Write Semantics

The future write adapter must be idempotent around one active evidence row per sale:

- no existing row:
  - insert one row directly as `uploading`;
  - include owner, market, sale, staff, sale completion, and captured time;
  - do not write `uploaded`.
- existing retryable row:
  - update only that row to `uploading`;
  - do not change owner, market, sale, or staff identity.
- existing `uploaded` row:
  - return idempotent success;
  - do not upload or rewrite metadata.
- terminal row:
  - reject fail-closed.

The adapter must never mark `uploaded`; that belongs after both R2 object uploads and metadata finalize succeed.

## Error Mapping

Recommended mapping:

- authentication or relationship failure -> `permission_denied`;
- sale event missing, wrong type, wrong market, wrong owner -> `source_invalid`;
- active row scope mismatch or soft-deleted row -> `source_invalid`;
- missing local payload -> `payload_missing`;
- terminal or in-flight status -> `status_not_uploadable`;
- insert/update failure -> `metadata_claim_failed`.

All failures keep the local payload.

## Feature Gate

The first adapter implementation must default disabled.

When disabled:

- it may read and build a dry-run claim plan;
- it must not call `createEvidenceUploadingClaim()`;
- it must not call `markEvidenceUploading()`;
- it must return a feature-disabled or dry-run result.

## Tests Required Before Runtime Wiring

The implementation slice must include fake repository tests for:

- owner valid new row claim;
- staff valid own row claim;
- inactive staff relationship denial;
- sale event wrong type denial;
- active row scope mismatch denial;
- uploaded idempotent row;
- terminal row rejection;
- disabled gate performs no writes;
- insert/update repository failure maps to `metadata_claim_failed`;
- adapter source does not import R2, signed URL, IndexedDB, route, or runtime enqueue code.

## Approval Boundary

Actual Supabase metadata writes are the next sensitive boundary.

Before implementing an enabled metadata claim adapter, confirm:

1. Whether the first adapter is allowed to insert rows directly as `uploading`.
2. Whether disabled mode should support dry-run reads in production or only test/local.
3. Whether staff uploads require `captured_by_staff_id = auth.uid()` for both new and existing rows.

Recommended answer:

- allow direct `uploading` claim only inside the future server route;
- keep adapter disabled by default in production;
- require staff uploads to match `captured_by_staff_id = auth.uid()`;
- keep local payload deletion outside the adapter.
