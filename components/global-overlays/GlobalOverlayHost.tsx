'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';

import { type CoordinatedOverlayProps } from './overlay-types';

type OverlayId = 'staffInvitation' | 'initialSync' | 'pwaUpdate' | 'pwaInstall';

const OVERLAY_PRIORITY: readonly OverlayId[] = [
  'staffInvitation',
  'initialSync',
  'pwaUpdate',
  'pwaInstall',
];

const INITIAL_VISIBILITY: Record<OverlayId, boolean> = {
  staffInvitation: false,
  initialSync: false,
  pwaUpdate: false,
  pwaInstall: false,
};

const StaffInvitationDialog = dynamic<CoordinatedOverlayProps>(
  () => import('@/components/staff/StaffInvitationDialog').then(module => module.StaffInvitationDialog),
  { ssr: false },
);

const InitialSyncDialog = dynamic<CoordinatedOverlayProps>(
  () => import('@/components/sync/InitialSyncDialog').then(module => module.InitialSyncDialog),
  { ssr: false },
);

const PWAUpdatePrompt = dynamic<CoordinatedOverlayProps>(
  () => import('@/components/PWAUpdatePrompt').then(module => module.PWAUpdatePrompt),
  { ssr: false },
);

const PWAInstallPrompt = dynamic<CoordinatedOverlayProps>(
  () => import('@/components/PWAInstallPrompt').then(module => module.PWAInstallPrompt),
  { ssr: false },
);

export function GlobalOverlayHost() {
  const [visibility, setVisibility] = useState(INITIAL_VISIBILITY);

  const reportVisibility = useCallback((id: OverlayId, visible: boolean) => {
    setVisibility(current => (
      current[id] === visible ? current : { ...current, [id]: visible }
    ));
  }, []);

  const reportStaffInvitation = useCallback(
    (visible: boolean) => reportVisibility('staffInvitation', visible),
    [reportVisibility],
  );
  const reportInitialSync = useCallback(
    (visible: boolean) => reportVisibility('initialSync', visible),
    [reportVisibility],
  );
  const reportPwaUpdate = useCallback(
    (visible: boolean) => reportVisibility('pwaUpdate', visible),
    [reportVisibility],
  );
  const reportPwaInstall = useCallback(
    (visible: boolean) => reportVisibility('pwaInstall', visible),
    [reportVisibility],
  );

  const activeOverlay = OVERLAY_PRIORITY.find(id => visibility[id]) ?? null;
  const isSuppressed = (id: OverlayId) => activeOverlay !== null && activeOverlay !== id;

  return (
    <>
      <StaffInvitationDialog
        isSuppressed={isSuppressed('staffInvitation')}
        onVisibilityChange={reportStaffInvitation}
      />
      <InitialSyncDialog
        isSuppressed={isSuppressed('initialSync')}
        onVisibilityChange={reportInitialSync}
      />
      <PWAUpdatePrompt
        isSuppressed={isSuppressed('pwaUpdate')}
        onVisibilityChange={reportPwaUpdate}
      />
      <PWAInstallPrompt
        isSuppressed={isSuppressed('pwaInstall')}
        onVisibilityChange={reportPwaInstall}
      />
    </>
  );
}
