'use client';

import { useRouter } from 'next/navigation';
import { Calendar, ArrowRight } from 'lucide-react';
import { useMarkets, useMonthlyStats } from '@/lib/db/hooks';
import { formatCurrency } from '@/lib/utils';
import { MarketCard } from '@/components/markets/MarketCard';
import { db } from '@/lib/db';

export default function HomePage() {
  const router = useRouter();
  const allMarkets = useMarkets({ orderBy: 'startDate', order: 'asc' });
  const monthlyStats = useMonthlyStats();

  // 臨時調試函數
  const handleDebugDB = async () => {
    try {
      const markets = await db.markets.toArray();
      console.log('=== 資料庫調試信息 ===');
      console.log('市集數量:', markets.length);
      console.log('所有市集:', markets);
      if (markets[0]) {
        console.log('第一個市集:', markets[0]);
        console.log('ID 類型:', typeof markets[0].id);
        console.log('ID 格式:', markets[0].id);
        console.log('ID 是否為 UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(markets[0].id));
      }
      alert('✅ 調試信息已輸出到控制台（按 F12 查看）');
    } catch (error) {
      console.error('調試失敗:', error);
      alert('❌ 調試失敗: ' + error.message);
    }
  };

  // 獲取今天的日期
  const today = new Date().toISOString().split('T')[0];

  // 篩選當日市集
  const todayMarkets = allMarkets?.filter(market => 
    market.startDate === today && 
    market.status !== 'cancelled' && 
    market.status !== 'completed'
  ) || [];

  // 篩選即將到來的市集（不包含當日）
  const upcomingMarkets = allMarkets?.filter(market => 
    market.startDate > today && 
    market.status !== 'cancelled' && 
    market.status !== 'completed'
  ) || [];



  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90">
              Market Pulse
            </h1>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
                <span className="text-white text-sm">離線模式</span>
              </div>
              <button
                onClick={handleDebugDB}
                className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
                title="調試資料庫"
              >
                <span className="text-white text-sm">🔍</span>
              </button>
            </div>
          </div>
          <p className="text-white/80 text-sm">
            您的市集攤販數位助手 ✨
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
               {/* 本月概覽 */}
               {monthlyStats && (
          <div className="mb-6">

            <div className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-[#7B9FA6]/5">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-[#6B6B6B] mb-1">市集場次</div>
                  <div className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
                    {monthlyStats.marketCount}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#6B6B6B] mb-1">總收入</div>
                  <div className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
                    {formatCurrency(monthlyStats.totalRevenue)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#6B6B6B] mb-1">成交數</div>
                  <div className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
                    {monthlyStats.totalDeals}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 當日市集 */}
        {todayMarkets.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-[#3A3A3A]">
                今日市集 🎪
              </h2>
            </div>
            
            <div className="space-y-3">
              {todayMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  variant="home"
                />
              ))}
            </div>
          </div>
        )}

        {/* 即將到來的市集 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#3A3A3A]">
              即將到來的市集
            </h2>
            {(todayMarkets.length > 0 || upcomingMarkets.length > 0) && (
              <button 
                onClick={() => router.push('/markets')}
                className="text-[#7B9FA6] text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* 市集列表 */}
          {upcomingMarkets.length > 0 ? (
            <div className="space-y-3">
              {upcomingMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  variant="home"
                />
              ))}
            </div>
          ) : (
            /* 空狀態 */
            <div className="bg-white rounded-[1.5rem] p-8 shadow-md shadow-[#7B9FA6]/5 text-center">
              <Calendar className="w-12 h-12 text-[#7B9FA6] mx-auto mb-3 opacity-50" />
              <p className="text-[#6B6B6B] text-sm mb-2">
                {todayMarkets.length > 0 ? '沒有即將到來的市集' : '尚未新增任何市集'}
              </p>
              <p className="text-[#6B6B6B] text-xs">
                前往市集頁面新增您的市集 📅
              </p>
            </div>
          )}
        </div>

 
      </div>
    </div>
  );
}
