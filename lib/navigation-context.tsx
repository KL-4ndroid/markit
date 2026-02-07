/**
 * 導航上下文
 * 
 * 用於追蹤導航方向，實現方向感動畫
 * - 記錄當前和目標路由索引
 * - 計算滑動方向（左/右）
 * - 提供給 template.tsx 使用
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NavigationContextType {
  direction: 'left' | 'right' | 'none';
  setDirection: (dir: 'left' | 'right' | 'none') => void;
  fromIndex: number;
  toIndex: number;
  setNavigation: (from: number, to: number) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  direction: 'none',
  setDirection: () => {},
  fromIndex: 0,
  toIndex: 0,
  setNavigation: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<'left' | 'right' | 'none'>('none');
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(0);

  const setNavigation = useCallback((from: number, to: number) => {
    setFromIndex(from);
    setToIndex(to);
    
    if (from < to) {
      // 向右導航（例如：首頁 → 設定）
      setDirection('left'); // 頁面從右邊滑入
    } else if (from > to) {
      // 向左導航（例如：設定 → 首頁）
      setDirection('right'); // 頁面從左邊滑入
    } else {
      // 同一頁面或非導航列切換
      setDirection('none'); // 使用淡入效果
    }
    
    // 重置方向（避免影響下次導航）
    setTimeout(() => {
      setDirection('none');
    }, 250); // 與動畫時長同步（200ms + 50ms 緩衝）
  }, []);

  return (
    <NavigationContext.Provider value={{ direction, setDirection, fromIndex, toIndex, setNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => useContext(NavigationContext);
