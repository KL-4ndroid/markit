'use client';

import { usePathname } from 'next/navigation';
import { useRoleContext } from '@/lib/role-context';
import { RoleLoadingFallback } from './RoleLoadingFallback';

interface RoleGuardProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ['/privacy', '/terms', '/about', '/demo', '/join'];

function ProtectedRoleGuard({ children }: RoleGuardProps) {
  const { roleRefreshState } = useRoleContext();

  if (roleRefreshState.shouldShowBlockingFallback) {
    return <RoleLoadingFallback />;
  }

  return (
    <div
      className="contents"
      aria-busy={!roleRefreshState.isAuthorizationFresh || undefined}
      inert={!roleRefreshState.isAuthorizationFresh || undefined}
    >
      {children}
    </div>
  );
}

export function RoleGuard({ children }: RoleGuardProps) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <ProtectedRoleGuard>{children}</ProtectedRoleGuard>;
}
