# Web Legal And Support Launch Review

Date: 2026-07-30

Status: local product and configuration baseline implemented; legal, accounting, and
operational approval evidence missing

This document is an engineering launch gate, not legal advice. It prevents public
policy pages, a placeholder email address, or an unchecked environment variable from
being treated as legal approval.

## Implemented local baseline

- `/support`, `/terms`, `/privacy`, and `/about` are exact public routes and do not
  require an authenticated session.
- `/support` provides separate account, privacy, billing, and security topics without
  exposing credentials or accepting card data.
- Terms state that real payment, recurring charges, renewal, cancellation, and refunds
  are not active. Plan presentation is not represented as a completed transaction.
- Privacy disclosure covers account, workspace, business, team, optional media, local
  offline state, cloud processors, rights requests, and incidents.
- Cloud data is the primary trusted recovery source. Device data is temporary cache or
  unsynced offline state; clearing it can lose changes that have not reached the cloud.
- The production preflight fails unless reviewed operator identity, support contact,
  policy dates, and server-only approval evidence are present.

## Deployment contract

Public values rendered on policy and support pages:

```text
NEXT_PUBLIC_SUPPORT_EMAIL
NEXT_PUBLIC_SERVICE_OPERATOR_NAME
NEXT_PUBLIC_SERVICE_OPERATOR_REPRESENTATIVE
NEXT_PUBLIC_SERVICE_OPERATOR_ADDRESS
NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE
```

Server-only approval evidence:

```text
LEGAL_POLICY_APPROVED_DATE
```

The public operator fields intentionally disclose business registration information.
Do not use a private residential address without confirming that it is the correct
lawful business disclosure. `LEGAL_POLICY_APPROVED_DATE` records approval but does not
replace a signed review artifact.

Run the structural check without printing values:

```powershell
npm.cmd run check:production-config -- --env-file=.env.production.local
```

Run the public-route smoke against the exact release revision. Use `draft` for local
fail-closed evidence and `published` for the release deployment:

```powershell
$env:WEB_LEGAL_SMOKE_BASE_URL='https://app.example.com'
$env:WEB_SMOKE_EXPECTED_COMMIT_SHA='<deployed-sha>'
$env:WEB_LEGAL_SMOKE_MODE='published'
npm.cmd run smoke:web:legal-support
```

The smoke follows no redirects, validates the health release identity and security
headers, and never prints page bodies or configured operator/contact values.

## Required human decisions

The `LEGAL-SUPPORT` launch gate remains open until all items have dated evidence:

1. Confirm the legal operator name, representative, business address, jurisdiction,
   and first-instance venue wording.
2. Create the public support mailbox, assign primary and backup responders, define the
   response target, and run a received/replied/closed test case.
3. Approve the personal-data notice: purposes, categories, period, region, recipients,
   methods, user rights, and the effect of not providing optional data.
4. Approve exact retention ceilings for account deletion, backups, operational logs,
   support cases, security incidents, product covers, and future billing records.
5. Confirm Supabase, Vercel, and Cloudflare regions, data-processing terms, subprocessors,
   cross-border handling, and deletion behavior.
6. Define account-deletion identity verification, pending-offline-write handling,
   completion evidence, and appeal path. CSV/Excel export remains reporting, not backup.
7. Approve incident severity, user/regulator notification owner, evidence preservation,
   support escalation, and an incident drill.
8. Before billing, approve price, currency, trial, recurring period, renewal notice,
   cancellation, effective date, refund, invoice/tax, dispute, and chargeback text.
9. Do not assume the seven-day communication-transaction cancellation right is excluded.
   Any digital-content or completed-online-service exception requires the applicable
   conditions, prior disclosure, affirmative consent, and legal review.
10. Capture product, legal, accounting, privacy/security, and support-owner sign-off on
    the exact release revision and published URLs.

## Current retention baseline

| Data | Current product behavior | Approval still required |
| --- | --- | --- |
| Account and business records | Retained while the account/workspace is active or until an authenticated deletion workflow completes | completion target, backup purge, legal holds |
| Device cache/offline writes | Temporary device state; unsynced changes may exist only on that device | stale-data ceiling and support procedure |
| Sales photo objects | Seven days from successful upload; sale/metadata may remain as an expired state | production R2 lifecycle evidence |
| Product covers | Until replace/delete/product or account cleanup | deletion propagation and backup behavior |
| Operational/security logs | Bounded schema is implemented for media events | exact retention ceiling and production sink |
| Support and future billing | Runtime not implemented | accounting/legal retention and access controls |

## Official review sources

- [Taiwan Personal Data Protection Act](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021):
  notice content, access/correction/deletion rights, purpose-expiry handling, and breach
  response/notification.
- [Taiwan Consumer Protection Act](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=J0170001):
  communication-transaction operator/contact, service, price, cancellation, and
  complaint disclosures.
- [Executive Yuan electronic commerce consumer protection guidelines](https://cpc.ey.gov.tw/Page/960E744883E6A75D):
  operator transparency, trial and recurring-charge disclosure, transaction
  confirmation, privacy/security, and complaint handling.
- [Executive Yuan communication-transaction cancellation exceptions](https://cpc.ey.gov.tw/Page/53D79214534B3D4C):
  conditions for digital content or completed online services; exceptions are not
  automatic.
- [Executive Yuan guidance on cancelling app subscriptions](https://cpc.ey.gov.tw/Page/8644AFB8F5DCB8A3/a6cad45f-8418-4c7b-b999-9f833c96ef11):
  clear subscription, renewal, cancellation, developer, and privacy information.

## Exit evidence

The gate can move from `evidence_missing` only when:

- the preflight passes on the selected production environment;
- the public pages show the reviewed operator/contact and effective date;
- an unauthenticated remote smoke proves all public pages are reachable on the exact
  release SHA;
- a real support case and incident escalation drill pass;
- signed approvals and the final retention table are stored with the release record.
