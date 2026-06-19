'use client';

import { useRouter } from 'next/navigation';
import { Package, Utensils, Gem, Shirt, Palette, BookOpen, MoreHorizontal, Shield, Hand, Cookie } from 'lucide-react';
import type { Product, ProductCategory } from '@/types/db';
import { formatCurrency } from '@/lib/utils';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  canEdit?: boolean;
}

/**
 * 商品卡片組件
 * 
 * 使用分類背景色和圖標替代圖片
 * 遵循日系設計系統的柔和色彩
 * 
 * ✅ 支援員工模式：
 * - 顯示身份標籤（老闆/員工）
 * - 員工模式下隱藏敏感數據（成本、利潤率）
 * - 員工模式下禁用編輯功能
 */
export function ProductCard({ product, onEdit, canEdit = false }: ProductCardProps) {
  const router = useRouter();
  
  // ✅ 員工權限檢查
  const { isStaff, canViewSensitiveData } = useStaffPermissions();
  const productAccessItem = product.id
    ? (product as unknown as Parameters<typeof isStaff>[0])
    : undefined;
  
  // ✅ 檢查是否有權限欄位（向後兼容）
  const hasPermissions = product.access_type !== undefined;

  // 根據分類返回對應的背景色和圖標
  const getCategoryStyle = (category: ProductCategory) => {
    const styles: Record<ProductCategory, { bg: string; icon: typeof Package; text: string }> = {
      handmade: {
        bg: 'bg-soft-pink',      // 柔粉色
        icon: Hand,
        text: '手作',
      },
      food: {
        bg: 'bg-soft-yellow',      // 柔黃色
        icon: Cookie,
        text: '食品',
      },
      accessory: {
        bg: 'bg-soft-green',      // 柔綠色
        icon: Gem,
        text: '飾品',
      },
      clothing: {
        bg: 'bg-cat-clothing',    // 柔藍色（cat-clothing token）
        icon: Shirt,
        text: '服飾',
      },
      art: {
        bg: 'bg-cat-art',         // 柔紫色（cat-art token）
        icon: Palette,
        text: '藝術品',
      },
      stationery: {
        bg: 'bg-cat-stationery',  // 柔橘色（cat-stationery token）
        icon: BookOpen,
        text: '文具',
      },
      other: {
        bg: 'bg-cat-other',       // 淺灰色（cat-other token）
        icon: MoreHorizontal,
        text: '其他',
      },
    };
    return styles[category] || styles.other;
  };

  const categoryStyle = getCategoryStyle(product.category);
  const Icon = categoryStyle.icon;

  // ✅ 點擊卡片觸發編輯（員工模式下禁用）
  const handleClick = () => {
    // 員工模式下不允許編輯
    if (isStaff(productAccessItem) && !canEdit) {
      return;
    }
    
    if (onEdit) {
      onEdit(product);
    } else {
      if (!product.id) {
        console.error('Cannot open product detail because product id is missing:', product);
        return;
      }

      router.push(`/products/${product.id}`);
    }
  };

  // 計算利潤率
  const getProfitMargin = () => {
    if (!product.cost || product.cost === 0) return null;
    const margin = ((product.price - product.cost) / product.price) * 100;
    return Math.round(margin);
  };

  const profitMargin = getProfitMargin();

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-[1.5rem] overflow-hidden shadow-md shadow-primary/5 ${
        isStaff(productAccessItem) && !canEdit ? 'cursor-default' : 'cursor-pointer hover:shadow-lg'
      } transition-shadow`}
    >
      {/* 圖標區域 */}
      <div className={`${categoryStyle.bg} p-6 flex items-center justify-center relative`}>
        <Icon className="w-12 h-12 text-foreground/70" strokeWidth={1.5} />
        
        {/* 分類標籤 */}
        <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
          <span className="text-xs text-muted-foreground">{categoryStyle.text}</span>
        </div>
        
        {/* ✅ 員工模式標籤 - 只在有權限欄位且為員工時顯示 */}
        {hasPermissions && isStaff(productAccessItem) && (
          <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">員工</span>
          </div>
        )}

        {/* 停用標記 */}
        {!product.isActive && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="bg-white/90 px-3 py-1 rounded-full text-xs text-muted-foreground">
              已停用
            </span>
          </div>
        )}
      </div>

      {/* 資訊區域 */}
      <div className="p-4">
        {/* 商品名稱 */}
        <h3 className="text-base font-medium text-foreground mb-2 line-clamp-1">
          {product.name}
        </h3>

        {/* 價格與成本 */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-xl font-medium text-primary tabular-nums">
            {formatCurrency(product.price)}
          </span>
          {/* ✅ 成本只有老闆可見（向後兼容：沒有權限欄位時顯示） */}
          {product.cost && (!hasPermissions || canViewSensitiveData(productAccessItem)) && (
            <span className="text-xs text-muted-foreground line-through tabular-nums">
              成本 {formatCurrency(product.cost)}
            </span>
          )}
        </div>

        {/* 統計資訊 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {/* 庫存 */}
            {product.unlimitedStock ? (
              <span className="text-primary font-medium">庫存 ∞</span>
            ) : product.stock !== undefined ? (
              <span className={product.stock === 0 ? 'text-danger' : ''}>
                庫存 {product.stock}
              </span>
            ) : null}
            
            {/* 已售 */}
            {product.totalSold !== undefined && product.totalSold > 0 && (
              <span>已售 {product.totalSold}</span>
            )}
          </div>

          {/* ✅ 利潤率只有老闆可見（向後兼容：沒有權限欄位時顯示） */}
          {profitMargin !== null && (!hasPermissions || canViewSensitiveData(productAccessItem)) && (
            <span className={`font-medium ${profitMargin > 50 ? 'text-primary' : 'text-secondary'}`}>
              {profitMargin}%
            </span>
          )}
        </div>

        {/* 描述 */}
        {product.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {product.description}
          </p>
        )}
      </div>
    </div>
  );
}
