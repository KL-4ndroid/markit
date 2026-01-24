# 🚨 DataError 終極修復指南

## 錯誤訊息

```
DataError: Failed to execute 'add' on 'IDBObjectStore': 
Evaluating the object store's key path did not yield a value.
```

## 問題原因

資料庫 schema 與實際資料庫狀態不一致，可能是因為：
1. 資料庫版本升級失敗
2. 之前的錯誤導致資料庫損壞
3. 瀏覽器快取問題

## ⚡ 終極解決方案

### 方法 1：使用修復工具（最簡單）

1. **訪問修復工具**
   ```
   http://localhost:3000/db-fix.html
   ```
   或
   ```
   http://localhost:3001/db-fix.html
   ```

2. **點擊「重置資料庫」**

3. **等待自動重新載入**

### 方法 2：使用瀏覽器控制台（最快）

1. **按 F12** 開啟開發者工具

2. **切換到 Console 標籤**

3. **複製並執行以下程式碼：**

```javascript
// 完整重置腳本
(async function() {
  try {
    console.log('🗑️ 正在刪除資料庫...');
    
    // 關閉資料庫連接
    if (window.indexedDB) {
      const dbs = await indexedDB.databases();
      console.log('找到的資料庫:', dbs);
    }
    
    // 刪除 MarketPulseDB
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('MarketPulseDB');
      request.onsuccess = () => {
        console.log('✅ 資料庫已刪除');
        resolve();
      };
      request.onerror = () => {
        console.error('❌ 刪除失敗:', request.error);
        reject(request.error);
      };
      request.onblocked = () => {
        console.warn('⚠️ 資料庫被鎖定，請關閉其他分頁');
      };
    });
    
    // 清除所有儲存
    console.log('🗑️ 清除 localStorage...');
    localStorage.clear();
    
    console.log('🗑️ 清除 sessionStorage...');
    sessionStorage.clear();
    
    console.log('✅ 清理完成！');
    console.log('🔄 3 秒後重新載入頁面...');
    
    setTimeout(() => {
      location.reload();
    }, 3000);
    
  } catch (error) {
    console.error('❌ 重置失敗:', error);
    alert('重置失敗，請手動清除瀏覽器資料');
  }
})();
```

4. **等待 3 秒後自動重新載入**

### 方法 3：手動清除（最徹底）

#### Chrome / Edge

1. **按 F12** → **Application** 標籤

2. **清除 IndexedDB**
   - 展開左側 `Storage` → `IndexedDB`
   - 找到 `MarketPulseDB`
   - 右鍵點擊 → `Delete database`

3. **清除所有網站資料**
   - 點擊左側 `Storage`
   - 點擊 `Clear site data` 按鈕
   - 確認清除

4. **重新載入頁面**
   - 按 `Ctrl + Shift + R`（強制重新載入）

#### Firefox

1. **按 F12** → **儲存空間** 標籤

2. **清除 IndexedDB**
   - 展開 `IndexedDB`
   - 找到 `MarketPulseDB`
   - 右鍵點擊 → `刪除資料庫`

3. **清除所有資料**
   - 點擊 `清除所有`

4. **重新載入頁面**
   - 按 `Ctrl + Shift + R`

---

## 🔍 驗證修復

修復成功後，執行以下測試：

### 測試 1：檢查資料庫狀態

在控制台執行：

```javascript
// 檢查資料庫
indexedDB.databases().then(dbs => {
  console.log('資料庫列表:', dbs);
  const marketPulse = dbs.find(db => db.name === 'MarketPulseDB');
  if (marketPulse) {
    console.log('✅ MarketPulseDB 存在，版本:', marketPulse.version);
  } else {
    console.log('ℹ️ MarketPulseDB 不存在（正常，會在首次使用時建立）');
  }
});
```

### 測試 2：新增市集

1. 點擊「市集」
2. 點擊「+」新增市集
3. 填寫表單：
   - 市集名稱：測試市集
   - 地點：測試地點
   - 日期：選擇今天
   - 報名費：100
   - 攤位成本：500
4. 點擊「建立市集」
5. **應該成功建立，無錯誤訊息**

### 測試 3：檢查資料

在控制台執行：

```javascript
// 檢查市集資料
(async function() {
  const request = indexedDB.open('MarketPulseDB');
  request.onsuccess = async () => {
    const db = request.result;
    const tx = db.transaction(['markets'], 'readonly');
    const store = tx.objectStore('markets');
    const markets = await new Promise(resolve => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
    console.log('市集資料:', markets);
    db.close();
  };
})();
```

---

## 🐛 仍然失敗？

### 檢查清單

- [ ] 已完全關閉所有瀏覽器視窗
- [ ] 已重新啟動瀏覽器
- [ ] 已清除瀏覽器快取（Ctrl + Shift + Delete）
- [ ] 已檢查沒有其他分頁開啟相同網站
- [ ] 已重新啟動開發伺服器

### 進階解決方案

#### 1. 完全重新安裝

```bash
# 停止開發伺服器（Ctrl + C）

# 刪除 node_modules 和 .next
rm -rf node_modules .next

# 清除 npm 快取
npm cache clean --force

# 重新安裝
npm install

# 啟動
npm run dev
```

#### 2. 使用無痕模式測試

- Chrome: `Ctrl + Shift + N`
- Firefox: `Ctrl + Shift + P`
- Edge: `Ctrl + Shift + N`

如果無痕模式可以正常使用，說明是瀏覽器快取問題。

#### 3. 嘗試其他瀏覽器

- Chrome
- Firefox
- Edge
- Brave

#### 4. 檢查瀏覽器版本

確保使用最新版本：
- Chrome 90+
- Firefox 88+
- Edge 90+

---

## 📝 預防措施

### 1. 定期備份（未來功能）

未來實作備份功能後，建議每週備份一次。

### 2. 避免多分頁操作

同時開啟多個分頁可能導致資料衝突。

### 3. 正常關閉

不要直接關閉瀏覽器，先關閉網站分頁。

### 4. 定期清理

每月清理一次瀏覽器快取。

---

## 🆘 緊急聯絡

如果以上所有方法都無法解決，請提供：

1. 瀏覽器名稱和版本
2. 作業系統
3. 完整的錯誤訊息（截圖）
4. 控制台完整日誌

---

## ✅ 成功標準

修復成功後，您應該能夠：

1. ✅ 訪問首頁，無錯誤
2. ✅ 進入市集頁面
3. ✅ 新增市集，無錯誤
4. ✅ 進入商品頁面
5. ✅ 新增商品，無錯誤
6. ✅ 控制台無紅色錯誤訊息

---

**最後更新：** 2026-01-21  
**適用版本：** Market Pulse v0.5.0  
**錯誤類型：** DataError - Key path evaluation failed
