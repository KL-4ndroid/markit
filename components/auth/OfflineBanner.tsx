/**
 * Offline Banner - 離線模式提示橫幅
 * 
 * 當應用處於離線狀態時顯示
 * 區分已登入但無法同步，以及未登入的離線唯讀狀態。
 */

'use client';

import { WifiOff, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getNetworkPort } from '@/lib/platform/network-capability';

export function OfflineBanner({ readOnly = true }: { readOnly?: boolean }) {
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
    <div role="status" className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-lg animate-slide-down">
      <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
        <WifiOff className="w-5 h-5 flex-shrink-0 animate-pulse" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {readOnly ? '離線唯讀模式' : '離線，雲端同步已暫停'}
          </p>
          <p className="text-xs text-white/90">
            {readOnly
              ? '尚未登入，目前僅能查看這台裝置的資料，無法編輯或同步。'
              : '尚未同步的紀錄只保存在這台裝置；連線恢復後請確認同步狀態。'}
          </p>
        </div>

        <AlertCircle className="w-5 h-5 flex-shrink-0" />
      </div>
    </div>
  );
}
