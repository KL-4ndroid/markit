export type VenueStatus = 'active' | 'archived';
export type OperationScheduleStatus = 'active' | 'paused' | 'archived';
export type ScheduleOccurrenceState = 'scheduled' | 'skipped' | 'suppressed' | 'rule_removed';

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  address?: string;
  locationNote?: string;
  status: VenueStatus;
  isDeleted?: boolean;
  createdAt: number;
  updatedAt: number;
  sync_status?: 'local_only' | 'pending' | 'synced' | 'conflict' | 'error';
}

export interface OperationScheduleDefaults {
  registrationFee?: number;
  boothCost?: number;
  deposit?: number;
  tableRental?: number;
  chairRental?: number;
  umbrellaRental?: number;
  tableclothRental?: number;
  commissionRate?: number;
  tableFree?: boolean;
  chairFree?: boolean;
  umbrellaFree?: boolean;
  tableclothFree?: boolean;
  notes?: string;
}

export interface WeeklyRecurrence {
  frequency: 'weekly';
  interval: 1;
  weekdays: number[];
  startDate: string;
  endDate?: string;
}

export interface OperationSchedule {
  id: string;
  owner_id: string;
  venueId: string;
  name?: string;
  timezone: string;
  recurrence: WeeklyRecurrence;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  defaults: OperationScheduleDefaults;
  status: OperationScheduleStatus;
  revision: number;
  createdAt: number;
  updatedAt: number;
  sync_status?: 'local_only' | 'pending' | 'synced' | 'conflict' | 'error';
}

export type ScheduleMarketStatus =
  | 'registered'
  | 'accepted'
  | 'paid'
  | 'ongoing'
  | 'completed'
  | 'postponed'
  | 'cancelled';

export interface ScheduledMarketCandidate {
  id: string;
  owner_id?: string;
  scheduleId?: string;
  sessionOrigin?: 'manual' | 'schedule' | 'legacy';
  scheduleOccurrenceKey?: string;
  scheduleRevision?: number;
  scheduleOccurrenceState?: ScheduleOccurrenceState;
  isScheduleOverride?: boolean;
  startDate: string;
  dates?: string[];
  status: ScheduleMarketStatus;
}

export interface ScheduleMarketActivity {
  hasStarted?: boolean;
  hasEnded?: boolean;
  hasDeals?: boolean;
  hasInteractions?: boolean;
  hasDailyStats?: boolean;
  hasFieldNotes?: boolean;
  hasChecklistActivity?: boolean;
}

export type ReconciliationAction =
  | { kind: 'create'; occurrenceDate: string; occurrenceKey: string; marketId: string }
  | { kind: 'update_snapshot'; marketId: string; occurrenceDate: string; targetRevision: number }
  | { kind: 'suppress'; marketId: string; occurrenceDate: string }
  | { kind: 'mark_rule_removed'; marketId: string; occurrenceDate: string }
  | { kind: 'restore'; marketId: string; occurrenceDate: string; targetRevision: number }
  | { kind: 'preserve'; marketId: string; occurrenceDate: string; reason: ReconciliationPreserveReason }
  | { kind: 'blocked'; marketId: string; occurrenceDate: string; reason: ReconciliationBlockedReason };

export type ReconciliationPreserveReason =
  | 'outside_schedule'
  | 'before_effective_date'
  | 'single_occurrence_override'
  | 'explicitly_skipped'
  | 'already_current';

export type ReconciliationBlockedReason =
  | 'owner_scope_mismatch'
  | 'ongoing_or_completed'
  | 'user_activity_present';

export interface ReconciliationPlan {
  actions: ReconciliationAction[];
  targetOccurrenceDates: string[];
}
