# Sales Photo Evidence Browser Adapter Implementation Design

Date: 2026-07-06
Status: Design-only. No camera, canvas, IndexedDB, Supabase, R2, upload, signed URL, or production runtime wiring is implemented by this document.

## Goal

Define the safest first implementation plan for browser-side sales photo capture and compression.

The adapter should let staff or owner capture one proof photo for a pending sales photo evidence row, compress it locally, create a thumbnail locally, validate the outputs against the existing evidence policy, and hand the result to a later local pending-storage slice.

## Recommended First Implementation

Use an `<input type="file" accept="image/*" capture="environment">` capture-first adapter for the first runtime slice.

Do not start with a custom `navigator.mediaDevices.getUserMedia()` live camera stream.

Reason:

- file input capture is simpler and more stable across iOS Safari, Android Chrome, and desktop browsers;
- permission handling is delegated to the browser;
- it avoids managing live streams, track cleanup, camera switching, and preview lifecycle;
- it still supports taking a new photo on mobile devices;
- it reduces the chance of leaving camera streams active after route changes or modal close.

`getUserMedia()` can be a later enhancement after the basic proof-photo workflow is stable.

## Non-Goals

- Do not upload to R2.
- Do not create signed read URLs.
- Do not write Supabase metadata.
- Do not create `sale_photo_evidence` rows.
- Do not enable production runtime enqueue.
- Do not mutate evidence expiration.
- Do not add automatic cleanup.
- Do not store image binary data in Postgres.
- Do not store public image URLs.

## Runtime Boundary

The browser adapter should be a UI/local-processing layer only.

Allowed:

- read a user-selected image file from file input;
- run capability checks from `photo-evidence-browser-adapter-contract.ts`;
- run source precheck and compression planning from `photo-evidence-capture-compression.ts`;
- decode the source image locally;
- draw the image to an offscreen or in-memory canvas;
- export compressed WebP primary image when supported;
- export JPEG fallback when WebP export is not supported;
- export thumbnail;
- validate final compressed outputs with the existing compression policy;
- return an in-memory result object to the caller.

Blocked:

- direct Supabase writes;
- direct IndexedDB writes in the adapter;
- R2 client usage;
- signed URL generation;
- `fetch()` upload;
- broad sync/drain/pending-operation integration;
- automatic retry worker behavior.

The first adapter should return data to a caller. A separate, later-approved storage slice decides how to store pending local binary payloads.

## Proposed Module Shape

Future runtime module:

```txt
lib/sales/photo-evidence-browser-adapter.ts
```

Primary function:

```txt
captureSalesPhotoEvidenceWithFileInput(options)
```

Recommended output:

```txt
{
  action: 'capture_ready_for_local_store',
  image: {
    blob,
    mimeType,
    width,
    height,
    fileSizeBytes,
    contentHash
  },
  thumbnail: {
    blob,
    mimeType,
    width,
    height,
    fileSizeBytes,
    contentHash
  }
}
```

Failure output must use the existing `SalesPhotoEvidenceBrowserAdapterResult` shape:

```txt
{
  action: 'capture_failed',
  failure: classifySalesPhotoEvidenceBrowserCaptureFailure(reason)
}
```

Failure must keep evidence pending and must not write cloud metadata.

## Capture Flow

1. User taps `Take Photo`.
2. UI opens a file input with:
   - `type="file"`
   - `accept="image/*"`
   - `capture="environment"`
3. User captures or selects one image.
4. Adapter validates:
   - secure context;
   - file exists;
   - file MIME type is supported by source precheck;
   - file size is below source max;
   - decoded dimensions are valid.
5. Adapter decodes the image.
6. Adapter runs the compression plan.
7. Adapter renders primary image and thumbnail to canvas.
8. Adapter exports blobs.
9. Adapter validates output size, MIME type, and dimensions.
10. Adapter returns in-memory compressed outputs.

## Compression Strategy

Use the existing policy model as the source of truth.

The runtime adapter should not create a separate policy.

Recommended first behavior:

- primary output target: WebP;
- fallback output: JPEG;
- thumbnail: WebP when possible, JPEG fallback;
- strip EXIF by drawing to canvas and exporting a new blob;
- never preserve original file metadata;
- fail closed if final output cannot meet size policy.

## Capability Checks

The UI layer should prepare a capability snapshot:

```txt
secureContext = window.isSecureContext
mediaCaptureAvailable = file input capture is usable or file input fallback is available
imageProcessingAvailable = ImageBitmap/Image/Canvas/Blob export path is available
```

Then call:

```txt
classifySalesPhotoEvidenceBrowserAdapterReadiness(snapshot)
```

If not ready, show an actionable blocked state and keep the evidence pending.

## Failure Handling

Use existing failure reasons:

- `permission_denied`
- `camera_not_found`
- `capture_cancelled`
- `source_decode_failed`
- `compression_failed`
- `thumbnail_generation_failed`
- `output_policy_rejected`
- `unexpected_adapter_error`

Rules:

- `capture_cancelled` should not be treated as data loss.
- `permission_denied` should show a user-actionable message.
- processing failures should allow retry.
- every failure keeps evidence pending.
- no failure should create cloud metadata or upload objects.

## UI Integration Plan

First UI integration should be limited to the pending evidence dialog.

Recommended first visible flow:

- pending row has a `Take Photo` button;
- button opens capture;
- capture success shows a local preview state only;
- capture failure shows an inline error;
- closing the dialog should not silently discard a successful local capture unless the later storage slice has been implemented.

Because local binary storage is not yet designed, the first real UI runtime should not be enabled until a local pending binary storage plan exists.

## Testing Plan

Design/contract tests:

- adapter design remains documented and non-mutating;
- file-input-first recommendation is preserved;
- `getUserMedia()` is explicitly deferred;
- Supabase/R2/upload/signed URL usage remains blocked.

Future runtime tests:

- capability classification in secure/insecure contexts;
- fake file accepted/rejected by MIME and size;
- decode failure classification;
- compression output validation;
- thumbnail output validation;
- cancellation keeps evidence pending;
- permission denial keeps evidence pending;
- adapter source has no Supabase/R2/direct IndexedDB writes.

Browser smoke tests should only be added when runtime camera/canvas code is implemented. Use a disposable Playwright browser context, not a daily-use browser profile.

## Decision Boundary Before Runtime Implementation

Before implementing real browser capture code, confirm:

- whether first runtime should support photo selection from gallery, or camera capture only;
- whether local binary pending storage is approved and where blobs should live;
- whether captured local previews should survive dialog close and route changes;
- whether staff can replace a captured local photo before upload;
- whether owner can capture evidence on behalf of staff.

Recommended answers for first runtime slice:

- allow camera capture and gallery fallback;
- store binary payload only in a narrowly scoped local pending evidence table after a separate storage plan;
- previews should survive dialog close only after local binary storage exists;
- staff can replace their own local pending photo before upload;
- owner capture on behalf of staff should remain deferred.
