'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';

export interface RoleContextValue {
  userRole: UserRole;
  isLoading: boolean;
  roleError: Error | null;
  isStaff: boolean;
  isOwner: boolean;
  canEdit: boolean;
  canViewSensitiveData: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const roleState = useUserRole();

  return (
    <RoleContext.Provider value={roleState}>
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
