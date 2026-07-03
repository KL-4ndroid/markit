'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/supabase/auth-context';
import { deriveRoleRefreshState, type RoleRefreshState } from '@/lib/permissions/role-refresh-state';

export interface RoleContextValue {
  userRole: UserRole;
  isLoading: boolean;
  roleError: Error | null;
  isStaff: boolean;
  isOwner: boolean;
  canEdit: boolean;
  canViewSensitiveData: boolean;
  roleRefreshState: RoleRefreshState;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const roleState = useUserRole();
  const userId = user?.id ?? null;
  const trackedUserIdRef = useRef<string | null>(userId);
  const hasUsablePreviousRoleRef = useRef(false);

  if (trackedUserIdRef.current !== userId) {
    trackedUserIdRef.current = userId;
    hasUsablePreviousRoleRef.current = false;
  }

  const roleRefreshState = useMemo(() => deriveRoleRefreshState(
    {
      userRole: userId ? roleState.userRole : null,
      isLoading: roleState.isLoading,
      roleError: roleState.roleError,
    },
    { hasUsablePreviousRole: hasUsablePreviousRoleRef.current },
  ), [roleState.isLoading, roleState.roleError, roleState.userRole, userId]);

  useEffect(() => {
    if (userId && !roleState.isLoading && !roleState.roleError && roleState.userRole != null) {
      hasUsablePreviousRoleRef.current = true;
    }
  }, [roleState.isLoading, roleState.roleError, roleState.userRole, userId]);

  const contextValue = useMemo<RoleContextValue>(() => ({
    ...roleState,
    roleRefreshState,
  }), [roleRefreshState, roleState]);

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
