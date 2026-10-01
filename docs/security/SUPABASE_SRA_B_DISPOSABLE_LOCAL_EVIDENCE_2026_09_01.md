# Supabase SRA-B Disposable Local Evidence

Date: 2026-09-01

Status: exact-scope local rehearsal passed; Production execution not authorized

A new container named `sra-b-20260901` used the already available Supabase PostgreSQL
17.6 image. It was isolated from Production and contained only synthetic tables, roles,
policies, events and trigger fixtures.

## Fixed artifacts

| Artifact | SHA-256 |
| --- | --- |
| `docs/security/drafts/SRA_B_LOCAL_REVIEW_TRANSACTION.sql` | `f079967206e6a01d87057b8bb52ab12bf2c3a6704d5369ae5dcf2cef01f6a4f7` |
| `supabase/tests/sra_b_local_fixture.sql` | `2c975fc1e8a7587966caa551f1f8390f5ad25072c3e25cf5c5606f9a424d34d9` |
| `supabase/tests/sra_b_local_postcheck.sql` | `bbcf7b4dfe9f615d38e2d9462de41b89e51cf719cc9e85718cd09a0b59bafabf` |
| `supabase/verification/sra_b_production_read_only_preflight.sql` | `a6abb5f1d3c2a633b994a13544735fa584011c61d09f9e1e3cefca1b60fe9879` |
| `supabase/verification/sra_b_postcheck_read_only.sql` | `51bc58746d805fc05f50be91f98584f00c0aa7f50e2fdfada0207e436bc0cbed` |

## Results

- [x] Exact four-policy baseline admitted the transaction.
- [x] Fixed Production-shaped read-only preflight returned `ok=true`, guard `1`.
- [x] Exactly three always-true policies were dropped.
- [x] The owner-bound product policy stayed exact.
- [x] Direct authenticated market INSERT was denied.
- [x] Foreign-owner product INSERT was denied.
- [x] Same-owner product INSERT remained allowed.
- [x] SECURITY DEFINER event projection still created market and product read models.
- [x] Unexpected repeat application was rejected before persistent change.
- [x] Fixed read-only postcheck returned `ok=true`, guard `1`.
- [x] Post-repeat catalog remained zero market INSERT policies and one product policy.
- [x] Synthetic writes rolled back; the disposable container was removed without backup.
- [x] Production connections and remote writes remained zero.

Machine-readable evidence:
`docs/security/SRA_B_DISPOSABLE_LOCAL_EVIDENCE_2026_09_01.json`.

The next SRA-B boundary is a fixed Production release artifact and separate execution
approval. This rehearsal does not authorize it.
