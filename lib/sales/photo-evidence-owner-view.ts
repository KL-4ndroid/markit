import {
  getDealEventRevenue,
  getDealPaymentMethod,
} from '@/lib/markets/event-view-utils';
import type { SalesPhotoEvidenceAlbumSourceRow } from '@/lib/sales/photo-evidence-owner-album-read-model';
import type { SalesPaymentMethod } from '@/lib/sales/payment-methods';
import type { DealClosedPayload, Event } from '@/types/db';

export type SalesPhotoEvidenceTransactionSummary = {
  amount: number;
  paymentMethod: SalesPaymentMethod;
};

export type SalesPhotoEvidenceOwnerImageDescriptor = {
  evidenceId: string;
  previewVariant: 'image' | 'thumbnail';
  fullVariant: 'image' | 'thumbnail';
};

function optionalString(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function buildSalesPhotoEvidenceTransactionIndex(
  deals: readonly Event<DealClosedPayload>[]
): ReadonlyMap<string, SalesPhotoEvidenceTransactionSummary> {
  const index = new Map<string, SalesPhotoEvidenceTransactionSummary>();

  for (const deal of deals) {
    if (!deal.id) continue;

    index.set(deal.id, {
      amount: getDealEventRevenue(deal),
      paymentMethod: getDealPaymentMethod(deal),
    });
  }

  return index;
}

export function findSalesPhotoEvidenceOwnerImageForSale(
  rows: readonly SalesPhotoEvidenceAlbumSourceRow[],
  saleId: string | null | undefined,
  now: string | number | Date = Date.now()
): SalesPhotoEvidenceOwnerImageDescriptor | null {
  if (!saleId) return null;

  const nowDate = now instanceof Date ? now : new Date(now);
  const nowTime = Number.isFinite(nowDate.getTime()) ? nowDate.getTime() : Date.now();

  for (const row of rows) {
    const rowSaleId = optionalString(row.sale_id ?? row.saleId);
    const deletedAt = optionalString(row.deleted_at ?? row.deletedAt);
    if (rowSaleId !== saleId || deletedAt || row.status !== 'uploaded') continue;

    const expiresAt = optionalString(row.expires_at ?? row.expiresAt);
    if (expiresAt) {
      const expiresTime = new Date(expiresAt).getTime();
      if (Number.isFinite(expiresTime) && expiresTime <= nowTime) continue;
    }

    const imageObjectKey = optionalString(row.r2_object_key ?? row.r2ObjectKey);
    const thumbnailObjectKey = optionalString(row.r2_thumbnail_key ?? row.r2ThumbnailKey);
    if (!imageObjectKey && !thumbnailObjectKey) continue;

    return {
      evidenceId: row.id,
      previewVariant: thumbnailObjectKey ? 'thumbnail' : 'image',
      fullVariant: imageObjectKey ? 'image' : 'thumbnail',
    };
  }

  return null;
}
