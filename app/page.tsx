'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Calendar, ArrowRight, User, UserCircle, LogOut } from 'lucide-react';
import { useMarkets, useMonthlyStats } from '@/lib/db/hooks';
import { formatCurrency } from '@/lib/utils';
import { MarketCard } from '@/components/markets/MarketCard';
import { useAuth } from '@/lib/supabase/auth-context';
import { useSync, SyncStatus as SyncStatusEnum } from '@/hooks/useSync';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getGradientClass, getShadowClass } from '@/lib/theme-config';
import { StaffBadge } from '@/components/staff/StaffBadge';
import { OwnerInfoCard } from '@/components/staff/OwnerInfoCard';
import { SensitiveDataMask } from '@/components/staff/SensitiveDataMask';
import HomeLoading from './loading';

export default function HomePage() {
  const router = useRouter();
  const localMarkets = useMarkets({ orderBy: 'startDate', order: 'asc' }); // 本地數據（老闆模式）
  const monthlyStats = useMonthlyStats();
  const { user, signOut, isConfigured } = useAuth();
  const { userRole, isStaff } = useUserRole();
  const { status, lastSyncAt, pendingCount, error, sync, isOnline } = useSync({
    enabled: !!user && isConfigured,
  });
  
  const [showSyncTooltip, setShowSyncTooltip] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [supabaseMarkets, setSupabaseMarkets] = useState<any[]>([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);

  // ✅ 員工模式：從 Supabase 獲取市集列表
  useEffect(() => {
    if (isStaff && user) {
      setIsLoadingSupabase(true);
      import('@/lib/supabase/markets').then(({ getAccessibleMarkets }) => {
        getAccessibleMarkets()
          .then(data => {
            // 轉換 Supabase 數據格式為本地格式
            const convertedMarkets = data.map((m: any) => ({
              id: m.id,
              name: m.name,
              location: m.location || '',
              dates: m.date ? [m.date] : [],
              startDate: m.start_date || m.date || '',
              endDate: m.end_date || m.date || '',
              status: m.status || 'registered',
              operatingStartTime: m.operating_start_time || undefined,
              operatingEndTime: m.operating_end_time || undefined,
              totalRevenue: parseFloat(m.total_revenue || '0'),
              totalDeals: m.total_deals || 0,
              earlyEntryEnabled: m.early_entry_enabled || false,
              earlyEntryTime: m.early_entry_time || undefined,
              checkInTime: m.check_in_time || undefined,
              boothCost: parseFloat(m.booth_cost || '0'),
              tableRental: m.table_rental ? parseFloat(m.table_rental) : undefined,
              chairRental: m.chair_rental ? parseFloat(m.chair_rental) : undefined,
              umbrellaRental: m.umbrella_rental ? parseFloat(m.umbrella_rental) : undefined,
              tableFree: m.table_free || false,
              chairFree: m.chair_free || false,
              umbrellaFree: m.umbrella_free || false,
              totalProfit: parseFloat(m.total_profit || '0'),
              totalInteractions: m.total_interactions || 0,
              registrationFee: parseFloat(m.registration_fee || '0'),
              createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
              updatedAt: m.updated_at ? new Date(m.updated_at).getTime() : Date.now(),
            }));
            
            // ✅ 去重：使用 Map 確保每個 ID 只出現一次（優先保留 owner 身份）
            const uniqueMarkets = Array.from(
              convertedMarkets.reduce((map, market) => {
                if (!map.has(market.id)) {
                  map.set(market.id, market);
                }
                return map;
              }, new Map<string, any>())
            ).map(([_, market]) => market);
            
            setSupabaseMarkets(uniqueMarkets);
          })
          .catch(error => {
            console.error('獲取 Supabase 市集列表失敗:', error);
          })
          .finally(() => {
            setIsLoadingSupabase(false);
          });
      });
    }
  }, [isStaff, user]);

  // ✅ 根據模式選擇數據源
  const allMarkets = isStaff ? supabaseMarkets : localMarkets;

  // ✅ 載入狀態檢查：數據未載入時顯示骨架屏
  const isLoading = (isStaff ? isLoadingSupabase : localMarkets === undefined) || monthlyStats === undefined;

  // ✅ 獲取今天的日期（使用本地時間，避免時區問題）
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // ✅ 修復：篩選今日市集（檢查 dates 陣列是否包含今天）
  const todayMarkets = (() => {
    const markets = allMarkets?.filter(market => {
      // 過濾已取消和已完成的市集
      if (market.status === 'cancelled' || market.status === 'completed') {
        return false;
      }
      
      // 優先檢查 dates 陣列（多選日期）
      if (market.dates && market.dates.length > 0) {
        return market.dates.includes(today);
      }
      
      // 降級：使用 startDate 和 endDate（連續日期）
      return market.startDate <= today && market.endDate >= today;
    }) || [];

    // ✅ 獲取營業狀態的函數（修復：使用分鐘數比較）
    const getOperatingStatus = (market: any) => {
      // 將時間字串轉換為分鐘數進行比較
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // 營業中
      if (market.operatingStartTime && market.operatingEndTime) {
        const startMinutes = timeToMinutes(market.operatingStartTime);
        const endMinutes = timeToMinutes(market.operatingEndTime);
        
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return 'operating';
        }
      }
      
      // 已結束
      if (market.operatingEndTime) {
        const endMinutes = timeToMinutes(market.operatingEndTime);
        
        if (currentMinutes >= endMinutes) {
          return 'closed';
        }
      }
      
      // 未開始
      return 'not_started';
    };

    // ✅ 排序邏輯：
    // 1. 營業中（operating）- 按開始時間升序
    // 2. 未開始（not_started）- 按開始時間升序
    // 3. 已結束（closed）- 按開始時間升序
    return markets.sort((a, b) => {
      const statusA = getOperatingStatus(a);
      const statusB = getOperatingStatus(b);
      
      // 狀態優先級
      const statusPriority: Record<string, number> = {
        'operating': 1,
        'not_started': 2,
        'closed': 3,
      };
      
      const priorityA = statusPriority[statusA] || 999;
      const priorityB = statusPriority[statusB] || 999;
      
      // 先按狀態排序
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // 同狀態下，按營業開始時間排序
      const timeA = a.operatingStartTime || '00:00';
      const timeB = b.operatingStartTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  })();

  // ✅ 修復：篩選即將到來的市集（有未來日期，且狀態為已繳費或如期舉行）
  // ✅ 排除已在今日市集中顯示的市集（避免重複顯示）
  const todayMarketIds = new Set(todayMarkets.map(m => m.id));
  
  const upcomingMarkets = allMarkets?.filter(market => {
    // 排除已在今日市集中顯示的市集
    if (todayMarketIds.has(market.id)) {
      return false;
    }
    
    // 只顯示已繳費或如期舉行的市集
    if (market.status !== 'paid' && market.status !== 'ongoing') {
      return false;
    }
    
    // 優先檢查 dates 陣列（多選日期）
    if (market.dates && market.dates.length > 0) {
      // 檢查是否有任何日期在今天之後
      return market.dates.some((date: string) => date > today);
    }
    
    // 降級：使用 startDate（連續日期）
    return market.startDate > today;
  }) || [];

  // ✅ 數據載入中，顯示骨架屏
  if (isLoading) {
    return <HomeLoading />;
  }

  // 獲取同步狀態圖示
  const getSyncIcon = () => {
    if (!user || !isConfigured) {
      return <CloudOff className="w-5 h-5" />;
    }
    
    switch (status) {
      case SyncStatusEnum.SYNCING:
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case SyncStatusEnum.SUCCESS:
        return <CheckCircle className="w-5 h-5" />;
      case SyncStatusEnum.ERROR:
        return <AlertCircle className="w-5 h-5" />;
      case SyncStatusEnum.OFFLINE:
        return <CloudOff className="w-5 h-5" />;
      default:
        return <Cloud className="w-5 h-5" />;
    }
  };

  // 獲取同步狀態文字
  const getSyncStatusText = () => {
    if (!user || !isConfigured) return '未登入';
    
    switch (status) {
      case SyncStatusEnum.SYNCING:
        return '同步中';
      case SyncStatusEnum.SUCCESS:
        return '已同步';
      case SyncStatusEnum.ERROR:
        return '同步失敗';
      case SyncStatusEnum.OFFLINE:
        return '離線';
      default:
        return '閒置';
    }
  };

  // 格式化最後同步時間
  const formatLastSync = () => {
    if (!lastSyncAt) return '從未同步';
    
    const now = Date.now();
    const diff = now - lastSyncAt;
    
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  // 處理登出
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('已登出');
      setShowUserMenu(false);
    } catch (error: any) {
      toast.error('登出失敗：' + error.message);
    }
  };

  // 處理登入
  const handleLogin = () => {
    const button = document.getElementById('auth-manager-login-trigger');
    if (button) {
      button.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90">
              Market Pulse
            </h1>
            <div className="flex items-center gap-2">
              {/* 同步狀態按鈕 */}
              {isConfigured && (
                <div className="relative">
                  <button
                    onClick={() => {
                      if (user && status !== SyncStatusEnum.SYNCING) {
                        sync();
                      }
                    }}
                    onMouseEnter={() => setShowSyncTooltip(true)}
                    onMouseLeave={() => setShowSyncTooltip(false)}
                    className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
                    title={getSyncStatusText()}
                    disabled={!user || status === SyncStatusEnum.SYNCING}
                  >
                    <div className="text-white">
                      {getSyncIcon()}
                    </div>
                  </button>

                  {/* 同步狀態 Tooltip */}
                  {showSyncTooltip && user && (
                    <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl p-4 min-w-[280px] z-50 border border-[#7B9FA6]/10">
                      <div className="space-y-3">
                        {/* 狀態 */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B6B6B]">狀態</span>
                          <div className="flex items-center gap-2 text-[#7B9FA6]">
                            {getSyncIcon()}
                            <span className="text-sm font-medium">{getSyncStatusText()}</span>
                          </div>
                        </div>

                        {/* 網路狀態 */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B6B6B]">網路</span>
                          <span className={`text-sm font-medium ${isOnline ? 'text-[#7B9FA6]' : 'text-[#6B6B6B]'}`}>
                            {isOnline ? '🟢 已連線' : '⚪ 離線'}
                          </span>
                        </div>

                        {/* 最後同步時間 */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#6B6B6B]">最後同步</span>
                          <span className="text-sm font-medium text-[#3A3A3A]">
                            {formatLastSync()}
                          </span>
                        </div>

                        {/* 待同步事件 */}
                        {pendingCount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#6B6B6B]">待同步</span>
                            <span className="text-sm font-medium text-[#7B9FA6]">
                              {pendingCount} 個事件
                            </span>
                          </div>
                        )}

                        {/* 錯誤訊息 */}
                        {error && (
                          <div className="pt-3 border-t border-[#7B9FA6]/10">
                            <p className="text-xs text-[#d4183d]">
                              ⚠️ {error}
                            </p>
                          </div>
                        )}

                        {/* 手動同步按鈕 */}
                        {status !== SyncStatusEnum.SYNCING && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sync();
                              setShowSyncTooltip(false);
                            }}
                            className="w-full bg-[#7B9FA6] text-white py-2 rounded-xl hover:bg-[#6A8E95] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            <RefreshCw className="w-4 h-4" />
                            立即同步
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* 使用者登入狀態按鈕 */}
              {isConfigured && (
                <div className="relative">
                  {user ? (
                    <>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
                        title={`已登入：${user.email}`}
                      >
                        <div className="text-white">
                          <UserCircle className="w-5 h-5" />
                        </div>
                      </button>

                      {/* 用戶選單 */}
                      {showUserMenu && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowUserMenu(false)}
                          />
                          <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl p-2 min-w-[200px] z-50 border border-[#7B9FA6]/10">
                            <div className="px-3 py-2 border-b border-[#7B9FA6]/10">
                              <p className="text-xs text-[#6B6B6B]">登入為</p>
                              <p className="text-sm font-medium text-[#3A3A3A] truncate">
                                {user.email}
                              </p>
                            </div>
                            <button
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#F5E6E8] transition-colors text-left"
                            >
                              <LogOut className="w-4 h-4 text-[#d4183d]" />
                              <span className="text-sm text-[#3A3A3A]">登出</span>
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleLogin}
                      className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
                      title="未登入"
                    >
                      <div className="text-white">
                        <User className="w-5 h-5" />
                      </div>
                    </button>
                  )}
                </div>
              )}
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
        <div className="mb-6">
          <div className={`bg-white rounded-[1.5rem] p-6 shadow-md ${getShadowClass(isStaff)}`}>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-[#6B6B6B] mb-1">市集場次</div>
                <div className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
                  {monthlyStats?.marketCount ?? 0}
                </div>
              </div>
              
              {/* 員工模式：隱藏總收入 */}
              {isStaff ? (
                <div className="text-center">
                  <div className="text-xs text-[#6B6B6B] mb-1">總收入</div>
                  <SensitiveDataMask label="僅老闆可見" size="sm" />
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xs text-[#6B6B6B] mb-1">總收入</div>
                  <div className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
                    {formatCurrency(monthlyStats?.totalRevenue ?? 0)}
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <div className="text-xs text-[#6B6B6B] mb-1">成交數</div>
                <div className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
                  {monthlyStats?.totalDeals ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 當日市集 - 移除條件渲染，始終顯示容器 */}
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
                  variant="upcoming"
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
