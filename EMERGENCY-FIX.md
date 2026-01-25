# 🚨 緊急修復：資料庫遷移失敗

## 問題
```
DexieError: Not yet support for changing primary key
```

資料庫因為遷移失敗而關閉，需要清除並重新初始化。

---

## ✅ 解決方案（3 種方法）

### 方法 1：使用瀏覽器控制台（最快）

1. 打開瀏覽器控制台（F12）
2. 複製並執行以下代碼：

```javascript
// 清除 IndexedDB
const deleteRequest = window.indexedDB.deleteDatabase('MarketPulseDB');
deleteRequest.onsuccess = () => {
  console.log('✅ 資料庫已清除');
  window.location.reload();
};
deleteRequest.onerror = (e) => console.error('❌ 清除失敗：', e);
deleteRequest.onblocked = () => console.warn('⚠️ 請關閉所有分頁後重試');
```

3. 等待頁面自動重新載入

---

### 方法 2：使用 Chrome DevTools（推薦）

1. 打開 Chrome DevTools（F12）
2. 切換到 **"Application"** 標籤
3. 左側選單：**Storage** > **IndexedDB**
4. 找到 **"MarketPulseDB"**
5. 右鍵點擊 > **"Delete database"**
6. 重新載入頁面（Ctrl+R 或 F5）

---

### 方法 3：使用清理腳本

1. 在控制台執行：
```javascript
// 載入清理腳本
const script = document.createElement('script');
script.src = '/scripts/clear-indexeddb.js';
document.head.appendChild(script);
```

2. 或者直接訪問：`/scripts/clear-indexeddb.js`

---

## 📝 清除後會發生什麼？

### ✅ 保留的數據
- Supabase 雲端數據（如果已同步）
- 用戶設定（存儲在 Supabase）
- 快速互動按鈕配置（存儲在 Supabase）

### ❌ 丟失的數據
- 本地未同步的事件
- 本地未同步的市集數據
- 本地未同步的商品數據

### 🔄 重新初始化
頁面重新載入後，Dexie 會：
1. 創建新的資料庫（版本 4）
2. 使用正確的索引結構
3. 如果已登入，從 Supabase 同步數據

---

## 🎯 驗證修復成功

重新載入後，檢查控制台應該看到：

```
✅ 資料庫初始化完成：已建立預設設定
📊 資料庫統計：{ events: 0, markets: 0, products: 0, dailyStats: 0 }
```

**沒有錯誤訊息** = 修復成功！

---

## 🔍 如果還是失敗

### 1. 清除所有網站數據
Chrome DevTools > Application > Storage > **Clear site data**

### 2. 無痕模式測試
開啟無痕視窗測試是否正常運行

### 3. 檢查瀏覽器版本
確保使用最新版本的 Chrome/Edge/Firefox

---

## 💾 備份建議（未來）

為避免數據丟失，建議：

1. **定期同步到 Supabase**
   - 登入帳號
   - 確保網路連線
   - 檢查同步狀態

2. **匯出數據**
   - 在設定頁面使用「匯出數據」功能
   - 定期下載備份檔案

3. **測試環境**
   - 使用無痕模式測試新功能
   - 避免在生產數據上測試

---

## 📞 需要幫助？

如果以上方法都無法解決，請提供：
1. 瀏覽器版本
2. 完整的錯誤訊息
3. 控制台截圖

---

**修復時間**：約 1-2 分鐘  
**數據丟失風險**：低（如果已同步到 Supabase）  
**操作難度**：簡單
