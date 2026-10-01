# Sales Photo Evidence Local Binary Pending Storage Design

Date: 2026-07-06
Status: Design-only. No Dexie schema migration, IndexedDB blob write, browser capture runtime, Supabase write, R2 upload, signed URL, queue drain, or production runtime wiring is implemented by this document.

## Goal

Define the safest local-only storage boundary for compressed sales photo evidence payloads before upload.

The browser adapter design returns in-memory compressed outputs. Those outputs need a temporary local place to survive dialog close, route changes, and short offline periods before a future upload worker can create cloud metadata and upload private objects.

This document does not approve the runtime implementation. It only defines the storage contract and guardrails for a later narrow slice.

## Current System Fit

The project already has a local pending creation queue:

```txt
salesPhotoEvidencePendingCreations
```

That queue stores sale/event metadata and retry status. It should remain small, searchable, and safe to inspect in diagnostics.

Binary photo payloads should not be embedded into that queue row.

Recommended design:

```txt
salesPhotoEvidencePendingPayloads
```

This should be a separate local IndexedDB/Dexie table keyed by the same `queueId` / `saleEventId`.

Reason:

- keeps queue status rows lightweight;
- avoids accidentally rendering or logging binary payloads in diagnostics;
- allows payload cleanup without changing queue history;
- avoids base64 overhead;
- keeps upload worker input explicit: queue metadata plus local payload.

## Source Of Truth

Local binary payloads are not the source of truth for sales or reports.

They are temporary upload input only.

If local binary payload is lost:

- the sale record remains valid;
- the pending evidence row should remain pending or become actionable;
- the user may need to retake or reselect the photo;
- cloud event data must not be modified to compensate.

This keeps the broader recovery direction aligned with cloud-rebuild-first: cloud data remains trusted, while local binary payloads are temporary cache/offline state.

## Recommended Table Shape

Future Dexie table:

```txt
salesPhotoEvidencePendingPayloads: 'queueId, ownerId, marketId, updatedAt, createdAt'
```

Recommended row shape:

```txt
{
  queueId: string,
  saleEventId: string,
  ownerId: string,
  marketId: string,
  capturedByStaffId: string | null,
  image: {
    blob: Blob,
    mimeType: 'image/webp' | 'image/jpeg',
    width: number,
    height: number,
    fileSizeBytes: number,
    contentHash: string
  },
  thumbnail: {
    blob: Blob,
    mimeType: 'image/webp' | 'image/jpeg',
    width: number,
    height: number,
    fileSizeBytes: number,
    contentHash: string
  },
  createdAt: string,
  updatedAt: string
}
```

`queueId` should equal `saleEventId`, matching the existing pending creation queue.

## Storage Format

Recommended first runtime format:

- store `Blob` values in IndexedDB through Dexie;
- do not store base64 strings;
- do not store object URLs;
- do not store original camera file;
- store only compressed image and compressed thumbnail;
- store explicit metadata needed for validation and upload.

Object URLs are process-local preview handles and must be recreated from stored blobs when needed.

## Validation Before Write

A future writer must validate before any IndexedDB write:

- queue id is a UUID;
- sale event id matches queue id;
- owner id is a UUID;
- market id is a UUID;
- actor id is either owner id or captured staff id according to the pending creation row;
- image MIME type is WebP or JPEG;
- thumbnail MIME type is WebP or JPEG;
- image and thumbnail file sizes pass the existing compression policy;
- dimensions are positive and finite;
- content hashes are non-empty;
- total payload size is within a narrow local cap.

Recommended local cap for the first runtime slice:

```txt
image.fileSizeBytes + thumbnail.fileSizeBytes <= 1_500_000
```

This cap is intentionally lower than a broad storage limit. It prevents IndexedDB from becoming a hidden photo archive.

## Write Semantics

Future write operation:

```txt
putPendingSalesPhotoEvidencePayload(queueItem, captureResult)
```

Rules:

- upsert by `queueId`;
- replacement is allowed only for the same sale event, owner, and market;
- replacement should update `updatedAt`;
- no Supabase call;
- no R2 upload;
- no pending operation drain;
- no event creation;
- no metadata row creation;
- no automatic retry trigger.

The UI may show a local preview after write, but upload remains a separate action/slice.

## Read Semantics

Future read operation:

```txt
getPendingSalesPhotoEvidencePayload(queueId)
```

Rules:

- return payload only for local UI preview or upload preparation;
- never include blob data in owner diagnostics list output;
- diagnostics may show payload existence, MIME type, size, and updated time;
- object URLs must be created by UI code and revoked on unmount.

## Delete Semantics

Future delete operations should be narrow:

```txt
deletePendingSalesPhotoEvidencePayload(queueId)
deletePendingSalesPhotoEvidencePayloadsForCreatedRows(queueIds)
```

Allowed deletion cases:

- upload and cloud metadata creation completed;
- user explicitly discards local pending photo before upload;
- queue row is permanently blocked and user confirms cleanup;
- clear-local-and-resync flow confirms pending local photo payload will be lost.

Blocked deletion cases:

- automatic app startup cleanup;
- silent cleanup on route change;
- cleanup triggered by read error alone;
- broad "delete all photos" without preview count and explicit confirmation.

## Relationship To Pending Creation Queue

The queue row remains the workflow state.

The payload row is only an attachment.

Expected state combinations:

| Queue status | Payload allowed | Meaning |
| --- | --- | --- |
| `waiting_for_event_sync` | yes | photo captured before sale event is synced |
| `creating` | yes | upload/metadata creation is in progress |
| `failed_retryable` | yes | retry can reuse local payload |
| `blocked_invalid_source` | yes, until cleanup | user can inspect/discard local pending photo |
| `failed_permanent` | yes, until cleanup | user can inspect/discard local pending photo |
| `created` | no after cleanup | payload should be removed after successful cloud creation |

The payload should not change queue status by itself.

## Pending Operations Pre-Clear Integration

The existing local pending write report should count local binary payloads as blocking local-only data.

Recommended future classification:

```txt
pending_sales_photo_evidence_payload
```

The clear-local-and-resync flow should warn that captured but not uploaded photo files will be lost. It should not claim that cloud rebuild can recover these local blobs.

## Security And Privacy

Local payloads may contain user/private sales proof images.

Guardrails:

- do not log blobs;
- do not log object URLs;
- do not include binary payloads in diagnostics;
- do not include binary payloads in export/reporting;
- do not sync payloads through event replay;
- do not store payloads in `localStorage` or `sessionStorage`;
- do not store payloads in Supabase tables;
- do not make public image URLs.

## Failure Handling

If payload write fails:

- keep pending creation queue row;
- surface an inline retryable local-storage error;
- do not mark evidence as uploaded or created;
- do not create cloud metadata;
- do not discard the in-memory capture result unless user closes/discards.

If payload read fails:

- keep queue row;
- surface "local photo unavailable";
- let user recapture or discard;
- do not automatically delete the queue row.

If payload validation fails:

- reject the write;
- keep evidence pending;
- ask user to retake/reselect the photo.

## Testing Plan

Design/static tests:

- storage design is local-only and design-only;
- payload table is separate from pending creation queue;
- binary payloads are not stored as base64, object URLs, events, or cloud rows;
- validation rules require compressed image plus thumbnail;
- pending pre-clear must count local binary payloads as blocking local-only data.

Future runtime tests:

- fake-indexeddb can store and read compressed `Blob` payloads;
- invalid MIME type is rejected before write;
- oversize payload is rejected before write;
- replacement keeps the same queue/sale/owner/market scope;
- diagnostics output contains only metadata, not blobs;
- clear-local precheck blocks when payload rows exist.

## Decision Boundary Before Runtime Implementation

Before implementing the real Dexie table and writer, confirm:

- whether `Blob` storage is acceptable as the first browser storage format;
- whether the local payload cap should start at `1_500_000` bytes;
- whether replacing an existing local pending photo should require user confirmation;
- whether failed/permanent/blocked rows keep payload until manual cleanup;
- whether clear-local-and-resync may discard payloads after explicit confirmation.

Recommended answers:

- use `Blob` storage first;
- start with `1_500_000` bytes total for image plus thumbnail;
- allow replacement after a clear "replace photo" confirmation;
- keep payload for failed/blocked rows until manual cleanup;
- allow clear-local-and-resync to discard payloads only after previewing the count and receiving explicit confirmation.
