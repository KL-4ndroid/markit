/**
 * 頁面切換動畫 Hook
 * 確保每次路由變更都觸發動畫
 */

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function usePageTransition() {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // 路由變更時觸發過渡
    setIsTransitioning(true);
    
    // 短暫延遲後結束過渡
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [pathname]);

  return isTransitioning;
}
