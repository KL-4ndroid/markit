# 🚨 緊急修復：清理 IndexedDB

## 問題

Dexie 報錯：`Not yet support for changing primary key`

這是因為版本 3 使用 `date` 作為主鍵，版本 4 改為 `++id`，Dexie 認為這是修改主鍵。

## 解決方案

**需要清除瀏覽器中的 IndexedDB，讓資料庫重新初始化。**

---

## 方法 1：使用清理腳本（推薦）

1. 打開瀏覽器開發者工具（按 `F12`）
2. 切換到 **Console** 標籤
3. 複製並貼上以下腳本：

```javascript
(async function cleanupIndexedDB() {
  console.log('🧹 開始清理 IndexedDB...');
  
  try {
    // 刪除資料庫
    await indexedDB.deleteDatabase('MarketPulseDB');
    
    console.log('✅ IndexedDB 清理完成！');
    console.log('🔄 3 秒後自動重新載入...');
    
    setTimeout(() => location.reload(), 3000);
    
  } catch (error) {
    console.error('❌ 清理失敗：', error);
  }
})();
```

4. 按 `Enter` 執行
5. 等待頁面自動重新載入

---

## 方法 2：手動清理

### Chrome / Edge

1. 打開開發者工具（`F12`）
2. 切換到 **Application** 標籤
3. 左側選擇 **Storage** > **IndexedDB**
4. 找到 **MarketPulseDB**
5. 右鍵點擊，選擇 **Delete database**
6. 重新載入頁面（`Ctrl + R` 或 `F5`）

### Firefox

1. 打開開發者工具（`F12`）
2. 切換到 **Storage** 標籤
3. 左側選擇 **Indexed DB**
4. 找到 **MarketPulseDB**
5. 右鍵點擊，選擇 **Delete "MarketPulseDB"**
6. 重新載入頁面（`Ctrl + R` 或 `F5`）

---

## 方法 3：清除所有網站資料（最徹底）

### Chrome / Edge

1. 打開開發者工具（`F12`）
2. 切換到 **Application** 標籤
3. 左側選擇 **Storage**
4. 點擊 **Clear site data** 按鈕
5. 重新載入頁面

### Firefox

1. 按 `Ctrl + Shift + Delete`
2. 選擇 **時間範圍**：全部
3. 勾選 **Cookie 和網站資料**
4. 點擊 **立即清除**
5. 重新載入頁面

---

## ⚠️ 注意事項

### 資料會遺失嗎？

- ✅ **如果已同步到 Supabase**：資料不會遺失，重新登入後會自動同步回來
- ❌ **如果未同步**：本地資料會遺失

### 建議操作順序

1. **先確認是否已登入 Supabase**
   - 查看右上角是否顯示用戶圖標
   - 如果已登入，資料應該已同步

2. **清理 IndexedDB**
   - 使用上述任一方法

3. **重新載入頁面**
   - 資料庫會自動重新初始化
   - 如果已登入，資料會自動同步回來

---

## 驗證修復

清理後，檢查控制台應該看到：

```
✅ 資料庫初始化完成：已建立預設設定
📊 資料庫統計： {events: 0, markets: 0, products: 0, dailyStats: 0}
```

如果看到這些訊息，表示資料庫已成功重新初始化！

---

## 如果還是有問題

1. **完全關閉瀏覽器**（不只是關閉標籤）
2. **重新打開瀏覽器**
3. **訪問應用**

如果問題仍然存在，請提供控制台的完整錯誤訊息。

---

**修復日期**：2025-01-25  
**問題類型**：資料庫遷移衝突  
**影響範圍**：本地 IndexedDB  
**解決方案**：清除並重新初始化
