/**
 * 清除 IndexedDB 資料庫腳本
 * 
 * 使用方法：
 * 1. 在瀏覽器控制台中複製並執行此腳本
 * 2. 或者在應用中臨時添加一個按鈕來執行此函數
 */

async function clearIndexedDB() {
  try {
    console.log('🗑️  正在清除 IndexedDB...');
    
    // 刪除 MarketPulseDB
    await indexedDB.deleteDatabase('MarketPulseDB');
    
    console.log('✅ IndexedDB 已清除！');
    console.log('🔄 請刷新頁面以重新初始化資料庫');
    
    // 自動刷新頁面
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ 清除失敗:', error);
  }
}

// 執行清除
clearIndexedDB();
