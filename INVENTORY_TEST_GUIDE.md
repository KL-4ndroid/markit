# 🧪 彈性庫存管理 - 快速測試指南

## 🚀 開始測試前

### 1. 重置資料庫（建議）

訪問：`http://localhost:3000/fix.html`

點擊「立即修復」，確保從乾淨的資料庫開始測試。

---

## ✅ 測試清單

### 測試 1：建立不限庫存商品 ⭐

**目標：** 驗證不限庫存商品可以正常建立

**步驟：**
1. 進入「商品」頁面
2. 點擊右下角「+」按鈕
3. 填寫表單：
   ```
   商品名稱：客製化插畫
   分類：藝術品 🎨
   售價：1500
   成本：500
   ☑ 不限庫存（販售服務或接單訂製）
   描述：現場手繪，約 30 分鐘完成
   ```
4. 點擊「建立商品」

**預期結果：**
- ✅ 商品建立成功
- ✅ 商品卡片顯示「庫存 ∞」（綠色）
- ✅ 控制台顯示：`📦 商品已建立：客製化插畫 (不限庫存)`

---

### 測試 2：建立有限庫存商品 ⭐

**目標：** 驗證有限庫存商品可以正常建立

**步驟：**
1. 進入「商品」頁面
2. 點擊右下角「+」按鈕
3. 填寫表單：
   ```
   商品名稱：手工陶杯
   分類：手作 🧵
   售價：350
   成本：150
   庫存數量：10
   ☐ 不限庫存（不勾選）
   描述：手工拉坯，每個獨一無二
   ```
4. 點擊「建立商品」

**預期結果：**
- ✅ 商品建立成功
- ✅ 商品卡片顯示「庫存 10」
- ✅ 控制台顯示：`📦 商品已建立：手工陶杯`

---

### 測試 3：建立市集 ⭐

**目標：** 建立測試用市集

**步驟：**
1. 進入「市集」頁面
2. 點擊右下角「+」按鈕
3. 填寫表單：
   ```
   市集名稱：測試市集
   地點：測試地點
   日期：選擇今天
   時間：10:00 - 18:00
   報名費：100
   攤位成本：500
   ```
4. 點擊「建立市集」

**預期結果：**
- ✅ 市集建立成功
- ✅ 可以看到市集卡片

---

### 測試 4：成交不限庫存商品 ⭐⭐

**目標：** 驗證不限庫存商品成交後不扣除庫存

**步驟：**
1. 進入「測試市集」詳情頁
2. 點擊「開始營業」
3. 點擊「客製化插畫」商品卡片
4. 數量選擇 2
5. 點擊「結帳」
6. 選擇支付方式：現金
7. 點擊「確認結帳」

**預期結果：**
- ✅ 結帳成功
- ✅ 「客製化插畫」庫存仍顯示「∞」
- ✅ 「客製化插畫」已售顯示「2」
- ✅ 市集總收入增加 NT$ 3,000
- ✅ 控制台顯示：`💰 成交已記錄：NT$3000`

**驗證方式：**
```javascript
// 在控制台執行
const db = indexedDB.open('MarketPulseDB');
db.onsuccess = async () => {
  const database = db.result;
  const tx = database.transaction(['products'], 'readonly');
  const store = tx.objectStore('products');
  const products = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
  const product = products.find(p => p.name === '客製化插畫');
  console.log('客製化插畫:', {
    stock: product.stock,           // 應該是 0
    unlimitedStock: product.unlimitedStock, // 應該是 true
    totalSold: product.totalSold    // 應該是 2
  });
  database.close();
};
```

---

### 測試 5：成交有限庫存商品 ⭐⭐

**目標：** 驗證有限庫存商品成交後正確扣除庫存

**步驟：**
1. 在 POS 頁面
2. 點擊「手工陶杯」商品卡片
3. 數量選擇 3
4. 點擊「結帳」
5. 選擇支付方式：現金
6. 點擊「確認結帳」

**預期結果：**
- ✅ 結帳成功
- ✅ 「手工陶杯」庫存從 10 變成 7
- ✅ 「手工陶杯」已售顯示「3」
- ✅ 市集總收入增加 NT$ 1,050
- ✅ 控制台顯示：`💰 成交已記錄：NT$1050`

**驗證方式：**
```javascript
// 在控制台執行
const db = indexedDB.open('MarketPulseDB');
db.onsuccess = async () => {
  const database = db.result;
  const tx = database.transaction(['products'], 'readonly');
  const store = tx.objectStore('products');
  const products = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
  const product = products.find(p => p.name === '手工陶杯');
  console.log('手工陶杯:', {
    stock: product.stock,           // 應該是 7
    unlimitedStock: product.unlimitedStock, // 應該是 false 或 undefined
    totalSold: product.totalSold    // 應該是 3
  });
  database.close();
};
```

---

### 測試 6：庫存不足防呆 ⭐⭐⭐

**目標：** 驗證庫存不足時無法結帳

**步驟：**
1. 在 POS 頁面
2. 點擊「手工陶杯」商品卡片
3. 數量選擇 10（超過剩餘庫存 7）
4. 點擊「結帳」

**預期結果：**
- ❌ 結帳失敗
- ✅ 顯示錯誤訊息：「手工陶杯 庫存不足！目前庫存：7，需要：10」
- ✅ 購物車保持不變
- ✅ 「手工陶杯」庫存仍為 7（未被扣除）
- ✅ 控制台顯示錯誤訊息

---

### 測試 7：編輯商品切換庫存模式 ⭐⭐

**目標：** 驗證可以將有限庫存改為不限庫存

**步驟：**
1. 進入「商品」頁面
2. 點擊「手工陶杯」商品卡片
3. 點擊「編輯」按鈕
4. 勾選「☑ 不限庫存」
5. 點擊「儲存變更」

**預期結果：**
- ✅ 更新成功
- ✅ 「手工陶杯」庫存顯示變為「∞」
- ✅ 「手工陶杯」已售仍為「3」（保留）
- ✅ 控制台顯示：`📦 商品已更新：ID X`

**再次測試成交：**
1. 回到 POS 頁面
2. 點擊「手工陶杯」x 5
3. 點擊「結帳」

**預期結果：**
- ✅ 結帳成功（不再檢查庫存）
- ✅ 「手工陶杯」庫存仍顯示「∞」
- ✅ 「手工陶杯」已售變為「8」

---

### 測試 8：除數保護驗證 ⭐⭐⭐

**目標：** 驗證轉換率和客單價不會出現 NaN

**步驟：**
1. 建立新市集「除數測試市集」
2. 開始營業
3. **不記錄任何互動**
4. 直接結帳一筆交易

**預期結果：**
- ✅ 結帳成功
- ✅ 控制台顯示：`📊 市集統計更新：轉換率 0.0%，客單價 NT$XXX`
- ✅ 轉換率為 0%（不是 NaN）
- ✅ 客單價為正常數字

**驗證方式：**
```javascript
// 在控制台執行
const db = indexedDB.open('MarketPulseDB');
db.onsuccess = async () => {
  const database = db.result;
  const tx = database.transaction(['markets'], 'readonly');
  const store = tx.objectStore('markets');
  const markets = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
  const market = markets.find(m => m.name === '除數測試市集');
  
  const conversionRate = market.totalInteractions > 0 
    ? (market.totalDeals / market.totalInteractions) * 100 
    : 0;
  
  const averageOrderValue = market.totalDeals > 0 
    ? market.totalRevenue / market.totalDeals 
    : 0;
  
  console.log('統計數據:', {
    totalInteractions: market.totalInteractions,
    totalDeals: market.totalDeals,
    totalRevenue: market.totalRevenue,
    conversionRate: conversionRate,      // 應該是 0，不是 NaN
    averageOrderValue: averageOrderValue, // 應該是正常數字，不是 NaN
    isNaN_conversionRate: isNaN(conversionRate),
    isNaN_averageOrderValue: isNaN(averageOrderValue)
  });
  
  database.close();
};
```

---

## 📊 測試結果記錄表

| 測試項目 | 狀態 | 備註 |
|---------|------|------|
| 測試 1：建立不限庫存商品 | ⬜ 未測試 / ✅ 通過 / ❌ 失敗 | |
| 測試 2：建立有限庫存商品 | ⬜ 未測試 / ✅ 通過 / ❌ 失敗 | |
| 測試 3：建立市集 | ⬜ 未測試 / ✅ 通過 / ❌ 失敗 | |
| 測試 4：成交不限庫存商品 | ⬜ 未測試 / ✅ 通過 / ❌ 失敗 | |
| 測試 5：成交有限庫存商品 | ⬜ 未測試 / ✅ 通過 / ❌ 失敗 | |
| 測試 6：庫存不足防呆 | ⬜ 未測試 / ✅ 通過 / ❌ 失敗 | |
| 測試 7：切換庫存模式 | ⬜ 未測試 / ✅ 通過 / ❌ 失敗 | |
| 測試 8：除數保護驗證 | ⬜ 未測試 / ✅ 通過 / ❌ 失敗 | |

---

## 🐛 常見問題排查

### 問題 1：商品建立後看不到

**可能原因：**
- 頁面沒有自動刷新

**解決方法：**
- 手動重新整理頁面（F5）
- 檢查控制台是否有錯誤訊息

### 問題 2：結帳時出現錯誤

**可能原因：**
- 資料庫狀態不一致
- 商品不存在

**解決方法：**
1. 檢查控制台錯誤訊息
2. 重置資料庫：`http://localhost:3000/fix.html`
3. 重新建立測試資料

### 問題 3：庫存顯示異常

**可能原因：**
- 快取問題
- 資料庫未正確更新

**解決方法：**
1. 強制重新整理（Ctrl + Shift + R）
2. 檢查資料庫資料（使用上面的驗證腳本）
3. 重置資料庫

---

## 🎯 快速驗證腳本

### 檢查所有商品狀態

```javascript
// 在控制台執行
(async function() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('MarketPulseDB');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const tx = db.transaction(['products'], 'readonly');
  const store = tx.objectStore('products');
  const products = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
  
  console.table(products.map(p => ({
    名稱: p.name,
    庫存: p.unlimitedStock ? '∞' : p.stock,
    不限庫存: p.unlimitedStock ? '是' : '否',
    已售: p.totalSold || 0,
    售價: p.price,
    成本: p.cost || 0
  })));
  
  db.close();
})();
```

### 檢查市集統計

```javascript
// 在控制台執行
(async function() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('MarketPulseDB');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const tx = db.transaction(['markets'], 'readonly');
  const store = tx.objectStore('markets');
  const markets = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
  
  console.table(markets.map(m => ({
    名稱: m.name,
    狀態: m.status,
    總收入: m.totalRevenue || 0,
    總利潤: m.totalProfit || 0,
    成交數: m.totalDeals || 0,
    互動數: m.totalInteractions || 0,
    轉換率: m.totalInteractions > 0 
      ? ((m.totalDeals / m.totalInteractions) * 100).toFixed(1) + '%' 
      : '0%'
  })));
  
  db.close();
})();
```

---

## ✅ 測試完成檢查清單

完成所有測試後，請確認：

- [ ] 所有 8 個測試項目都通過
- [ ] 控制台無紅色錯誤訊息
- [ ] 不限庫存商品顯示「∞」
- [ ] 有限庫存商品正確扣除庫存
- [ ] 庫存不足時無法結帳
- [ ] 轉換率和客單價無 NaN
- [ ] 可以正常切換庫存模式

---

**測試時間：** 約 15-20 分鐘  
**難度：** ⭐⭐⭐☆☆  
**建議：** 按順序執行測試，每個測試都驗證結果後再進行下一個

**祝測試順利！** 🎉
