/**
 * Offline Banner - 離線模式提示橫幅
 * 
 * 當應用處於離線狀態時顯示
 * 提醒用戶目前為唯讀模式
 */

'use client';

import { WifiOff, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getNetworkPort } from '@/lib/platform/network-capability';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => getNetworkPort().getCurrentStatus().connected);

  useEffect(() => {
    // 初始化狀態
    const network = getNetworkPort();
    setIsOnline(network.getCurrentStatus().connected);

    // 監聽網路狀態變化
    return network.subscribe(status => setIsOnline(status.connected));
  }, []);

  // 在線時不顯示
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 shadow-lg animate-slide-down">
      <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
        <WifiOff className="w-5 h-5 flex-shrink-0 animate-pulse" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            離線模式
          </p>
          <p className="text-xs text-white/90">
            目前無網路連線，僅能查看資料，無法進行編輯或同步
          </p>
        </div>

        <AlertCircle className="w-5 h-5 flex-shrink-0" />
      </div>
    </div>
  );
}
