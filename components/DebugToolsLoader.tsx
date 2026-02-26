'use client';

import { useEffect } from 'react';
import { debugTools } from '@/lib/debug-tools';

/**
 * 調試工具載入器
 * 在開發環境下將調試工具掛載到 window.debug
 */
export function DebugToolsLoader() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).debug = debugTools;
      console.log('🛠️ 調試工具已載入，使用 window.debug 訪問');
      console.log('📖 可用指令:');
      console.log('  - window.debug.cloudProducts()      // 查詢雲端商品');
      console.log('  - window.debug.localProducts()      // 查詢本地商品');
      console.log('  - window.debug.compareProducts()    // 比對本地與雲端');
      console.log('  - window.debug.pendingProductEvents() // 查詢待同步事件');
      console.log('  - window.debug.teamMembers()        // 查詢團隊成員');
      console.log('  - window.debug.diagnose()           // 完整診斷');
      console.log('  - window.debug.testRLS()            // 測試 RLS 政策');
    }
  }, []);

  return null;
}
