/**
 * 清除 IndexedDB 並重新初始化
 * 
 * 使用方法：
 * 1. 在瀏覽器控制台執行此腳本
 * 2. 或者手動刪除 IndexedDB
 */

// 方法 1：使用腳本清除
async function clearAndReinitialize() {
  console.log('🔄 開始清除 IndexedDB...');
  
  try {
    // 關閉所有連接
    if (window.indexedDB) {
      // 刪除資料庫
      const deleteRequest = window.indexedDB.deleteDatabase('MarketPulseDB');
      
      deleteRequest.onsuccess = () => {
        console.log('✅ IndexedDB 已清除');
        console.log('🔄 請重新載入頁面以重新初始化資料庫');
        
        // 自動重新載入
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      };
      
      deleteRequest.onerror = (event) => {
        console.error('❌ 清除失敗：', event);
      };
      
      deleteRequest.onblocked = () => {
        console.warn('⚠️ 資料庫被阻擋，請關閉所有使用此資料庫的分頁');
      };
    }
  } catch (error) {
    console.error('❌ 清除過程發生錯誤：', error);
  }
}

// 執行清除
clearAndReinitialize();

// 方法 2：手動清除步驟
console.log(`
📝 手動清除步驟：

1. 打開 Chrome DevTools (F12)
2. 切換到 "Application" 標籤
3. 左側選單找到 "Storage" > "IndexedDB"
4. 找到 "MarketPulseDB"
5. 右鍵點擊 "MarketPulseDB" > "Delete database"
6. 重新載入頁面

或者直接在控制台執行：
clearAndReinitialize()
`);
