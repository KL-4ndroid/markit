/**
 * 清理 IndexedDB 腳本
 * 
 * 使用方法：
 * 1. 打開瀏覽器開發者工具（F12）
 * 2. 切換到 Console 標籤
 * 3. 複製並貼上此腳本
 * 4. 按 Enter 執行
 * 5. 重新載入頁面
 */

(async function cleanupIndexedDB() {
  console.log('🧹 開始清理 IndexedDB...');
  
  try {
    // 關閉現有連接
    if (window.db) {
      console.log('📌 關閉現有資料庫連接...');
      await window.db.close();
    }
    
    // 刪除資料庫
    console.log('🗑️ 刪除 MarketPulseDB...');
    await indexedDB.deleteDatabase('MarketPulseDB');
    
    console.log('✅ IndexedDB 清理完成！');
    console.log('🔄 請重新載入頁面以重新初始化資料庫');
    
    // 自動重新載入
    setTimeout(() => {
      console.log('🔄 3 秒後自動重新載入...');
      setTimeout(() => location.reload(), 3000);
    }, 1000);
    
  } catch (error) {
    console.error('❌ 清理失敗：', error);
    console.log('💡 請手動清理：');
    console.log('1. 打開開發者工具 > Application 標籤');
    console.log('2. 左側選擇 Storage > IndexedDB');
    console.log('3. 右鍵點擊 MarketPulseDB');
    console.log('4. 選擇 "Delete database"');
    console.log('5. 重新載入頁面');
  }
})();
