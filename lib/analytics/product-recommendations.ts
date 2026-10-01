import type { DailyStats, Product } from '@/types/db';
import type { AnalyticsConfidence } from './actionable-insights';

export type ProductRecommendationAction = 'restock' | 'promote' | 'watch';

export interface ProductRecommendation {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  action: ProductRecommendationAction;
  reason: string;
  confidence: AnalyticsConfidence;
  isEstimated: boolean;
  estimatedReason?: string;
}

export interface ProductRecommendationInput {
  dailyStats?: DailyStats[];
  products?: Product[];
  confidence: AnalyticsConfidence;
}

interface ProductSalesAccumulator {
  quantity: number;
  revenue: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasValidProductId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getProductName(productId: string, productsById: Map<string, Product>): string {
  return productsById.get(productId)?.name ?? '未命名商品';
}

function getEstimatedReason(product: Product | undefined): string | undefined {
  const missingSignals: string[] = [];

  if (!product) {
    missingSignals.push('商品基本資料');
  } else {
    if (!isFiniteNumber(product.cost)) missingSignals.push('成本');
    if (product.unlimitedStock !== true && !isFiniteNumber(product.stock)) missingSignals.push('庫存');
  }

  if (missingSignals.length === 0) return undefined;
  return `缺少${missingSignals.join('、')}資料，因此建議以銷售紀錄估算。`;
}

function chooseAction(
  quantity: number,
  product: Product | undefined
): ProductRecommendationAction {
  const hasFiniteStock = isFiniteNumber(product?.stock);

  if (quantity >= 5) {
    if (product?.unlimitedStock === true) return 'promote';
    if (!hasFiniteStock) return 'restock';
    return (product.stock ?? 0) <= quantity ? 'restock' : 'promote';
  }

  if (quantity >= 3) return 'promote';
  return 'watch';
}

function buildReason(
  action: ProductRecommendationAction,
  quantity: number,
  revenue: number,
  product: Product | undefined
): string {
  if (action === 'restock') {
    if (isFiniteNumber(product?.stock)) {
      return `已記錄 ${quantity} 件銷售，且目前庫存可能不足，下一場前優先確認補貨。`;
    }

    return `已記錄 ${quantity} 件銷售，是目前較明顯的需求訊號；因庫存不完整，先以保守補貨量準備。`;
  }

  if (action === 'promote') {
    return `已記錄 ${quantity} 件、約 $${Math.round(revenue).toLocaleString('zh-TW')} 營收，可在下一場放到更醒目的位置或主打組合。`;
  }

  return '目前銷售訊號還少，先繼續觀察，不急著大量補貨或調價。';
}

export function buildProductRecommendations(
  input: ProductRecommendationInput
): ProductRecommendation[] {
  const productsById = new Map(
    (input.products ?? [])
      .filter((product) => hasValidProductId(product.id))
      .map((product) => [product.id!, product])
  );

  const salesByProduct = new Map<string, ProductSalesAccumulator>();

  for (const stat of input.dailyStats ?? []) {
    for (const item of stat.productsSold ?? []) {
      if (!hasValidProductId(item.productId)) continue;

      const quantity = Math.max(0, isFiniteNumber(item.quantity) ? item.quantity : 0);
      const revenue = Math.max(0, isFiniteNumber(item.revenue) ? item.revenue : 0);
      if (quantity === 0 && revenue === 0) continue;

      const existing = salesByProduct.get(item.productId) ?? { quantity: 0, revenue: 0 };
      salesByProduct.set(item.productId, {
        quantity: existing.quantity + quantity,
        revenue: existing.revenue + revenue,
      });
    }
  }

  return Array.from(salesByProduct.entries())
    .map(([productId, stats]) => {
      const product = productsById.get(productId);
      const action = chooseAction(stats.quantity, product);
      const estimatedReason = getEstimatedReason(product);

      return {
        productId,
        productName: getProductName(productId, productsById),
        quantity: stats.quantity,
        revenue: stats.revenue,
        action,
        reason: buildReason(action, stats.quantity, stats.revenue, product),
        confidence: input.confidence,
        isEstimated: estimatedReason !== undefined,
        estimatedReason,
      };
    })
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 3);
}
