import {
  deriveRolePermissions,
  deriveSafeInfoLevel,
  type RolePermissions,
  type RoleSnapshot,
} from './role-fail-closed';
import type { InfoLevel } from './PermissionGate';

export type RoleRefreshStage =
  | 'initial_loading'
  | 'ready'
  | 'background_refreshing'
  | 'background_refresh_failed'
  | 'blocked';

export type RoleRefreshReason =
  | 'initial'
  | 'identity_changed'
  | 'app_resumed'
  | 'role_invalidated'
  | 'manual_retry';

export interface RoleRefreshState {
  stage: RoleRefreshStage;
  shouldMountProtectedChildren: boolean;
  shouldShowBlockingFallback: boolean;
  isRefreshing: boolean;
  isAuthorizationFresh: boolean;
  needsRetry: boolean;
  refreshReason: RoleRefreshReason;
  permissions: RolePermissions;
  syncInfoLevel: InfoLevel;
}

export interface RoleRefreshOptions {
  hasUsablePreviousRole?: boolean;
  refreshReason?: RoleRefreshReason;
}

const failClosedPermissions: RolePermissions = Object.freeze({
  isOwner: false,
  canEdit: false,
  canViewSensitiveData: false,
  isStaff: true,
});

function blocked(
  stage: Extract<RoleRefreshStage, 'initial_loading' | 'blocked'>,
  refreshReason: RoleRefreshReason,
): RoleRefreshState {
  return {
    stage,
    shouldMountProtectedChildren: false,
    shouldShowBlockingFallback: true,
    isRefreshing: false,
    isAuthorizationFresh: false,
    needsRetry: stage === 'blocked',
    refreshReason,
    permissions: failClosedPermissions,
    syncInfoLevel: 0,
  };
}

export function deriveRoleRefreshState(
  snapshot: RoleSnapshot,
  options: RoleRefreshOptions = {},
): RoleRefreshState {
  const refreshReason = options.refreshReason ?? 'initial';

  if (snapshot.roleError) {
    if (options.hasUsablePreviousRole) {
      return {
        stage: 'background_refresh_failed',
        shouldMountProtectedChildren: true,
        shouldShowBlockingFallback: false,
        isRefreshing: false,
        isAuthorizationFresh: false,
        needsRetry: true,
        refreshReason,
        permissions: failClosedPermissions,
        syncInfoLevel: 0,
      };
    }

    return blocked('blocked', refreshReason);
  }

  if (snapshot.isLoading && options.hasUsablePreviousRole) {
    return {
      stage: 'background_refreshing',
      shouldMountProtectedChildren: true,
      shouldShowBlockingFallback: false,
      isRefreshing: true,
      isAuthorizationFresh: false,
      needsRetry: false,
      refreshReason,
      permissions: failClosedPermissions,
      syncInfoLevel: 0,
    };
  }

  if (snapshot.isLoading) {
    return blocked('initial_loading', refreshReason);
  }

  if (snapshot.userRole == null) {
    return blocked('blocked', refreshReason);
  }

  return {
    stage: 'ready',
    shouldMountProtectedChildren: true,
    shouldShowBlockingFallback: false,
    isRefreshing: false,
    isAuthorizationFresh: true,
    needsRetry: false,
    refreshReason,
    permissions: deriveRolePermissions(snapshot),
    syncInfoLevel: deriveSafeInfoLevel(snapshot),
  };
}
