/**
 * Template 組件
 * 用於在每次路由切換時觸發頁面過渡動畫
 * 
 * 注意：template.tsx 會在每次路由變更時重新掛載
 * 這確保了動畫每次都會觸發
 * 
 * 方向感動畫：
 * - 從左到右導航（首頁 → 設定）：頁面從右邊滑入
 * - 從右到左導航（設定 → 首頁）：頁面從左邊滑入
 * - 非導航列切換：淡入效果
 */

'use client';

import { useNavigation } from '@/lib/navigation-context';

export default function Template({ children }: { children: React.ReactNode }) {
  const { direction } = useNavigation();

  return (
    <div 
      className={`page-transition ${
        direction === 'left' ? 'slide-from-right' : 
        direction === 'right' ? 'slide-from-left' : 
        'fade-in'
      }`}
    >
      {children}
    </div>
  );
}
