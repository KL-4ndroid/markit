# Sales Photo Evidence Writer and R2 Upload Design

Date: 2026-07-07
Status: design-only. This document defines the recommended Supabase evidence-row writer and R2 upload architecture. It does not implement routes, R2 clients, Supabase mutations, signed URLs, queue drain wiring, runtime enqueue enablement, cleanup execution, or production recovery behavior.

## Scope

This design covers the first cloud-backed path after staff local capture:

1. Read one local pending creation row and its local payload.
2. Create or claim one `sale_photo_evidence` metadata row.
3. Upload image and thumbnail objects to private R2 keys.
4. Mark the metadata row `uploaded` only after both uploads succeed.
5. Keep all failure states retryable and visible.

This design does not cover:

- post-sale runtime enqueue enablement;
- automatic background worker;
- broad queue drain;
- signed read URL implementation;
- owner album private image rendering;
- R2 lifecycle cleanup;
- evidence waiver UI;
- production data repair.

## Existing Building Blocks

- `supabase/migrations/055_add_sales_photo_evidence_schema.sql`
  - Adds metadata-only `sale_photo_evidence`.
  - Stores private R2 object keys only.
  - Rejects public URLs and image binary storage.
  - Enforces one active evidence row per sale.
  - Provides owner/staff RLS for scoped metadata rows.
- `lib/sales/photo-evidence-upload-contract.ts`
  - Builds private image and thumbnail object keys.
  - Requires `captured_local` before upload.
  - Validates owner/staff actor identity.
  - Validates image and thumbnail metadata.
  - Caps signed read TTL at `300` seconds for the future read path.
- `lib/sales/photo-evidence-pending-payload-storage.ts`
  - Stores local compressed image and thumbnail blobs by `queueId`.
  - Keeps binary payloads local and temporary.
  - Counts payloads as blocking local-only work before destructive cache reset.
- `lib/sales/photo-evidence-pending-creation-drain.ts`
  - Existing drain model is disabled by default.
  - It should not become a broad worker as part of this design slice.

## Recommended Architecture

Use a narrow server route instead of direct browser-to-Supabase metadata mutation plus direct R2 credentials.

Recommended future route shape:

```txt
POST /api/sales-photo-evidence/upload
```

Input:

- `queueId`
- `saleEventId`
- `ownerId`
- `marketId`
- `image` payload metadata and binary
- `thumbnail` payload metadata and binary
- `capturedAt`

The first implementation may use `FormData`, because the browser already holds local `Blob` values. A later optimization can switch to pre-signed upload URLs, but that should be a separate decision.

## Server-Side Steps

The route should execute one sale evidence upload at a time.

1. Authenticate current user.
2. Re-check live permission:
   - owner must match `owner_id`;
   - staff must be active under the owner;
   - staff upload must match `captured_by_staff_id` when present.
3. Load the referenced sale event.
4. Verify:
   - event exists;
   - event type is `deal_closed`;
   - event belongs to the same market;
   - market belongs to the same owner;
   - evidence is still required or an existing pending evidence row exists.
5. Create or reuse one active `sale_photo_evidence` row for the sale:
   - if no row exists, insert `captured_local`;
   - if row exists and is `pending_capture`, `capture_skipped`, `captured_local`, or `upload_failed`, continue;
   - if row exists as `uploaded`, stop idempotently;
   - if row is `waived_by_owner` or `expired`, reject without upload.
6. Generate object keys using `createSalesPhotoEvidenceUploadContract()`.
7. Set metadata row to `uploading` before object upload.
8. Upload image object to R2.
9. Upload thumbnail object to R2.
10. Update metadata row to `uploaded` with:
    - `r2_object_key`;
    - `r2_thumbnail_key`;
    - `mime_type`;
    - `width`;
    - `height`;
    - `file_size_bytes`;
    - `content_hash`;
    - `captured_at`;
    - `uploaded_at`;
    - `expires_at = uploaded_at + 7 days`;
    - `failure_reason = null`.
11. Only after the route returns success may the client delete the local pending payload.

## Failure Semantics

The route must not mark `uploaded` until both R2 uploads and metadata update are complete.

Failure classes:

- `permission_denied`
  - No R2 upload.
  - No metadata status change unless an owned row was already claimed and can be safely marked `upload_failed`.
- `source_invalid`
  - No R2 upload.
  - Mark existing row `upload_failed` only if it is owned and still retryable.
- `metadata_claim_failed`
  - No R2 upload.
  - Keep local payload.
- `r2_image_upload_failed`
  - Mark row `upload_failed`.
  - Keep local payload.
  - Thumbnail upload should not start.
- `r2_thumbnail_upload_failed`
  - Mark row `upload_failed`.
  - Keep local payload.
  - Future cleanup may remove orphan image object, but this design does not implement cleanup.
- `metadata_finalize_failed`
  - Keep local payload.
  - Mark row `upload_failed` if possible.
  - Treat any uploaded objects as orphan candidates for future owner-only cleanup.

## Idempotency

Use deterministic object keys:

```txt
sales-evidence/7d/{ownerId}/{marketId}/{saleId}/{evidenceId}.webp
sales-evidence-thumbs/7d/{ownerId}/{marketId}/{saleId}/{evidenceId}.webp
```

This keeps retry behavior predictable:

- repeated upload for the same row writes the same object keys;
- metadata remains one active row per sale;
- client retries should target the same `queueId` / `saleEventId`;
- uploaded rows should return success without re-uploading unless a future replacement flow is explicitly approved.

## R2 Requirements

R2 objects must be private.

Required route/server configuration:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- optional `R2_ENDPOINT`

Blocked client exposure:

- no `NEXT_PUBLIC_R2_*`;
- no public bucket URL;
- no client-side R2 credentials;
- no raw object URL stored in Supabase;
- no public URL stored in local IndexedDB.

## Client Boundary

The client upload caller may:

- read one pending creation row;
- read one local pending payload row;
- send the blobs to the server route;
- keep local payload on failure;
- delete local payload only after server success;
- refresh pending list and owner album metadata after success.

The client upload caller must not:

- call Supabase table writes directly;
- call R2 directly;
- request signed read URLs;
- delete local payload before confirmed upload success;
- batch-drain every pending row automatically;
- run in app startup or background sync without explicit future approval.

## Recommended Implementation Slices

### Slice 7B-0: Writer/Upload Design Guardrail

Current design-only slice.

- Add this document.
- Add static tests.
- Do not implement runtime.

### Slice 7B-1: Pure Service Types

Add type-only models for:

- upload request;
- upload response;
- failure codes;
- metadata row transition plan.

No route and no mutation.

### Slice 7B-2: Server Route Skeleton Disabled

Add route file that:

- rejects all requests with `501` or feature-disabled response;
- imports no R2 client;
- writes no Supabase data;
- has tests proving it is disabled.

### Slice 7B-3: Metadata Claim Service

Add a narrow service with injected Supabase client:

- live permission recheck;
- sale event verification;
- row create/reuse decision;
- no R2 upload.

### Slice 7B-4: R2 Adapter Contract

Add server-only R2 adapter interface and validation:

- no client imports;
- no public env;
- no upload execution outside injected tests.

### Slice 7B-5: Disabled End-to-End Route Test

Test the full path through injected fake Supabase and fake R2.

Still disabled in production by explicit flag/guard.

### Slice 7B-6: Manual Local/Staging Enablement

Only after approval:

- enable route for local/staging;
- use disposable row and payload;
- verify one upload;
- verify Supabase row status and R2 keys;
- verify local payload deletion after success.

### Slice 7B-7: Production Enablement

Requires separate approval after local/staging evidence.

## Decisions Required Before Runtime

1. Upload transport:
   - Recommended: server route accepts `FormData` first.
   - Alternative: pre-signed upload URL flow.
2. Staff row visibility:
   - Recommended: staff can upload only rows where `captured_by_staff_id = auth.uid()`.
3. Orphan object cleanup:
   - Recommended: defer; record failures and keep local payload.
4. Replacement flow:
   - Recommended: defer; uploaded replacement is a separate feature.
5. Production feature gate:
   - Recommended: disabled by default until local/staging smoke passes.

## Current Recommendation

Proceed next with `Slice 7B-1: Pure Service Types`.

Do not implement the route or R2 client yet. The route and R2 client introduce real cloud write risk and should be sliced behind explicit tests and a disabled default.
