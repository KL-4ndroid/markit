# 🔧 資料庫錯誤修復指南

## 問題描述

**錯誤訊息：** `DexieError` - 資料庫初始化失敗

**可能原因：**
1. IndexedDB 資料損壞
2. 瀏覽器儲存空間已滿
3. 隱私模式限制
4. 資料庫版本衝突

---

## 🚀 快速修復方法

### 方法 1：清除瀏覽器資料（推薦）

1. **開啟開發者工具**
   - 按 `F12` 或 `Ctrl + Shift + I`

2. **清除 IndexedDB**
   - 切換到 `Application` 標籤（Chrome）或 `儲存空間` 標籤（Firefox）
   - 找到 `IndexedDB` → `MarketPulseDB`
   - 右鍵點擊 → `Delete database`

3. **清除快取**
   - 在 `Application` 標籤中
   - 點擊 `Clear storage`
   - 勾選 `IndexedDB`
   - 點擊 `Clear site data`

4. **重新載入頁面**
   - 按 `Ctrl + Shift + R`（強制重新載入）

### 方法 2：使用瀏覽器控制台

1. **開啟開發者工具**
   - 按 `F12`

2. **切換到 Console 標籤**

3. **執行以下指令**

```javascript
// 刪除資料庫
indexedDB.deleteDatabase('MarketPulseDB');

// 重新載入頁面
location.reload();
```

### 方法 3：清除所有網站資料

1. **Chrome：**
   - 設定 → 隱私權和安全性 → 清除瀏覽資料
   - 選擇「Cookie 和其他網站資料」
   - 選擇「快取圖片和檔案」
   - 點擊「清除資料」

2. **Firefox：**
   - 選項 → 隱私權與安全性 → Cookie 與網站資料
   - 點擊「清除資料」

3. **Edge：**
   - 設定 → 隱私權、搜尋與服務 → 清除瀏覽資料
   - 選擇「Cookie 和其他網站資料」
   - 點擊「立即清除」

---

## 🔍 進階診斷

### 檢查瀏覽器支援

在控制台執行：

```javascript
// 檢查 IndexedDB 支援
console.log('IndexedDB 支援:', !!window.indexedDB);

// 檢查儲存空間
if (navigator.storage && navigator.storage.estimate) {
  navigator.storage.estimate().then(estimate => {
    console.log('已使用:', estimate.usage);
    console.log('配額:', estimate.quota);
    console.log('使用率:', (estimate.usage / estimate.quota * 100).toFixed(2) + '%');
  });
}
```

### 檢查資料庫狀態

```javascript
// 列出所有資料庫
indexedDB.databases().then(dbs => {
  console.log('資料庫列表:', dbs);
});

// 檢查特定資料庫
const request = indexedDB.open('MarketPulseDB');
request.onsuccess = () => {
  const db = request.result;
  console.log('資料庫版本:', db.version);
  console.log('資料表:', Array.from(db.objectStoreNames));
  db.close();
};
request.onerror = () => {
  console.error('無法開啟資料庫:', request.error);
};
```

---

## 🛠️ 手動重置資料庫

### 使用開發者工具

1. **開啟 Console**

2. **執行重置腳本**

```javascript
// 完整重置腳本
(async function resetDatabase() {
  try {
    // 1. 刪除舊資料庫
    console.log('🗑️ 刪除舊資料庫...');
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('MarketPulseDB');
      request.onsuccess = resolve;
      request.onerror = reject;
    });
    
    console.log('✅ 資料庫已刪除');
    
    // 2. 清除 localStorage
    console.log('🗑️ 清除 localStorage...');
    localStorage.clear();
    
    // 3. 清除 sessionStorage
    console.log('🗑️ 清除 sessionStorage...');
    sessionStorage.clear();
    
    console.log('✅ 重置完成！');
    console.log('🔄 正在重新載入頁面...');
    
    // 4. 重新載入頁面
    setTimeout(() => {
      location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ 重置失敗:', error);
  }
})();
```

---

## 🐛 常見問題

### Q1: 清除資料後還是出現錯誤？

**A:** 嘗試以下步驟：

1. 關閉所有瀏覽器視窗
2. 重新開啟瀏覽器
3. 清除瀏覽器快取（Ctrl + Shift + Delete）
4. 重新訪問網站

### Q2: 隱私模式下無法使用？

**A:** IndexedDB 在某些瀏覽器的隱私模式下有限制：

- **Chrome：** 支援，但資料會在關閉視窗後清除
- **Firefox：** 支援，但有儲存限制
- **Safari：** 可能不支援

**解決方法：** 使用正常模式

### Q3: 資料會遺失嗎？

**A:** 清除資料庫會刪除所有本地資料：

- ❌ 市集記錄
- ❌ 商品資料
- ❌ 交易記錄
- ❌ 統計資料

**建議：** 在清除前先匯出資料（如果可以）

### Q4: 如何備份資料？

**A:** 在控制台執行：

```javascript
// 匯出資料（如果資料庫可以開啟）
async function exportData() {
  const { db } = await import('./lib/db/index');
  const data = await db.exportData();
  
  // 下載為 JSON 檔案
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `market-pulse-backup-${Date.now()}.json`;
  a.click();
}

exportData();
```

---

## 📝 預防措施

### 1. 定期備份

建議每週備份一次資料：
- 進入「設定」頁面
- 點擊「匯出資料」
- 儲存 JSON 檔案

### 2. 避免儲存空間不足

定期檢查瀏覽器儲存空間：
- Chrome: `chrome://quota-internals/`
- Firefox: `about:preferences#privacy`

### 3. 使用最新瀏覽器

確保瀏覽器版本是最新的：
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

### 4. 避免多個分頁同時操作

同時開啟多個分頁可能導致資料衝突：
- 建議只在一個分頁中使用
- 關閉其他分頁

---

## 🆘 仍然無法解決？

### 檢查清單

- [ ] 已清除 IndexedDB
- [ ] 已清除瀏覽器快取
- [ ] 已重新啟動瀏覽器
- [ ] 已檢查儲存空間
- [ ] 已更新瀏覽器版本
- [ ] 已關閉其他分頁

### 聯絡支援

如果以上方法都無法解決，請提供以下資訊：

1. 瀏覽器名稱和版本
2. 作業系統
3. 完整的錯誤訊息
4. 控制台截圖

---

## ✅ 修復確認

修復成功後，您應該看到：

1. **首頁正常載入**
   - 無錯誤訊息
   - 底部導航可見

2. **市集頁面可訪問**
   - 點擊「市集」圖標
   - 頁面正常顯示

3. **商品頁面可訪問**
   - 點擊「商品」圖標
   - 頁面正常顯示

4. **控制台無錯誤**
   - 按 F12 檢查
   - 無紅色錯誤訊息

---

**最後更新：** 2026-01-21  
**適用版本：** Market Pulse v0.5.0
