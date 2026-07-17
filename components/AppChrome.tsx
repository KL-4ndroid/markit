'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AuthManager } from '@/components/auth/AuthManager';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { SessionExpiredHandler } from '@/components/auth/SessionExpiredHandler';
import { AuthCacheBlockedDialog } from '@/components/auth/AuthCacheBlockedDialog';
import { BottomNavigation } from '@/components/BottomNavigation';
import { GlobalOverlayHost } from '@/components/global-overlays/GlobalOverlayHost';
import { PWASplashScreen } from '@/components/PWASplashScreen';
import { RegisterServiceWorker } from '@/app/register-sw';

const STANDALONE_PUBLIC_ROUTES = [
  '/demo',
  ...(process.env.NEXT_PUBLIC_APP_RUNTIME_SMOKE === '1' ? ['/mobile-runtime-smoke'] : []),
];
const AUTH_FLOW_PUBLIC_ROUTES = ['/join'];

function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: 'rgb(var(--brand-card))',
          color: 'rgb(var(--brand-foreground))',
          border: '1px solid rgb(var(--brand-primary) / 0.2)',
          borderRadius: '1rem',
          padding: '1rem',
        },
      }}
    />
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalonePublicRoute = STANDALONE_PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
  const isAuthFlowPublicRoute = AUTH_FLOW_PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

  if (isStandalonePublicRoute) {
    return (
      <>
        <main>{children}</main>
        <AppToaster />
      </>
    );
  }

  if (isAuthFlowPublicRoute) {
    return (
      <>
        <main>{children}</main>
        <AppToaster />
        <AuthManager />
        <SessionExpiredHandler />
        <AuthCacheBlockedDialog />
      </>
    );
  }

  return (
    <>
      <PWASplashScreen />
      <AuthGuard>
        <RoleGuard>
          <div className="min-h-screen bg-background">
            <main className="pb-24">
              {children}
            </main>
            <BottomNavigation />
            <GlobalOverlayHost />
            <RegisterServiceWorker />
            <AppToaster />
          </div>
        </RoleGuard>
      </AuthGuard>
      <AuthManager />
      <SessionExpiredHandler />
      <AuthCacheBlockedDialog />
    </>
  );
}
