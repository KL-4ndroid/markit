import type { AccountCapabilityClientResult } from './account-capability-client';
import {
  evaluateCapabilityAccess,
  type CapabilityAccessBlockReason,
  type CapabilityAccessDecision,
  type CapabilityAccessInput,
} from './subscription-access';

export type AccountCapabilityClientAccessInput = Omit<CapabilityAccessInput, 'capabilities'> & {
  capabilityResult: AccountCapabilityClientResult | null;
};

export function mapAccountCapabilityClientFailure(
  code: string,
): CapabilityAccessBlockReason {
  switch (code) {
    case 'authentication_required':
      return 'authentication_required';
    case 'owner_workspace_forbidden':
      return 'owner_workspace_unavailable';
    case 'stale_capability':
      return 'stale_capability';
    case 'offline_lease_expired':
      return 'offline_lease_expired';
    default:
      return 'capability_unavailable';
  }
}

export function evaluateAccountCapabilityClientAccess(
  input: AccountCapabilityClientAccessInput,
): CapabilityAccessDecision {
  const { capabilityResult, ...accessInput } = input;

  if (!capabilityResult?.ok) {
    const structuralDecision = evaluateCapabilityAccess({
      ...accessInput,
      capabilities: null,
    });

    if (
      !structuralDecision.allowed
      && structuralDecision.reason !== 'capability_unavailable'
    ) {
      return structuralDecision;
    }

    return {
      allowed: false,
      reason: capabilityResult
        ? mapAccountCapabilityClientFailure(capabilityResult.code)
        : 'capability_unavailable',
    };
  }

  return evaluateCapabilityAccess({
    ...accessInput,
    capabilities: capabilityResult.capabilities,
  });
}
