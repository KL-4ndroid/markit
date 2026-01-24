'use client';

import { useRouter } from 'next/navigation';
import { Package, Utensils, Gem, Shirt, Palette, BookOpen, MoreHorizontal } from 'lucide-react';
import type { Product, ProductCategory } from '@/types/db';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
}

/**
 * 商品卡片組件
 * 
 * 使用分類背景色和圖標替代圖片
 * 遵循日系設計系統的柔和色彩
 */
export function ProductCard({ product, onEdit }: ProductCardProps) {
  const router = useRouter();

  // 根據分類返回對應的背景色和圖標
  const getCategoryStyle = (category: ProductCategory) => {
    const styles = {
      handmade: {
        bg: 'bg-[#F5E6E8]',      // 柔粉色
        icon: Package,
        emoji: '🖐️',
        text: '手作',
      },
      food: {
        bg: 'bg-[#FFF8E7]',      // 柔黃色
        icon: Utensils,
        emoji: '🍰',
        text: '食品',
      },
      accessory: {
        bg: 'bg-[#E8F3E8]',      // 柔綠色
        icon: Gem,
        emoji: '💎',
        text: '飾品',
      },
      clothing: {
        bg: 'bg-[#E8F0F8]',      // 柔藍色
        icon: Shirt,
        emoji: '👕',
        text: '服飾',
      },
      art: {
        bg: 'bg-[#F8E8F0]',      // 柔紫色
        icon: Palette,
        emoji: '🎨',
        text: '藝術品',
      },
      stationery: {
        bg: 'bg-[#FFF0E8]',      // 柔橘色
        icon: BookOpen,
        emoji: '📚',
        text: '文具',
      },
      other: {
        bg: 'bg-[#F0F0F0]',      // 柔灰色
        icon: MoreHorizontal,
        emoji: '📦',
        text: '其他',
      },
    };
    return styles[category] || styles.other;
  };

  const categoryStyle = getCategoryStyle(product.category);
  const Icon = categoryStyle.icon;

  // 點擊卡片觸發編輯
  const handleClick = () => {
    if (onEdit) {
      onEdit(product);
    } else {
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
      className="bg-white rounded-[1.5rem] overflow-hidden shadow-md shadow-[#7B9FA6]/5 cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* 圖標區域 */}
      <div className={`${categoryStyle.bg} p-6 flex items-center justify-center relative`}>
        <div className="text-5xl">{categoryStyle.emoji}</div>
        
        {/* 分類標籤 */}
        <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
          <span className="text-xs text-[#6B6B6B]">{categoryStyle.text}</span>
        </div>

        {/* 停用標記 */}
        {!product.isActive && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="bg-white/90 px-3 py-1 rounded-full text-xs text-[#6B6B6B]">
              已停用
            </span>
          </div>
        )}
      </div>

      {/* 資訊區域 */}
      <div className="p-4">
        {/* 商品名稱 */}
        <h3 className="text-base font-medium text-[#3A3A3A] mb-2 line-clamp-1">
          {product.name}
        </h3>

        {/* 價格與成本 */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-xl font-medium text-[#7B9FA6] tabular-nums">
            {formatCurrency(product.price)}
          </span>
          {product.cost && (
            <span className="text-xs text-[#6B6B6B] line-through tabular-nums">
              成本 {formatCurrency(product.cost)}
            </span>
          )}
        </div>

        {/* 統計資訊 */}
        <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
          <div className="flex items-center gap-3">
            {/* 庫存 */}
            {product.unlimitedStock ? (
              <span className="text-[#7B9FA6] font-medium">庫存 ∞</span>
            ) : product.stock !== undefined ? (
              <span className={product.stock === 0 ? 'text-[#d4183d]' : ''}>
                庫存 {product.stock}
              </span>
            ) : null}
            
            {/* 已售 */}
            {product.totalSold !== undefined && product.totalSold > 0 && (
              <span>已售 {product.totalSold}</span>
            )}
          </div>

          {/* 利潤率 */}
          {profitMargin !== null && (
            <span className={`font-medium ${profitMargin > 50 ? 'text-[#7B9FA6]' : 'text-[#D4A574]'}`}>
              {profitMargin}%
            </span>
          )}
        </div>

        {/* 描述 */}
        {product.description && (
          <p className="text-xs text-[#6B6B6B] mt-2 line-clamp-2">
            {product.description}
          </p>
        )}
      </div>
    </div>
  );
}
