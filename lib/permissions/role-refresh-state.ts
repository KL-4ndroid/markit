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
  | 'blocked';

export interface RoleRefreshState {
  stage: RoleRefreshStage;
  shouldMountProtectedChildren: boolean;
  shouldShowBlockingFallback: boolean;
  isRefreshing: boolean;
  permissions: RolePermissions;
  syncInfoLevel: InfoLevel;
}

export interface RoleRefreshOptions {
  hasUsablePreviousRole?: boolean;
}

const failClosedPermissions: RolePermissions = Object.freeze({
  isOwner: false,
  canEdit: false,
  canViewSensitiveData: false,
  isStaff: true,
});

function blocked(stage: Extract<RoleRefreshStage, 'initial_loading' | 'blocked'>): RoleRefreshState {
  return {
    stage,
    shouldMountProtectedChildren: false,
    shouldShowBlockingFallback: true,
    isRefreshing: false,
    permissions: failClosedPermissions,
    syncInfoLevel: 0,
  };
}

export function deriveRoleRefreshState(
  snapshot: RoleSnapshot,
  options: RoleRefreshOptions = {},
): RoleRefreshState {
  if (snapshot.roleError) {
    return blocked('blocked');
  }

  if (snapshot.isLoading && options.hasUsablePreviousRole) {
    return {
      stage: 'background_refreshing',
      shouldMountProtectedChildren: true,
      shouldShowBlockingFallback: false,
      isRefreshing: true,
      permissions: failClosedPermissions,
      syncInfoLevel: 0,
    };
  }

  if (snapshot.isLoading) {
    return blocked('initial_loading');
  }

  if (snapshot.userRole == null) {
    return blocked('blocked');
  }

  return {
    stage: 'ready',
    shouldMountProtectedChildren: true,
    shouldShowBlockingFallback: false,
    isRefreshing: false,
    permissions: deriveRolePermissions(snapshot),
    syncInfoLevel: deriveSafeInfoLevel(snapshot),
  };
}
