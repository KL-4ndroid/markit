'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AuthManager } from '@/components/auth/AuthManager';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { SessionExpiredHandler } from '@/components/auth/SessionExpiredHandler';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWASplashScreen } from '@/components/PWASplashScreen';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { InitialSyncDialog } from '@/components/sync/InitialSyncDialog';
import { SyncProgressManager } from '@/components/sync/SyncProgressManager';
import { StaffInvitationDialog } from '@/components/staff/StaffInvitationDialog';
import { RegisterServiceWorker } from '@/app/register-sw';

const STANDALONE_PUBLIC_ROUTES = ['/demo'];

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

  if (isStandalonePublicRoute) {
    return (
      <>
        <main>{children}</main>
        <AppToaster />
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
            <PWAInstallPrompt />
            <PWAUpdatePrompt />
            <StaffInvitationDialog />
            <InitialSyncDialog />
            <SyncProgressManager />
            <RegisterServiceWorker />
            <AppToaster />
          </div>
        </RoleGuard>
      </AuthGuard>
      <AuthManager />
      <SessionExpiredHandler />
    </>
  );
}
