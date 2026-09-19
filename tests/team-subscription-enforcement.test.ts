import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveModelAccountCapabilities } from '../lib/subscription/subscription-capabilities';

const root = process.cwd();
const migration = readFileSync(
  join(root, 'supabase/migrations/064_enforce_team_subscription.sql'),
  'utf8',
);
const invitationVerificationHotfix = readFileSync(
  join(root, 'supabase/migrations/065_fix_team_invitation_verification_return_type.sql'),
  'utf8',
);
const teamPage = readFileSync(join(root, 'app/settings/team/page.tsx'), 'utf8');
const staffManagement = readFileSync(
  join(root, 'components/settings/StaffManagement.tsx'),
  'utf8',
);
const staffDialog = readFileSync(
  join(root, 'components/staff/StaffInvitationDialog.tsx'),
  'utf8',
);
const staffService = readFileSync(join(root, 'lib/supabase/staff.ts'), 'utf8');
const invitationService = readFileSync(
  join(root, 'lib/supabase/staff-invitations.ts'),
  'utf8',
);
const liveSmoke = readFileSync(
  join(root, 'scripts/smoke-team-subscription-enforcement.mjs'),
  'utf8',
);
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');

function capabilities(planCode: 'free' | 'pro' | 'team') {
  return resolveModelAccountCapabilities({
    ownerId: 'owner-1',
    planCode,
    planSource: planCode === 'free' ? 'free' : 'admin',
    billingStatus: 'none',
    entitlementStatus: 'active',
    capabilityEvaluatedAt: '2026-07-29T10:00:00.000Z',
    capabilityRefreshAfter: '2026-07-29T10:05:00.000Z',
    entitlementEndsAt: null,
  });
}

assert.equal(capabilities('free').features.staffCollaboration, false);
assert.equal(capabilities('pro').features.staffCollaboration, false);
assert.equal(capabilities('team').features.staffCollaboration, true);
assert.equal(capabilities('pro').features.managerWorkflow, false);
assert.equal(capabilities('team').features.managerWorkflow, true);

assert.match(migration, /status IN \('pending', 'active', 'suspended_by_plan', 'revoked'\)/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.has_authoritative_team_entitlement/);
assert.match(migration, /sa\.plan_code = 'team'/);
assert.match(migration, /sa\.plan_source = 'admin'/);
assert.match(migration, /sa\.entitlement_status IN \('active', 'grace'\)/);
assert.match(migration, /CREATE TRIGGER sync_team_plan_staff_suspension/);
assert.match(migration, /SET status = 'suspended_by_plan'/);
assert.match(migration, /DELETE FROM public\.market_members AS mm/);
assert.match(migration, /NOT public\.has_authoritative_team_entitlement\(sr\.owner_id\)/);

assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.staff_relationships/);
assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.staff_invitations/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.invite_staff_member/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_staff_invitation/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.update_staff_role/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.restore_staff_relationship/);
assert.match(migration, /status = 'suspended_by_plan'/);
assert.match(migration, /upgrade never auto-restores staff access/);
assert.match(migration, /Simulation, billing, and promotion never authorize database writes/);
assert.match(invitationVerificationHotfix, /CREATE OR REPLACE FUNCTION public\.verify_invitation_token/);
assert.match(invitationVerificationHotfix, /u\.email::text/);
assert.match(invitationVerificationHotfix, /GRANT EXECUTE ON FUNCTION public\.verify_invitation_token\(text\) TO anon, authenticated/);

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.current_user_market_ids/);
assert.match(migration, /public\.has_authoritative_team_entitlement\(m\.owner_id\)/);
assert.match(migration, /CREATE POLICY "Staff can view their relationships"/);
assert.match(migration, /public\.can_current_staff_read_relationship\(owner_id, status\)/);

for (const functionName of [
  'invite_staff_member',
  'create_staff_invitation',
  'accept_staff_email_invitation',
  'accept_invitation_and_bind',
  'restore_staff_relationship',
  'update_staff_role',
]) {
  const functionStart = migration.indexOf(`FUNCTION public.${functionName}`);
  assert.notEqual(functionStart, -1, `${functionName} must exist`);
  const functionBody = migration.slice(functionStart, functionStart + 8_000);
  assert.match(
    functionBody,
    /has_authoritative_team_entitlement/,
    `${functionName} must enforce authoritative Team access`,
  );
}

assert.match(teamPage, /useAccountCapabilities/);
assert.match(teamPage, /feature: 'staffCollaboration'/);
assert.match(teamPage, /feature: 'managerWorkflow'/);
assert.match(teamPage, /status === 'simulation_enabled'/);
assert.match(teamPage, /teamFeatureAllowed=\{staffCollaborationAccess\.allowed\}/);

assert.match(staffManagement, /teamFeatureAllowed: boolean/);
assert.match(staffManagement, /managerWorkflowAllowed: boolean/);
assert.match(staffManagement, /simulationActive: boolean/);
assert.match(staffManagement, /status === 'suspended_by_plan'/);
assert.match(staffManagement, /restoreStaffRelationship/);
assert.match(staffManagement, /disabled=\{!canCreateTeamData\}/);

assert.doesNotMatch(staffService, /\.from\('staff_relationships'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
assert.doesNotMatch(invitationService, /\.from\('staff_invitations'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
assert.doesNotMatch(staffDialog, /\.from\('staff_relationships'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
assert.match(staffDialog, /acceptInvitation\(invitation\.id\)/);
assert.match(staffDialog, /declineInvitation\(invitation\.id\)/);

assert.match(packageJson, /"smoke:subscription:team-enforcement"/);
assert.match(liveSmoke, /SUPABASE_SECRET_KEY/);
assert.match(liveSmoke, /active relationship Team backing/);
assert.match(liveSmoke, /suspended membership cleanup/);
assert.match(liveSmoke, /anonymous relationship insert/);
assert.match(liveSmoke, /anonymous RPC denied: \$\{name\}/);
assert.match(liveSmoke, /denied-write-smoke@invalid\.example/);
assert.doesNotMatch(liveSmoke, /signUp|createUser|admin\.createUser|subscription_accounts.*\.(insert|update|delete)/);

console.log('Team subscription enforcement guardrails passed.');
