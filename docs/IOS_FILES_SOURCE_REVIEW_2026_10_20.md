# iOS file export and preview source review

Date: 2026-10-20 (Asia/Taipei)

Codex technical review under the accepted autonomous Windows-first scope. Gate 2
and bootstrap source review remain complete. This is not Apple or native approval.

- Pin official Share 8.0.3 (core peer >=8), reuse Filesystem 8.1.5. Share resolves
  only when the activity completes; its exact iOS cancellation message is handled
  separately from failure. No assumption that the selected destination is Files.
- Keep file bytes, report models, permissions and recovery rules shared. Resolve
  native FilePort lazily without selecting browser downloads on native failure.
- Support existing PDF, CSV and JSON outputs only; reject paths as filenames,
  unsupported MIME/extensions, empty/oversize files and unavailable runtimes.
- Each operation owns a unique Cache/feria-exports/<UUID>/<filename>. Only that
  file and its empty operation directory are removed; never scan/delete other
  files, pending photos or source data. Bound bridge I/O; uncertain writes keep
  the instance disabled and do not trigger a retry/late presentation.
- Hold exclusive ownership until the share/preview UI finishes. Do not apply an
  arbitrary UI timer that deletes files while another app or preview uses them.
- Preview uses a private minimal QuickLook bridge with a dismissal delegate.
  The inspected official FileViewer 2.0.4 delegates local preview completion to
  IONFileViewerLib 2.0.0's interactor deinit, while its opener retains that
  interactor. That lifetime is unsuitable as this adapter's deletion boundary.
  Do not install FileViewer or its native dependency in this slice.
- The private bridge accepts only owned cache paths, rejects symlinks and
  non-PDF previews, retains controller/call until actual dismissal and refuses
  overlapping native presentation. No network/download or arbitrary-file API.
- Save cancellation is a typed rejection so callers cannot show export success.
  User-visible file errors contain no bridge errors, paths or content. Native
  cleanup failure is reported separately and blocks further use in the instance.
- No additional backup/recovery feature, upload, native store SDK, signing,
  project generation or hosted macOS job is included.

Validate injected bridge behavior, native resolution, actual CLI discovery and
plugin packaging, shared callers, inventory, graph, lint/types, manifest and both
builds. Real QuickLook/Share dismissal, Files save, cache cleanup, process death,
large-file memory and Swift/SPM execution remain macOS/iPhone evidence.

Primary sources checked:
- https://capacitorjs.com/docs/apis/share
- https://capacitorjs.com/docs/apis/filesystem
- https://developer.apple.com/documentation/quicklook/qlpreviewcontrollerdelegate/previewcontrollerdiddismiss(_:)
- Published Share 8.0.3 and FileViewer 2.0.4 npm sources/package manifests.
- https://github.com/ionic-team/ion-ios-fileviewer/blob/2.0.0/IONFileViewerLib/IONFLVWDocumentOpener.swift
