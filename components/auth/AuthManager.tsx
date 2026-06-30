'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectAnonymousData } from '@/lib/supabase/migration';
import { LoginModal } from './LoginModal';
import { MigrationModal } from './MigrationModal';

type LoginMode = 'login' | 'signup';
type LoginSuccessMeta = {
  invitationAccepted?: boolean;
};

export function AuthManager() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('login');
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationData, setMigrationData] = useState({
    userId: '',
    userEmail: '',
    marketCount: 0,
    eventCount: 0,
  });

  useEffect(() => {
    const handleOpenLogin = (event?: CustomEvent<{ mode?: LoginMode }>) => {
      const invitationToken = sessionStorage.getItem('invitation_token');
      const requestedMode = event?.detail?.mode;

      if (requestedMode) {
        setLoginMode(requestedMode);
      } else if (invitationToken) {
        setLoginMode('signup');
      } else {
        setLoginMode('login');
      }

      setShowLoginModal(true);
    };

    window.addEventListener('auth:open-login', handleOpenLogin as EventListener);

    return () => {
      window.removeEventListener('auth:open-login', handleOpenLogin as EventListener);
    };
  }, []);

  const handleLoginSuccess = async (userId: string, email: string, meta?: LoginSuccessMeta) => {
    setShowLoginModal(false);
    window.dispatchEvent(new CustomEvent('auth:login-success'));

    if (meta?.invitationAccepted) {
      router.replace('/');
      return;
    }

    const { hasAnonymousData, marketCount, eventCount } = await detectAnonymousData(userId);

    if (hasAnonymousData) {
      setMigrationData({
        userId,
        userEmail: email,
        marketCount,
        eventCount,
      });
      setShowMigrationModal(true);
    }
  };

  const handleMigrationComplete = () => {
    setShowMigrationModal(false);
  };

  return (
    <>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        defaultMode={loginMode}
      />

      <MigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        userId={migrationData.userId}
        userEmail={migrationData.userEmail}
        marketCount={migrationData.marketCount}
        eventCount={migrationData.eventCount}
        onMigrationComplete={handleMigrationComplete}
      />
    </>
  );
}

export function triggerLogin(mode: LoginMode = 'login') {
  window.dispatchEvent(new CustomEvent('auth:open-login', { detail: { mode } }));
}
