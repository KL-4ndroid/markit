'use client';

import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import { RoleLoadingFallback } from './RoleLoadingFallback';

interface RoleGuardProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ['/privacy', '/terms', '/about', '/demo'];

function ProtectedRoleGuard({ children }: RoleGuardProps) {
  const { isLoading: isRoleLoading, roleError } = useUserRole();

  if (isRoleLoading || roleError) {
    return <RoleLoadingFallback />;
  }

  return <>{children}</>;
}

export function RoleGuard({ children }: RoleGuardProps) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <ProtectedRoleGuard>{children}</ProtectedRoleGuard>;
}
