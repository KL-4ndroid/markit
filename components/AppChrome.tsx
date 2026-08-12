'use client';

import dynamic from 'next/dynamic';
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
import {
  AUTH_FLOW_PUBLIC_ROUTES,
  isPathWithinAnyRoute,
  STANDALONE_PUBLIC_ROUTES,
} from '@/lib/navigation/public-route';

const ThemeLabGate = dynamic(
  () => import('@/components/dev/ThemeLabGate').then((module) => module.ThemeLabGate),
  { ssr: false },
);

const RUNTIME_STANDALONE_PUBLIC_ROUTES = [
  ...STANDALONE_PUBLIC_ROUTES,
  ...(process.env.NEXT_PUBLIC_APP_RUNTIME_SMOKE === '1' ? ['/mobile-runtime-smoke'] : []),
];

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
  const isStandalonePublicRoute = isPathWithinAnyRoute(pathname, RUNTIME_STANDALONE_PUBLIC_ROUTES);
  const isAuthFlowPublicRoute = isPathWithinAnyRoute(pathname, AUTH_FLOW_PUBLIC_ROUTES);

  if (isStandalonePublicRoute) {
    return (
      <>
        <main className="japanese-app">{children}</main>
        <RegisterServiceWorker />
        <AppToaster />
        <ThemeLabGate />
      </>
    );
  }

  if (isAuthFlowPublicRoute) {
    return (
      <>
        <main className="japanese-app">{children}</main>
        <AppToaster />
        <AuthManager />
        <SessionExpiredHandler />
        <AuthCacheBlockedDialog />
        <RegisterServiceWorker />
        <ThemeLabGate />
      </>
    );
  }

  return (
    <>
      <PWASplashScreen />
      <AuthGuard>
        <RoleGuard>
          <div className="japanese-app min-h-screen bg-background">
            <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
              <BottomNavigation />
              <main className="min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
                {children}
              </main>
            </div>
            <GlobalOverlayHost />
            <AppToaster />
          </div>
        </RoleGuard>
      </AuthGuard>
      <AuthManager />
      <SessionExpiredHandler />
      <AuthCacheBlockedDialog />
      <RegisterServiceWorker />
      <ThemeLabGate />
    </>
  );
}
