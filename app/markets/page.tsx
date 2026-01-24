'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useMarkets } from '@/lib/db/hooks';
import { initializeDatabase } from '@/lib/db';
import { MarketCard } from '@/components/markets/MarketCard';
import { AddMarketForm } from '@/components/markets/AddMarketForm';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import type { MarketStatus } from '@/types/db';

type TabType = 'all' | 'registered' | 'unpaid' | 'scheduled';

export default function MarketsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化資料庫
  useEffect(() => {
    initializeDatabase()
      .then(() => setIsInitialized(true))
      .catch((error) => {
        console.error('資料庫初始化失敗：', error);
        toast.error('資料庫初始化失敗');
      });
  }, []);

  // 查詢所有市集
  const allMarkets = useMarkets({ orderBy: 'startDate', order: 'desc' });

  // 根據 Tab 篩選市集
  const getFilteredMarkets = () => {
    if (!allMarkets) return [];

    switch (activeTab) {
      case 'registered':
        // 已報名：只顯示 status === 'registered'
        return allMarkets.filter(m => m.status === 'registered');
      case 'unpaid':
        // 未繳費：顯示 status === 'accepted'
        return allMarkets.filter(m => m.status === 'accepted');
      case 'scheduled':
        // 如期舉行：顯示 status === 'paid' 或 'ongoing'
        return allMarkets.filter(m => m.status === 'paid' || m.status === 'ongoing');
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
    { id: 'registered' as TabType, label: '已報名', count: allMarkets?.filter(m => m.status === 'registered').length || 0 },
    { id: 'unpaid' as TabType, label: '未繳費', count: allMarkets?.filter(m => m.status === 'accepted').length || 0 },
    { id: 'scheduled' as TabType, label: '如期舉行', count: allMarkets?.filter(m => m.status === 'paid' || m.status === 'ongoing').length || 0 },
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7B9FA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B6B6B]">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90">
              我的市集
            </h1>
            {/* 新增按鈕 */}
            <button
              onClick={handleOpenForm}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
              aria-label="新增市集"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>
          <p className="text-white/80 text-sm">
            管理您的市集場次 🎪
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Tabs */}
        <div className="bg-white rounded-[1.5rem] p-2 shadow-lg shadow-[#7B9FA6]/10 mb-6">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#7B9FA6] text-white shadow-md'
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
          /* 空狀態 */
          <div className="bg-white rounded-[1.5rem] p-12 shadow-lg shadow-[#7B9FA6]/10 text-center">
            <Calendar className="w-16 h-16 text-[#7B9FA6] mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-medium text-[#3A3A3A] mb-2">
              {activeTab === 'all' ? '尚未新增任何市集' : `沒有${tabs.find(t => t.id === activeTab)?.label}的市集`}
            </h2>
            <p className="text-[#6B6B6B] text-sm mb-6">
              {activeTab === 'all' 
                ? '點擊右上角的 + 按鈕開始新增您的第一個市集 ✨'
                : '切換到其他分類查看更多市集'}
            </p>
            {activeTab === 'all' && (
              <button
                onClick={handleOpenForm}
                className="bg-[#7B9FA6] text-white px-6 py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors inline-flex items-center gap-2"
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
