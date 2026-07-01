'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Calendar, ArrowRight, User, UserCircle, LogOut, Shield, Eye, Edit3, Crown, LogIn, Store } from 'lucide-react';
import { useMarkets, useMonthlyStats } from '@/lib/db/hooks';
import { formatCurrency } from '@/lib/utils';
import { MarketCard } from '@/components/markets/MarketCard';
import { useAuth } from '@/lib/supabase/auth-context';
import { confirmDiscardLocalChangesForSignOut } from '@/lib/auth/signout-confirmation';
import { SyncStatus as SyncStatusEnum } from '@/hooks/useSync';
import { useSyncContext } from '@/lib/sync-context';
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
import { StaffModeNotice } from '@/components/staff/StaffModeNotice';
import { SensitiveDataMask } from '@/components/staff/SensitiveDataMask';
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator';
import {
  OWNER_BRAND_NAME_UPDATED_EVENT,
  loadOwnerBrandName,
  readCachedOwnerBrandName,
} from '@/lib/owner-brand';
// Overview skeleton — mirrors the 3-column grid layout
function OverviewSkeleton() {
  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-gray-100">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/10">
        <div>
          <div className="h-4 w-20 bg-gray-200 rounded skeleton-shimmer-dark mb-1" />
          <div className="h-3 w-28 bg-gray-100 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center">
            <div className="h-3 w-12 bg-gray-200 rounded mx-auto mb-2 skeleton-shimmer-dark" />
            <div className="h-8 w-14 bg-gray-200 rounded mx-auto skeleton-shimmer-dark" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Market list skeleton — mirrors the market card structure
function MarketsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="h-5 w-32 bg-gray-200 rounded mb-2 skeleton-shimmer-dark" />
              <div className="h-3 w-44 bg-gray-100 rounded skeleton-shimmer" />
            </div>
            <div className="h-6 w-16 bg-gray-100 rounded-full skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 bg-gray-50 rounded-xl skeleton-shimmer-light" />
            <div className="h-14 bg-gray-50 rounded-xl skeleton-shimmer-light" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state — only shown when markets have loaded and are empty
function MarketsEmptyState({ hasToday }: { hasToday: boolean }) {
  return (
    <div className="bg-white rounded-[1.5rem] p-8 shadow-md shadow-primary/5 text-center">
      <Calendar className="w-12 h-12 text-primary mx-auto mb-3 opacity-50" />
      <p className="text-muted-foreground text-sm mb-2">
        {hasToday ? '沒有即將到來的市集' : '尚未新增任何市集'}
      </p>
      <p className="text-muted-foreground text-xs">
        前往市集頁面新增您的市集
      </p>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  
  const { user, signOut, isConfigured } = useAuth();
  const { userRole, isStaff, isLoading: isRoleLoading, roleError } = useUserRole();
  
  // ✅ 根據用戶身份過濾市集（權限控制）
  // - 員工：只顯示老闆的市集（userRole.ownerId）
  // - 老闆：只顯示自己的市集（user.id）
  const currentOwnerId = isStaff ? userRole.ownerId : user?.id;
  
  const allMarkets = useMarkets({ 
    orderBy: 'startDate', 
    order: 'asc',
    ownerId: currentOwnerId,  // ✅ 根據擁有者 ID 過濾
  });
  
  // ✅ 修復：傳入 ownerId 參數，只統計當前使用者的市集
  const monthlyStats = useMonthlyStats(currentOwnerId);
  const { status, lastSyncAt, pendingCount, error, sync, isOnline } = useSyncContext();
  
  const [showSyncTooltip, setShowSyncTooltip] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [ownerBrandName, setOwnerBrandName] = useState('出攤本 - BoothBook');

  // ✅ 角色守衛（RoleGuard）已由 layout 級別統一處理（C2.28B）
  //   - 這裡不需要再寫 if (isRoleLoading || roleError) return <RoleLoadingFallback />
  //   - 到這層時角色必定已載入
  //   - fail-closed 仍由 useUserRole 的 deriveRolePermissions 提供雙層保護

  // TODO: 從實際訂閱狀態獲取
  const currentPlan: 'free' | 'pro' | 'enterprise' = 'free';

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || isStaff) {
      setOwnerBrandName('出攤本 - BoothBook');
      return;
    }

    const cached = readCachedOwnerBrandName(user.id);
    if (cached) setOwnerBrandName(cached);

    loadOwnerBrandName(user.id)
      .then((brandName) => {
        if (!cancelled) setOwnerBrandName(brandName);
      })
      .catch((error) => {
        console.error('載入首頁品牌名稱失敗:', error);
      });

    const handleBrandNameUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerId?: string; brandName?: string }>).detail;
      if (detail?.ownerId === user.id && detail.brandName) {
        setOwnerBrandName(detail.brandName);
      }
    };

    window.addEventListener(OWNER_BRAND_NAME_UPDATED_EVENT, handleBrandNameUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(OWNER_BRAND_NAME_UPDATED_EVENT, handleBrandNameUpdated);
    };
  }, [user?.id, isStaff]);

  // Per-section loading states — each section resolves independently
  const marketsLoading = allMarkets === undefined;
  const statsLoading = monthlyStats === undefined;

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
  const todayMarketIds = marketsLoading
    ? new Set<string>()
    : new Set(todayMarkets.map(m => m.id));
  
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
      if (confirmDiscardLocalChangesForSignOut(error)) {
        await signOut({ forceDiscardLocalChanges: true });
        toast.success('已登出');
        setShowUserMenu(false);
        return;
      }

      toast.error('登出失敗：' + error.message);
    }
  };

  // 處理登入
  const handleLogin = () => {
    window.dispatchEvent(new CustomEvent('auth:open-login', { detail: { mode: 'login' } }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            {/* ✅ 左側：Logo + 品牌名稱 */}
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-medium text-white">
                  {ownerBrandName}
                </h1>
              </div>
            </div>
            
            {/* ✅ 右側：同步狀態 + 用戶選單 */}
            <div className="flex items-center gap-2">
              {/* ✅ 同步狀態指示器（輕量化呼吸燈） */}
              {user && isConfigured && <SyncStatusIndicator />}
              
              {/* ✅ 用戶選單 */}
              {isConfigured && (
                <div className="relative">
                  {user ? (
                    <>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                      >
                        {userRole.isStaff ? (
                          <Shield className="w-4 h-4 text-white" />
                        ) : (
                          <User className="w-4 h-4 text-white" />
                        )}
                        <span className="text-sm text-white max-w-[100px] truncate">
                          {user.email?.split('@')[0]}
                        </span>
                      </button>

                      {/* 用戶選單彈窗 */}
                      {showUserMenu && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowUserMenu(false)}
                          />
                          <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl p-2 min-w-[240px] z-50 border border-primary/10">
                            {/* 用戶信息 */}
                            <div className="px-3 py-2 border-b border-primary/10">
                              <p className="text-xs text-muted-foreground">登入為</p>
                              <p className="text-sm font-medium text-foreground truncate">
                                {user.email}
                              </p>
                            </div>

                            {/* 訂閱狀態（僅老闆身份顯示） */}
                            {!userRole.isStaff && (
                              <div className="px-3 py-2 border-b border-primary/10">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-muted-foreground">目前方案</span>
                                  {currentPlan === 'free' && (
                                    <Crown className="w-4 h-4 text-secondary" />
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground">
                                    {currentPlan === "free"
                                      ? "免費版"
                                      : currentPlan === "pro"
                                      ? "專業版"
                                      : currentPlan === "enterprise"
                                      ? "企業版"
                                      : ""}
                                  </span>
                                  {currentPlan === 'free' ? (
                                    <button
                                      onClick={() => {
                                        setShowUserMenu(false);
                                        router.push('/subscription');
                                      }}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      升級
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setShowUserMenu(false);
                                        router.push('/subscription');
                                      }}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      管理
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 身份信息 */}
                            <div className="px-3 py-2 border-b border-primary/10">
                              {userRole.isStaff ? (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-secondary" />
                                    <span className="text-sm font-medium text-foreground">
                                      員工身份
                                    </span>
                                  </div>
                                  {/* 老闆信息 */}
                                  {userRole.ownerEmail && (
                                    <div className="mb-2 p-2 bg-primary/10 rounded-lg">
                                      <p className="text-xs text-muted-foreground mb-0.5">為以下老闆工作</p>
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {userRole.ownerEmail}
                                      </p>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs">
                                    {userRole.permissions?.can_edit ? (
                                      <>
                                        <Edit3 className="w-3 h-3 text-primary" />
                                        <span className="text-muted-foreground">可編輯</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-muted-foreground">僅查看</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium text-foreground">
                                    老闆身份
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 登出按鈕 */}
                            <button
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-soft-pink transition-colors text-left"
                            >
                              <LogOut className="w-4 h-4 text-danger" />
                              <span className="text-sm text-foreground">登出</span>
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleLogin}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                    >
                      <LogIn className="w-4 h-4 text-white" />
                      <span className="text-sm font-medium text-white">登入</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        <StaffModeNotice className="mb-4" />

        {/* 本月概覽 */}
        {!isStaff && (
        <div className="mb-6">
          {statsLoading ? (
            <OverviewSkeleton />
          ) : (
            <div className={`bg-white rounded-[1.5rem] p-6 shadow-md ${getShadowClass(isStaff)}`}>
              {/* 標題區 */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/10">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-0.5">
                    本月概覽
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {now.getFullYear()} 年 {now.getMonth() + 1} 月統計
                  </p>
                </div>
                <button
                  onClick={() => router.push('/analytics')}
                  className="text-xs text-primary hover:text-primary/85 transition-colors flex items-center gap-1"
                >
                  詳情
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 統計數據區 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1.5">
                    本月市集
                  </div>
                  <div className="text-2xl font-semibold text-primary tabular-nums mb-0.5">
                    {monthlyStats?.marketCount ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">場次</div>
                </div>

                {/* 員工模式：隱藏總收入 */}
                {isStaff ? (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1.5">
                      本月收入
                    </div>
                    <SensitiveDataMask label="僅老闆可見" size="sm" />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1.5">
                      本月收入
                    </div>
                    <div className="text-xl font-semibold text-primary tabular-nums mb-0.5">
                      {formatCurrency(monthlyStats?.totalRevenue ?? 0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">總收入</div>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1.5">
                    本月成交
                  </div>
                  <div className="text-2xl font-semibold text-primary tabular-nums mb-0.5">
                    {monthlyStats?.totalDeals ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">筆數</div>
                </div>
              </div>

              {/* 提示文字 */}
              {monthlyStats && monthlyStats.marketCount === 0 && (
                <div className="mt-4 pt-3 border-t border-primary/10">
                  <p className="text-xs text-center text-muted-foreground">
                    本月尚未有市集記錄
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* 當日市集 - 移除條件渲染，始終顯示容器 */}
        {todayMarkets.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                今日市集
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
            <h2 className="text-lg font-medium text-foreground">
              即將到來的市集
            </h2>
            {!marketsLoading && (todayMarkets.length > 0 || upcomingMarkets.length > 0) && (
              <button
                onClick={() => router.push('/markets')}
                className="text-primary text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 市集列表 — 三選一：骨架 / 卡片 / 空狀態 */}
          {marketsLoading ? (
            <MarketsSkeleton count={2} />
          ) : upcomingMarkets.length > 0 ? (
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
            <MarketsEmptyState hasToday={todayMarkets.length > 0} />
          )}
        </div>

 
      </div>
    </div>
  );
}
