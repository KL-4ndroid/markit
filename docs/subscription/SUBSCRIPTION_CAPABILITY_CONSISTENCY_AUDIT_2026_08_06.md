# Subscription Capability Consistency Audit

Date: 2026-08-06

Status: local implementation audit complete; this document does not activate billing,
store verification, entitlement writes, media Production runtime, or candidate limits

Machine-readable source:
`lib/subscription/subscription-capability-implementation.ts`

## Purpose

The product matrix describes what Free, Pro, and Team are intended to include. This
audit separately records what the application actually enforces today. A product-tier
decision is not release evidence, and a client presentation gate is not authority for a
protected server write.

## Current Implementation

| Capability | Intended tier | Enforcement today | Release state | Next gate |
| --- | --- | --- | --- | --- |
| Product cover photo | Pro/Team | Server capability check exists in configurable `required` mode | Pre-subscription `open` mode remains intentional | Approve and verify required mode before paid launch |
| Sales photo evidence | Team | Authentication, role, ownership, rollout, and media gates; no Team entitlement check | Entitlement enforcement missing | Add a separately reviewed authoritative Team gate before paid launch |
| Basic analytics | Pro/Team | Authoritative account read followed by local execution gate | Local complete; deployment smoke pending | Paid-state deployment UI smoke |
| Advanced analytics | Pro/Team with limited Free preview | Authoritative account read followed by query and presentation suppression | Local complete; deployment smoke pending | Paid-state deployment UI smoke |
| Settlement report preview | Pro/Team with limited Free preview | Authoritative account read followed by owner-only presentation gate | Local complete; deployment smoke pending | Paid-state deployment UI smoke |
| PDF generation | Pro/Team | Authoritative account read, owner role, and platform file-preview gate | Local complete; deployment smoke pending | Paid-state deployment PDF smoke |
| Excel export | Coming soon | No mounted UI or subscription runtime | Not implemented | Approve export scope before implementation |
| Staff collaboration | Team | Authoritative database RPC/RLS transition contract | Selected sandbox verified; release smoke pending | Release owner/staff transition smoke |
| Manager workflow | Team plus role permission | Authoritative database RPC/RLS plus role-capability intersection | Selected sandbox verified; release smoke pending | Release role-cache and projection cleanup smoke |

## Paid Authority Boundary

The subscription center, native store catalog, fake IAP adapter, local simulation, store
purchase result, receipt, and purchase token cannot grant Pro or Team. The account
capability server intentionally continues to map `billing` and `promotion` projections
to disconnected Free snapshots until an approved F3C writer and runtime read policy
exist.

## Required Follow-up Order

1. Approve and implement F3C only from verified, account-bound store state.
2. Add Team entitlement enforcement to new sales-photo writes without removing existing
   role, ownership, rollout, size, and recovery checks.
3. Decide when product-cover access changes from pre-subscription `open` to `required`,
   then preserve deployment evidence before activation.
4. Run paid-state analytics, report, PDF, Team downgrade, restore, and cross-platform
   release smokes.
5. Keep Excel and product/storage limits unimplemented until their commercial and data
   policies are separately approved.

No item in this audit authorizes a Production migration or entitlement mutation.
