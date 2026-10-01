import { db } from '@/lib/db';
import type { Product } from '@/types/db';

export async function getProductDetail(productId: string): Promise<Product | undefined> {
  if (!productId.trim()) {
    return undefined;
  }

  return db.products.get(productId);
}
