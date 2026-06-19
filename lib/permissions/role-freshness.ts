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
  | 'staff_role_capability_denied'
  | 'staff_write_field_denied';

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

const EVENT_CAPABILITY: Partial<Record<string, StaffCapability>> = {
  interaction_recorded: 'canRecordInteraction',
  interaction_deleted: 'canDeleteOwnSameDayRecord',
  deal_closed: 'canRecordDeal',
  deal_deleted: 'canDeleteOwnSameDayRecord',
  market_updated: 'canEditMarketBasic',
  product_updated: 'canEditProductBasic',
  field_note_created: 'canCreateFieldNote',
  field_note_updated: 'canEditOwnSameDayRecord',
  field_note_deleted: 'canDeleteOwnSameDayRecord',
};

const STAFF_OWNER_ONLY_EVENTS = new Set<EventType>([
  'market_created',
  'market_status_changed',
  'market_started',
  'market_ended',
  'market_deleted',
  'product_created',
  'product_deleted',
  'settings_updated',
]);

export const MANAGER_MARKET_UPDATE_FIELDS = [
  'dates',
  'startDate',
  'endDate',
  'earlyEntryEnabled',
  'earlyEntryTime',
  'checkInTime',
  'operatingStartTime',
  'operatingEndTime',
  'notes',
] as const;

export const MANAGER_PRODUCT_UPDATE_FIELDS = [
  'price',
  'stock',
  'unlimitedStock',
  'description',
  'isActive',
] as const;

const MANAGER_MARKET_UPDATE_FIELD_SET = new Set<string>(MANAGER_MARKET_UPDATE_FIELDS);
const MANAGER_PRODUCT_UPDATE_FIELD_SET = new Set<string>(MANAGER_PRODUCT_UPDATE_FIELDS);

function isStaffRole(value: unknown): value is StaffRole {
  return value === 'viewer' || value === 'operator' || value === 'manager';
}

export function getRequiredCapabilityForEvent(type: EventType): StaffCapability | null {
  return EVENT_CAPABILITY[type] ?? null;
}

function getPayloadUpdates(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;

  const updates = (payload as { updates?: unknown }).updates;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return null;

  return updates as Record<string, unknown>;
}

function assertAllowedUpdateFields(args: {
  eventType: EventType;
  payload: unknown;
  allowedFields: Set<string>;
}): void {
  const updates = getPayloadUpdates(args.payload);
  if (!updates) return;

  const deniedFields = Object.keys(updates).filter((field) => !args.allowedFields.has(field));
  if (deniedFields.length === 0) return;

  throw new RoleFreshnessError(
    'staff_write_field_denied',
    `Staff write blocked because ${args.eventType} cannot update: ${deniedFields.join(', ')}.`
  );
}

function getInteractionTypeFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = (payload as { type?: unknown }).type;
  return typeof value === 'string' ? value : null;
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
  payload?: unknown;
  now?: number;
  maxAgeMs?: number;
  rawCache?: string | null;
}): void {
  const {
    userId,
    eventType,
    payload,
    now = Date.now(),
    maxAgeMs = ROLE_FRESHNESS_MAX_AGE_MS,
    rawCache = typeof localStorage === 'undefined' ? null : localStorage.getItem(ROLE_CACHE_KEY),
  } = args;

  const requiredCapability = getRequiredCapabilityForEvent(eventType);
  const interactionType = getInteractionTypeFromPayload(payload);
  const effectiveRequiredCapability: StaffCapability | null =
    eventType === 'interaction_recorded' && interactionType === 'field_note'
      ? 'canCreateFieldNote'
      : requiredCapability;
  const isStaffOwnerOnlyEvent = STAFF_OWNER_ONLY_EVENTS.has(eventType);
  if (!effectiveRequiredCapability && !isStaffOwnerOnlyEvent) return;

  const snapshot = parseCachedRoleSnapshot(rawCache);
  if (!snapshot) {
    return;
  }

  if (snapshot.userId !== userId) {
    return;
  }

  if (!snapshot.isStaff) return;

  if (isStaffOwnerOnlyEvent) {
    throw new RoleFreshnessError(
      'staff_role_capability_denied',
      `Staff write blocked because ${eventType} is owner-only.`
    );
  }

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

  if (effectiveRequiredCapability && !capabilities[effectiveRequiredCapability]) {
    throw new RoleFreshnessError(
      'staff_role_capability_denied',
      `Staff write blocked because ${String(snapshot.staffRole)} cannot ${effectiveRequiredCapability}.`
    );
  }

  if (eventType === 'market_updated') {
    assertAllowedUpdateFields({
      eventType,
      payload,
      allowedFields: MANAGER_MARKET_UPDATE_FIELD_SET,
    });
  }

  if (eventType === 'product_updated') {
    assertAllowedUpdateFields({
      eventType,
      payload,
      allowedFields: MANAGER_PRODUCT_UPDATE_FIELD_SET,
    });
  }
}
