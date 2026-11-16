/** Shared deletion/retention classification. No DB, browser, filesystem or provider APIs. */
export type DeletionDataClass = 'workspace' | 'identity' | 'derived_cache' | 'billing_evidence' | 'global_configuration' | 'deletion_evidence' | 'view';
export type DeletionRelationPolicy = Readonly<{
  dataClass: DeletionDataClass;
  owner: string;
  staff: string;
  retentionYears?: 5;
}>;
const workspace = (owner: string, staff = 'preserve_owner_data'): DeletionRelationPolicy => ({dataClass:'workspace',owner,staff});
const billing: DeletionRelationPolicy = {dataClass:'billing_evidence',owner:'detach_to_restricted_subject_before_profile',staff:'must_not_delete_owner_ledger',retentionYears:5};
const config: DeletionRelationPolicy = {dataClass:'global_configuration',owner:'preserve',staff:'preserve'};
const view: DeletionRelationPolicy = {dataClass:'view',owner:'fence_access_no_stored_rows',staff:'fence_access_no_stored_rows'};
const evidence: DeletionRelationPolicy = {dataClass:'deletion_evidence',owner:'retain_minimized_receipts_clear_active_identity',staff:'retain_minimized_receipts_clear_active_identity'};
export const ACCOUNT_DELETION_RELATION_POLICIES: Readonly<Record<string, DeletionRelationPolicy>> = Object.freeze({
  account_deletion_requests:evidence,account_deletion_cleanup_steps:evidence,account_deletion_transition_audit:evidence,
  profiles:{dataClass:'identity',owner:'delete_after_operational_data',staff:'delete_after_anonymization'},
  account_entitlements:workspace('delete'), subscription_accounts:workspace('delete_projection_only_after_billing_check'),
  subscription_write_guard_owners:workspace('delete'),subscription_test_switch_audit:workspace('delete_test_audit'),
  user_settings:workspace('delete','delete_own_settings'),
  events:workspace('delete_owned_workspace_anonymize_other_workspaces','anonymize_identity_preserve_facts'),
  events_archive:workspace('delete_owned_workspace_anonymize_other_workspaces','anonymize_actor_and_archiver_preserve_facts'),
  markets:workspace('delete'),products:workspace('delete_owned_preserve_others_shared_catalog'),
  product_cover_photos:workspace('delete_metadata_only_after_manifest_absence'),
  sale_photo_evidence:workspace('delete_metadata_only_after_manifest_absence','anonymize_capture_attribution_preserve_objects'),
  market_cash_records:workspace('delete'),market_financial_reviews:workspace('delete'),market_financial_review_receipts:workspace('delete'),
  market_journals:workspace('delete_owner_private_journals'),
  market_members:workspace('revoke_owned_workspace_and_self_memberships','revoke_self_memberships'),
  market_invitations:workspace('revoke_owned_workspace_or_self_identity_tokens','revoke_tokens_created_or_used_by_self'),
  staff_invitations:workspace('revoke_owned_invitations'),
  staff_relationships:workspace('revoke_owned_and_self_relationships','revoke_self_relationships'),
  pending_operations:workspace('block_unsynced_work_then_delete_synced_receipts','block_unsynced_work_then_delete_self_synced_receipts'),
  snapshots:{dataClass:'derived_cache',owner:'delete_owned_or_identity_contaminated_cache',staff:'invalidate_identity_contaminated_cache_preserve_source_history'},
  preparation_templates:workspace('delete'),
  preparation_template_applications:workspace('delete_owned_receipts','anonymize_actor_and_receipt_payload'),
  owner_workflow_receipts:workspace('delete','anonymize_embedded_identity'),
  operation_schedules:workspace('delete_after_owned_markets'),venues:workspace('delete_after_schedules'),
  billing_customer_links:billing,billing_subscriptions:billing,billing_transactions:billing,
  billing_reconciliation_runs:billing,subscription_price_assignments:billing,
  billing_event_inbox:{...billing,owner:'classify_subject_before_detach_never_guess_from_raw_payload'},
  billing_storefront_price_mappings:config,subscription_price_versions:config,
  subscription_read_guard_settings:config,subscription_write_guard_settings:config,
  owner_accessible_events:view,owner_accessible_markets:view,
  staff_accessible_events:view,staff_accessible_markets:view,staff_accessible_products:view,
});

/** Coverage is a necessary review check, never permission to execute deletion. */
export function evaluateDeletionCatalogCoverage(relations: readonly string[]) {
  const names=relations.map(name=>name.replace(/^public\./,''));
  return {
    unclassified: names.filter(name=>!Object.hasOwn(ACCOUNT_DELETION_RELATION_POLICIES,name)),
    missing: Object.keys(ACCOUNT_DELETION_RELATION_POLICIES).filter(name=>!names.includes(name)),
    duplicate: names.filter((name,index)=>names.indexOf(name)!==index),
    productionReady:false as const,
  };
}
