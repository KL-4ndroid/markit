# Supabase SRA-D Leaked-password Protection Rollout

Date: 2026-09-01

Status: Production setting confirmed disabled; preparation complete; provider mutation
not authorized

## Current state

The same Production target still reports `Leaked Password Protection Disabled` in
Security Advisor. Authentication → Attack Protection shows “Prevent use of leaked
passwords” unchecked. No setting was changed.

The Production project has no active Supabase branch. The other visible paused project
has not been proven schema-, Auth-provider-, URL-, email-template- or invitation-equivalent
and must not be silently treated as staging.

## Recommended rollout

1. Provision or explicitly designate a non-Production Auth environment.
2. Record its masked target, provider settings, redirect URLs, email templates and test
   account owner; do not copy Production user rows.
3. Enable “Prevent use of leaked passwords” there.
4. Test:
   - new sign-up with a known weak/leaked password is rejected;
   - strong password sign-up succeeds;
   - existing strong-password sign-in and session refresh remain valid;
   - reset and password change reject weak/leaked passwords and accept strong ones;
   - invitation sign-up/acceptance and normal login continue to work;
   - user-facing copy is actionable and does not expose provider internals;
   - offline/cache recovery and sign-out guards remain unchanged.
5. Disable again only if the non-Production regression matrix fails; retain sanitized
   result counts, not passwords or account identities.
6. Request a separate Production change with operator, reviewer, bounded window and an
   explicit instruction to click the checkbox and Save changes.
7. Repeat sign-up/sign-in/reset/change/invitation smoke with disposable Production test
   accounts only if their creation is separately approved.
8. Rerun Security Advisor and accept only when this warning disappears without a new
   Auth warning.

## What AI can do

AI can navigate to Attack Protection, verify the current state, click the control, save,
run browser smoke, rerun Advisor and update checklist evidence. It may do so only after
the selected environment and configuration write are explicitly approved. Passwords,
reset links and user identities must never enter Git evidence.

## Rollback

Rollback is only the same provider toggle off, followed by the same Auth regression
matrix and incident note. There is no SQL migration, user-table repair, session deletion
or password export in SRA-D.

## Approval boundary

This runbook does not authorize enabling the setting on Production or the unrelated
paused project. The next safe decision is either non-Production environment designation
or a separately reasoned Production-only exception.
