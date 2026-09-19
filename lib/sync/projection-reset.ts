/**
 * Sync Hydration 投影重設工具
 *
 * 重要：雲端 markets / products 表的 projection 欄位
 * （`totalRevenue / totalProfit / totalDeals / totalInteractions / totalSold`）
 * **不**應作為本地 IndexedDB 寫入的初始值。
 *
 * 原因（見 PROJECTION_DOUBLECOUNT_FIX_PLAN.md C3.4）：
 * 雲端 handler 已經把 events 累加進 `markets.total_revenue`。
 * 若本地直接寫入這個值，再 replay 同一批 `deal_closed` events，
 * `deal_closed` handler 會「`market.totalRevenue += totalAmount`」二次累加，
 * 導致 projection 變成「雲端值 + events 總和」（數倍）。
 *
 * 修法：sync 把市場/商品 hydrate 進 IndexedDB 時，把累加型欄位歸零，
 * 讓本地 events replay 從 0 開始累加為單一真相來源。
 *
 * 注意：`product.stock` **不**重設：
 * - stock 是「絕對剩餘量」，從雲端帶入是正確的（雲端 = truth source）
 * - 雲端 handler 已經扣過 stock，本地 replay 若再扣會造成雙重扣減（見 P4 候選）
 * - 我們只重設**累加型**投影欄位
 */

import type { Market, Product } from '@/types/db';

/**
 * 標記為「累加型 projection」的 market 欄位。
 * 這些欄位在 event handler 中以 `+=` 累加。
 */
export const MARKET_ACCUMULATIVE_PROJECTION_FIELDS = [
  'totalRevenue',
  'totalProfit',
  'totalDeals',
  'totalInteractions',
] as const;

export type MarketAccumulativeProjectionField =
  (typeof MARKET_ACCUMULATIVE_PROJECTION_FIELDS)[number];

/**
 * 標記為「累加型 projection」的 product 欄位。
 * `deal_closed` handler 對 `product.totalSold` 執行 `+= item.quantity`。
 * `product.stock` 不在此清單（見檔頭說明）。
 */
export const PRODUCT_ACCUMULATIVE_PROJECTION_FIELDS = ['totalSold'] as const;

export type ProductAccumulativeProjectionField =
  (typeof PRODUCT_ACCUMULATIVE_PROJECTION_FIELDS)[number];

/**
 * 把 market 的累加型 projection 欄位歸零。
 * 不修改其他欄位（保留雲端 metadata、權限資訊、市集基本資料等）。
 */
export function resetMarketProjectionFields<M extends Market | null | undefined>(
  market: M
): M {
  if (!market) return market;
  const reset: Market = { ...market };
  for (const field of MARKET_ACCUMULATIVE_PROJECTION_FIELDS) {
    reset[field] = 0 as never;
  }
  return reset as M;
}

/**
 * 把 product 的累加型 projection 欄位歸零。
 * `stock` 不重設（雲端 stock 是「絕對剩餘量」）。
 */
export function resetProductProjectionFields<P extends Product | null | undefined>(
  product: P
): P {
  if (!product) return product;
  const reset: Product = { ...product };
  for (const field of PRODUCT_ACCUMULATIVE_PROJECTION_FIELDS) {
    reset[field] = 0 as never;
  }
  return reset as P;
}
