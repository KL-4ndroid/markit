import {
  deriveRoleCapabilities,
  type RoleCapabilities,
  type StaffCapability,
} from '@/lib/permissions/role-capabilities';
import type { EventType } from '@/types/db';
import type { StaffRole } from '@/types/staff';

export const ROLE_FRESHNESS_MAX_AGE_MS = 180 * 1000;
const ROLE_CACHE_KEY = 'user_role_cache';

export type RoleFreshnessErrorCode =
  | 'staff_role_cache_missing'
  | 'staff_role_cache_stale'
  | 'staff_role_cache_invalid'
  | 'staff_role_capability_denied';

export class RoleFreshnessError extends Error {
  constructor(
    public readonly code: RoleFreshnessErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'RoleFreshnessError';
  }
}

export interface CachedRoleSnapshot {
  userId: string;
  isStaff: boolean;
  staffRole: StaffRole | null;
  timestamp: number;
}

type CachedRoleEnvelope = {
  userId?: unknown;
  role?: {
    isStaff?: unknown;
    staffRole?: unknown;
  };
  timestamp?: unknown;
};

const EVENT_CAPABILITY: Partial<Record<EventType, StaffCapability>> = {
  interaction_recorded: 'canRecordInteraction',
  deal_closed: 'canRecordDeal',
  market_updated: 'canEditMarketBasic',
  product_updated: 'canEditProductBasic',
};

function isStaffRole(value: unknown): value is StaffRole {
  return value === 'viewer' || value === 'operator' || value === 'manager';
}

export function getRequiredCapabilityForEvent(type: EventType): StaffCapability | null {
  return EVENT_CAPABILITY[type] ?? null;
}

export function parseCachedRoleSnapshot(raw: string | null): CachedRoleSnapshot | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedRoleEnvelope | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.userId !== 'string') return null;
    if (typeof parsed.timestamp !== 'number' || !Number.isFinite(parsed.timestamp)) return null;
    if (!parsed.role || typeof parsed.role !== 'object') return null;
    if (typeof parsed.role.isStaff !== 'boolean') return null;

    const rawStaffRole = parsed.role.staffRole;
    const staffRole = isStaffRole(rawStaffRole) ? rawStaffRole : null;

    return {
      userId: parsed.userId,
      isStaff: parsed.role.isStaff,
      staffRole,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export function assertFreshStaffCapability(args: {
  userId: string;
  eventType: EventType;
  now?: number;
  maxAgeMs?: number;
  rawCache?: string | null;
}): void {
  const {
    userId,
    eventType,
    now = Date.now(),
    maxAgeMs = ROLE_FRESHNESS_MAX_AGE_MS,
    rawCache = typeof localStorage === 'undefined' ? null : localStorage.getItem(ROLE_CACHE_KEY),
  } = args;

  const requiredCapability = getRequiredCapabilityForEvent(eventType);
  if (!requiredCapability) return;

  const snapshot = parseCachedRoleSnapshot(rawCache);
  if (!snapshot) {
    return;
  }

  if (snapshot.userId !== userId) {
    return;
  }

  if (!snapshot.isStaff) return;

  const age = now - snapshot.timestamp;
  if (age < 0 || age > maxAgeMs) {
    throw new RoleFreshnessError(
      'staff_role_cache_stale',
      'Staff write blocked because role cache is stale.'
    );
  }

  const capabilities: RoleCapabilities = deriveRoleCapabilities({
    isOwner: false,
    staffRole: snapshot.staffRole,
  });

  if (!capabilities[requiredCapability]) {
    throw new RoleFreshnessError(
      'staff_role_capability_denied',
      `Staff write blocked because ${String(snapshot.staffRole)} cannot ${requiredCapability}.`
    );
  }
}
