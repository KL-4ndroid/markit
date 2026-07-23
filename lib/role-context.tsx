'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/supabase/auth-context';
import { deriveRoleRefreshState, type RoleRefreshState } from '@/lib/permissions/role-refresh-state';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';

const FOREGROUND_ROLE_REVALIDATION_THROTTLE_MS = 5_000;

export interface RoleContextValue {
  userRole: UserRole;
  isLoading: boolean;
  roleError: Error | null;
  isStaff: boolean;
  isOwner: boolean;
  canEdit: boolean;
  canViewSensitiveData: boolean;
  roleRefreshState: RoleRefreshState;
  refreshRole: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const roleState = useUserRole();
  const revalidateRole = roleState.revalidate;
  const userId = user?.id ?? null;
  const isResolvedForCurrentUser = userId !== null && roleState.resolvedUserId === userId;
  const trackedUserIdRef = useRef<string | null>(userId);
  const hasUsablePreviousRoleRef = useRef(false);
  const lastForegroundRevalidationAtRef = useRef(0);

  if (trackedUserIdRef.current !== userId) {
    trackedUserIdRef.current = userId;
    hasUsablePreviousRoleRef.current = false;
  }

  const roleRefreshState = useMemo(() => deriveRoleRefreshState(
    {
      userRole: userId ? roleState.userRole : null,
      isLoading: roleState.isLoading || (userId !== null && !isResolvedForCurrentUser),
      roleError: roleState.roleError,
    },
    {
      hasUsablePreviousRole: hasUsablePreviousRoleRef.current,
      refreshReason: roleState.refreshReason,
    },
  ), [
    isResolvedForCurrentUser,
    roleState.isLoading,
    roleState.refreshReason,
    roleState.roleError,
    roleState.userRole,
    userId,
  ]);

  useEffect(() => {
    if (isResolvedForCurrentUser && !roleState.isLoading && !roleState.roleError && roleState.userRole != null) {
      hasUsablePreviousRoleRef.current = true;
    }
  }, [isResolvedForCurrentUser, roleState.isLoading, roleState.roleError, roleState.userRole, userId]);

  useEffect(() => getLifecyclePort().subscribe(lifecycleState => {
    if (lifecycleState !== 'active' || !userId) return;

    const now = Date.now();
    if (now - lastForegroundRevalidationAtRef.current < FOREGROUND_ROLE_REVALIDATION_THROTTLE_MS) {
      return;
    }

    lastForegroundRevalidationAtRef.current = now;
    revalidateRole('app_resumed');
  }), [revalidateRole, userId]);

  const contextValue = useMemo<RoleContextValue>(() => ({
    ...roleState,
    isLoading: roleRefreshState.shouldShowBlockingFallback,
    roleError: roleRefreshState.shouldShowBlockingFallback ? roleState.roleError : null,
    isStaff: roleState.userRole.isStaff,
    isOwner: userId !== null && !roleState.userRole.isStaff,
    canEdit: roleRefreshState.permissions.canEdit,
    canViewSensitiveData: roleRefreshState.permissions.canViewSensitiveData,
    roleRefreshState,
    refreshRole: () => revalidateRole('manual_retry'),
  }), [revalidateRole, roleRefreshState, roleState, userId]);

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRoleContext(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRoleContext must be used within RoleProvider');
  }
  return context;
}
