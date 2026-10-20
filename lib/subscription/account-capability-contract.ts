import type { AccountCapabilities } from './subscription-capabilities';

export const ACCOUNT_CAPABILITY_READ_STATUSES = [
  'default_free',
  'explicit_free',
  'admin_enabled',
  'admin_inactive',
  'simulation_enabled',
  'billing_enabled',
  'billing_inactive',
  'billing_not_connected',
  'promotion_enabled',
  'promotion_inactive',
  'promotion_not_connected',
] as const;

export type AccountCapabilityReadStatus = typeof ACCOUNT_CAPABILITY_READ_STATUSES[number];

export type AccountCapabilityApiSuccess = {
  ok: true;
  status: AccountCapabilityReadStatus;
  capabilities: AccountCapabilities;
};

export type AccountCapabilityUnavailableCode =
  | 'authentication_required'
  | 'authentication_unavailable'
  | 'capability_unavailable'
  | 'invalid_request'
  | 'owner_workspace_forbidden'
  | 'stale_capability';

export function isAccountCapabilityReadStatus(value: unknown): value is AccountCapabilityReadStatus {
  return typeof value === 'string'
    && ACCOUNT_CAPABILITY_READ_STATUSES.includes(value as AccountCapabilityReadStatus);
}
