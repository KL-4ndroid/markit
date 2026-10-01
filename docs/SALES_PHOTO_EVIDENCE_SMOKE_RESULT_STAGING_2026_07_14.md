# Sales Photo Evidence Staging Smoke Result

Date: 2026-07-14
Status: **Ready for manual execution - final result pending**
Plan phase: Phase 2, Staging Manual Upload
Application baseline: `dd4783f`

## Code Preflight Result

The following targeted tests passed:

- Server-only R2 upload adapter configuration, validation, private object write, and retryable error mapping.
- Metadata-claim and R2-upload route gates, authentication ordering, fake-adapter upload ordering, and production fail-closed behavior.
- Manual upload client local-payload retention/deletion contract.
- Owner-only private image read and unauthorized denial.
- Supabase metadata claim repository scope, upload finalization, and retry failure behavior.
- Supabase owner album metadata reader role and read-only boundaries.

No real Supabase write, R2 upload, or private image read was performed by this preflight.

## Environment Preflight

Present in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- Supabase public/anonymous client keys

The repository user reported these values are now configured in the Git-ignored local environment file:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- Optional `R2_ENDPOINT`
- `SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED=1`
- `SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED=1`
- `SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED=1`

Production allow flags must remain absent/off during Staging smoke:

- `SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION`
- `SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION`
- `SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ALLOW_PRODUCTION`

## Required Human Setup

Before recording the final Phase 2 result:

1. Confirm the configured Supabase project is an isolated Staging project and migrations `055` and `056` are applied.
2. Provide disposable Staging owner and staff accounts with one disposable market and sale.
3. Configure a private Staging R2 bucket with the expected seven-day lifecycle prefix policy.
4. Open `/debug/sales-photo-evidence`, confirm all four environment checks show `就緒`, and use the disposable staff account.
5. Do not paste credentials into this document, screenshots, logs, commits, or the Codex conversation.
6. Restart the local dev server after environment changes.

## Staging Smoke Checklist

- [ ] Record the Staging Supabase project identifier without credentials.
- [ ] Record the private R2 bucket name and lifecycle-policy confirmation.
- [ ] Sign in as the disposable staff account.
- [ ] Confirm one local pending payload exists for a staff-owned queue row.
- [ ] Trigger `上傳照片` once.
- [ ] Confirm route order: authenticate, claim/reuse metadata, upload image, upload thumbnail, finalize metadata.
- [ ] Confirm metadata reaches `uploaded`.
- [ ] Confirm private image and thumbnail objects exist under approved keys.
- [ ] Confirm the successful response permits deletion and the matching local payload is removed.
- [ ] Confirm the owner album shows the uploaded row and private thumbnail.
- [ ] Confirm the authorized owner can read image bytes.
- [ ] Confirm staff and unrelated users cannot read owner image bytes.
- [ ] Run one controlled upload failure and confirm the local payload remains retryable.
- [ ] Retry successfully and confirm no duplicate active metadata row is created.
- [ ] Confirm all production allow flags remain off.

## Result To Complete

- Tester:
- Staging project identifier:
- R2 bucket/lifecycle confirmed:
- Owner account id:
- Staff account id:
- Market id:
- Queue id:
- Evidence metadata id:
- Image object key:
- Thumbnail object key:
- Success-path local deletion result:
- Failure/retry result:
- Authorization checks:
- Duplicate check:
- Final result: `PASS` / `FAIL`
- Notes:

## Exit Decision

Do not start Phase 3 or enable any production allow flag until this document records a final `PASS`. Missing credentials or environment classification is a hard block, not a test failure.
