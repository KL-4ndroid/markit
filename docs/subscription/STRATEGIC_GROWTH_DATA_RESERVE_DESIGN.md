# Strategic Growth Data Reserve Design

Date: 2026-07-29  
Status: S7 completed as planning only  
Authority: canonical data and consent boundary for future strategic growth work

## 1. Purpose

Reserve a platform-neutral data contract for a future small-brand commerce
network while the current product remains focused on helping each brand operate
well. This document defines logical records, not physical tables or an approved
runtime schema.

This slice creates:

- no Supabase migration;
- no runtime route;
- no creator or partner account model;
- no marketplace, search, ranking, matching, chat, fee, or payout workflow;
- no public data exposure.

The current purchasable plans remain `free`, `pro`, and `team`. Strategic
capabilities and consent remain separate from plan entitlement.

## 2. Design Principles

1. **Private by default.** Operational records and derived internal insight stay
   owner-private unless a separate publication action is completed.
2. **Publish a copy, not a private view.** A partner-facing artifact must contain
   only an owner-approved projection. It must never be a live view into private
   operational records.
3. **Consent is not entitlement.** A subscription may make a capability
   available, but it cannot grant publication or benchmark consent.
4. **Purpose-specific consent.** Publication and anonymous benchmarking are
   different purposes and require separate decisions.
5. **Provenance over unsupported claims.** Derived records carry source version,
   freshness, evidence coverage, and limitations. Readiness is not a guarantee.
6. **Reversible sharing.** Owners can withdraw a publication or benchmark
   consent without deleting the operational records from which it was derived.
7. **Portable contracts.** Future domain rules and API contracts must remain
   reusable by Web, iOS, and Android clients. No browser or device API belongs in
   these records.
8. **Neutral partnership language.** The contract supports creators, group-buy
   hosts, retailers, distributors, event operators, and future partner types
   without embedding one channel into the core model.

## 3. Logical Record Catalog

These names describe bounded logical records. A later implementation design must
decide storage, normalization, identifiers, indexes, RLS, retention, and API
shapes after privacy and threat-model review.

| Logical record | Privacy | Purpose | Approved field families | Explicit exclusions |
| --- | --- | --- | --- | --- |
| `brand_profile` | owner-private master | stable brand identity and operating context | owner workspace reference, display identity, summary, categories, broad operating regions, business stage, collaboration preferences, provenance | private financial metrics, staff activity, credentials |
| `product_commerce_profile` | owner-private master | describe an offering and whether it can support a collaboration | product reference, category and differentiation tags, packaging and fulfillment constraints, allowed collaboration modes, broad lead-time band, restrictions, media-readiness references, provenance | unit economics, supplier identity or notes, exact stock or capacity, customer data |
| `market_context` | owner-private derived context | preserve where and under what conditions evidence was observed | market type, broad region, audience and season tags, observation window, source references, freshness, evidence quality, limitations | private organizer terms, booth notes, person-level behavior, raw transactions |
| `collaboration_readiness_snapshot` | owner-private derived snapshot | explain current collaboration readiness without promising outcomes | evaluated dimensions, evidence coverage, limitations, generated time, source version, policy version | public ranking, guaranteed performance, hidden partner score, raw source rows |
| `public_partner_snapshot` | separately published artifact | expose only the owner-selected collaboration offer | publication reference, approved public brand projection, selected product projections, allowed collaboration modes, broad regions, lead-time bands, contact relay, freshness, limitations, publication lifecycle | any implicit join to private records that can expose excluded fields |
| `benchmark_opt_in` | owner-private consent record | record purpose-specific anonymous benchmark participation | owner workspace reference, purpose, cohort dimensions, metric allowlist, policy version, granted time, withdrawn time, consent status | bundled consent, default opt-in, raw-row sharing, public participation flag |

## 4. Ownership And Derivation

```text
owner-private operational data
  -> owner-private normalized profiles
  -> owner-private readiness snapshot
  -> explicit owner review and publication
  -> detached public_partner_snapshot
```

- Operational data remains the owner's private source of truth.
- Derived profiles and readiness snapshots are rebuildable projections, not
  financial ledgers and not public records.
- A `public_partner_snapshot` is a detached publication copy with its own version
  and lifecycle. Withdrawing it must not mutate or delete source operations.
- Partner-facing consumers may use only an active published copy and data that
  both parties later authorize for a specific collaboration.
- Future systems must not infer consent from plan, trial, founder pricing,
  referral participation, account age, or prior publication.

## 5. Publication And Consent State Machines

### Partner publication

```text
draft -> published -> withdrawn
                  -> expired
```

- Only the owner can move a reviewed draft to `published`.
- Material source changes do not silently rewrite a published artifact. They
  create a new draft or mark the publication stale according to future policy.
- Republish is a new explicit owner action.
- `withdrawn` and `expired` are not publicly discoverable and cannot receive new
  collaboration requests.

### Anonymous benchmark consent

```text
not_granted -> granted -> withdrawn
```

- `not_granted` is the default.
- Consent is scoped by purpose, metric allowlist, cohort dimensions, and policy
  version. A changed purpose or materially changed policy requires new consent.
- Withdrawal blocks future inclusion. Retention of already aggregated results
  requires a separately reviewed privacy policy before runtime implementation.
- Benchmark consent never publishes a partner profile and publication never
  grants benchmark consent.

## 6. Partner-Facing Redaction Policy

The following data is never partner-facing merely because the platform can
calculate or store it:

- raw cost, gross profit, net profit, margin, payout, bank, tax, or invoice data;
- supplier identity, supplier terms, supplier notes, or sourcing discussions;
- staff identity, staff activity, permissions, schedules, or performance;
- private market identity, organizer terms, booth notes, or private market
  performance details;
- raw sales, transaction, customer, interaction, or contact-list data;
- exact inventory, production capacity, internal lead-time calculations, or
  fulfillment failure history;
- internal readiness components, fraud or trust signals, private ranking inputs,
  support notes, and security metadata.

Partner-facing fields are restricted to owner-selected identity, summary,
categories, selected offerings, allowed collaboration modes, broad operating
regions, broad lead-time bands, platform contact relay, freshness, and stated
limitations. Every future serializer must use an allowlist; deleting disallowed
keys after serializing a private object is not acceptable.

### Public-safe example

<!-- PUBLIC_SAFE_EXAMPLE_START -->
```json
{
  "publication_id": "partner_snapshot_demo",
  "brand": {
    "display_name": "Demo Studio",
    "summary": "Small-batch home goods",
    "categories": ["home", "gift"]
  },
  "offerings": [
    {
      "title": "Seasonal gift set",
      "category": "gift_set",
      "collaboration_modes": ["group_buy", "limited_release"],
      "lead_time_band": "14_to_21_days"
    }
  ],
  "operating_regions": ["north_taiwan"],
  "contact_channel": "platform_relay",
  "freshness": "current_as_of_2026_07",
  "limitations": ["availability_requires_owner_confirmation"],
  "published_at": "2026-07-29T00:00:00Z",
  "expires_at": "2026-10-27T00:00:00Z"
}
```
<!-- PUBLIC_SAFE_EXAMPLE_END -->

The example is illustrative only. It is not a migration, API response, or final
field naming decision.

## 7. Anonymous Benchmark Boundary

Anonymous benchmark work remains blocked until a later privacy review approves:

- a minimum cohort threshold and suppression behavior;
- metric and cohort allowlists;
- aggregation, noise, outlier, and re-identification controls;
- regional privacy, deletion, and consent requirements;
- auditability of inclusion and withdrawal;
- a rule that raw owner rows are never returned or exported to another owner.

Small or uniquely identifiable cohorts must fail closed. No UI may claim
"anonymous" based only on removing a brand name.

## 8. Future Matching Boundary

Future matching may consume active `public_partner_snapshot` artifacts and
collaboration-specific data later authorized by both parties. It must not read
private profiles directly for public search or silently expose internal readiness
scores.

S7 does not define partner acquisition, identity verification, search, ranking,
recommendations, messaging, contracts, attribution, commission, settlement,
disputes, ratings, or moderation. Each requires a separately approved threat,
privacy, policy, and implementation plan.

## 9. Future Implementation Gates

Before any runtime implementation, a later approved slice must provide all of:

1. final product purpose and lawful-basis review;
2. schema, RLS, service-role, and deletion design;
3. server-authoritative consent and publication commands with audit history;
4. allowlist serializer tests proving private fields cannot cross the boundary;
5. owner preview, confirm, withdraw, stale, and recovery UX;
6. abuse, scraping, enumeration, and rate-limit protections;
7. Web and future mobile API contracts that do not assume same-origin behavior;
8. staged privacy and authorization tests before any public route is enabled.

Until those gates are approved, all three strategic capabilities remain
`model_only` and all six logical records remain documentation-only reserves.
