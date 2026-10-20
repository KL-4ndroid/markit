# iOS camera/photo source evidence

Date: 2026-10-20 (Asia/Taipei)

Scope: Camera/Filesystem adapters, shared photo acquisition, permission/privacy
configuration sources. Native execution and the full device-adapter task remain open.

## Changes

- Camera 8.2.6 / Filesystem 8.1.5 are pinned; Synapse 1.0.4 is lockfile/inventory
  evidence. Native IONCameraLib 2.0.x / IONFilesystemLib 2.0.1 are recorded but not
  claimed resolved/compiled. Gate 2 and bounded source review precede installation.
- Current single-photo native APIs request neither editing, video, metadata nor
  gallery saving. Loader requires actual iOS and both native plugin registrations.
  Web keeps its installed AppPlatform camera; native failure has no Web fallback.
- The adapter only reads/deletes `image_<timestamp>.jpg|jpeg|png` returned by this
  picker operation inside this app's tmp folder, derived from a trusted Cache URI.
  Foreign paths, traversal, remote URLs, directories and unexpected file types
  never reach a read. Size, base64 length/format, actual byte count and image magic
  are checked. The full image is used, not the native thumbnail or webPath.
- File I/O is bounded. One picker owns the plugin until native completion; no
  artificial UI timeout starts a second picker. Disposal drops late results and
  cleanup failure blocks further selections for that adapter instance.
- Owned temporary images are cleaned before shared processing begins. This is
  exact returned-file cleanup, not directory scanning, recursive deletion or
  deletion of previously pending photos. Cleanup failure does not report success.
- Shared sales-photo compression, EXIF stripping, thumbnails, local persistence,
  permissions and manual cloud upload remain the existing pipeline. Typed camera
  errors preserve cancellation/permission classifications and pending evidence.
- Product cover uses the same camera boundary with separate library/camera buttons.
  Cancellation/errors preserve the existing cover. Stale product/unmounted field
  results are ignored and prepared preview URLs are released.
- Web picker cancellation now removes its input/listeners and resolves null.
- Shared product encoding checks the returned MIME type and falls back to JPEG
  when WebP encoding is unavailable. Failed decoding releases its object URL.
  The native processing readiness probe also requires the existing WebCrypto API.
- macOS project preparation automatically fills missing usage strings, merges the
  Filesystem timestamp reason C617.1 and adds PrivacyInfo.xcprivacy to the App target
  resource phase. Custom descriptions, other privacy reasons and bundle data remain.
  Malformed configuration is refused before writes; repeated setup is idempotent.

## Verification

- Native adapter behavior / shared capture integration: PASS using injected bridges.
- Actual CLI detects both plugins and native bridge classes: PASS.
- Bundled CLI template transformation, resource reference, merge preservation,
  idempotence and Windows apply refusal: PASS without creating an iOS application.
- Product photo, shared camera boundary and mobile types: PASS.
- Full manifest: PASS across 393 test files. Mobile TypeScript and scoped lint: PASS.
- Final Web and mobile API builds: PASS. Mobile output verification: PASS across
  329 files (19.46 MiB); mobile smoke: PASS for nine artifacts/routes.
- Disclosure inventory, task graph/manual checklist, workflow YAML and diff checks:
  PASS. These are local Windows results; hosted CI and native execution remain open.

## Remaining native evidence

No iOS application project, Swift/SPM build, device picker, signed build or upload
was performed. Permission prompts, limited Photos access, HEIC/orientation,
large-image memory, device background/process interruption, actual tmp cleanup and
privacy resource bundling must be verified on macOS/iPhone. Freeze/review native
transitive versions there. The loader supports iOS only in this slice.

Auth and camera resolve actual runtime independently; the process-wide AppPlatform
is still Web. Full native bootstrap, file export/preview/share, clipboard and links
remain unfinished. No real photos, account credentials, uploads, store purchases,
remote data mutations or additional cloud retry behavior were used in verification.
