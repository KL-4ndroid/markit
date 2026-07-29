import {
  hasEffectiveEntitlement,
  isPromotionExpired,
  resolveCapabilityFreshness,
  type AccountCapabilities,
  type AccountCapabilityFeature,
} from './subscription-capabilities';
import type { AccountPlanCode } from './subscription-plans';

export type SubscriptionActorRole = 'owner' | 'manager' | 'operator' | 'viewer' | 'unresolved';

export type SubscriptionCapabilityOperation =
  | 'read_existing'
  | 'create'
  | 'replace'
  | 'delete_existing'
  | 'execute';

export type CapabilityAccessBlockReason =
  | 'authentication_required'
  | 'owner_workspace_unavailable'
  | 'plan_required'
  | 'entitlement_inactive'
  | 'stale_capability'
  | 'capability_unavailable'
  | 'role_forbidden'
  | 'runtime_disabled'
  | 'data_insufficient'
  | 'offline_lease_expired'
  | 'promotion_reward_expired';

export type CapabilityAccessDecision =
  | { allowed: true; reason: 'allowed'; accessMode: 'entitled' | 'retained' }
  | {
      allowed: false;
      reason: CapabilityAccessBlockReason;
      requiredPlan?: AccountPlanCode;
    };

const FEATURE_REQUIRED_PLAN: Record<AccountCapabilityFeature, AccountPlanCode> = {
  productCoverPhoto: 'pro',
  salesPhotoEvidence: 'team',
  basicAnalytics: 'pro',
  advancedAnalytics: 'pro',
  settlementReportPreview: 'pro',
  settlementPdf: 'pro',
  excelExport: 'pro',
  staffCollaboration: 'team',
  managerWorkflow: 'team',
};

const RETAINED_OPERATIONS: Partial<Record<AccountCapabilityFeature, readonly SubscriptionCapabilityOperation[]>> = {
  productCoverPhoto: ['read_existing', 'delete_existing'],
  salesPhotoEvidence: ['read_existing', 'delete_existing'],
  settlementPdf: ['read_existing'],
};

function permitsRetainedOperation(
  feature: AccountCapabilityFeature,
  operation: SubscriptionCapabilityOperation,
): boolean {
  return RETAINED_OPERATIONS[feature]?.includes(operation) ?? false;
}

function unavailable(reason: CapabilityAccessBlockReason, requiredPlan?: AccountPlanCode): CapabilityAccessDecision {
  return requiredPlan ? { allowed: false, reason, requiredPlan } : { allowed: false, reason };
}

export function evaluateCapabilityAccess(input: {
  authenticated: boolean;
  ownerWorkspaceAvailable: boolean;
  workspaceOwnerId?: string | null;
  requestedOwnerId?: string | null;
  actorRole: SubscriptionActorRole;
  rolePermission: boolean;
  capabilities: AccountCapabilities | null;
  feature: AccountCapabilityFeature;
  operation: SubscriptionCapabilityOperation;
  runtimeEnabled: boolean;
  dataReady: boolean;
  nowMs: number;
  network: 'online' | 'offline';
  offlineLeaseEndsAt?: string | null;
}): CapabilityAccessDecision {
  if (!input.authenticated) return unavailable('authentication_required');
  if (!input.ownerWorkspaceAvailable) return unavailable('owner_workspace_unavailable');
  if (
    input.workspaceOwnerId &&
    input.requestedOwnerId &&
    input.workspaceOwnerId !== input.requestedOwnerId
  ) {
    return unavailable('owner_workspace_unavailable');
  }

  if (input.actorRole === 'unresolved' || !input.rolePermission) {
    return unavailable('role_forbidden');
  }
  if (!input.capabilities || !input.capabilities.ownerId) {
    return unavailable('capability_unavailable');
  }
  if (input.requestedOwnerId && input.capabilities.ownerId !== input.requestedOwnerId) {
    return unavailable('owner_workspace_unavailable');
  }

  if (isPromotionExpired(input.capabilities, input.nowMs)) {
    return unavailable('promotion_reward_expired', FEATURE_REQUIRED_PLAN[input.feature]);
  }

  const isRetainedAccess = permitsRetainedOperation(input.feature, input.operation);
  if (!input.capabilities.features[input.feature] && !isRetainedAccess) {
    return unavailable('plan_required', FEATURE_REQUIRED_PLAN[input.feature]);
  }

  if (!isRetainedAccess && !hasEffectiveEntitlement(input.capabilities, input.nowMs)) {
    return unavailable('entitlement_inactive', FEATURE_REQUIRED_PLAN[input.feature]);
  }

  if (!isRetainedAccess) {
    const freshness = resolveCapabilityFreshness({
      capabilities: input.capabilities,
      nowMs: input.nowMs,
      network: input.network,
      offlineLeaseEndsAt: input.offlineLeaseEndsAt,
    });
    if (freshness === 'unavailable') return unavailable('capability_unavailable');
    if (freshness === 'stale') return unavailable('stale_capability');
    if (freshness === 'offline_lease_expired') return unavailable('offline_lease_expired');
  }

  if (!input.runtimeEnabled) return unavailable('runtime_disabled');
  if (!input.dataReady) return unavailable('data_insufficient');

  return {
    allowed: true,
    reason: 'allowed',
    accessMode: isRetainedAccess ? 'retained' : 'entitled',
  };
}
