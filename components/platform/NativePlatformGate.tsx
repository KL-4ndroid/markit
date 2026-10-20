'use client';

import { useEffect, useState } from 'react';
import { initializeAppPlatform } from '@/lib/platform/app-bootstrap';

function MobileStartup({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'starting' | 'ready' | 'failed'>('starting');
  useEffect(() => {
    let active = true;
    void initializeAppPlatform().then(() => { if (active) setStatus('ready'); }, () => { if (active) setStatus('failed'); });
    // The process-wide installation survives StrictMode and route remounts.
    return () => { active = false; };
  }, []);
  if (status === 'ready') return <>{children}</>;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center text-foreground"
      role={status === 'failed' ? 'alert' : 'status'} aria-live="polite">
      <p>{status === 'failed' ? '裝置功能準備失敗，請關閉並重新開啟 App。' : '正在準備裝置功能…'}</p>
    </div>
  );
}

export function NativePlatformGate({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_APP_BUILD_TARGET !== 'mobile') return <>{children}</>;
  return <MobileStartup>{children}</MobileStartup>;
}
