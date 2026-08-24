# iOS Phase 2 Gate 2 Baseline Evidence

Date: 2026-08-21

Status: Probe A and Probe B controlled failure, physical cleanup, exact-once recovery, and final release smoke passed; Gate 2 complete

This record contains no credentials, environment values other than public/non-secret
boolean gates, customer data, full owner/market/sale identifiers, or R2 object keys.

## Selected release

- Production host: `https://markit-app-mocha.vercel.app`
- Vercel deployment: `Fd8osR4EkNaKhSFyXDzhvriZHVeD`
- Environment: Production / Current / Ready
- Source commit: `faf0786`
- Health build time: `2026-08-21T06:00:41.363Z`
- Recovery owner: human deployment owner, with AI step-by-step evidence review

The redeploy reused the selected Production deployment source. It did not include the
local dirty working tree.

## Completed baseline checks

| Check | Result | Evidence |
| --- | --- | --- |
| Production CORS | PASS | `https://markit-app-mocha.vercel.app` and `capacitor://localhost` are accepted; an unrelated origin is rejected |
| Minimum owner media baseline | PASS | client enqueue, metadata claim, R2 upload, and image read enabled with Production allow gates |
| Commit-bound API smoke | PASS | health, release identity, three Capacitor preflights, disallowed-origin rejection, and invalid-token rejection passed |
| Route gate activation | PASS | an unauthenticated invalid multipart request reached the active route and failed closed with `authentication_required` before data access |
| Fault gate safe state | PASS | `FAULT_INJECTION_ENABLED=0`, `ALLOW_PRODUCTION=0`, and no temporary token/owner/market/sale/mode scope variables present |
| Private R2 inspection | PASS | authenticated random-sentinel `HEAD` returned expected not-found without creating, listing, changing, or deleting an object |
| Evidence/recovery ownership | PASS | repository template exists; human recovery owner and AI evidence reviewer assigned |
| Isolated fixtures | PASS | authenticated test owner, disposable isolated market, two isolated cash sales, and repository demo image prepared without recording full identifiers |
| Local pending payloads | PASS | both isolated sales visibly retain one local image preview; pending-photo count remains two and no successful cloud upload occurred |
| Sync baseline | PASS | account UI shows `已同步`, zero unrelated pending writes, and connected network |

The first manual upload attempt exposed stale Sensitive boolean values in the
Production route gates. The server rejected it before authentication or data mutation,
the local payload remained available, and the attempt is diagnostic baseline evidence,
not Probe A. The corrected deployment now reaches the authenticated route boundary.

## Gate 2 disposition

No Gate 2 evidence remains pending. Both controlled probes, physical-cleanup checks,
single user-triggered recoveries, private-image reads, fault-variable removal, and the
final commit-bound Production smoke passed. The evidence set remains secret-free.

## Probe A diagnostic attempts and safe recovery

These early diagnostic attempts did not pass Probe A and were not checked off. Two isolated NT$2 upload attempts
were rejected with HTTP 403 before the metadata-claim and R2-write stages. The first
attempt exposed stale Production fault-gate values. After the values were rotated and
an exact-scope deployment reached Ready, the retry still produced the generic retained-
photo message. The client error mapping, route status, and server decision ordering
identify this second rejection as the bounded fault-injection authorization guard rather
than the normal `permission_denied` upload path.

Post-attempt read-only verification found exactly one matching NT$2 sale and zero
`sale_photo_evidence` rows: uploaded, upload-failed, and uploading counts were all zero.
The local photo preview remained available for another retry. Because no R2 write was
reached, neither attempt is compensation proof.

Production was immediately returned to a safe deployment:

- Vercel deployment: `EqFjEA8L2Gk26shf5Vb1kiUTtDZN`
- Environment: Production / Current / Ready
- Source commit: `faf0786`
- Health status: healthy
- Health build time: `2026-08-21T12:47:16.57Z`
- Fault-injection master gates: disabled

The five temporary scope variables remain inert while the authorization prerequisite is
diagnosed; both master gates are disabled. They must be removed after the probes, and
their presence does not satisfy the final safe-cleanup checklist item.

## Probe A controlled failure result

The bounded diagnostic deployment was built from a detached clean `faf0786` worktree
plus a four-file server-only diagnostic change. The change records only one fixed
fault-authorization reason code and does not return that reason to the client. Both
focused fault-injection and upload-route tests passed, and Vercel completed its clean
production build.

- Diagnostic deployment: `4MTgQcau3hth6R4nEpjD2Rya7TvF`
- Diagnostic health build time: `2026-08-21T13:58:05.542Z`
- Selected fault: `thumbnail_upload_failed`
- User-visible result: storage upload failed and the local photo remained on-device
- Server result: two POST requests in the manual interaction window, each with fixed
  code `r2_thumbnail_upload_failed`, HTTP 500, and `outcome=failure`
- Compensation interpretation: `outcome=failure` means `cleanupIncomplete=false`;
  any delete rejection would instead emit a compensation error and `outcome=partial`

The POST transport policy does not automatically retry mutation requests. The two
observed requests are therefore recorded explicitly and the later safe normal retry
must still prove one uploaded row and no duplicate evidence.

Read-only Supabase verification after the controlled failure returned:

| Check | Result |
| --- | --- |
| Matching isolated NT$2 sales | 1 |
| Active evidence rows | 1 |
| `uploaded` rows | 0 |
| `upload_failed` rows | 1 |
| `uploading` rows | 0 |
| Rows with persisted R2 object keys | 0 |

The R2 adapter accepted the same-attempt image `DeleteObject` operation for both
requests without a cleanup error. A subsequent authenticated, read-only R2 `HEAD`
verification derived the four canonical image/thumbnail candidates from exactly one
matching private identity row. All four candidates were absent and no unexpected HEAD
error occurred. The one-row private CSV and temporary verifier were deleted immediately
after the check and independently confirmed absent. No identifier or object key is
recorded in this evidence file. Vercel correctly did not disclose Sensitive values
through `env pull`, and no bypass was attempted.

All seven temporary Production fault variables were then removed. A new clean
`faf0786` safe deployment was built after their removal and assigned to the Production
host:

- Safe deployment: `BBH1bhCZ4oPuMYn2nAPr4bqzqJSs`
- Environment: Production / Current / Ready
- Health status: healthy
- Health build time: `2026-08-21T15:19:46.021Z`
- Production fault-variable count: 0

The safe-host smoke passed for health, three `capacitor://localhost` route preflights,
an unrelated-origin rejection, and invalid-token rejection. Probe A physical cleanup is
now proven by direct R2 HEAD. The normal upload and zero-duplicate verification remain
pending.

## Probe A isolated rerun — 2026-08-24

A new disposable market and one NT$2 cash sale were created because the earlier fixture
had completed its local workflow. Sales-photo evidence was enabled before the sale, and
one non-customer test image remained on-device until the exact-scope deployment was Ready.
No private owner, market, sale, evidence identifier, or object key is recorded here.

The rerun used the same bounded server-only diagnostic change and seven Sensitive,
Production-only variables scoped to exactly one verified owner, market, and sale. Both
focused diagnostic tests passed immediately before deployment.

- Diagnostic deployment URL: `markit-jfnn61sul-masons-projects-1db534c5.vercel.app`
- Custom Production alias: `markit-app-mocha.vercel.app`
- Selected fault: `thumbnail_upload_failed`
- User-visible result: storage upload failed and the photo remained on-device
- Runtime result: exactly one POST at `2026-08-24T08:14:09.584Z`, HTTP 500, with
  `code=r2_thumbnail_upload_failed` and `outcome=failure`
- Automatic retry result: none; no second POST appeared in the selected log window

Read-only Supabase verification returned exactly one active evidence row: zero uploaded,
one `upload_failed`, zero uploading, and zero rows with persisted R2 object keys. A private
single-row identity transfer then drove four authenticated R2 HEAD requests for the two
canonical variants and two supported file extensions. All four candidates were absent,
with zero unexpected HEAD errors. The private identity file, temporary verifier, browser
clipboard contents, and in-memory identity bindings were immediately cleared and confirmed
absent where applicable.

All seven temporary Production fault variables were removed after evidence capture. A clean
`faf0786` deployment was built from the isolated safe worktree and reassigned to the custom
Production alias:

- Safe deployment URL: `markit-dd0g6ex2t-masons-projects-1db534c5.vercel.app`
- Health: `healthy`
- Production fault-variable count: 0
- CORS smoke: three approved `capacitor://localhost` preflights returned 204
- Negative smoke: unrelated origin returned 403; invalid bearer token returned 401

The owner then used the single `重新上傳` recovery action once on the safe deployment.
The Production runtime recorded exactly one successful POST at
`2026-08-24T08:21:24.180Z`: HTTP 200, `code=upload_completed`, `outcome=success`,
and attempted/completed/failed counts of 1/1/0. No second successful upload request
appeared in the selected runtime window.

Post-success read-only Supabase verification returned:

| Check | Result |
| --- | --- |
| Matching isolated NT$2 sales | 1 |
| Active evidence rows | 1 |
| `uploaded` rows | 1 |
| `upload_failed` rows | 0 |
| `uploading` rows | 0 |
| Rows with a complete image/thumbnail key pair | 1 |

The authenticated Production owner UI then read and rendered both the stored thumbnail
and the full-size private image through the server-side R2 read adapter. This proves that
both exact persisted objects are present and readable in the Production bucket without
exposing either object key. A direct local HEAD was not used for the post-success objects
because the local R2 credential set targets a different bucket and Vercel correctly does
not export Sensitive Production credential values. The failure-cleanup absence proof above
remains the direct authenticated HEAD evidence required for compensation.

The owner UI showed `照片已齊`, no retained retry action, and a rendered recent-sale
photo. Together with the single metadata row and single complete key pair, this passes the
normal-recovery, private-read, pending-clear, and zero-duplicate requirements for Probe A.
The private key/identity CSV, the temporary Production environment export, the temporary
verifier, browser clipboard contents, and in-memory private bindings were removed or
cleared and confirmed absent where applicable. At that point Probe B remained pending;
the completed Probe B evidence is recorded below.

## Probe B controlled failure — 2026-08-24

One isolated NT$3 cash sale was created in the same disposable market. One non-customer
test image remained on-device until a bounded diagnostic deployment was Ready. A read-only
preflight query found exactly one matching sale and zero evidence rows. Seven Sensitive,
Production-only variables were then scoped to exactly that owner, market, and sale with
automatic mode `metadata_finalize_failed`.

- Diagnostic deployment URL: `markit-mqz4w6z1g-masons-projects-1db534c5.vercel.app`
- Diagnostic deployment ID: `HgSm2FRBNS4Cmc2oUeMCj7KVnPoS`
- Custom Production alias: `markit-app-mocha.vercel.app`
- User-visible result: the photo was transmitted, metadata finalization failed, and the
  local photo remained available
- Runtime result: exactly one POST at `2026-08-24T09:04:44.920Z`, HTTP 500, with
  `code=metadata_finalize_failed`, `outcome=failure`, and attempted/completed/failed
  counts of 1/0/1
- Automatic retry result: none; no second POST appeared in the selected runtime window

Read-only Supabase verification after the failure returned:

| Check | Result |
| --- | --- |
| Matching isolated NT$3 sales | 1 |
| Active evidence rows | 1 |
| `uploaded` rows | 0 |
| `upload_failed` rows | 1 |
| `uploading` rows | 0 |
| Rows with any persisted R2 object key | 0 |

The route result has `cleanupIncomplete=false` semantics: both confirmed uploads were sent
through the same-attempt compensation path, and no finalize mutation was accepted. Vercel
correctly withheld Sensitive R2 credential values from both `env pull` and `env run`; no
credential bypass was attempted.

After the recovery owner authenticated directly to Cloudflare, a read-only provider-console
inspection verified the Production bucket without downloading, modifying, or deleting an
object. The bucket still contained exactly two objects totaling 87.63 kB: one existing
Probe A original and one existing Probe A thumbnail. Under both `sales-evidence/7d/` and
`sales-evidence-thumbs/7d/`, the hierarchy contained exactly one owner folder, one market
folder, and one sale folder. Probe B used a different sale identity and therefore would
have produced a second sale folder in each hierarchy; neither exists. This proves both
Probe B physical objects are absent while avoiding disclosure of any private identifier or
object key.

All seven temporary fault variables were removed immediately after the failure evidence was
captured. A clean `faf0786` safe deployment was built with explicit commit identity and
reassigned to the custom Production alias:

- Safe deployment URL: `markit-1ava79eky-masons-projects-1db534c5.vercel.app`
- Safe deployment ID: `65toYyQwKhjn1Cn48jH8iVLz6QxE`
- Health: `healthy`; commit identity: `faf0786`
- Production fault-variable count: 0
- Commit-bound smoke: health, three approved Capacitor CORS preflights, unrelated-origin
  rejection, and invalid-token rejection passed
- Owner UI: local photo retained with one `重新上傳` recovery action

Private identity files, temporary verifier scripts, browser clipboard contents, and
in-memory private bindings were removed or cleared and confirmed absent where applicable.
The controlled Probe B failure and physical cleanup are checked off independently. The
exact-once normal retry evidence follows.

## Probe B exact-once recovery and final release verification — 2026-08-24

After the safe deployment was Ready and all seven temporary fault variables were absent,
the recovery owner pressed the single visible `重新上傳` action once. The UI reported a
successful upload and cleared the pending item. Runtime logs contained exactly one new
upload POST at `2026-08-24T09:23:25.193Z`: HTTP 200 with `code=upload_completed`,
`outcome=success`, and attempted/completed/failed counts of 1/1/0. No duplicate retry POST
was present.

Final read-only Supabase verification returned:

| Check | Result |
| --- | --- |
| Matching isolated NT$3 sales | 1 |
| Active evidence rows | 1 |
| `uploaded` rows | 1 |
| `upload_failed` rows | 0 |
| `uploading` rows | 0 |
| Rows with a complete image/thumbnail key pair | 1 |

Read-only Cloudflare inspection found exactly two sale folders under the isolated market
in each of the original-image and thumbnail hierarchies: the existing Probe A folder and
one new Probe B folder. No third sale folder existed in either hierarchy. Combined with
the single Probe B metadata row and complete key pair, this verifies one new private
image/thumbnail pair with no duplicate recovery write. The authenticated Production owner
UI successfully rendered both the Probe B thumbnail and full-size private image through
the server-side read route, without exposing object keys or private identifiers.

The owner UI showed `照片已齊` and `目前沒有待補照片`. A final commit-bound Production
smoke passed health and release identity for `faf0786`, all three approved Capacitor CORS
preflights, unrelated-origin rejection, and invalid-token rejection. The Production
environment list contained zero fault-injection variables. Probe B recovery and the final
secret-free evidence review therefore pass, completing Gate 2.
