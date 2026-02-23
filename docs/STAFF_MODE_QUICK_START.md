# 員工模式快速開始指南

## 🚀 5 分鐘快速測試

### 前置條件

- ✅ 已執行 SQL 腳本：`supabase/migrations/20240220_staff_system_simple.sql`
- ✅ 已登入 Supabase 帳號
- ✅ 有兩個測試帳號（帳號 A 和帳號 B）

---

## 📋 測試步驟

### 步驟 1：帳號 A（老闆）邀請員工

1. **登入帳號 A**

2. **啟用員工模式**（在瀏覽器控制台執行）：
```javascript
localStorage.setItem('feature_staff_mode', 'true');
location.reload();
```

3. **前往設置頁面**：
   - 點擊底部導航的「設定」
   - 找到「員工管理」區塊

4. **邀請員工**：
   - 點擊「邀請員工」按鈕
   - 輸入帳號 B 的 email
   - 選擇權限：
     - **僅查看**：員工只能查看，無法編輯
     - **可編輯**：員工可以記錄互動、成交，編輯商品
   - 點擊「確認邀請」

5. **確認邀請成功**：
   - 應該看到 toast 提示：「✅ 已邀請 xxx@email.com 成為員工」
   - 員工列表中應該顯示帳號 B

---

### 步驟 2：帳號 B（員工）查看市集

1. **登出帳號 A，登入帳號 B**

2. **啟用員工模式**（在瀏覽器控制台執行）：
```javascript
localStorage.setItem('feature_staff_mode', 'true');
location.reload();
```

3. **等待同步完成**（約 5-10 秒）
   - 觀察控制台日誌：
   ```
   📊 員工模式已啟用，嘗試從視圖拉取數據...
   📥 拉取到 X 個市集
   📥 拉取到 X 個商品
   ✅ 視圖數據同步完成
   ```

4. **查看市集列表**：
   - 前往「市集」頁面
   - 應該看到帳號 A 的市集
   - 市集卡片應該顯示「員工模式」標籤（綠色，帶 Shield 圖標）
   - **不應該顯示**「淨利潤」區塊
   - 應該顯示「收入」、「成交次數」等公開數據

5. **查看商品列表**：
   - 前往「商品」頁面
   - 應該看到帳號 A 的商品
   - 商品卡片應該顯示「員工」標籤（左上角，綠色，帶 Shield 圖標）
   - **不應該顯示**「成本」和「利潤率」
   - 應該顯示「價格」、「庫存」等公開數據

---

### 步驟 3：驗證權限欄位

在帳號 B 的瀏覽器控制台執行：

```javascript
// 檢查市集權限
const request = indexedDB.open('MarketPulseDB');
request.onsuccess = function(event) {
  const db = event.target.result;
  
  // 查詢市集
  const marketTx = db.transaction(['markets'], 'readonly');
  const marketStore = marketTx.objectStore('markets');
  const marketRequest = marketStore.getAll();
  
  marketRequest.onsuccess = function() {
    const markets = marketRequest.result;
    console.log('=== 市集權限（員工視角）===');
    markets.forEach(m => {
      console.log(`${m.name}:`, {
        access_type: m.access_type,  // 應該是 "staff"
        permissions: m.permissions,   // 應該是 {can_view: true, can_edit: false/true}
        relationship_owner_id: m.relationship_owner_id  // 應該是帳號 A 的 ID
      });
    });
  };
  
  // 查詢商品
  const productTx = db.transaction(['products'], 'readonly');
  const productStore = productTx.objectStore('products');
  const productRequest = productStore.getAll();
  
  productRequest.onsuccess = function() {
    const products = productRequest.result;
    console.log('=== 商品權限（員工視角）===');
    products.forEach(p => {
      console.log(`${p.name}:`, {
        access_type: p.access_type,  // 應該是 "staff"
        permissions: p.permissions,   // 應該是 {can_view: true, can_edit: false/true}
        relationship_owner_id: p.relationship_owner_id  // 應該是帳號 A 的 ID
      });
    });
  };
};
```

**預期輸出**：
```
=== 市集權限（員工視角）===
市集名稱: {
  access_type: "staff",
  permissions: {can_view: true, can_edit: false},
  relationship_owner_id: "帳號 A 的 UUID"
}

=== 商品權限（員工視角）===
商品名稱: {
  access_type: "staff",
  permissions: {can_view: true, can_edit: false},
  relationship_owner_id: "帳號 A 的 UUID"
}
```

---

### 步驟 4：切換回老闆視角

1. **登出帳號 B，登入帳號 A**

2. **確認員工模式已啟用**（或重新啟用）

3. **查看市集和商品列表**：
   - 應該顯示所有數據（利潤、成本、利潤率）
   - **不應該顯示**員工標籤（因為你是 owner）

---

## ✅ 測試檢查清單

### 帳號 A（老闆）視角
- [ ] 可以邀請員工
- [ ] 員工列表顯示正確
- [ ] 顯示「淨利潤」
- [ ] 顯示「成本」和「利潤率」
- [ ] 沒有員工標籤
- [ ] `access_type: "owner"`

### 帳號 B（員工）視角
- [ ] 可以看到帳號 A 的市集
- [ ] 顯示「員工模式」標籤
- [ ] **不顯示**「淨利潤」
- [ ] **不顯示**「成本」和「利潤率」
- [ ] 顯示「收入」、「價格」等公開數據
- [ ] `access_type: "staff"`
- [ ] `permissions: {can_view: true, can_edit: false/true}`

---

## 🎯 視覺參考

### 老闆視角（帳號 A）

**市集卡片**：
```
┌─────────────────────────────────┐
│ [ongoing] 市集名稱              │
│ 📅 2026-02-21                   │
│ 📍 台北                         │
│                                 │
│ ┌──────────┐ ┌──────────┐      │
│ │ 收入     │ │ 淨利潤   │ ✅   │
│ │ $10,000  │ │ $5,000   │      │
│ └──────────┘ └──────────┘      │
└─────────────────────────────────┘
```

### 員工視角（帳號 B）

**市集卡片**：
```
┌─────────────────────────────────┐
│ [ongoing] [🛡️ 員工模式] 市集名稱│
│ 📅 2026-02-21                   │
│ 📍 台北                         │
│                                 │
│ ┌──────────┐                   │
│ │ 收入     │ ❌ 淨利潤被隱藏   │
│ │ $10,000  │                   │
│ └──────────┘                   │
└─────────────────────────────────┘
```

**商品卡片**：
```
┌─────────────────────────┐
│ [🛡️ 員工]              │
│                         │
│      🎨 商品圖標        │
│                         │
│ 商品名稱                │
│ $100                    │
│ ❌ 成本被隱藏           │
│ ❌ 利潤率被隱藏         │
│ 庫存 10                 │
└─────────────────────────┘
```

---

## 🐛 常見問題

### Q1：看不到「員工模式」標籤

**可能原因**：
1. 員工模式未啟用
2. 沒有被邀請到任何市集
3. 權限欄位未正確保存

**解決方法**：
```javascript
// 1. 檢查員工模式狀態
console.log('員工模式:', localStorage.getItem('feature_staff_mode'));

// 2. 檢查市集權限
const request = indexedDB.open('MarketPulseDB');
request.onsuccess = function(event) {
  const db = event.target.result;
  const tx = db.transaction(['markets'], 'readonly');
  const store = tx.objectStore('markets');
  const req = store.getAll();
  req.onsuccess = function() {
    console.log('市集權限:', req.result.map(m => ({
      name: m.name,
      access_type: m.access_type
    })));
  };
};
```

---

### Q2：員工模式下仍然看到敏感數據

**可能原因**：
1. `access_type` 為 `"owner"` 而不是 `"staff"`
2. 視圖拉取失敗，使用了原邏輯

**解決方法**：
```javascript
// 檢查同步日誌
// 應該看到：
// 📊 員工模式已啟用，嘗試從視圖拉取數據...
// ✅ 視圖數據同步完成

// 如果看到：
// ⚠️ 從視圖拉取失敗，降級到原邏輯
// 說明視圖查詢失敗，請檢查 Supabase SQL 腳本是否正確執行
```

---

### Q3：邀請員工時提示「找不到此 email 的用戶」

**原因**：對方還沒有註冊帳號

**解決方法**：
1. 確認對方已經註冊並登入過一次
2. 確認 email 拼寫正確
3. 檢查 Supabase 的 `profiles` 表是否有該用戶記錄

---

## 🎉 測試完成

如果所有測試都通過，恭喜！員工模式功能已經完整運作。

### 下一步

1. **關閉員工模式**（如果不需要）：
```javascript
localStorage.removeItem('feature_staff_mode');
location.reload();
```

2. **查看完整報告**：
   - `docs/STAFF_MODE_IMPLEMENTATION_REPORT.md`

3. **部署到生產環境**：
   - 確認所有測試通過
   - 確認 SQL 腳本已在生產環境執行
   - 部署前端代碼

---

**祝測試順利！** 🚀
