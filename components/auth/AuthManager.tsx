'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectAnonymousData } from '@/lib/supabase/migration';
import { LoginModal } from './LoginModal';
import { MigrationModal } from './MigrationModal';

type LoginMode = 'login' | 'signup';
type LoginSuccessMeta = {
  invitationAccepted?: boolean;
  invitationLogin?: boolean;
};

export function AuthManager() {
  const router = useRouter();
  const migrationDetectionRequestRef = useRef(0);
  const migrationDetectionTimeoutRef = useRef<number | null>(null);
  const migrationDetectionIdleRef = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (migrationDetectionTimeoutRef.current != null) {
        window.clearTimeout(migrationDetectionTimeoutRef.current);
      }
      if (migrationDetectionIdleRef.current != null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(migrationDetectionIdleRef.current);
      }
    };
  }, []);

  const scheduleAnonymousDataDetection = (userId: string, email: string) => {
    const requestId = ++migrationDetectionRequestRef.current;

    const runDetection = async () => {
      const { hasAnonymousData, marketCount, eventCount } = await detectAnonymousData(userId);
      if (requestId !== migrationDetectionRequestRef.current) return;

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

    if (typeof window.requestIdleCallback === 'function') {
      migrationDetectionIdleRef.current = window.requestIdleCallback(() => {
        void runDetection();
      }, { timeout: 2000 });
      return;
    }

    migrationDetectionTimeoutRef.current = window.setTimeout(() => {
      void runDetection();
    }, 250);
  };

  const handleLoginSuccess = async (userId: string, email: string, meta?: LoginSuccessMeta) => {
    setShowLoginModal(false);
    window.dispatchEvent(new CustomEvent('auth:login-success'));

    if (meta?.invitationAccepted) {
      migrationDetectionRequestRef.current += 1;
      router.replace('/');
      return;
    }

    if (meta?.invitationLogin) {
      migrationDetectionRequestRef.current += 1;
      return;
    }

    scheduleAnonymousDataDetection(userId, email);
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
