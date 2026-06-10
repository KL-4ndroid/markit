/**
 * Sync Status - 同步狀態指示器
 * 
 * 在 Navbar 顯示同步狀態
 * 訂閱 useSync 的狀態
 */

'use client';

import { SyncStatus as SyncStatusEnum } from '@/hooks/useSync';
import { useSyncContext } from '@/lib/sync-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';

export function SyncStatus() {
  const { user, isConfigured } = useAuth();
  const { status, lastSyncAt, pendingCount, error, sync, isOnline } = useSyncContext();
  const [showTooltip, setShowTooltip] = useState(false);

  // 如果未配置或未登入，不顯示
  if (!isConfigured || !user) {
    return null;
  }

  // 獲取狀態圖示和顏色
  const getStatusIcon = () => {
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

  const getStatusColor = () => {
    switch (status) {
      case SyncStatusEnum.SYNCING:
        return 'text-[#7B9FA6]';
      case SyncStatusEnum.SUCCESS:
        return 'text-[#7B9FA6]';
      case SyncStatusEnum.ERROR:
        return 'text-[#d4183d]';
      case SyncStatusEnum.OFFLINE:
        return 'text-[#6B6B6B]';
      default:
        return 'text-[#6B6B6B]';
    }
  };

  const getStatusText = () => {
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

  const getStatusBgColor = () => {
    switch (status) {
      case SyncStatusEnum.SYNCING:
        return 'bg-[#7B9FA6]/10';
      case SyncStatusEnum.SUCCESS:
        return 'bg-[#E8F3E8]';
      case SyncStatusEnum.ERROR:
        return 'bg-[#F5E6E8]';
      case SyncStatusEnum.OFFLINE:
        return 'bg-[#F0F0F0]';
      default:
        return 'bg-[#F0F0F0]';
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

  return (
    <div className="relative">
      {/* 狀態按鈕 */}
      <button
        onClick={() => {
          if (status !== SyncStatusEnum.SYNCING) {
            sync();
          }
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full ${getStatusBgColor()} ${getStatusColor()} hover:opacity-80 transition-all min-w-[120px] justify-center`}
        disabled={status === SyncStatusEnum.SYNCING}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
        {pendingCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-[#7B9FA6] text-white text-xs rounded-full">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl p-4 min-w-[280px] z-50 border border-[#7B9FA6]/10">
          <div className="space-y-3">
            {/* 狀態 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B6B6B]">狀態</span>
              <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusText()}</span>
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
                  setShowTooltip(false);
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
  );
}
