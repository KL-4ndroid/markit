'use client';

import {
  ArrowRight,
  Banknote,
  Camera,
  CreditCard,
  MoreHorizontal,
  Smartphone,
} from 'lucide-react';

import {
  buildSalesPhotoEvidenceOwnerAlbumViewModel,
  type SalesPhotoEvidenceAlbumSourceRow,
  type SalesPhotoEvidenceOwnerAlbumActorRole,
} from '@/lib/sales/photo-evidence-owner-album-read-model';
import {
  buildSalesPhotoEvidenceTransactionIndex,
  type SalesPhotoEvidenceTransactionSummary,
} from '@/lib/sales/photo-evidence-owner-view';
import {
  SALES_PAYMENT_METHOD_LABELS,
  type SalesPaymentMethod,
} from '@/lib/sales/payment-methods';
import type { DealClosedPayload, Event } from '@/types/db';
import { SalesPhotoEvidenceOwnerAlbumImage } from './SalesPhotoEvidenceOwnerAlbumImage';

interface MarketOverviewPhotoStoryProps {
  actorRole: SalesPhotoEvidenceOwnerAlbumActorRole | null;
  ownerId: string | null | undefined;
  marketId: string | null | undefined;
  rows?: readonly SalesPhotoEvidenceAlbumSourceRow[];
  dealEvents?: readonly Event<DealClosedPayload>[];
  onViewAll: () => void;
}

const PAYMENT_METHOD_ICONS = {
  cash: Banknote,
  card: CreditCard,
  mobile: Smartphone,
  other: MoreHorizontal,
} satisfies Record<SalesPaymentMethod, typeof Banknote>;

function formatDateTime(value: string | null): string {
  if (!value) return '未記錄時間';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function TransactionCaption({
  transaction,
  saleCompletedAt,
}: {
  transaction?: SalesPhotoEvidenceTransactionSummary;
  saleCompletedAt: string | null;
}) {
  const PaymentIcon = transaction
    ? PAYMENT_METHOD_ICONS[transaction.paymentMethod]
    : null;

  return (
    <div className="flex items-end justify-between gap-3 border-t border-atelier-line bg-atelier-paper px-3 py-3">
      <div className="min-w-0">
        <p className="text-xs text-atelier-muted">{formatDateTime(saleCompletedAt)}</p>
        {transaction && (
          <p className="mt-1 text-base font-semibold tabular-nums text-atelier-ink">
            NT$ {transaction.amount.toLocaleString()}
          </p>
        )}
      </div>
      {transaction && PaymentIcon && (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-atelier-muted">
          <PaymentIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {SALES_PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
        </span>
      )}
    </div>
  );
}

export function MarketOverviewPhotoStory({
  actorRole,
  ownerId,
  marketId,
  rows = [],
  dealEvents = [],
  onViewAll,
}: MarketOverviewPhotoStoryProps) {
  if (actorRole !== 'owner' || !ownerId || !marketId) return null;

  const decision = buildSalesPhotoEvidenceOwnerAlbumViewModel({
    actorRole,
    ownerId,
    marketId,
    rows,
  });
  if (decision.action !== 'show_owner_album') return null;

  const items = decision.viewModel.items
    .filter(item => (
      item.displayStatus === 'uploaded_private'
      && (item.hasPrivateThumbnailObject || item.hasPrivateImageObject)
    ))
    .slice(0, 3);
  if (items.length === 0) return null;

  const transactionBySaleId = buildSalesPhotoEvidenceTransactionIndex(dealEvents);
  const [featured, ...secondary] = items;
  const featuredTransaction = featured.saleId
    ? transactionBySaleId.get(featured.saleId)
    : undefined;

  return (
    <section className="mb-4 rounded-card border border-atelier-line bg-atelier-paper p-4 sm:p-5" aria-labelledby="market-photo-story-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-atelier-clay">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            市集片段
          </p>
          <h2 id="market-photo-story-title" className="mt-1 text-lg font-semibold text-atelier-ink">
            最近成交照片
          </h2>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2 text-sm font-medium text-primary transition-colors hover:bg-atelier-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          查看全部
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className={`grid gap-2 ${secondary.length > 0 ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(14rem,0.65fr)]' : ''}`}>
        <article className="overflow-hidden rounded-card border border-atelier-line bg-atelier-canvas">
          <div className="aspect-[4/3] min-h-0 overflow-hidden sm:aspect-[16/9]">
            <SalesPhotoEvidenceOwnerAlbumImage
              evidenceId={featured.id}
              canLoad
              alt="最近一筆成交照片"
              previewVariant={featured.hasPrivateThumbnailObject ? 'thumbnail' : 'image'}
              fullVariant={featured.hasPrivateImageObject ? 'image' : 'thumbnail'}
            />
          </div>
          <TransactionCaption
            transaction={featuredTransaction}
            saleCompletedAt={featured.saleCompletedAt}
          />
        </article>

        {secondary.length > 0 && (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {secondary.map(item => (
              <article key={item.id} className="overflow-hidden rounded-card border border-atelier-line bg-atelier-canvas">
                <div className="aspect-square min-h-0 overflow-hidden lg:aspect-[16/9]">
                  <SalesPhotoEvidenceOwnerAlbumImage
                    evidenceId={item.id}
                    canLoad
                    alt="成交照片"
                    previewVariant={item.hasPrivateThumbnailObject ? 'thumbnail' : 'image'}
                    fullVariant={item.hasPrivateImageObject ? 'image' : 'thumbnail'}
                  />
                </div>
                <TransactionCaption
                  transaction={item.saleId ? transactionBySaleId.get(item.saleId) : undefined}
                  saleCompletedAt={item.saleCompletedAt}
                />
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
