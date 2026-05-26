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

const SORT_ASCENDING_TABS: TabType[] = ['all', 'pending', 'payment', 'upcoming'];

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getMarketDateForSorting(market: { dates?: string[]; startDate: string }) {
  if (market.dates && market.dates.length > 0) {
    return market.dates.slice().sort()[0];
  }

  return market.startDate;
}

function sortMarketsByNearestDate<T extends { dates?: string[]; startDate: string }>(markets: T[]) {
  return markets.slice().sort((a, b) => {
    const aTime = new Date(getMarketDateForSorting(a)).getTime();
    const bTime = new Date(getMarketDateForSorting(b)).getTime();

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;

    return aTime - bTime;
  });
}

function isEndedMarket(market: { status: MarketStatus; dates?: string[]; endDate: string }, today: string) {
  if (market.status === 'completed') {
    return true;
  }

  if (market.status !== 'paid' && market.status !== 'ongoing') {
    return false;
  }

  if (market.dates && market.dates.length > 0) {
    return market.dates.every(date => date < today);
  }

  return market.endDate < today;
}

function isUpcomingMarket(market: { status: MarketStatus; dates?: string[]; startDate: string }, today: string) {
  if (market.status !== 'paid' && market.status !== 'ongoing') {
    return false;
  }

  if (market.dates && market.dates.length > 0) {
    return market.dates.some(date => date >= today);
  }

  return market.startDate >= today;
}

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

    const today = getTodayString();
    let markets;

    switch (activeTab) {
      case 'pending':
        markets = allMarkets.filter(m => m.status === 'registered');
        break;
      case 'payment':
        markets = allMarkets.filter(m => m.status === 'accepted');
        break;
      case 'upcoming':
        markets = allMarkets.filter(m => isUpcomingMarket(m, today));
        break;
      case 'completed':
        return allMarkets.filter(m => isEndedMarket(m, today));
      case 'cancelled':
        return allMarkets.filter(m => m.status === 'cancelled' || m.status === 'postponed');
      default:
        markets = allMarkets.filter(m => !isEndedMarket(m, today));
        break;
    }

    return SORT_ASCENDING_TABS.includes(activeTab) ? sortMarketsByNearestDate(markets) : markets;
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
  const today = getTodayString();
  const allTabMarkets = allMarkets?.filter(m => !isEndedMarket(m, today)) || [];
  const pendingTabMarkets = allMarkets?.filter(m => m.status === 'registered') || [];
  const paymentTabMarkets = allMarkets?.filter(m => m.status === 'accepted') || [];
  const upcomingTabMarkets = allMarkets?.filter(m => isUpcomingMarket(m, today)) || [];
  const completedTabMarkets = allMarkets?.filter(m => isEndedMarket(m, today)) || [];
  const cancelledTabMarkets = allMarkets?.filter(m => m.status === 'cancelled' || m.status === 'postponed') || [];

  const tabs = [
    { id: 'all' as TabType, label: '全部', count: allTabMarkets.length },
    { id: 'pending' as TabType, label: '待公佈', count: pendingTabMarkets.length },
    { id: 'payment' as TabType, label: '待繳費', count: paymentTabMarkets.length },
    { id: 'upcoming' as TabType, label: '待舉辦', count: upcomingTabMarkets.length },
    { id: 'completed' as TabType, label: '已結束', count: completedTabMarkets.length },
    { id: 'cancelled' as TabType, label: '已取消', count: cancelledTabMarkets.length },
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
