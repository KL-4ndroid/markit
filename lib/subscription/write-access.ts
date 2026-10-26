/** Shared contract; the server/database determines the plan, never a client tier. */
export type SubscriptionWriteFeature = 'sales' | 'products' | 'cash' | 'product_photo' | 'sales_photo' | 'field_notes';
export type SubscriptionWriteDecision = {
  enabled: boolean;
  allowed: boolean;
  reason: 'allowed' | 'pilot_not_enabled' | 'plan_required' | 'role_forbidden' | 'invalid_scope' | 'entitlement_unavailable';
};

export function parseSubscriptionWriteDecision(value: unknown): SubscriptionWriteDecision | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.enabled !== 'boolean' || typeof row.allowed !== 'boolean') return null;
  if (!['allowed', 'pilot_not_enabled', 'plan_required', 'role_forbidden', 'invalid_scope'].includes(String(row.reason))) return null;
  if (row.allowed !== (row.reason === 'allowed' || row.reason === 'pilot_not_enabled')) return null;
  if (!row.enabled && row.reason !== 'pilot_not_enabled') return null;
  if (row.enabled && row.reason === 'pilot_not_enabled') return null;
  return row as SubscriptionWriteDecision;
}

export function subscriptionWriteErrorStatus(decision: SubscriptionWriteDecision): 403 | 503 {
  return decision.reason === 'entitlement_unavailable' ? 503 : 403;
}
