/** Frozen-account access classification; no browser, native or database APIs. */
export const DELETION_ACCESS_POLICY_REVISION='2026-11-02-v1';
export const DELETION_PURE_ROUTINES=new Set([
  'deal_projection_number','deal_projection_totals','financial_review_day','financial_review_number',
  'market_cash_point_cents','market_payment_deadline_is_valid','market_region_code_is_valid',
  'sanitize_staff_event_payload','subscription_foundation_event','subscription_free_payload',
  'subscription_mask_json','subscription_staff_payload','staff_team_access_from_source_rows',
]);
export const DELETION_CONTROL_ROUTINES=new Set([
  'bff_read_account_deletion_request','bff_create_account_deletion_request','bff_claim_account_deletion_lease',
  'bff_record_account_deletion_step','bff_finalize_account_deletion','bff_release_account_deletion_lease',
  'audit_account_deletion_request_transition','enforce_account_deletion_request_transition','prevent_account_deletion_audit_mutation',
]);
export const DELETION_FALSE_ON_DENIAL=new Set([
  'can_current_staff_read_relationship','can_manage_preparation_templates','can_manage_recurring_operations',
  'check_user_market_permission','has_authoritative_team_entitlement','is_staff_of',
  'is_sale_photo_evidence_sale_event','product_cover_photo_write_allowed',
  'subscription_read_owner_advanced','subscription_read_owner_paid','subscription_read_paid','subscription_read_staff',
]);
export type DeletionReferenceKind='identity'|'market'|'product'|'event'|'photo'|'journal'|'template'|'venue'|'schedule'|'relationship'|'invitation'|'token'|'operation'|'json'|'none';
const idArgs:Record<string,DeletionReferenceKind>={
  p_actor:'identity',p_actor_id:'identity',p_owner:'identity',p_owner_id:'identity',p_user_id:'identity',p_staff_id:'identity',
  p_market_id:'market',p_market_ids:'market',market:'market',p_product_id:'product',
  p_sale_id:'event',event_id:'event',p_evidence_id:'photo',p_expected_evidence_id:'photo',p_photo_id:'photo',
  p_journal_id:'journal',p_template_id:'template',p_venue_id:'venue',p_schedule_id:'schedule',
  p_relationship_id:'relationship',p_invitation_id:'invitation',
  p_request_id:'none',p_mutation_id:'none',p_application_id:'none',p_batch_id:'none',p_attempt_id:'none',
};
export function deletionArgumentReference(routine:string,name:string,type:string):DeletionReferenceKind{
  if(type==='uuid'||type==='uuid[]'){
    // Item UUIDs are embedded checklist identifiers within the already scoped template.
    if(name==='p_item_ids'&&routine==='apply_preparation_template')return 'none';
    if(name==='p_id'&&routine==='save_market_journal')return 'journal';
    if(name==='p_id'&&routine==='save_preparation_template')return 'template';
    if(!Object.hasOwn(idArgs,name))throw new Error('Unclassified UUID argument in deletion access policy.');
    return idArgs[name];
  }
  if(name==='p_token'||name==='p_code')return 'token';
  if(name==='p_operation_id')return 'operation';
  return type==='jsonb'?'json':'none';
}
export function deletionRoutineMode(name:string,returnType:string){
  if(DELETION_CONTROL_ROUTINES.has(name))return 'control' as const;
  if(DELETION_PURE_ROUTINES.has(name))return 'pure' as const;
  if(name==='delete_current_user_app_data')return 'disabled_legacy' as const;
  if(returnType==='trigger')return 'trigger' as const;
  if(DELETION_FALSE_ON_DENIAL.has(name))return 'false_on_denial' as const;
  return 'guarded' as const;
}
