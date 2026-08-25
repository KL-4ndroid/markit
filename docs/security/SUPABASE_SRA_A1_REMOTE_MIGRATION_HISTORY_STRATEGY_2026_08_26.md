# Supabase SRA-A1 Remote Migration-History Strategy

Date: 2026-08-26
Status: strategy prepared; remote inventory and execution not authorized
Related task: `SEC-REMEDIATION` (`pending_approval`)

## Decision

Use a **remote-history-first, forward-only, disposable release workspace** for SRA-A1.
Do not rename, delete, squash, or mark any existing repository or remote migration as
applied/reverted merely to make the current repository chain pass.

The repository contains legacy version collisions:

- two files use version `012`;
- three files use version `20240220`.

Because the exact remote migration ledger has not been read for an authorized
non-Production target, neither `072` nor any other version is approved for SRA-A1.

## Approved preparation boundary

This document and its static guardrail may be created locally. This approval does not:

- identify or contact a Supabase project;
- authorize `supabase migration list --linked`, `migration fetch`, `migration repair`,
  `db push`, SQL Editor execution, or a direct database connection;
- create a numbered SRA-A1 migration under `supabase/migrations`;
- authorize non-Production or Production mutation.

## Required release method

After a security owner separately authorizes one exact non-Production target:

1. Record the project reference, environment label, operator, maintenance window,
   evidence reviewer, and expected database major version.
2. Read the target migration ledger without mutation. Save only sanitized version,
   name, and status evidence; do not save credentials or connection strings.
3. Build a disposable release workspace from the target's canonical applied history.
   Do not use the repository's colliding legacy filenames as proof of remote state.
4. Generate one new UTC timestamp version later than every version in that target
   ledger. Copy the reviewed SRA-A1 SQL into that single forward migration without
   changing its four-function scope.
5. Record the exact migration filename and SHA-256 before any dry run. The approved
   hash becomes immutable; any content change cancels authorization.
6. Run `db push --dry-run` against the exact non-Production target. Do not use
   `--include-all`. The plan must contain only the approved SRA-A1 migration.
7. Stop for a separate execution authorization containing the target, filename, hash,
   operator, window, reviewer, and corrective-forward artifact.

`migration repair` is not part of the normal SRA-A1 route. It may only be proposed if
read-only evidence proves a specific ledger error, and then requires its own exact
version/status approval. It must never be used as an automatic response to the local
duplicate versions.

## Fail-closed stop conditions

Stop without mutation when any of the following occurs:

- the target is Production or its environment identity is uncertain;
- the target ledger cannot be captured read-only;
- the database major version differs from the recorded expectation;
- a remote version collision, missing statement body, or unexplained local/remote
  mismatch is found;
- the dry run proposes more than one migration;
- the proposed filename or SHA-256 differs from the authorization record;
- the four function definitions, owners, trigger bindings, or baseline body hashes
  differ from the accepted SRA-A1 local evidence;
- the operator cannot produce the corrective-forward artifact before execution.

## Corrective-forward artifact

The release package must contain a separately hashed SQL artifact that restores the
four functions' pre-change `proconfig` and EXECUTE ACL values captured from the same
non-Production target. It must not replace function bodies, alter triggers, or touch
application data. Automatic rollback is prohibited; the security owner decides whether
to apply the corrective-forward artifact after reviewing evidence.

## Human authorization record

The next approval is incomplete until every field below has a concrete value:

| Field | Required value |
| --- | --- |
| Environment | Exact non-Production label |
| Supabase project ref | Exact project reference |
| Operator | Named responsible person or role |
| Maintenance window | Start/end time with timezone |
| Evidence reviewer | Named person or role distinct from automated execution |
| Database major version | Read-only verified value |
| Migration filename | UTC timestamp plus SRA-A1 description |
| Migration SHA-256 | Exact lowercase hash |
| Corrective-forward filename/hash | Exact artifact identity |
| Dry-run result | Exactly one pending SRA-A1 migration |

Until that record is complete, `SEC-REMEDIATION` remains `pending_approval`, and no
checklist completion is earned by this strategy-only preparation.
