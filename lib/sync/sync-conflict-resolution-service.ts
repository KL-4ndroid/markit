import { db } from '@/lib/db';
import { marketRowToLocal, productRowToLocal } from '@/lib/data-mappers';
import { createPermissionGate, sanitizeWithLevel, type InfoLevel } from '@/lib/data-sanitization';
import type { Market, Product } from '@/types/db';

interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge';
  reason: string;
}

function sanitizeWritePayload(
  tableName: 'markets' | 'products',
  data: Market | Product,
  infoLevel: InfoLevel
): Record<string, unknown> {
  if (infoLevel >= 3) return data as unknown as Record<string, unknown>;
  if (tableName === 'markets') {
    return createPermissionGate({ infoLevel, entity: 'market' })
      .sanitizeMarketProjection(data as unknown as Record<string, unknown>);
  }
  return sanitizeWithLevel(
    data as unknown as Record<string, unknown>,
    'product',
    infoLevel
  );
}

async function resolveMarketConflict(
  localData: any,
  remoteData: any
): Promise<ConflictResolution> {
  const normalizedRemote = marketRowToLocal(remoteData as Record<string, unknown>);

  const localUpdatedAt = localData.updatedAt || 0;
  const remoteUpdatedAt = normalizedRemote.updatedAt || 0;

  if (localUpdatedAt > remoteUpdatedAt) {
    return {
      strategy: 'local',
      reason: 'local data is newer',
    };
  }

  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      strategy: 'remote',
      reason: 'remote data is newer',
    };
  }

  const localRevenue = localData.totalRevenue || 0;
  const remoteRevenue = normalizedRemote.totalRevenue || 0;

  const localDeals = localData.totalDeals || 0;
  const remoteDeals = normalizedRemote.totalDeals || 0;

  if (localRevenue !== remoteRevenue || localDeals !== remoteDeals) {
    return {
      strategy: 'merge',
      reason: 'market stats differ',
    };
  }

  return {
    strategy: 'local',
    reason: 'data is equivalent',
  };
}

async function mergeMarketData(
  localData: any,
  remoteData: any,
  infoLevel: InfoLevel = 3
): Promise<any> {
  console.log(`[sync-conflict] merging market data: ${localData.id?.substring(0, 8)}...`);
  const sanitizedRemote = sanitizeWritePayload(
    'markets',
    marketRowToLocal(remoteData as Record<string, unknown>),
    infoLevel
  );

  return {
    ...sanitizedRemote,
    totalRevenue: Math.max(
      Number(localData.totalRevenue) || 0,
      Number(sanitizedRemote.totalRevenue) || 0
    ),
    totalProfit: Math.max(
      Number(localData.totalProfit) || 0,
      Number(sanitizedRemote.totalProfit) || 0
    ),
    totalDeals: Math.max(
      Number(localData.totalDeals) || 0,
      Number(sanitizedRemote.totalDeals) || 0
    ),
    totalInteractions: Math.max(
      Number(localData.totalInteractions) || 0,
      Number(sanitizedRemote.totalInteractions) || 0
    ),
    updatedAt: Math.max(
      Number(localData.updatedAt) || 0,
      Number(sanitizedRemote.updatedAt) || 0
    ),
  };
}

async function resolveProductConflict(
  localData: any,
  remoteData: any
): Promise<ConflictResolution> {
  const normalizedRemote = productRowToLocal(remoteData as Record<string, unknown>);

  const localUpdatedAt = localData.updatedAt || 0;
  const remoteUpdatedAt = normalizedRemote.updatedAt || 0;

  if (localUpdatedAt > remoteUpdatedAt) {
    return {
      strategy: 'local',
      reason: 'local data is newer',
    };
  }

  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      strategy: 'remote',
      reason: 'remote data is newer',
    };
  }

  const localStock = localData.stock || 0;
  const remoteStock = normalizedRemote.stock || 0;

  const localSold = localData.totalSold || 0;
  const remoteSold = normalizedRemote.totalSold || 0;

  if (localStock !== remoteStock || localSold !== remoteSold) {
    return {
      strategy: 'merge',
      reason: 'product stock or sales stats differ',
    };
  }

  return {
    strategy: 'local',
    reason: 'data is equivalent',
  };
}

async function mergeProductData(
  localData: any,
  remoteData: any,
  infoLevel: InfoLevel = 3
): Promise<any> {
  console.log(`[sync-conflict] merging product data: ${localData.id?.substring(0, 8)}...`);
  const sanitizedRemote = sanitizeWritePayload(
    'products',
    productRowToLocal(remoteData as Record<string, unknown>),
    infoLevel
  );

  return {
    ...sanitizedRemote,
    ...(infoLevel >= 3
      ? {
          stock: Math.min(
            Number(localData.stock) || 0,
            Number(sanitizedRemote.stock) || 0
          ),
        }
      : { stock: sanitizedRemote.stock }),
    totalSold: Math.max(
      Number(localData.totalSold) || 0,
      Number(sanitizedRemote.totalSold) || 0
    ),
    updatedAt: Math.max(
      Number(localData.updatedAt) || 0,
      Number(sanitizedRemote.updatedAt) || 0
    ),
  };
}

export async function detectAndResolveConflict(
  tableName: 'markets' | 'products',
  localData: any,
  remoteData: any,
  infoLevel: InfoLevel = 3
): Promise<boolean> {
  try {
    let resolution: ConflictResolution;

    if (tableName === 'markets') {
      resolution = await resolveMarketConflict(localData, remoteData);
    } else {
      resolution = await resolveProductConflict(localData, remoteData);
    }

    console.log(`[sync-conflict] detected: ${tableName} (${localData.id?.substring(0, 8)}...) - ${resolution.strategy} (${resolution.reason})`);

    switch (resolution.strategy) {
      case 'local':
        return false;

      case 'remote': {
        const remote = sanitizeWritePayload(
          tableName,
          tableName === 'markets'
            ? marketRowToLocal(remoteData as Record<string, unknown>)
            : productRowToLocal(remoteData as Record<string, unknown>),
          infoLevel
        );
        if (tableName === 'markets') {
          await db.markets.update(localData.id, remote as unknown as Partial<Market>);
        } else {
          await db.products.update(localData.id, remote as unknown as Partial<Product>);
        }
        return true;
      }

      case 'merge': {
        let mergedData: any;

        if (tableName === 'markets') {
          mergedData = await mergeMarketData(localData, remoteData, infoLevel);
          await db.markets.update(localData.id, mergedData as unknown as Partial<Market>);
        } else {
          mergedData = await mergeProductData(localData, remoteData, infoLevel);
          await db.products.update(localData.id, mergedData as unknown as Partial<Product>);
        }

        console.log(`[sync-conflict] merged: ${tableName} (${localData.id?.substring(0, 8)}...)`);
        return true;
      }

      default:
        return false;
    }
  } catch (error) {
    console.error(`[sync-conflict] failed: ${tableName} (${localData.id})`, error);
    return false;
  }
}
