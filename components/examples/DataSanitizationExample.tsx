/**
 * 資料脫敏使用範例
 * 
 * 展示如何在組件中使用資料脫敏功能
 */

'use client';

import { useRoleContext } from '@/lib/role-context';
import { useSyncContext } from '@/lib/sync-context';
import { 
  sanitizeObject, 
  sanitizeArray, 
  renderSensitiveData,
  canViewSensitiveData 
} from '@/lib/data-sanitization';

// 範例：產品列表組件
export function ProductListExample() {
  const { userRole } = useRoleContext();
  const { isDataSanitized } = useSyncContext();

  // 模擬產品資料
  const products = [
    { id: '1', name: '商品 A', price: 100, cost: 60, profit_margin: 0.4 },
    { id: '2', name: '商品 B', price: 200, cost: 120, profit_margin: 0.4 },
  ];

  // ✅ 使用脫敏函數過濾敏感資料
  const sanitizedProducts = sanitizeArray(products, 'product', userRole);

  return (
    <div className="p-6">
      {/* 顯示脫敏狀態 */}
      {isDataSanitized && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-amber-800">
            🔒 員工模式：成本與利潤資訊已隱藏
          </p>
        </div>
      )}

      {/* 產品列表 */}
      <div className="space-y-4">
        {sanitizedProducts.map(product => (
          <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">售價：</span>
                <span className="font-medium">${product.price}</span>
              </div>
              
              {/* ✅ 條件顯示敏感資料 */}
              {canViewSensitiveData(userRole) && (
                <>
                  <div>
                    <span className="text-gray-600">成本：</span>
                    <span className="font-medium">${product.cost}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">利潤率：</span>
                    <span className="font-medium">
                      {(product.profit_margin * 100).toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
              
              {/* ✅ 或使用 renderSensitiveData 函數 */}
              <div>
                <span className="text-gray-600">成本：</span>
                <span className="font-medium">
                  {renderSensitiveData(`$${product.cost}`, userRole, '***')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 範例：統計資料組件
export function StatsExample() {
  const { userRole } = useRoleContext();

  // 模擬統計資料
  const stats = {
    total_revenue: 10000,
    total_cost: 6000,
    net_profit: 4000,
    profit_margin: 0.4,
    items_sold: 100,
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-4">
        {/* 總收入（所有人可見） */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">總收入</p>
          <p className="text-2xl font-bold text-primary">
            ${stats.total_revenue.toLocaleString()}
          </p>
        </div>

        {/* 銷售數量（所有人可見） */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">銷售數量</p>
          <p className="text-2xl font-bold text-primary">
            {stats.items_sold}
          </p>
        </div>

        {/* ✅ 敏感資料：只有老闆可見 */}
        {canViewSensitiveData(userRole) && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">總成本</p>
              <p className="text-2xl font-bold text-amber-600">
                ${stats.total_cost.toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">淨利潤</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.net_profit.toLocaleString()}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
