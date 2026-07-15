'use client';

import { SalesPhotoEvidenceOwnerAlbumShell } from '@/components/markets/SalesPhotoEvidenceOwnerAlbumShell';
import {
  buildSalesPhotoEvidenceOwnerAlbumViewModel,
  type SalesPhotoEvidenceAlbumSourceRow,
  type SalesPhotoEvidenceOwnerAlbumActorRole,
} from '@/lib/sales/photo-evidence-owner-album-read-model';
import { buildSalesPhotoEvidenceTransactionIndex } from '@/lib/sales/photo-evidence-owner-view';
import type { DealClosedPayload, Event } from '@/types/db';

interface SalesPhotoEvidenceOwnerAlbumRouteSectionProps {
  actorRole: SalesPhotoEvidenceOwnerAlbumActorRole | null;
  ownerId: string | null | undefined;
  marketId: string | null | undefined;
  rows?: readonly SalesPhotoEvidenceAlbumSourceRow[];
  dealEvents?: readonly Event<DealClosedPayload>[];
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
  dealEvents = [],
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

  const transactionBySaleId = buildSalesPhotoEvidenceTransactionIndex(dealEvents);

  return (
    <SalesPhotoEvidenceOwnerAlbumShell
      viewModel={decision.viewModel}
      isLoading={isLoading}
      loadError={loadError}
      onRefresh={onRefresh}
      transactionBySaleId={transactionBySaleId}
      className={className}
    />
  );
}
