export const ROLE_STATUS_EVENT = 'boothbook:role-status';

export type RoleStatusEventKind =
  | 'checking'
  | 'downgraded'
  | 'revoked'
  | 'projection-cleanup-complete'
  | 'projection-cleanup-failed';

export interface RoleStatusEventDetail {
  kind: RoleStatusEventKind;
  message: string;
  fromRole?: string | null;
  toRole?: string | null;
}

export function dispatchRoleStatusEvent(detail: RoleStatusEventDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<RoleStatusEventDetail>(ROLE_STATUS_EVENT, { detail }));
}
