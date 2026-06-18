# P5-1: Role-aware Runtime Design

> Status: P5-1 Design Only
> Risk: Yellow / Design Only
> Last Updated: 2026-06-19

---

## 0. About This Document

This document is the **P5-1 design** for how staff role enters the runtime permission system.

It is the design basis for:

```text
P5-2  useUserRole reads role (no UI behavior change)
P5-3  role-capabilities helper (no UI wiring)
P5-4  Sync / Dexie downgrade safety
P5-5  operator write paths (interaction / deal)
P5-6  manager write paths (market / product)
P5-7  StaffPermissionCard role-aware
```

This document **must be read together with**:

```text
docs/staff-role-matrix.md        (v1.0, sealed at 4de2287)
docs/staff-role-permissions.md   (v1.0, sealed at 4de2287)
```

If anything in this document contradicts the sealed role docs, the role docs win.
When this design is implemented in P5-2 and later, the role docs must be re-audited.

### Non-goals (this document)

This document:

* ❌ Does NOT modify runtime code
* ❌ Does NOT modify migrations
* ❌ Does NOT open any operator / manager write capability
* ❌ Does NOT change `canEdit`
* ❌ Does NOT change `PermissionGate`
* ❌ Does NOT change `useSync` / Dexie logic
* ❌ Does NOT enter P5-2 / P5-5 / P5-6 / P5-7

If a reader wants a code change, this is the wrong document.
Read `P5-2` and onwards.

---

## 1. Purpose

The purpose of P5-1 is to design how `staff_relationships.role` enters the runtime, so that future P5 phases can open operator / manager capabilities **safely and minimally**.

P5-1 only defines the runtime shape. It does not implement.

Concretely this document must answer:

```text
Q1.  How should role be read by useUserRole?
Q2.  What is the responsibility boundary between infoLevel and role?
Q3.  Should permissions.can_edit be used as a runtime source?
Q4.  Should we avoid a global canEdit?
Q5.  What named capabilities should be introduced?
Q6.  Should PermissionGate stay focused on data sanitization?
Q7.  How should operator / manager !isStaff guards be replaced in the future?
Q8.  How do downgrade / Dexie cache risks enter the gate design?
```

The P5-1 design output is **only the design contract**. The contract is for the next phases to implement against.

---

## 2. Current Runtime State (as of 2026-06-19)

This section describes the runtime state that P5-1 must build on.
All findings are read-only audits of:

```text
hooks/useUserRole.ts
lib/permissions/PermissionGate.ts
lib/permissions/role-fail-closed.ts
hooks/useSync.ts
hooks/useStaffPermissions.ts
components/staff/StaffPermissionCard.tsx
components/staff/StaffMarketDetailView.tsx  (file does not exist; see §2.7)
app/markets/[id]/page.tsx
app/markets/page.tsx
app/products/page.tsx
components/markets/MarketCard.tsx
components/products/ProductCard.tsx
```

### 2.1 useUserRole — does it read role?

`useUserRole()` reads only:

```text
staff_relationships.owner_id
staff_relationships.permissions        (the whole JSON column, including can_view / can_edit)
```

It does **not** read `staff_relationships.role` and does **not** expose a role field.

```text
hooks/useUserRole.ts:137-167   selects owner_id + permissions only
hooks/useUserRole.ts:15-23     UserRole interface has no role field
hooks/useUserRole.ts:213-221   return shape: { isStaff, ownerId, ownerEmail, permissions, isLoading, roleError, isOwner, canEdit, canViewSensitiveData }
```

### 2.2 useUserRole — does it read permissions?

It reads `data[0].permissions` as a raw JSON and stores it on `UserRole.permissions`.
No field of the permissions object is consumed in the current return shape.

```text
hooks/useUserRole.ts:166         permissions: data[0].permissions
hooks/useUserRole.ts:193         (fail-closed) permissions: { can_view: false, can_edit: false }
hooks/useUserRole.ts:213-221     return shape does not surface can_view / can_edit
```

### 2.3 deriveRolePermissions — how is canEdit computed?

`deriveRolePermissions` is a pure function. Its `canEdit` is computed purely from:

```text
isResolved = !isLoading && !roleError && userRole != null
isOwner    = isResolved && !isStaff
canEdit    = isOwner
```

`permissions.can_edit` from the DB is **completely ignored** by the runtime.

```text
lib/permissions/role-fail-closed.ts:56-69
hooks/useUserRole.ts:211-221   canEdit = permissions.canEdit
```

### 2.4 deriveSafeInfoLevel — how is infoLevel computed?

```text
isLoading=true     → 0
roleError != null  → 0
userRole == null   → 0
isStaff = true     → permissions.infoLevel ?? 2
isStaff = false    → 3
```

So today, `infoLevel` is the only runtime source for "what data the user can see".
`permissions.infoLevel` is the override for staff; default for staff is 2.

```text
lib/permissions/role-fail-closed.ts:81-93
```

### 2.5 PermissionGate — what is it responsible for?

`PermissionGate` is the **single source of truth for data sanitization** (脱敏).
It is responsible for:

```text
Sanitize market / product / deal / event / stats rows by infoLevel
Block cost / revenue / interaction event types below certain infoLevels
Resolve infoLevel from UserRole (UI helper) or accept it as argument (sync helper)
Provide UI helpers: canViewSensitiveData, canPerformSensitiveAction, renderSensitiveData, maskSensitiveValue, isSensitiveField
```

`PermissionGate` is **not** a UI action-permission gate. It does not know:

```text
What a user can create
What a user can edit
What a user can delete
What button a user can see
```

```text
lib/permissions/PermissionGate.ts:1-90   header documents the responsibility split
```

### 2.6 useSync — how does it use infoLevel?

`useSync` uses `infoLevel` for **data sanitization only**:

```text
derive effectiveInfoLevel from useUserRole (default 3 = owner, backward compat)
branch pull path: infoLevel < 3 → staff view; infoLevel >= 3 → owner view
sanitize markets / products / events via PermissionGate before writing to IndexedDB
sanitize staff projections after event replay
sanitize merge result before re-applying local data
sanitize on hydration / recovery
```

`useSync` does **not** consume role / canEdit for any write gate today.

```text
hooks/useSync.ts:235-236   effectiveInfoLevel / effectiveStaffMode
hooks/useSync.ts:951-955   market gate
hooks/useSync.ts:981-995   market gate factory + view branching
hooks/useSync.ts:1548-1554 markets sanitize
hooks/useSync.ts:1611-1625 products sanitize
hooks/useSync.ts:1666-1693 projection sanitize
hooks/useSync.ts:1698-1700 events sanitize
hooks/useSync.ts:1762       infoLevel < 3 replay branch
hooks/useSync.ts:1832-1855 merge sanitize
hooks/useSync.ts:2024-2043 conflict reconciliation sanitize
hooks/useSync.ts:2080-2132 hydration sanitize
```

### 2.7 Where !isStaff is used as a functional gate today

`!isStaff` is the dominant pattern for "this is owner-only UI". A non-exhaustive inventory:

```text
app/markets/page.tsx:78          initializeDatabaseSafely({ profile: isStaff ? 'staff_scoped' : 'owner_full' })
app/markets/page.tsx:91          currentOwnerId = isStaff ? userRole.ownerId : user?.id
app/markets/page.tsx:239         {!isStaff && (   … 新增市集按鈕 …)}
app/markets/page.tsx:302         activeTab === 'all' && !searchQuery && !isStaff && (   … CTA …)

app/markets/[id]/page.tsx:271   initializeDatabaseSafely(...)
app/markets/[id]/page.tsx:914   deleteDealEvent(deal, { allowDelete: !isStaff })
app/markets/[id]/page.tsx:1105  {!isStaff && (   … 編輯按鈕 …)}
app/markets/[id]/page.tsx:1620  {!isStaff && (   … owner-only block …)}

app/products/page.tsx:38         initializeDatabaseSafely(...)
app/products/page.tsx:51         currentOwnerId = isStaff ? userRole.ownerId : user?.id
app/products/page.tsx:225        {!isStaff && (   … 新增商品按鈕 …)}
app/products/page.tsx:308        activeTab === 'all' && !searchQuery && !isStaff && (   … CTA …)

app/page.tsx:97                  currentOwnerId = isStaff ? userRole.ownerId : user?.id
app/page.tsx:477                 {!isStaff && (   … owner block …)}

app/analytics/page.tsx:84        currentOwnerId = isStaff ? userRole.ownerId : user?.id

app/settings/page.tsx:327, 440   {!isStaff && (   … owner-only …)}
app/settings/page.tsx:252        {isStaff ? (   … staff settings … ) : (   … owner settings … )}

components/markets/MarketCard.tsx:317  {variant !== 'upcoming' && !isStaff && (   … edit buttons …)}
components/markets/MarketCard.tsx:360  {!isStaff && (   … owner block …)}

components/TopNavigation.tsx:79, 151  {userRole.isStaff ? (   … staff nav … ) : (   … owner nav …)}
```

Important nuance: most `!isStaff` gates are **scope / route / owner-only UI** gates, not edit-permission gates for fields the staff can otherwise see. Examples:

* `isStaff ? 'staff_scoped' : 'owner_full'` is a Dexie init profile, not a permission.
* `currentOwnerId = isStaff ? userRole.ownerId : user?.id` is a data scoping helper, not a permission.
* `deleteDealEvent(..., { allowDelete: !isStaff })` is an actual write gate.
* `{!isStaff && (edit button)}` is an actual UI gate.

P5-1 design must distinguish these cases (see §3.4).

### 2.8 Does canEdit have a real consumer today?

`canEdit` is exported by `useUserRole`. It is computed as `isOwner` (fail-closed).
A full audit of the codebase shows:

```text
hooks/useUserRole.ts:219                  exported on return
lib/permissions/role-fail-closed.ts:65    computed but not gated through DB
docs/ROLE_ACCESS_MODEL.md:25-26, 105-129  documents the hard-coded !isStaff semantic
docs/ROLE_SECURITY_CHECKLIST.md:180       documents that can_edit is ignored
docs/C2.28B_RENDER_GUARD_2026_06_16.md    documents that canEdit is intentionally kept equal to isOwner for now
```

In runtime, `canEdit` is **not** consumed as a per-action gate. It is a synonym for `isOwner`.
Components that need owner-only behavior either use `!isStaff` or `useUserRole().isOwner`.

> The design question for P5-1: do we want a runtime that uses `canEdit` semantically, or do we replace it with named capabilities?
> Answer: see §4 and §11.

### 2.9 What is the StaffMarketDetailView file referenced in the task?

Audit result: `components/staff/StaffMarketDetailView.tsx` does **not** exist in the current repo.
It is referenced in the task description but has no on-disk content. P5-1 will not create it.

```text
glob: components/staff/StaffMarketDetailView.tsx
→ no match
```

### 2.10 Summary of current state

```text
✓ role is NOT read by useUserRole
✓ permissions.can_edit is NOT a runtime source
✓ operator / manager only differ in infoLevel today; no operation difference
✓ infoLevel is the single runtime source for data visibility
✓ PermissionGate is the single source of truth for data sanitization
✓ !isStaff is the dominant pattern for "owner-only UI"
✓ canEdit has no real consumer (it is isOwner under the hood)
```

---

## 3. Design Principle

P5-1 commits to a small number of design principles. All future P5 phases must respect them.

### 3.1 Separation of visibility and action

```text
infoLevel  → "what data can be seen" (data visibility)
role + capabilities → "what operations can be performed" (action permission)
```

These are independent axes. The same user with the same `infoLevel` can have different
`role` values; the same `role` can be applied at different `infoLevel` per resource.

### 3.2 PermissionGate stays focused on data sanitization

`PermissionGate` is a **data-visibility gate**, not an action-permission gate.

```text
PermissionGate.sanitize / sanitizeEvent / shouldBlockEvent / sanitizeMarketProjection
  → input-driven by infoLevel
  → output: cleaned data ready for IndexedDB

PermissionGate.canViewSensitiveData / canPerformSensitiveAction / renderSensitiveData
  → input-driven by UserRole
  → output: a boolean for JSX
```

`PermissionGate` should NOT grow new methods like:

```text
❌ PermissionGate.canRecordInteraction(userRole)
❌ PermissionGate.canEditMarketBasic(userRole)
❌ PermissionGate.shouldShowEditButton(userRole, resource)
```

These are operation permissions. They belong to a separate layer.

### 3.3 No global canEdit

`canEdit` today is a synonym for `isOwner`. This is fine for the current state
(operator / manager have no write capabilities), but it is the wrong shape for
P5+ when operator / manager get specific write capabilities.

The P5-1 design commits:

```text
canEdit (current global)  →  kept as a coarse owner-only signal (do not expand)
named capabilities (new)  →  introduced for every concrete operation
```

`canEdit` is **not deleted** in P5-1, and it is **not** widened to `true` for
operator / manager. It is intentionally kept as the "owner-only" signal so that
existing owner-only code paths keep working.

See §4.4 for the precise decision.

### 3.4 !isStaff is not a permission

`!isStaff` is a coarse identity check. It is acceptable for:

```text
* navigation differences (TopNavigation)
* "owner-only" copy / branding
* "show the staff-mode notice"
* route-scope (staff cannot reach /settings/staff-management)
```

It is **not** a precision tool for action permissions. Once P5 opens operator /
manager write capabilities, `!isStaff` must be replaced by named capabilities
on a per-action basis.

P5-1 commits:

```text
P5-2..P5-6 do NOT remove existing !isStaff guards.
P5-6+ replaces !isStaff only at the action level, not at the route level.
P5-7 retires !isStaff at the action level for the operations P5 actually opened.
```

### 3.5 Role is the single source of truth for operation permission

For every operation P5 wants to open, there must be a named capability.
A role is mapped to capabilities via a static matrix. The mapping is pure and
unit-testable.

```text
role + resource context  →  capability name  →  boolean
```

The mapping must live in one place and be the **only** place that answers
"can this role do X". UI does not compute capabilities. UI only consumes them.

### 3.6 Fail-closed is mandatory

Any new operation permission must inherit the same fail-closed semantics as
`deriveRolePermissions`:

```text
loading   → false
error     → false
no role   → false
```

This applies to role-capability helpers, not just to PermissionGate.

### 3.7 Local-First compatibility

The role-aware runtime must not break Local-First:

```text
* Dexie remains the UI's only data source
* No new blocking network call for permission resolution
* Role resolution is still done by useUserRole with localStorage cache + 5min TTL
* Capability check is a pure function over the cached role
```

---

## 4. Recommended Runtime Shape (Design Only — Do NOT Implement)

This section describes the runtime shape. It is a **design contract** for P5-2 onwards.

### 4.1 Type: StaffRole

```ts
// Design only — do not implement in P5-1
type StaffRole = 'viewer' | 'operator' | 'manager';
```

Notes:

* `owner` is intentionally **not** in this enum.
* `owner` is a **separate identity** — the auth user who matches `staff_relationships.owner_id`.
* The role enum value `staff_relationships.role` is only for staff members.
* For UI purposes, "the user is the owner" is computed separately from "the user is a staff with role X".

### 4.2 Type: RoleCapabilities

```ts
// Design only — do not implement in P5-1
type RoleCapabilities = {
  // operator-tier write capabilities
  canRecordInteraction: boolean;
  canRecordDeal: boolean;
  canCreateFieldNote: boolean;

  // manager-tier write capabilities
  canEditMarketBasic: boolean;
  canEditProductBasic: boolean;
  canManageChecklist: boolean;

  // personal record scope (own / same-day only)
  canEditOwnSameDayRecord: boolean;
  canDeleteOwnSameDayRecord: boolean;

  // owner-only capabilities (always true for owner, always false for staff in P5+)
  canManageStaff: boolean;
  canChangeStaffRole: boolean;
  canViewOwnerFinance: boolean;
  canUseRepairTools: boolean;
  canImportExport: boolean;
  canDeleteMarket: boolean;
  canDeleteProduct: boolean;
};
```

### 4.3 Recommended capability matrix

This is the **target matrix** for when P5 is complete. Today only owner is fully open.

| Capability | viewer | operator | manager | owner | Phase |
|---|---|---|---|---|---|
| `canRecordInteraction` | ❌ | ✅ | ✅ | ✅ | P5-5 (operator first) |
| `canRecordDeal` | ❌ | future / gated | ✅ | ✅ | P5-5 (gated) |
| `canCreateFieldNote` | ❌ | future / gated | ✅ | ✅ | P5-5 (gated) |
| `canEditMarketBasic` | ❌ | ❌ | ✅ | ✅ | P5-6 |
| `canEditProductBasic` | ❌ | ❌ | ✅ | ✅ | P5-6 |
| `canManageChecklist` | ❌ | ❌ | ✅ | ✅ | P5-6 |
| `canEditOwnSameDayRecord` | ❌ | future / gated | future / gated | ✅ | P5-7 |
| `canDeleteOwnSameDayRecord` | ❌ | future / gated | future / gated | ✅ | P5-7 |
| `canManageStaff` | ❌ | ❌ | ❌ | ✅ | never (owner-only) |
| `canChangeStaffRole` | ❌ | ❌ | ❌ | ✅ | never (owner-only) |
| `canViewOwnerFinance` | ❌ | ❌ | ❌ | ✅ | never (owner-only) |
| `canUseRepairTools` | ❌ | ❌ | ❌ | ✅ | never (owner-only) |
| `canImportExport` | ❌ | ❌ | ❌ | ✅ | never (owner-only) |
| `canDeleteMarket` | ❌ | ❌ | ❌ | ✅ | never (owner-only) |
| `canDeleteProduct` | ❌ | ❌ | ❌ | ✅ | never (owner-only) |

Phase columns:

```text
P5-5       = operator's first write path (interaction)
P5-6       = manager's first write path (market / product basic)
P5-7       = own-same-day record edit / delete
never      = owner-only; staff never gets this in any P5 phase
future     = NOT planned for the current P5 plan; do not implement
gated      = design keeps the capability, but P5-5 ships it disabled until B1 is solved
```

### 4.4 Decision: canEdit / canViewSensitiveData

The current shape:

```ts
canEdit              = isOwner (synonym)
canViewSensitiveData = isOwner (synonym)
```

P5-1 design decision:

```text
✅ Keep canEdit and canViewSensitiveData.
   - They are the coarse owner-only signal.
   - They continue to be a synonym for isOwner.
   - They are NOT widened to true for operator / manager.

✅ Do NOT rename canEdit to canEditOwnerData.
   - Renaming would force a code-touch-everywhere refactor.
   - The semantic is "owner-only coarse signal" — keep the name.
   - If a future reader needs the finer-grained version, they should
     call the role-capability helper.

✅ Do NOT use canEdit as the source of truth for any new permission.
   - All new permissions must use a named capability from §4.2.
   - If a UI component currently uses canEdit for owner-only behavior,
     it can keep using it. If it needs operator / manager support,
     it must switch to a named capability.
```

The P5-1 design intentionally keeps `canEdit` as a coarse synonym so that:

* existing owner-only behavior does not change
* new code has a clearly better option (named capabilities)
* the change surface for P5-2 is small

### 4.5 Recommended naming and file layout

```text
lib/permissions/role-capabilities.ts     (new) — RoleCapabilities + matrix + helper
lib/permissions/capability-fail-closed.ts (new) — fail-closed wrapper for the matrix

lib/permissions/PermissionGate.ts        (unchanged) — data sanitization only
lib/permissions/role-fail-closed.ts      (unchanged) — coarse owner-only signal

hooks/useUserRole.ts                     (P5-2 minimal change) — read role + return role field
```

`role-capabilities.ts` exports:

```ts
// Design only — do not implement in P5-1
type StaffRole = 'viewer' | 'operator' | 'manager';
type RoleCapabilities = { ... };  // see §4.2

// Pure function: role + (optionally) context → capabilities
export function deriveRoleCapabilities(input: {
  isOwner: boolean;
  role: StaffRole | null;     // null when not a staff, or unknown / loading
  isLoading: boolean;
  roleError: Error | null;
}): RoleCapabilities;

// Pure function: capabilities + capability name → boolean
export function hasCapability(
  caps: RoleCapabilities,
  name: keyof RoleCapabilities
): boolean;
```

`capability-fail-closed.ts` exists to keep the same fail-closed contract as
`role-fail-closed.ts`. It is a small wrapper that fails-closed on
`isLoading / roleError / unknown role`.

### 4.6 UI consumption pattern (design)

```ts
// Design only — do not implement in P5-1
function MarketsPage() {
  const { isStaff, isOwner, isLoading, roleError } = useUserRole();
  const { userRole } = useUserRole();
  const caps = deriveRoleCapabilities({
    isOwner,
    role: userRole?.role ?? null,
    isLoading,
    roleError,
  });

  return (
    <>
      {/* route-scope / branding — keep !isStaff */}
      <TopNavigation isStaff={isStaff} />

      {/* action-scope — use capability */}
      {hasCapability(caps, 'canEditMarketBasic') && (
        <EditMarketButton />
      )}
    </>
  );
}
```

This is the target pattern. P5-1 does not require it to be implemented in this phase.

---

## 5. Role Capability Matrix (Sealed Reference)

The capability matrix in §4.3 is the **target** matrix. This section pins the
matrix as a design contract. Any change requires a new audit and a sealed
version bump.

### 5.1 viewer

```text
viewer:
  canRecordInteraction: false
  canRecordDeal: false
  canCreateFieldNote: false
  canEditMarketBasic: false
  canEditProductBasic: false
  canManageChecklist: false
  canEditOwnSameDayRecord: false
  canDeleteOwnSameDayRecord: false
  canManageStaff: false
  canChangeStaffRole: false
  canViewOwnerFinance: false
  canUseRepairTools: false
  canImportExport: false
  canDeleteMarket: false
  canDeleteProduct: false
```

### 5.2 operator

```text
operator:
  canRecordInteraction: true          (P5-5 first)
  canRecordDeal: future / gated       (NOT in P5-5; future phase)
  canCreateFieldNote: future / gated  (NOT in P5-5; future phase)
  canEditMarketBasic: false
  canEditProductBasic: false
  canManageChecklist: false
  canEditOwnSameDayRecord: future / gated
  canDeleteOwnSameDayRecord: future / gated
  canManageStaff: false
  canChangeStaffRole: false
  canViewOwnerFinance: false
  canUseRepairTools: false
  canImportExport: false
  canDeleteMarket: false
  canDeleteProduct: false
```

### 5.3 manager

```text
manager:
  canRecordInteraction: true          (P5-5 alongside operator)
  canRecordDeal: true                 (P5-5; gated until B1 is solved)
  canCreateFieldNote: true            (P5-5; gated until B1 is solved)
  canEditMarketBasic: true            (P5-6)
  canEditProductBasic: true           (P5-6)
  canManageChecklist: true            (P5-6)
  canEditOwnSameDayRecord: future / gated
  canDeleteOwnSameDayRecord: future / gated
  canManageStaff: false
  canChangeStaffRole: false
  canViewOwnerFinance: false
  canUseRepairTools: false
  canImportExport: false
  canDeleteMarket: false
  canDeleteProduct: false
```

### 5.4 owner

```text
owner:
  canRecordInteraction: true
  canRecordDeal: true
  canCreateFieldNote: true
  canEditMarketBasic: true
  canEditProductBasic: true
  canManageChecklist: true
  canEditOwnSameDayRecord: true
  canDeleteOwnSameDayRecord: true
  canManageStaff: true
  canChangeStaffRole: true
  canViewOwnerFinance: true
  canUseRepairTools: true
  canImportExport: true
  canDeleteMarket: true
  canDeleteProduct: true
```

### 5.5 Phase legend

```text
P5-5        implemented in P5-5; UI / sync gates active
P5-6        implemented in P5-6; UI / sync gates active
P5-7        implemented in P5-7; UI / sync gates active
never       owner-only; staff never gets this; do not implement
future      not planned in current P5 plan; capability kept in type for symmetry
gated       capability exists; runtime value is false until B1 is solved
```

---

## 6. Role / infoLevel Responsibility Boundary

### 6.1 Current responsibility split

```text
useUserRole.permissions.infoLevel  →  effective infoLevel for staff
useUserRole.isStaff                →  coarse identity
PermissionGate                    →  data sanitization by infoLevel
```

### 6.2 Target responsibility split

```text
useUserRole.role         →  staff_relationships.role (viewer / operator / manager)
useUserRole.isOwner      →  coarse identity (user is the owner of this staff relationship)
useUserRole.infoLevel    →  unchanged: permissions.infoLevel ?? 2

PermissionGate           →  data sanitization by infoLevel (unchanged boundary)
role-capabilities        →  operation permission by role
```

### 6.3 Should runtime derive infoLevel from role?

**Short-term: no.**
`permissions.infoLevel` is the **transition source of truth** for data visibility.
It has DB alignment (migration 046) and is the value currently used by `useSync`
and `PermissionGate`. Re-deriving it from role would couple visibility to action
and would break the existing `infoLevel` contract.

```text
Short term:
  infoLevel comes from permissions.infoLevel ?? 2  (unchanged)
  role comes from staff_relationships.role         (new in P5-2)
  data visibility = infoLevel                       (unchanged)
  action permission = role + capabilities          (new in P5-2 / P5-3)
```

### 6.4 What if role and infoLevel disagree?

Today this is a 046-repaired case. In the sealed design, the failure mode is:

```text
If role = operator / manager but infoLevel < role expected level:
  → fail closed to the LOWER of the two
  → log a warning to the operator / owner (out of scope of P5-1)
  → do NOT silently upgrade infoLevel

If role = viewer but infoLevel > 0:
  → fail closed to the LOWER of the two (typically infoLevel 0 wins)
  → do NOT silently downgrade infoLevel below the explicit permissions value
```

P5-1 does not require a runtime consistency check. The sealed design
**documents** the rule but defers implementation to P5-4.

```text
Short term:  no consistency check
Mid term:    P5-4 adds a consistency check in deriveRoleCapabilities
Long term:   role becomes the only source of truth; permissions JSON is deprecated
```

### 6.5 Phase alignment

```text
Short term (P5-1 / P5-2):
  permissions.infoLevel  =  transition source of truth (data visibility)
  staff_relationships.role  =  operation source of truth (action permission)

Mid term (P5-4):
  role and infoLevel are cross-checked; mismatches fail closed to the lower value
  log a warning so the owner can re-run role change

Long term (post P5-7):
  role is the only source of truth
  permissions JSON is deprecated and can be dropped
```

---

## 7. PermissionGate Boundary

### 7.1 P5-1 decision

```text
✅ PermissionGate stays focused on data sanitization.
   It does NOT grow new methods like canRecordInteraction or canEditMarketBasic.

✅ A separate role-capabilities layer is introduced.
   File: lib/permissions/role-capabilities.ts (P5-3)
   File: lib/permissions/capability-fail-closed.ts (P5-3)

✅ UI consumes named capabilities from the role-capabilities layer.
   Pattern: const caps = deriveRoleCapabilities(...); hasCapability(caps, 'canEditMarketBasic')
```

### 7.2 Why a separate layer, not a method on PermissionGate

* `PermissionGate` is **stateless** in the sense that it does not know about user identity. It only knows `infoLevel` (or, for UI helpers, `UserRole`).
* Adding operation permissions to `PermissionGate` would conflate "data the user can see" with "actions the user can perform".
* The existing C2.30C / C2.30D hardening plan committed PermissionGate to a single purpose. P5-1 honors that commitment.
* Fail-closed rules differ between visibility (infoLevel 0 on error) and action (capability false on error). Keeping them in separate files makes the contract clearer.

### 7.3 Recommended responsibility split

```text
PermissionGate                  = data visibility / sanitization
role-capabilities                = operation permission
useUserRole                      = identity + role + coarse isOwner / canEdit
UI                              = consume named capabilities, never compute them
sync / Dexie (existing)          = infoLevel-driven sanitization (unchanged)
```

### 7.4 What PermissionGate is allowed to add (and what it is not)

Allowed in P5+:

```text
✓ Document its current scope more clearly
✓ Add helper exports for new entities (if a new entity is introduced)
✓ Add unit tests for edge cases
```

Not allowed in P5+:

```text
✗ New methods that answer "can the user do action X" (use role-capabilities)
✗ Read role from staff_relationships (it has no role semantics today)
✗ Use permissions.can_edit as a runtime source
```

---

## 8. Migration Path (Forward Plan)

This section is the **forward** migration plan. Each phase is described with:

```text
Risk
Can be automated
Requires manual gate
Files touched
```

### 8.1 P5-2: useUserRole reads role, no UI change

```text
Risk:          Low
Automatable:   Yes (test-coverage exists)
Manual gate:   Yes — must run P4 production observation period
Files touched:
  hooks/useUserRole.ts          (add role field to UserRole, do not change existing return)
  types/staff.ts                (extend UserRole type)
  docs/                         (re-audit role docs)
Notes:
  - Add `userRole.role: StaffRole | null` (read-only, no behavior change)
  - Existing isStaff / isOwner / canEdit / canViewSensitiveData stay the same
  - No component is allowed to consume role yet
```

### 8.2 P5-3: role-capabilities helper, no UI wiring

```text
Risk:          Low
Automatable:   Yes (pure functions, unit-testable)
Manual gate:   Yes — P5-2 sealed
Files touched:
  lib/permissions/role-capabilities.ts          (new)
  lib/permissions/capability-fail-closed.ts     (new)
  tests/role-capabilities.test.ts               (new)
  docs/                                          (P5-1 follow-up)
Notes:
  - Pure functions, no side effects
  - No component is allowed to import the helper yet
```

### 8.3 P5-4: Sync / Dexie downgrade safety design

```text
Risk:          High (touches local cache invariants)
Automatable:   No — design only
Manual gate:   Yes — P5-3 sealed
Files touched:
  docs/p5-4-sync-dexie-downgrade-safety.md      (new, design only)
  hooks/useSync.ts                              (P5-5+, after P5-4 design is sealed)
Notes:
  - Resolve B1 blocker (downgrade / Dexie cache)
  - P5-5 must NOT start until P5-4 is sealed
```

### 8.4 P5-5a: operator interaction — RLS / event audit

```text
Risk:          Medium
Automatable:   No
Manual gate:   Yes — P5-4 sealed + B1 resolved
Files touched:
  supabase/migrations/046_..._p5_5_...sql      (new; per P5-4 design)
  lib/permissions/role-capabilities.ts         (canRecordInteraction = true for operator)
  docs/                                          (re-audit role docs)
Notes:
  - RLS policy on staff insert for interaction events
  - Event-level audit log for staff-originated writes
  - No UI change yet
```

### 8.5 P5-5b: operator interaction — UI minimal

```text
Risk:          Medium
Automatable:   No
Manual gate:   Yes — P5-5a in production
Files touched:
  components/markets/MarketCard.tsx            (capability-gated add interaction button)
  components/...                                (whatever hosts the interaction form)
  docs/                                          (re-audit role docs)
Notes:
  - First UI capability wire-up; reference implementation for P5-5b
  - Use named capability, not canEdit
```

### 8.6 P5-6a: manager market basic edit — RLS / audit

```text
Risk:          High (touches market editable fields, can affect cost / margin)
Automatable:   No
Manual gate:   Yes — P5-5b in production
Files touched:
  supabase/migrations/047_..._p5_6_...sql
  lib/permissions/role-capabilities.ts         (canEditMarketBasic / canEditProductBasic)
  docs/
Notes:
  - Even when canEditMarketBasic = true, market cost / margin / boothCost / etc.
    are still owner-only (PermissionGate must continue to gate these)
  - Edit API must reject any attempt to write sensitive fields
```

### 8.7 P5-6b: manager market basic edit — UI

```text
Risk:          Medium
Automatable:   No
Manual gate:   Yes — P5-6a in production
Files touched:
  app/markets/[id]/page.tsx                    (replace !isStaff edit guard with canEditMarketBasic)
  components/markets/MarketCard.tsx            (same)
  docs/
Notes:
  - Use named capability
  - Keep !isStaff only for route / branding
```

### 8.8 P5-7: StaffPermissionCard role-aware

```text
Risk:          Low
Automatable:   No
Manual gate:   Yes — P5-6b in production
Files touched:
  components/staff/StaffPermissionCard.tsx     (show role + capability labels)
  docs/
Notes:
  - Show "you are: operator / manager / viewer" and what you can do
  - This is the first UI surface that explains the role system to staff
```

### 8.9 Hard rule

```text
P5-2 must NOT be merged until the production P4 role change feature
has been observed for ≥ 7 days without abnormal P0/P1 incidents AND
at least 1 owner has used the role change flow against a real staff.
```

This rule is sealed in `docs/staff-role-permissions.md` §9 and is repeated here
as the **hard entry gate** for P5-2.

---

## 9. B1: Downgrade / Dexie Safety Boundary

P5-0 surfaced B1 as a blocker. This section pins the design boundary so that
P5-4 can answer the operational questions without re-litigating the policy.

### 9.1 The blocker

> Before solving the residual cache that a downgrade (operator → viewer)
> leaves in IndexedDB, we should NOT open large amounts of role-aware writes
> or sensitive data scope changes.

### 9.2 P5-1 design statement

```text
In P5-5 (operator interaction write), the staff's infoLevel is L2
and is identical to viewer-allowed scope for the data they touch.
Therefore, an operator → viewer downgrade does not expand sensitive
data visibility.

In P5-6 (manager market / product basic edit), the manager is writing
data they already can read at L2. A manager → viewer downgrade does not
expand read scope. But a viewer → manager UPGRADE is the inverse risk:
the new manager can suddenly see markets that the prior viewer could
not (because L2 view of sensitive fields is already complete, but
manager scope of editable fields grows).

P5-1 commits:
  - Downgrade (operator / manager → viewer) is the FIRST class B1 risk.
  - Upgrade (viewer → operator / manager) is the SECOND class B1 risk.
  - Both must be designed before P5-5.
```

### 9.3 Open questions for P5-4

P5-4 must answer:

```text
Q1.  When operator / manager downgrades to viewer, how is the local L2
     market / product cache handled?
     -  Option A: clear all staff projections on downgrade
     -  Option B: re-sanitize projections on downgrade (re-apply L0)
     -  Option C: lock UI until next successful sync
     -  Decision: not made in P5-1; P5-4 must recommend one.

Q2.  When staff is offline and the cache says role = manager, but the
     server has already demoted the staff to viewer, what happens?
     -  Option A: rely on role cache 5 min TTL + next online check
     -  Option B: add an explicit invalidateRoleCache() call on the
                  next /api/auth/sync round-trip
     -  Option C: lock write actions while offline for staff
     -  Decision: not made in P5-1; P5-4 must recommend one.

Q3.  Is the 5-minute role cache TTL appropriate for the new role
     semantics?  Or do we need a faster invalidation path for
     staff role changes?
     -  Option A: keep 5 min TTL
     -  Option B: shorten to 60s for staff
     -  Option C: introduce invalidateRoleCache on every role change
                  RPC
     -  Decision: not made in P5-1; P5-4 must recommend one.

Q4.  Should we expose invalidateRoleCache() to server-driven events
     (Supabase Realtime)?  Or only to local user actions?
     -  Option A: server-driven via Realtime
     -  Option B: local-only (current pattern)
     -  Option C: hybrid
     -  Decision: not made in P5-1; P5-4 must recommend one.

Q5.  When invalidateRoleCache() is called, do we also need to clear
     Dexie staff projections?  Or only invalidate and let next sync
     re-pull?
     -  Option A: clear Dexie staff projections
     -  Option B: only invalidate role cache, let sync re-pull
     -  Option C: hybrid
     -  Decision: not made in P5-1; P5-4 must recommend one.
```

P5-1 explicitly defers these decisions to P5-4.

### 9.4 What P5-1 is allowed to assume

```text
For P5-2 / P5-3 design work:
  - The 5-minute role cache TTL is acceptable.
  - P5-2 only ADDS a role field; it does NOT change the TTL.
  - P5-3 is pure functions; it does NOT touch the cache.

For P5-5 implementation:
  - P5-4 must be sealed first.
  - The downgrade path must be answered before staff can write.
```

---

## 10. Risk Assessment

Each risk has an ID, a description, and a mitigation.

### R1. canEdit expanded into a coarse operator / manager gate

```text
Description:
  A future refactor may decide "canEdit = true for operator" and use
  the existing canEdit everywhere, inadvertently opening
  `canEdit = true` for cost / margin / staff-management buttons that
  are not part of P5 scope.

Severity:  High
Likelihood: Medium

Mitigation:
  - This document pins canEdit = isOwner for the entire P5 series.
  - Code review checklist item: any change to canEdit must be
    rejected unless the PR explicitly states it widens the
    capability.
  - Role docs re-audit on every PR that touches canEdit.
```

### R2. !isStaff guard replaced too fast

```text
Description:
  A P5-5 or P5-6 PR may replace `!isStaff && <EditButton>` with
  `hasCapability(caps, 'canEditMarketBasic')` for the WRONG action.
  This would let a viewer or operator click a button they should not
  see, with a downstream RLS error or, worse, a silent no-op.

Severity:  High
Likelihood: Medium

Mitigation:
  - Replacement is per-action and per-component; not bulk refactor.
  - Each !isStaff replacement must cite a capability name in the PR
    description and reference P5-1 §4.2.
  - For each replacement, the new component must be exercised in
    QA by all four roles.
```

### R3. role / infoLevel inconsistency

```text
Description:
  An owner changes role to operator. The DB updates role and
  permissions.can_edit, but permissions.infoLevel is not updated
  (or the staff is offline and the cache lags). The runtime sees
  role = operator and infoLevel = 3 (owner). The UI shows L2 read
  scope but capability checks (if any) treat the user as L2.

Severity:  Medium
Likelihood: Medium (low today, higher after P5-2)

Mitigation:
  - P5-1 commits: P5-4 must add a consistency check
    (role + infoLevel must agree, fail closed to the lower value).
  - Until P5-4, capability checks must not assume role-derives-infoLevel.
  - Role docs explicitly note: "permissions.infoLevel is the
    transition source of truth, NOT role".
```

### R4. Dexie downgrade cache residue

```text
Description:
  An operator's IndexedDB has L2 market / product projections.
  Owner demotes operator → viewer. Offline. Staff continues to see
  L2 data until next sync.

Severity:  High
Likelihood: Medium (only after P5-5 ships operator writes)

Mitigation:
  - P5-1 commits: P5-4 must answer B1.
  - Until B1 is solved, P5-5 only opens writes (not new read scope).
  - After B1 is solved, the resolved behavior (clear / re-sanitize /
    lock) must be re-audited.
```

### R5. RLS not opened for staff INSERT but UI is open

```text
Description:
  P5-5 opens the "add interaction" button for operator. RLS still
  rejects the insert (because P5-5a was not applied). Staff clicks
  the button, gets an opaque error, and the event is silently lost.

Severity:  Medium
Likelihood: High if P5-5b ships before P5-5a

Mitigation:
  - P5-5a (RLS / audit) MUST ship before P5-5b (UI).
  - P5-1 explicitly orders P5-5a before P5-5b.
  - Code review must reject any P5-5b PR that does not cite
    P5-5a as merged.
```

### R6. RLS over-opened for staff INSERT

```text
Description:
  P5-5a opens a too-broad RLS policy that lets staff insert any
  event, not just interaction events. Staff accidentally (or
  maliciously) inserts a cost_added event.

Severity:  High
Likelihood: Medium

Mitigation:
  - RLS policy is per-event-type, not per-table.
  - Migration must include a test that proves cost_added cannot be
    inserted by staff.
  - Migration must include a test that proves market_updated
    cannot be inserted by staff with cost fields.
```

### R7. StaffPermissionCard text inconsistent with actual capabilities

```text
Description:
  StaffPermissionCard says "operator: can record interaction".
  Reality: P5-5 is not shipped yet, but the card was already
  updated, misleading staff.

Severity:  Medium
Likelihood: Low (P5-7 is the explicit phase for this)

Mitigation:
  - StaffPermissionCard is owned by P5-7, not P5-5.
  - Card text is generated from the capability matrix, not hard-coded.
  - The capability matrix in §5 is the single source of truth.
```

---

## 11. Recommendation

P5-1 recommends:

```text
✅ R1. P5-2 should ONLY read role; no UI change in P5-2.
       - useUserRole adds a `userRole.role: StaffRole | null` field.
       - No component is allowed to consume it in P5-2.
       - This is the minimum-risk way to make role available.

✅ R2. canEdit should stay owner-only.
       - canEdit = isOwner, unchanged.
       - canEdit is NOT widened to operator / manager.
       - canEdit is the coarse owner-only signal.

✅ R3. New named capabilities should be introduced (see §4.2).
       - One capability per concrete action.
       - Pure functions in lib/permissions/role-capabilities.ts.
       - UI consumes capabilities, never computes them.

✅ R4. PermissionGate should stay focused on data sanitization.
       - No new methods like canRecordInteraction on PermissionGate.
       - Operation permissions live in role-capabilities.

✅ R5. Operator interaction MUST be gated by B1 design completion.
       - P5-4 must answer downgrade / Dexie cache before P5-5a.
       - If P5-4 surfaces a blocker, P5-5a is delayed, NOT skipped.

✅ R6. The capability matrix in §5 is the single source of truth
       for operation permission.
       - It is sealed at P5-1.
       - Any change requires a new audit and a version bump.
       - The matrix is rendered in code (P5-3), not just in docs.

✅ R7. The migration path in §8 is the only sanctioned path.
       - No P5-5 implementation before P5-4 design is sealed.
       - No P5-5b before P5-5a.
       - No P5-6 before P5-5b in production.
       - No P5-7 before P5-6b in production.
```

### 11.1 The single most important rule

```text
Until P5-4 (B1) is sealed, NO staff write path is opened.
Until the role docs (matrix + permissions) are re-audited for the
P5 phase being shipped, that P5 phase is NOT done.
Until the production P4 role change has been observed for ≥ 7 days
with no P0/P1 incidents and at least 1 owner has used the flow
against a real staff, P5-2 is NOT done.
```

This is the P5-1 seal.

---

## 12. Cross-References

* `docs/staff-role-matrix.md` — Role × infoLevel matrix (sealed v1.0)
* `docs/staff-role-permissions.md` — Per-role business positioning (sealed v1.0)
* `docs/PROJECT_CONTEXT.md` — Local-First architecture
* `docs/C2.28_REANALYSIS_2026_06_15.md` — fail-closed history
* `docs/C2.30C_*` — PermissionGate hardening
* `docs/OWNER_STAFF_REVENUE_HARDENING_PLAN.md` — Owner / staff revenue hardening
* `docs/ROLE_ACCESS_MODEL.md` — current access model
* `docs/ROLE_SECURITY_CHECKLIST.md` — security checklist

---

## 13. Change Log

```text
v0.1  2026-06-19  P5-1 design draft, sealed
                - 13 sections
                - Capability matrix as design contract
                - Hard rule: no P5-2 until P4 production observation
                - B1 questions deferred to P5-4
```
