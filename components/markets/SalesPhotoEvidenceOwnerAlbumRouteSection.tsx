'use client';

import { SalesPhotoEvidenceOwnerAlbumShell } from '@/components/markets/SalesPhotoEvidenceOwnerAlbumShell';
import {
  buildSalesPhotoEvidenceOwnerAlbumViewModel,
  type SalesPhotoEvidenceAlbumSourceRow,
  type SalesPhotoEvidenceOwnerAlbumActorRole,
} from '@/lib/sales/photo-evidence-owner-album-read-model';

interface SalesPhotoEvidenceOwnerAlbumRouteSectionProps {
  actorRole: SalesPhotoEvidenceOwnerAlbumActorRole | null;
  ownerId: string | null | undefined;
  marketId: string | null | undefined;
  rows?: readonly SalesPhotoEvidenceAlbumSourceRow[];
  isRoleReady?: boolean;
  isLoading?: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
  className?: string;
}

export function SalesPhotoEvidenceOwnerAlbumRouteSection({
  actorRole,
  ownerId,
  marketId,
  rows = [],
  isRoleReady = true,
  isLoading = false,
  loadError = null,
  onRefresh,
  className,
}: SalesPhotoEvidenceOwnerAlbumRouteSectionProps) {
  if (!isRoleReady || actorRole !== 'owner' || !ownerId || !marketId) {
    return null;
  }

  const decision = buildSalesPhotoEvidenceOwnerAlbumViewModel({
    actorRole,
    ownerId,
    marketId,
    rows,
  });

  if (decision.action !== 'show_owner_album') {
    return null;
  }

  return (
    <SalesPhotoEvidenceOwnerAlbumShell
      viewModel={decision.viewModel}
      isLoading={isLoading}
      loadError={loadError}
      onRefresh={onRefresh}
      className={className}
    />
  );
}
