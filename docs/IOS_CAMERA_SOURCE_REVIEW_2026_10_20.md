# iOS camera/photo source review

Date: 2026-10-20 (Asia/Taipei)

Codex technical review under the user's autonomous Windows-first authorization.
Gate 2 and the preceding runtime/auth-storage source slices remain complete.

## Reviewed scope

- Pin official Camera 8.2.6 and Filesystem 8.1.5 (core peer >=8, compatible with
  installed 8.5.3). Record the installed Synapse transitive dependency and native
  IONCameraLib 2.0.x / IONFilesystemLib 2.0.1 dependencies in the inventory.
- Use current `takePhoto` / `chooseFromGallery` APIs, single photo, no video,
  gallery write, editing or metadata request. No permission request at startup.
- Isolate native loading and image acquisition under `lib/platform/capacitor`.
  Native resolution must never choose the Web picker when its bridge is missing.
  Web/fake AppPlatform selection remains supported without native activation.
- Read the full returned image, not the low-resolution thumbnail. Use Filesystem
  only for app cache root discovery and stat/read/delete of the returned image.
  Derive the sibling tmp directory from the app's Cache URI; accept only the
  inspected native `image_<timestamp>.jpeg|jpg|png` namespace in that directory.
  Reject foreign paths, traversal, remote URLs, unexpected file types and oversize
  data before reading. Never list directories or perform recursive/broad cleanup.
- Bounded file I/O, raw-error sanitization, exclusive picker ownership and disposal
  prevent overlapping calls and late image delivery. Picker UI has no arbitrary
  timer that could start a second picker while the first is still displayed.
- Remove only returned, validated temporary images after conversion or failure.
  Cleanup failure blocks that adapter instance; do not claim successful selection
  or automatically retry deletion. No cloud upload is triggered by the adapter.
- Keep compression, EXIF removal, thumbnails, policy validation, pending evidence
  persistence and existing manual upload behavior shared. Route product-cover
  acquisition through the same camera boundary, retaining its business permissions.
- Add typed platform-neutral selection errors so cancellation/permission denial
  cannot be mistaken for decoding failure; preserve previous selected/pending data.
- Automate iOS camera/photo usage strings and the Filesystem timestamp reason
  C617.1 in PrivacyInfo.xcprivacy, including the Xcode resource reference. Preserve
  existing purpose strings/other privacy declarations and refuse malformed inputs.
  Run this only as part of reviewed macOS project preparation; Windows tests use
  source fixtures, not a generated application or native execution.

## Required validation and limits

The shared product renderer must validate the actual encoded MIME type and fall
back to the already-supported JPEG output when a WebView cannot encode WebP.
Release object URLs after failed image decoding. This is encoding compatibility,
not a change to plan permissions, pixel/byte limits or upload behavior. Native
processing readiness also requires the existing WebCrypto digest capability.

Behavior tests cover cancellation, permissions, denied/malformed paths, bounds,
cleanup, timeout, concurrency, disposal and shared local-capture integration.
Test actual CLI plugin discovery and permission/privacy configuration using its
template sources. Recheck SDK inventory, shared types, affected UI/flow tests,
full manifest and Web/mobile builds. Complete only this source subtask.

Actual picker presentation, limited Photos access, HEIC/orientation, large-photo
memory, permission prompts, temporary-file removal, privacy resource bundling and
process interruption remain macOS/iPhone evidence. Native library resolution must
be frozen/reviewed there. Full device adapters and store compliance stay incomplete.

## Primary sources checked

- https://capacitorjs.com/docs/apis/camera
- https://capacitorjs.com/docs/apis/filesystem
- Exact published npm plugin sources and Swift package manifests.
- https://github.com/ionic-team/ion-ios-camera/tree/2.0.0
  (URI generation, image namespace, gallery options and media result encoding).

This technical review is not independent human, Apple, native build or store approval.
