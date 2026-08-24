# Account Deletion Legal And Security Review Packet

Date: 2026-08-17

Status: legal/privacy and security policy reviews approved on 2026-08-17; pre-runtime evidence and destructive-runtime approval remain pending

Canonical product proposal: `docs/subscription/ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06.md`

Decision record: `docs/SESSION1_POLICY_DECISION_WORKSHEET_2026_08_17.md`

## 1. Product directions already approved

- Immediate deletion after recent reauthentication and explicit pending-write resolution; no mandatory waiting period.
- Active Apple/Google billing does not block Féria deletion and does not get canceled by Féria deletion.
- Ordinary primary-system identity/workspace data has a 30-day engineering ceiling; object, device-cache, and backup ceilings are separately defined.
- Staff self-deletion removes identity/relationships without deleting the owner workspace; retained owner facts use irreversible deleted-member attribution.
- Necessary billing evidence is minimized and detached from `profiles.id`/email to a restricted pseudonymous billing subject.
- Cleanup failure remains `failed_retryable` or `manual_review`; completion is never reported early.
- Deleted workspace data never returns through purchase restore.

These directions remain subject to the reviews below. A reviewer may reject or require a policy change.

## 2. Retention table for review

| Data class | Proposed deletion result | Engineering ceiling | Required review |
| --- | --- | ---: | --- |
| Auth identity, profile, contact, workspace settings | disable immediately; delete from primary systems | 30 days | legal basis, processor propagation |
| Markets, products, sales, events, notes, checklists | delete with workspace except a minimized legally required subset | 30 days | confirm not blanket accounting records |
| Staff relationships and invitations | revoke immediately; delete or irreversibly anonymize | 30 days | third-party rights, anonymization fields |
| Audit/security logs | restrict and pseudonymize | 180 days | scope, incident extension, integrity, purge evidence |
| Support cases | remove unnecessary identifiers | 2 years | necessity, legal basis, appeal evidence |
| Product-cover objects | delete and prove absence | 30 days | processor/object proof |
| Sales-photo objects | delete and prove absence | earlier of seven-day lifecycle or cleanup | metadata/object proof |
| Price assignment/subscription state | detach and minimize | 5 years | exact classification and fields |
| Store transaction/refund evidence | detach; no raw token in general logs | 5 years | tax/dispute classification and minimization |
| Legally classified accounting books | restricted pseudonymous retention | 10 years | identify exact records; unresolved exception |
| Legally classified accounting vouchers | restricted pseudonymous retention | 5 years | identify exact records; unresolved exception |
| Controlled-device cache | clear after completion | immediate | inaccessible-device disclosure |
| Backups | restrict; no routine identity restore; corrective-forward deletion | 90 days | legal basis, restore controls, processor propagation |

The 10-year/5-year rows apply only after legal/accounting classification. They do not authorize retaining an entire customer workspace.

## 3. Legal/privacy decisions required

The designated reviewer must approve, reject, or revise:

1. immediate deletion timing, optional delete-at-expiry choice, and active-store disclosure;
2. legal basis and exact start/end calculation for every retention row;
3. whether the proposed 30/180-day, two/five/ten-year, and 90-day ceilings are lawful and necessary;
4. scope and approval authority for litigation, tax, regulatory, and incident holds;
5. processor/subprocessor deletion and backup propagation obligations;
6. controller/processor boundaries for owner workspace, staff identity, and third-party content;
7. irreversible-anonymization fields and whether retained operational facts remain personal data;
8. minimized billing-subject fields, lawful reidentification boundary, and data-subject request behavior;
9. post-deletion active-billing warning, restore ownership, appeal, and completion evidence;
10. public deletion resource, privacy-notice wording, jurisdiction-specific rights, and response deadlines.

## 4. Security decisions required

The designated reviewer must approve, reject, or revise:

1. private deletion-request table, state transitions, idempotency, actor authorization, and reauthentication freshness;
2. pending-write inventory and fail-closed prevention of silent local loss;
3. billing-subject key generation, separation from profile/email, access roles, encryption, and audit trail;
4. absence of a reversible staff-anonymization lookup and resistance to linkage through retained fields;
5. object-deletion enumeration, retry, absence verification, and metadata cleanup;
6. backup corrective-forward deletion after restore;
7. legal/incident-hold creation, approval, expiry, review, and purge controls;
8. purchase restore prior-binding release, single-owner enforcement, replay/race handling, and fraud recovery;
9. request-status disclosure without leaking private identifiers or internal object keys;
10. audit evidence integrity without raw receipts, purchase tokens, passwords, or customer content in general logs.

## 5. Required pre-runtime evidence

- Table-level schema/FK inventory and an explicit action for every user reference.
- Exact R2 object/metadata inventory and absence-verification plan.
- Processor region, deletion, backup and DPA evidence for Supabase, Vercel, Cloudflare, and the selected observability provider.
- Threat model for deletion authorization, cross-account deletion, purchase replay, restore races, support impersonation, and reidentification.
- Synthetic owner and staff deletion fixtures, active-store fixture, retry/manual-review fixture, and disaster-restore fixture.
- Repository-safe evidence with timestamps, reviewer roles, policy revision, test references, and release SHA.

None of these checks authorizes Production deletion or a destructive migration.

## 6. Approval statements

`legal_privacy_owner` approval must state:

> I approve the legal/privacy bases, exact retention table, deletion/anonymous outcomes, active-store disclosure, staff/third-party boundaries, billing-subject minimization, processor propagation, appeal, and evidence requirements for policy revision 2026-08-17, subject to the listed pre-runtime evidence.

Approved on 2026-08-17 by `legal_privacy_owner`. This closes the legal/privacy policy-review portions subject to the listed pre-runtime evidence, future law/store-policy recheck, and security review.

`security_owner` approval must state:

> I approve the security boundaries for authorization, state transitions, pending writes, pseudonymous billing identity, irreversible staff anonymization, object/backup deletion, holds, purchase restore anti-replay, request evidence, and purge verification for policy revision 2026-08-17, subject to the listed pre-runtime evidence.

Approved on 2026-08-17 by `security_owner`. This closes the security policy-review portions subject to the listed threat model, schema/processor evidence, synthetic fixtures, implementation review, and destructive-runtime gate.

Approval of this packet closes policy-review checklist items only. Runtime, migrations, store configuration, destructive tests, Production deployment, public legal publication, and release evidence remain separately gated.

## 7. Official references to verify during review

- Taiwan Personal Data Protection Act: https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021
- Taiwan Ministry of Finance accounting retention guidance: https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-q-and-a/national/profit-seeking-enterprise-income-tax/imputation-credit-account/GA8Rb37
- Apple account deletion guidance: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google Play account deletion policy: https://support.google.com/googleplay/android-developer/answer/13327111
