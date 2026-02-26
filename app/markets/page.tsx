'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useMarkets } from '@/lib/db/hooks';
import { initializeDatabase } from '@/lib/db';
import { MarketCard } from '@/components/markets/MarketCard';
import { AddMarketForm } from '@/components/markets/AddMarketForm';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/supabase/auth-context';
import { getGradientClass, getShadowClass, getPrimaryBgClass } from '@/lib/theme-config';
import type { MarketStatus } from '@/types/db';
import MarketsLoading from './loading';

type TabType = 'all' | 'pending' | 'payment' | 'upcoming' | 'completed' | 'cancelled';

export default function MarketsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { userRole, isStaff } = useUserRole(); // ✅ 員工權限檢查
  const { user } = useAuth(); // ✅ 獲取當前用戶

  // 初始化資料庫
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ 資料庫初始化超時，強制完成');
      setIsInitialized(true);
    }, 10000);
    
    initializeDatabase()
      .then(() => {
        clearTimeout(timeoutId);
        setIsInitialized(true);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('資料庫初始化失敗：', error);
        toast.error('資料庫初始化失敗');
        // 即使失敗也要設置為已初始化，讓用戶可以看到界面
        setIsInitialized(true);
      });
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // ✅ 根據用戶身份過濾市集（權限控制）
  const currentOwnerId = isStaff ? userRole.ownerId : user?.id;
  
  const allMarkets = useMarkets({ 
    orderBy: 'startDate', 
    order: 'desc',
    ownerId: currentOwnerId,  // ✅ 根據擁有者 ID 過濾
  });

  // ✅ 載入狀態檢查：資料庫未初始化或數據未載入時顯示骨架屏
  const isLoading = !isInitialized || allMarkets === undefined;

  // 根據 Tab 篩選市集
  const getFilteredMarkets = () => {
    if (!allMarkets) return [];

    // ✅ 獲取今天的日期（使用本地時間）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    switch (activeTab) {
      case 'pending':
        // 待處理：已報名 + 已錄取
        return allMarkets.filter(m => m.status === 'registered');
      case 'payment':
        // 待繳費：已錄取（需要繳費）
        return allMarkets.filter(m => m.status === 'accepted');
      case 'upcoming':
        // 待舉辦：已繳費 + 如期舉行，且還有未來的日期
        return allMarkets.filter(m => {
          if (m.status !== 'paid' && m.status !== 'ongoing') return false;
          
          // ✅ 檢查 dates 陣列中是否有任何日期 >= 今天
          if (m.dates && m.dates.length > 0) {
            return m.dates.some(date => date >= today);
          }
          
          // 降級：使用 startDate（向後兼容）
          return m.startDate >= today;
        });
      case 'completed':
        // 已結束：所有日期都已過去
        return allMarkets.filter(m => {
          if (m.status !== 'paid' && m.status !== 'ongoing') return false;
          
          // ✅ 檢查 dates 陣列中的所有日期是否都 < 今天
          if (m.dates && m.dates.length > 0) {
            return m.dates.every(date => date < today);
          }
          
          // 降級：使用 endDate（向後兼容）
          return m.endDate < today;
        });
      case 'cancelled':
        // 已取消：已取消 + 已延期
        return allMarkets.filter(m => m.status === 'cancelled' || m.status === 'postponed');
      default:
        // 全部
        return allMarkets;
    }
  };

  const filteredMarkets = getFilteredMarkets();

  // 處理新增成功
  const handleAddSuccess = () => {
    toast.success('市集建立成功！', {
      description: '已成功新增市集，狀態為「已報名」',
    });
    showNavigation(); // 顯示導航列
  };

  // 處理打開表單
  const handleOpenForm = () => {
    setIsFormOpen(true);
    hideNavigation(); // 隱藏導航列
  };

  // 處理關閉表單
  const handleCloseForm = () => {
    setIsFormOpen(false);
    showNavigation(); // 顯示導航列
  };

  // Tab 配置
  const tabs = [
    { id: 'all' as TabType, label: '全部', count: allMarkets?.length || 0 },
    { id: 'pending' as TabType, label: '待公佈', count: allMarkets?.filter(m => m.status === 'registered').length || 0 },
    { id: 'payment' as TabType, label: '待繳費', count: allMarkets?.filter(m => m.status === 'accepted').length || 0 },
    { id: 'upcoming' as TabType, label: '待舉辦', count: (() => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return allMarkets?.filter(m => {
        if (m.status !== 'paid' && m.status !== 'ongoing') return false;
        // ✅ 檢查是否有任何日期 >= 今天
        if (m.dates && m.dates.length > 0) {
          return m.dates.some(date => date >= today);
        }
        return m.startDate >= today;
      }).length || 0;
    })() },
    { id: 'completed' as TabType, label: '已結束', count: (() => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return allMarkets?.filter(m => {
        if (m.status !== 'paid' && m.status !== 'ongoing') return false;
        // ✅ 檢查所有日期是否都 < 今天
        if (m.dates && m.dates.length > 0) {
          return m.dates.every(date => date < today);
        }
        return m.endDate < today;
      }).length || 0;
    })() },
    { id: 'cancelled' as TabType, label: '已取消', count: allMarkets?.filter(m => m.status === 'cancelled' || m.status === 'postponed').length || 0 },
  ];

  // ✅ 數據載入中，顯示骨架屏
  if (isLoading) {
    return <MarketsLoading />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header - ✅ 員工模式使用紫色漸變 */}
      <div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90">
              {isStaff ? '市集列表' : '我的市集'}
            </h1>
            {/* 新增按鈕 - ✅ 員工模式下隱藏 */}
            {!isStaff && (
              <button
                onClick={handleOpenForm}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                aria-label="新增市集"
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
          <p className="text-white/80 text-sm">
            {isStaff ? '' : '管理您的市集場次 🎪'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Tabs - ✅ 員工模式使用紫色主題 */}
        <div className={`bg-white rounded-[1.5rem] p-2 shadow-lg ${getShadowClass(isStaff)} mb-6`}>
          <div className="grid grid-cols-3 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? `${getPrimaryBgClass(isStaff)} text-white shadow-md`
                    : 'text-[#6B6B6B] hover:bg-[#F5E6E8]'
                }`}
              >
                <div>{tab.label}</div>
                <div className="text-xs mt-0.5 opacity-80">{tab.count}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 市集列表 */}
        {filteredMarkets.length > 0 ? (
          <div className="space-y-4 pb-6">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
              />
            ))}
          </div>
        ) : (
          /* 空狀態 - ✅ 員工模式使用紫色主題 */
          <div className={`bg-white rounded-[1.5rem] p-12 shadow-lg ${getShadowClass(isStaff)} text-center`}>
            <Calendar className={`w-16 h-16 mx-auto mb-4 opacity-50 ${isStaff ? 'text-[#8B7BA6]' : 'text-[#7B9FA6]'}`} />
            <h2 className="text-lg font-medium text-[#3A3A3A] mb-2">
              {activeTab === 'all' ? (isStaff ? '目前沒有市集' : '尚未新增任何市集') : `沒有${tabs.find(t => t.id === activeTab)?.label}的市集`}
            </h2>
            <p className="text-[#6B6B6B] text-sm mb-6">
              {activeTab === 'all' 
                ? (isStaff ? '老闆尚未新增任何市集' : '點擊右上角的 + 按鈕開始新增您的第一個市集 ✨')
                : '切換到其他分類查看更多市集'}
            </p>
            {activeTab === 'all' && !isStaff && (
              <button
                onClick={handleOpenForm}
                className={`${getPrimaryBgClass(isStaff)} text-white px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity inline-flex items-center gap-2`}
              >
                <Plus className="w-5 h-5" />
                新增市集
              </button>
            )}
          </div>
        )}
      </div>

      {/* 新增市集表單 */}
      <AddMarketForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
