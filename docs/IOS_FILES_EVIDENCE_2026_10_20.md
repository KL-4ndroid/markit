# iOS file export and preview source evidence

Date: 2026-10-20 (Asia/Taipei)

Scope: existing CSV/JSON saves and PDF previews, official Share 8.0.3 and private
QuickLook bridge 0.1.0. No native application was generated or compiled.

- Shared report bytes, role/subscription gates and data models remain unchanged.
  Lazy FilePort resolution is used by current exports and existing database
  fallback saves; native failures do not fall back to browser downloads.
- Save hands a file to the system share sheet. Success means a completed selected
  activity, not proof of a particular Files destination. Cancellation rejects with
  a typed code and does not report export success. Preview waits for dismissal.
- PDF/CSV/JSON MIME and extension checks, safe names and a 25 MiB limit apply to
  the native bridge path. Each operation owns a random UUID cache directory.
- Only that exact file and its non-recursively removed empty operation directory
  are cleaned after native UI completion. No scanning, source deletion, photo
  deletion, remote upload or automatic retry is introduced.
- I/O deadlines prevent late presentation and disable an uncertain instance.
  A timed-out write may leave its cache file until the OS clears cache; it is not
  raced by deletion, reused or reported as saved. Process death can also leave
  cache files. This source slice does not claim restart cleanup or secure erasure.
- QuickLook validates the app-owned cache/UUID/PDF path, actual regular-file size
  and non-symlink file/directories, retains its controller and finishes the bridge
  call on dismissal. It has no arbitrary path, network or download feature.
- The rejected official FileViewer alternative is not installed. No additional
  native library dependency was added beyond Share and Apple's system QuickLook.

## Verification

- Injected native bytes, UI lifetime, cancellation, cleanup, bounds, concurrency,
  disposal and resolver failure tests: PASS.
- Actual Capacitor CLI plugin/class/SPM product discovery: PASS without generating
  an application. Shared fake FilePort and PDF preview boundaries: PASS.
- Full manifest: PASS across 395 test files (exit 0).
- Mobile TypeScript and scoped ESLint: PASS. React review confirmed existing
  permission guards, lazy PDF imports and busy/error/finally state handling.
- Final Web and mobile API builds: PASS. Mobile static verification: PASS across
  332 files (19.47 MiB); static smoke: PASS for nine artifacts/routes.
- SDK disclosure inventory, canonical graph/manual checklist, workflow YAML and
  diff checks: PASS. The graph retains IOS-DEVICE-ADAPTERS as incomplete and launch
  readiness as false. These are local results; hosted CI is not verified here.

## Remaining evidence

Windows cannot prove Swift compilation, real QuickLook dismissal, iPad popovers,
Files save destinations, external receivers, actual cache deletion, process death
or device memory. These remain macOS/iPhone tests. Node here is 22.11.0; repository
and CI require Node 24. No hosted job or real device was run.

Full native AppPlatform bootstrap, clipboard/links and other remaining device
adapters are still open. IOS-DEVICE-ADAPTERS, signed builds, TestFlight and paid
release gates remain incomplete. No customer data or external account was used.
