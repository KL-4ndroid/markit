export const ACCOUNT_DELETION_AD4_BLOCKER_IDS = [
  'capacitor_gate2_open',
  'native_projects_absent',
  'native_store_adapters_absent',
  'public_deletion_resource_absent',
  'authenticated_deletion_entry_absent',
  'confirmation_route_absent',
  'cancellation_route_absent',
  'cleanup_executor_absent',
  'billing_detachment_absent',
  'real_r2_purge_absent',
  'external_accounts_incomplete',
  'public_legal_support_incomplete',
  'remote_migration_strategy_unapproved',
  'release_candidate_absent',
] as const;

export type AccountDeletionAd4BlockerId = typeof ACCOUNT_DELETION_AD4_BLOCKER_IDS[number];

export type AccountDeletionAd4Facts = Readonly<{
  capacitorGate2Complete: boolean;
  nativeProjectsPresent: boolean;
  nativeStoreAdaptersPresent: boolean;
  publicDeletionResourcePresent: boolean;
  authenticatedDeletionEntryPresent: boolean;
  confirmationRoutePresent: boolean;
  cancellationRoutePresent: boolean;
  cleanupExecutorPresent: boolean;
  billingDetachmentPresent: boolean;
  realR2PurgePresent: boolean;
  externalAccountsComplete: boolean;
  publicLegalSupportComplete: boolean;
  remoteMigrationStrategyApproved: boolean;
  releaseCandidatePresent: boolean;
}>;

export type AccountDeletionAd4ReadinessReport = Readonly<{
  ready: boolean;
  blockerCount: number;
  blockers: readonly AccountDeletionAd4BlockerId[];
  productionRuntimeMustRemainDisabled: true;
}>;

const FACT_TO_BLOCKER = [
  ['capacitorGate2Complete', 'capacitor_gate2_open'],
  ['nativeProjectsPresent', 'native_projects_absent'],
  ['nativeStoreAdaptersPresent', 'native_store_adapters_absent'],
  ['publicDeletionResourcePresent', 'public_deletion_resource_absent'],
  ['authenticatedDeletionEntryPresent', 'authenticated_deletion_entry_absent'],
  ['confirmationRoutePresent', 'confirmation_route_absent'],
  ['cancellationRoutePresent', 'cancellation_route_absent'],
  ['cleanupExecutorPresent', 'cleanup_executor_absent'],
  ['billingDetachmentPresent', 'billing_detachment_absent'],
  ['realR2PurgePresent', 'real_r2_purge_absent'],
  ['externalAccountsComplete', 'external_accounts_incomplete'],
  ['publicLegalSupportComplete', 'public_legal_support_incomplete'],
  ['remoteMigrationStrategyApproved', 'remote_migration_strategy_unapproved'],
  ['releaseCandidatePresent', 'release_candidate_absent'],
] as const satisfies readonly (readonly [keyof AccountDeletionAd4Facts, AccountDeletionAd4BlockerId])[];

export function evaluateAccountDeletionAd4Readiness(
  facts: AccountDeletionAd4Facts,
): AccountDeletionAd4ReadinessReport {
  const blockers = FACT_TO_BLOCKER
    .filter(([fact]) => facts[fact] !== true)
    .map(([, blocker]) => blocker);
  return Object.freeze({
    ready: blockers.length === 0,
    blockerCount: blockers.length,
    blockers: Object.freeze(blockers),
    productionRuntimeMustRemainDisabled: true,
  });
}
