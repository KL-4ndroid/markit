import type { AccountCapabilityFeature } from './subscription-capabilities';

export type SubscriptionCapabilityEnforcementClass =
  | 'pilot_authoritative_server'
  | 'authoritative_server'
  | 'authoritative_read_client_execution'
  | 'configurable_server'
  | 'role_and_rollout_only'
  | 'not_implemented';

export type SubscriptionCapabilityReleaseState =
  | 'sandbox_verified_release_smoke_pending'
  | 'local_complete_deployment_smoke_pending'
  | 'pilot_verified_global_pending'
  | 'open_pre_subscription'
  | 'entitlement_enforcement_missing'
  | 'not_implemented';

export type SubscriptionCapabilityImplementation = {
  feature: AccountCapabilityFeature;
  enforcement: SubscriptionCapabilityEnforcementClass;
  releaseState: SubscriptionCapabilityReleaseState;
  protectedWrites: boolean;
  nextGate: string;
};

export const SUBSCRIPTION_CAPABILITY_IMPLEMENTATION: readonly SubscriptionCapabilityImplementation[] =
  Object.freeze([
    {
      feature: 'productCoverPhoto',
      enforcement: 'pilot_authoritative_server',
      releaseState: 'pilot_verified_global_pending',
      protectedWrites: true,
      nextGate: 'Pilot write guard/capability and workspace reads aligned; approve global enforcement and downgrade policy before launch.',
    },
    {
      feature: 'salesPhotoEvidence',
      enforcement: 'pilot_authoritative_server',
      releaseState: 'pilot_verified_global_pending',
      protectedWrites: true,
      nextGate: 'Pilot Team write guards exist; approve global enforcement and retained-read policy before paid launch.',
    },
    {
      feature: 'basicAnalytics',
      enforcement: 'authoritative_read_client_execution',
      releaseState: 'local_complete_deployment_smoke_pending',
      protectedWrites: false,
      nextGate: 'Complete paid-state deployment UI smoke.',
    },
    {
      feature: 'advancedAnalytics',
      enforcement: 'authoritative_read_client_execution',
      releaseState: 'local_complete_deployment_smoke_pending',
      protectedWrites: false,
      nextGate: 'Complete paid-state deployment UI smoke.',
    },
    {
      feature: 'settlementReportPreview',
      enforcement: 'authoritative_read_client_execution',
      releaseState: 'local_complete_deployment_smoke_pending',
      protectedWrites: false,
      nextGate: 'Complete paid-state deployment UI smoke.',
    },
    {
      feature: 'settlementPdf',
      enforcement: 'authoritative_read_client_execution',
      releaseState: 'local_complete_deployment_smoke_pending',
      protectedWrites: false,
      nextGate: 'Complete paid-state deployment PDF smoke.',
    },
    {
      feature: 'excelExport',
      enforcement: 'not_implemented',
      releaseState: 'not_implemented',
      protectedWrites: false,
      nextGate: 'Approve an export scope before adding UI or runtime.',
    },
    {
      feature: 'staffCollaboration',
      enforcement: 'authoritative_server',
      releaseState: 'sandbox_verified_release_smoke_pending',
      protectedWrites: true,
      nextGate: 'Complete release-environment owner and staff transition smoke.',
    },
    {
      feature: 'managerWorkflow',
      enforcement: 'authoritative_server',
      releaseState: 'sandbox_verified_release_smoke_pending',
      protectedWrites: true,
      nextGate: 'Complete release-environment role-cache and projection cleanup smoke.',
    },
  ] satisfies readonly SubscriptionCapabilityImplementation[]);

export function getSubscriptionCapabilityImplementation(
  feature: AccountCapabilityFeature,
): SubscriptionCapabilityImplementation {
  const implementation = SUBSCRIPTION_CAPABILITY_IMPLEMENTATION.find((entry) => entry.feature === feature);
  if (!implementation) throw new Error(`subscription_capability_implementation_missing:${feature}`);
  return implementation;
}

export function listSubscriptionCapabilityLaunchBlockers(): readonly SubscriptionCapabilityImplementation[] {
  return SUBSCRIPTION_CAPABILITY_IMPLEMENTATION.filter((entry) => (
    entry.releaseState !== 'sandbox_verified_release_smoke_pending'
    && entry.releaseState !== 'local_complete_deployment_smoke_pending'
  ));
}
