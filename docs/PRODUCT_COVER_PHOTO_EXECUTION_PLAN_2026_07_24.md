# Féria Product Cover Photo Execution Plan

Date: 2026-07-24  
Status: Web implementation completed locally on 2026-07-24; production activation remains gated by migration, entitlement, environment, and deployment verification.  
Scope: one private cover photo per product for paid accounts, including add-product upload, edit/replace/delete, compressed list/detail delivery, offline retry, and future Capacitor adapters.

Implementation note: migration `062` consolidates the metadata table and service-role mutation RPCs because it has not been deployed yet. Web and Capacitor WebView use the shared product-image adapter port; a native HEIC adapter remains part of the paused Capacitor workstream.

## 1. Product Decisions

The following decisions are fixed for the first release:

1. Each active product supports zero or one cover photo. There is no gallery, ordering, caption, or multiple-image UI.
2. Cover photos do not expire. They remain until explicitly deleted, replaced, or cleaned up after product deletion.
3. Free accounts may view an existing cover photo but cannot add or replace one.
4. Paid accounts may add or replace a cover photo when the acting user also has product-edit permission.
5. An account downgrade keeps existing photos readable. It blocks new uploads and replacement, but never silently removes existing photos.
6. Photo deletion remains available to an authorized product owner after downgrade so users can remove their data.
7. Staff who can access a product may view its cover photo. Staff cannot manage cover photos. A manager may manage the photo only when the existing role model grants product editing and the product owner's account has the paid entitlement.
8. The original source file is not retained. Only a compressed display image and thumbnail are stored.
9. Product photos are private objects. Object keys and bucket access are never public product fields.
10. Product events and snapshots remain image-free. Binary data, Base64, object keys, and signed URLs are prohibited in `product_created` and `product_updated` payloads.

## 2. Current Constraints

- `types/db.ts` explicitly states that `Product` must not contain image fields.
- Product create/update behavior is event-sourced through `product_created` and `product_updated`.
- The local `products` Dexie table is a projection used by offline and sync behavior, not binary storage.
- Product cards currently use category icons as the visual fallback.
- Sales photo evidence already provides useful compression, private R2, BFF, local-pending, and server-mutation patterns, but product cover photos have different lifetime and entitlement rules.
- `SUBSCRIPTION_PRESENTATION.availability` is currently `preview`; there is no authoritative paid-plan source. UI-only free/paid checks are therefore prohibited.

## 3. Non-Negotiable Boundaries

1. Do not add image blobs, Base64, object keys, signed URLs, or image status to product event payloads.
2. Do not change sales photo evidence tables, expiration behavior, routes, feature gates, or cleanup jobs.
3. Do not reuse the seven-day evidence expiration model. Product covers are durable account content.
4. Do not make R2 objects public.
5. Do not rely on a disabled button as the subscription security boundary.
6. Do not read a public environment variable in the browser to decide paid access.
7. Do not upload an uncompressed original before client-side validation and compression complete.
8. Do not make product creation fail solely because the optional photo upload fails.
9. Do not build a Web-only compression API directly into product forms. Use platform adapters compatible with future Capacitor implementations.
10. Do not delete retained photos automatically on downgrade, sign-out, cache reset, role refresh, or offline recovery.

## 4. Entitlement Model

### 4.1 Required source of truth

Introduce an authoritative server-side account entitlement keyed by the product owner account, not the acting device:

```ts
type ProductPhotoEntitlement = {
  canManageProductCoverPhoto: boolean;
  reason: 'paid_active' | 'free_plan' | 'subscription_inactive' | 'entitlement_unavailable';
  checkedAt: string;
};
```

The server must derive this value from a real subscription/account record. The default for missing, stale, or unavailable entitlement data is fail closed.

### 4.2 Required capability decision

Upload or replacement is allowed only when all conditions are true:

```text
role state is ready and current
AND actor can edit the target product
AND target product belongs to the entitlement owner
AND owner entitlement canManageProductCoverPhoto = true
AND product is active and not deleted
```

Deletion does not require a currently paid plan, but still requires ownership and product-management authorization.

### 4.3 Preview subscription blocker

The current pricing preview cannot be treated as billing state. Before production enablement, one of these must exist:

- an active production subscription table and provider reconciliation flow; or
- an approved account entitlement table managed by administrators until billing launches.

A local/staging-only entitlement override may be used for tests. It must be server-only, default disabled, explicitly scoped to non-production, and impossible to enable through browser storage or a `NEXT_PUBLIC_*` variable.

## 5. Image Policy

Create a product-specific policy instead of importing the sales-evidence constants:

| Rule | Display image | Thumbnail |
| --- | ---: | ---: |
| Maximum edge | 1600px | 480px |
| Preferred format | WebP | WebP |
| JPEG fallback | yes | yes |
| Starting quality | 0.80 | 0.78 |
| Minimum quality | 0.65 | 0.60 |
| Maximum output size | 600KB | 150KB |

Source limits:

- accepted input for the Web adapter: JPEG, PNG, and WebP;
- maximum source file size: 25MB;
- maximum decoded pixel count: 24 megapixels;
- width and height must be positive and bounded;
- EXIF and location metadata must be stripped;
- animation is not preserved;
- alpha may be preserved only when WebP output remains within policy;
- HEIC/HEIF is rejected by the Web adapter unless the current runtime can decode and normalize it reliably.

The future iOS/Android adapter may request a system-converted JPEG/bitmap representation for HEIC sources. The shared domain policy must not depend on DOM, Canvas, `File`, or native plugin types.

## 6. Storage Model

### 6.1 Supabase metadata

Add a dedicated table, provisionally in migration `062_add_product_cover_photos.sql`:

```sql
product_cover_photos (
  id uuid primary key,
  owner_id uuid not null,
  product_id uuid not null,
  status text not null,
  display_object_key text,
  thumbnail_object_key text,
  display_content_hash text,
  thumbnail_content_hash text,
  display_mime_type text,
  thumbnail_mime_type text,
  display_size_bytes integer,
  thumbnail_size_bytes integer,
  width integer,
  height integer,
  version integer not null default 1,
  upload_lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
)
```

Required constraints:

- foreign key to `products(id)` and owner consistency validation;
- one non-deleted row per `product_id` through a partial unique index;
- allowed statuses: `uploading`, `uploaded`, `upload_failed`, `deleting`;
- dimensions, byte sizes, MIME types, hashes, and object keys validated server-side;
- no authenticated direct insert/update/delete grants;
- service-role BFF RPCs own all mutations;
- RLS reads are limited to users who can already access the product.

Do not add photo columns to `products`, `events`, or staff event payloads. A read view may expose safe photo metadata such as `has_cover_photo`, `cover_photo_id`, and `cover_photo_version`, but never object keys.

### 6.2 R2 object layout

```text
product-cover-photos/{ownerId}/{productId}/{photoId}/v{version}/display.webp
product-cover-photos/{ownerId}/{productId}/{photoId}/v{version}/thumbnail.webp
```

Replacement uploads a new version first. The old version stays readable until the new metadata finalize succeeds. Cleanup of the old objects occurs only after the new version is authoritative.

### 6.3 Local pending storage

Add dedicated Dexie tables rather than extending `products`:

```text
productCoverPhotoPendingUploads
productCoverPhotoPendingPayloads
```

The queue stores product/photo scope, hashes, attempt state, and errors. The payload table stores only the two compressed blobs needed for retry. Local blobs are removed only after server finalize succeeds or the user explicitly discards the pending photo.

Cloud metadata and R2 remain the recovery source. Local payloads are temporary offline work, not backup content.

## 7. Platform Architecture

Add shared policy and ports:

```text
lib/products/product-cover-photo-model.ts
lib/products/product-cover-photo-compression.ts
lib/products/product-cover-photo-pending.ts
lib/products/product-cover-photo-upload-client.ts
lib/platform/product-image-capability.ts
lib/platform/product-image-adapter.web.ts
lib/platform/product-image-adapter.native.ts
```

The shared compression planner accepts plain metadata and returns a variant plan. The Web adapter performs file selection, decoding, Canvas rendering, orientation normalization, and Blob creation. The native adapter is a later implementation behind the same port.

Product forms call the port and domain service only. They must not call `document.createElement`, Canvas, Capacitor, camera plugins, or R2 directly.

## 8. Server API And Mutation Flow

### 8.1 Routes

Provisionally add:

```text
GET    /api/product-cover-photo/capability?productId=...
POST   /api/product-cover-photo/upload
GET    /api/product-cover-photo/image?productId=...&variant=thumbnail|display&version=...
DELETE /api/product-cover-photo
```

All routes use the existing app API authentication and CORS contracts.

### 8.2 Upload transaction

1. Authenticate the actor.
2. Load the product and resolve its owner.
3. Re-check current role permission and paid entitlement.
4. Validate content type, dimensions, output sizes, hashes, and the one-cover invariant.
5. Claim or renew an idempotent upload lease through a service-role RPC.
6. Upload thumbnail and display objects to private R2.
7. Finalize metadata only after both objects are confirmed.
8. On failure, record a sanitized failure code and compensate uploaded objects where safe.
9. Never return secrets, object keys, service credentials, or raw provider errors.

Idempotency binds owner, product, photo ID, version, and content hashes. Repeating a completed request must return the existing uploaded result without creating another active cover.

### 8.3 Read behavior

- Product lists request only thumbnail variants.
- Product detail requests the display variant.
- The image route re-checks product read access and uploaded/non-deleted status.
- Responses use ETag/content hash and versioned cache headers.
- Missing, failed, deleted, or unauthorized photos return a stable placeholder decision without leaking existence across accounts.
- List loading must avoid an unbounded metadata N+1 query. Product list metadata should be fetched in one scoped query; image bytes may remain independently lazy-loaded.

### 8.4 Replacement and deletion

- Replacement keeps the current photo visible until the new version finalizes.
- A failed replacement preserves the old photo and presents a retry action.
- Deletion marks metadata first, removes both current objects, then finalizes deletion.
- If object cleanup fails, the photo disappears from user reads while a retryable cleanup state remains server-side.
- Product soft deletion schedules cover cleanup but does not make product deletion depend on immediate R2 availability.

## 9. Product Creation Contract

The current `createProduct()` return value is not an approved product-ID contract for photo upload. Do not infer the product ID from event IDs in UI code.

Add a backwards-compatible creation API such as:

```ts
type CreateProductResult = {
  productId: string;
  eventId: string;
};

createProductWithResult(payload): Promise<CreateProductResult>
```

The caller generates or obtains the product ID through the event normalization boundary, and the existing `createProduct()` remains compatible until all callers are migrated.

Add-product flow:

1. User enters product data.
2. Eligible user optionally selects a photo.
3. The adapter validates and compresses immediately, then shows a local preview.
4. Product metadata is created first and returns an explicit `productId`.
5. Compressed variants are placed in the local pending queue.
6. Online upload starts immediately; offline mode keeps the queue pending.
7. Product creation succeeds even if photo upload is pending or fails.
8. UI reports either `商品已建立` or `商品已建立，照片等待上傳`.

Closing or cancelling before product creation revokes preview URLs and discards the uncommitted compressed blobs.

## 10. UI/UX Contract

### 10.1 Add product

- Add a `商品封面照片` section near identity fields, before price and inventory.
- Photo remains optional for paid accounts.
- Empty eligible state uses one image placeholder with `加入照片`.
- Web opens a file picker. Mobile/native may offer camera and library through the adapter.
- Selected state shows preview, `更換` and `移除` icon commands, compression progress, and upload status.
- The submit button remains the single form commit action.

Free state:

- no hidden file input is triggered;
- show a restrained locked row: `商品照片為付費方案功能`;
- provide one `查看方案` action;
- do not automatically open an upgrade modal or interrupt product creation.

### 10.2 Edit product

- Paid eligible account: add, replace, retry, or delete.
- Free/downgraded account with existing photo: show the photo and allow delete, but disable replacement with an explanation.
- While replacement uploads, keep the old image visible with a localized progress state.
- Navigating away with an uncommitted local selection participates in the existing dirty-form guard.

### 10.3 Product list and detail

- Product card uses a stable 4:3 thumbnail area and `object-fit: cover`.
- Missing, unavailable, or loading photos reserve the same dimensions and show the existing category icon fallback.
- Product detail uses the display variant in a bounded responsive media area.
- Image alt text is derived from the product name, for example `手工陶杯的商品照片`.
- Loading, failure, and no-photo states must not resize the card or shift list layout.
- Lazy loading must not delay product text, price, stock state, or actions.

## 11. State And Error Model

User-facing states:

```text
none
compressing
ready_local
upload_pending
uploading
uploaded
replacement_pending
upload_failed_retryable
blocked_entitlement
deleting
cleanup_pending
```

Required behavior:

- permission or entitlement changes immediately stop new upload attempts;
- an in-flight request re-checks on the server and fails closed;
- role refresh keeps the form mounted while photo commands are temporarily disabled;
- offline status preserves compressed pending payloads;
- cache clear/sign-out uses the existing pending-write safety report and must include product photo payloads before destructive clearing;
- no error path silently discards a compressed payload that has already been committed to the pending queue.

## 12. Operational Limits

- Exactly one active cover per product is enforced by the database.
- Every output is bounded by the compression policy.
- Upload endpoints require rate limiting and per-account storage accounting.
- A production account quota must be approved before enablement. Until pricing is finalized, use a configurable server-side safety ceiling rather than advertise an unlimited entitlement.
- Quota failure must preserve the product and explain that the photo was not uploaded.
- Orphan-object reconciliation must be read-only first and must not be combined with the initial upload release.

## 13. Execution Slices

Each slice is separately reviewable. Stop when an acceptance gate fails.

### Slice P0: Entitlement Source And Decisions

Deliver:

- authoritative owner entitlement repository;
- `canManageProductCoverPhoto` server decision;
- downgrade/read/delete policy tests;
- local/staging-only controlled override if billing is not ready.

Gate: production upload remains disabled until a real entitlement source and production safety quota are approved.

### Slice P1: Pure Model, Schema, And Read Contract

Deliver:

- product photo state model and one-cover invariant;
- migration `062` metadata table, indexes, read RLS, and no direct authenticated writes;
- safe owner/staff metadata read model;
- no runtime upload yet.

Gate: staff cannot read another owner's photos outside existing product access.

### Slice P2: Compression Policy And Platform Adapters

Deliver:

- pure compression planner/classifier;
- Web file selection and compression adapter;
- platform capability registry;
- source/output/pixel/orientation tests;
- no cloud writes.

Gate: 25MB/high-resolution fixtures remain bounded on representative mobile memory profiles.

### Slice P3: Local Pending Storage And Product-ID Contract

Deliver:

- explicit `CreateProductResult` path;
- pending upload metadata/payload tables;
- pending-write safety report integration;
- retry/read/discard model tests;
- no production upload route yet.

Gate: offline product creation never loses product metadata or committed photo payloads.

### Slice P4: Server Upload And Finalize

Deliver:

- service-role claim/finalize/fail RPCs in migration `062` before its first deployment;
- private R2 adapter;
- authenticated upload route;
- idempotency, compensation, entitlement, role, quota, and fault-injection tests;
- feature gates default disabled.

Gate: no route can create two active covers or bypass paid entitlement.

### Slice P5: Read Delivery And Product Presentation

Deliver:

- safe metadata batch read;
- authenticated thumbnail/display image route;
- card/detail view models;
- stable placeholders, lazy loading, ETag/version caching;
- owner/staff access tests.

Gate: lists do not fetch display images and do not issue unbounded metadata queries.

### Slice P6: Add And Edit Product UX

Deliver:

- optional paid photo selection in add-product;
- add flow that creates product before queuing upload;
- edit add/replace/retry states;
- free-plan locked state and plan navigation;
- dirty-form, focus, 320px, zoom, and touch-target tests.

Gate: product creation succeeds when the optional photo upload fails.

### Slice P7: Replacement, Delete, Downgrade, And Cleanup

Deliver:

- atomic version replacement;
- deletion route/RPC and cleanup retry;
- downgrade behavior;
- product-delete cleanup scheduling;
- retained-photo and no-silent-deletion tests.

Gate: downgrade never removes data and failed replacement never hides the current photo.

### Slice P8: Capacitor Adapter And Release Audit

Deliver:

- iOS/Android adapter implementation or verified fallback file picker;
- HEIC/system conversion decision;
- app lifecycle interruption tests;
- owner, manager, staff, free, paid, downgraded, offline, and permission-change matrix;
- production feature-gate rollout and rollback checklist.

Gate: Web, iOS, and Android use the same domain policy and server API without route-specific business logic.

## 14. Required Tests

Suggested guardrails:

```text
tests/product-cover-photo-model.test.ts
tests/product-cover-photo-entitlement.test.ts
tests/product-cover-photo-compression.test.ts
tests/product-cover-photo-platform-boundary.test.ts
tests/product-cover-photo-schema.test.ts
tests/product-cover-photo-pending-storage.test.ts
tests/product-cover-photo-upload-route.test.ts
tests/product-cover-photo-owner-staff-read.test.ts
tests/product-cover-photo-add-flow.test.ts
tests/product-cover-photo-replacement-delete.test.ts
tests/product-cover-photo-downgrade.test.ts
tests/product-cover-photo-responsive-ui.test.ts
```

Critical scenarios:

1. Free owner cannot add or replace through UI, API, or RPC.
2. Paid owner can upload exactly one cover.
3. Authorized manager follows the owner's entitlement; staff cannot mutate.
4. Downgraded owner can view and delete but cannot replace.
5. Entitlement changes during upload fail closed at finalize.
6. Offline add creates the product and retains compressed variants for retry.
7. Duplicate retries do not create duplicate metadata or objects.
8. Replacement failure preserves the previous cover.
9. Product deletion hides the cover even when object cleanup is delayed.
10. Unauthorized image requests do not reveal whether a cover exists.
11. Oversized, unsupported, malformed, or decompression-bomb inputs are rejected before upload.
12. Product event payloads and backup exports contain no binary or object-key fields.

## 15. Validation Matrix

Roles and account states:

```text
owner: free / paid / downgraded
manager: owner free / owner paid / permission revoked
staff: owner free / owner paid
unresolved role / account switch / background role refresh
```

Runtime states:

```text
online / offline / reconnecting
first upload / replacement / deletion
upload interrupted before R2 / between variants / before finalize
entitlement revoked before claim / during upload / before finalize
app backgrounded during compression / queue write / upload
```

Viewports:

```text
320x700
390x844
768x1024
1440x900
200% browser zoom equivalent
```

Commands:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit --project tsconfig.mobile.json
git diff --check
```

## 16. Release And Rollback

Feature gates:

```text
PRODUCT_COVER_PHOTO_READ_ENABLED
PRODUCT_COVER_PHOTO_UPLOAD_ENABLED
PRODUCT_COVER_PHOTO_UPLOAD_ALLOW_PRODUCTION
PRODUCT_COVER_PHOTO_DELETE_ENABLED
```

Release order:

1. schema and read model with every route disabled;
2. compression and local pending flow in local/staging;
3. server upload for designated paid test accounts;
4. read-only display in production;
5. paid upload for a limited production cohort;
6. replacement and deletion;
7. full paid rollout;
8. native adapter rollout after Web stability evidence.

Rollback disables new uploads first. Existing uploaded photos remain readable unless the read path itself is unsafe. Never roll back by deleting metadata or R2 objects.

## 17. Pull Request Sequence

```text
product-photo-01-entitlement-contract
product-photo-02-schema-read-model
product-photo-03-compression-platform-port
product-photo-04-local-pending-product-id
product-photo-05-server-upload
product-photo-06-read-presentation
product-photo-07-add-edit-ux
product-photo-08-replace-delete-downgrade
product-photo-09-capacitor-release-audit
```

Every pull request must state:

- the single behavior objective;
- entitlement and role impact;
- offline and pending-write impact;
- Web/Capacitor boundary impact;
- files intentionally unchanged;
- focused tests and command evidence;
- feature-gate state;
- remaining known risks.

## 18. Definition Of Done

The feature is complete only when:

- each product has at most one active cover photo;
- paid authorization is enforced by the server, not inferred by the browser;
- free and downgraded behavior matches the fixed policy;
- add-product and edit-product both support the eligible flow;
- compression and output limits pass on representative mobile devices;
- product creation remains independent from optional upload success;
- private reads respect existing product access for owner, manager, and staff;
- offline pending data survives interruption and participates in safe cache clearing;
- replacement and deletion are idempotent and recoverable;
- no image data enters product events, Product snapshots, backups, logs, or public URLs;
- Web, iOS, and Android share the same domain policy and server contract;
- production build and the complete validation matrix pass with gates enabled for the intended cohort.
