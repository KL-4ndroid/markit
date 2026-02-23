# Phase B 測試指南

## 🎯 測試目標

驗證 Phase A 和 Phase B 的修改不會破壞現有功能，並且員工模式的基礎設施已正確實現。

---

## ✅ Phase A + B1 測試（預設狀態 - 特性開關關閉）

### 測試 1：現有功能正常運作

**目的**：確保新增的欄位不影響現有功能

**步驟**：
1. 打開應用程式
2. 查看市集列表
3. 查看商品列表
4. 新增市集
5. 新增商品
6. 記錄交易

**預期結果**：
- ✅ 所有功能正常運作
- ✅ 沒有任何錯誤
- ✅ 數據正常顯示
- ✅ 離線功能正常

**如果失敗**：
- 檢查瀏覽器控制台是否有錯誤
- 檢查 TypeScript 編譯錯誤
- 立即回滾（見下方回滾指令）

---

### 測試 2：特性開關功能

**目的**：驗證特性開關可以正常讀寫

**步驟**：
1. 打開瀏覽器控制台（F12）
2. 執行以下代碼：

```javascript
// 測試特性開關
const { isStaffModeEnabled, enableStaffMode, disableStaffMode } = await import('/lib/db/feature-flags.ts');

// 檢查預設狀態（應該是 false）
console.log('預設狀態:', isStaffModeEnabled()); // 應該輸出 false

// 啟用員工模式
enableStaffMode();
console.log('啟用後:', isStaffModeEnabled()); // 應該輸出 true

// 停用員工模式
disableStaffMode();
console.log('停用後:', isStaffModeEnabled()); // 應該輸出 false
```

**預期結果**：
- ✅ 預設狀態為 false
- ✅ 可以正常啟用和停用
- ✅ localStorage 正常讀寫

**如果失敗**：
- 檢查 localStorage 權限
- 檢查模組導入路徑

---

## 🔄 Phase B2-B3 測試（啟用員工模式）

### 測試 3：視圖拉取功能（需要員工權限）

**前置條件**：
1. 你需要有一個員工帳號（被邀請的帳號）
2. 或者在 Supabase 中手動創建員工關係

**步驟**：
1. 打開瀏覽器控制台
2. 啟用員工模式：

```javascript
// 啟用員工模式
localStorage.setItem('feature_staff_mode', 'true');
console.log('✅ 員工模式已啟用');

// 重新載入頁面
location.reload();
```

3. 等待同步完成（約 5-10 秒）
4. 查看控制台日誌

**預期結果**：
- ✅ 看到 "📊 員工模式已啟用，嘗試從視圖拉取數據..."
- ✅ 看到 "📥 拉取到 X 個市集"
- ✅ 看到 "📥 拉取到 X 個商品"
- ✅ 看到 "✅ 視圖數據同步完成"
- ✅ 市集和商品列表正常顯示

**如果失敗（預期行為）**：
- ⚠️ 如果你沒有員工權限，會看到 "⚠️ 從視圖拉取失敗，降級到原邏輯"
- ✅ 這是正常的！降級方案會自動啟動
- ✅ 應用程式應該繼續正常運作

---

### 測試 4：降級方案

**目的**：驗證視圖拉取失敗時會自動降級

**步驟**：
1. 確保員工模式已啟用
2. 斷開網路連接
3. 重新載入頁面
4. 查看控制台日誌

**預期結果**：
- ✅ 看到 "⚠️ 從視圖拉取失敗，降級到原邏輯"
- ✅ 應用程式繼續使用原邏輯同步
- ✅ 沒有崩潰或錯誤

---

### 測試 5：關閉特性開關

**目的**：驗證可以隨時回到原邏輯

**步驟**：
1. 打開瀏覽器控制台
2. 執行：

```javascript
// 停用員工模式
localStorage.removeItem('feature_staff_mode');
console.log('✅ 員工模式已停用');

// 重新載入
location.reload();
```

3. 查看控制台日誌

**預期結果**：
- ✅ 不再看到 "📊 員工模式已啟用" 的日誌
- ✅ 使用原邏輯同步
- ✅ 所有功能正常

---

## 🧪 完整測試流程

### 流程 1：老闆模式（特性開關關閉）

```javascript
// 1. 確保特性開關關閉
localStorage.removeItem('feature_staff_mode');
location.reload();

// 2. 測試所有功能
// - 查看市集列表 ✅
// - 新增市集 ✅
// - 查看商品列表 ✅
// - 新增商品 ✅
// - 記錄交易 ✅
// - 離線功能 ✅
```

### 流程 2：員工模式（特性開關開啟）

```javascript
// 1. 啟用特性開關
localStorage.setItem('feature_staff_mode', 'true');
location.reload();

// 2. 查看同步日誌
// - 應該看到視圖拉取日誌
// - 或者看到降級日誌（如果沒有員工權限）

// 3. 測試功能
// - 查看市集列表 ✅
// - 查看商品列表 ✅
// - 數據應該包含權限欄位（如果有員工權限）
```

### 流程 3：降級測試

```javascript
// 1. 啟用特性開關
localStorage.setItem('feature_staff_mode', 'true');

// 2. 斷開網路
// 3. 重新載入
location.reload();

// 4. 應該看到降級日誌
// 5. 功能應該正常（使用原邏輯）
```

---

## 🚨 快速回滾指令

如果發現任何問題，立即執行：

```javascript
// 方法 1：快速回滾（1 秒）
localStorage.removeItem('feature_staff_mode');
location.reload();

// 方法 2：完整回滾（如果需要清除數據）
async function fullRollback() {
  // 1. 停用特性開關
  localStorage.removeItem('feature_staff_mode');
  
  // 2. 清除權限欄位（可選）
  const { db } = await import('/lib/db/index.ts');
  
  const markets = await db.markets.toArray();
  for (const market of markets) {
    await db.markets.update(market.id, {
      access_type: undefined,
      permissions: undefined,
      relationship_owner_id: undefined,
    });
  }
  
  const products = await db.products.toArray();
  for (const product of products) {
    await db.products.update(product.id, {
      access_type: undefined,
      permissions: undefined,
      relationship_owner_id: undefined,
    });
  }
  
  console.log('✅ 完整回滾完成');
  location.reload();
}

// 執行完整回滾
fullRollback();
```

---

## 📋 測試檢查清單

### Phase A + B1（預設狀態）
- [ ] 市集列表正常顯示
- [ ] 商品列表正常顯示
- [ ] 可以新增市集
- [ ] 可以新增商品
- [ ] 可以記錄交易
- [ ] 離線功能正常
- [ ] 特性開關可以讀寫
- [ ] 預設狀態為關閉

### Phase B2-B3（啟用員工模式）
- [ ] 啟用特性開關後可以看到視圖拉取日誌
- [ ] 視圖拉取成功（如果有員工權限）
- [ ] 視圖拉取失敗時自動降級（如果沒有員工權限）
- [ ] 降級後功能正常
- [ ] 關閉特性開關後恢復原邏輯
- [ ] 沒有崩潰或錯誤

---

## 🎯 下一步

如果所有測試通過：
- ✅ Phase A 和 B 完成
- ✅ 可以繼續 Phase C（更新 UI 組件）

如果有任何測試失敗：
- ❌ 立即回滾
- ❌ 報告問題
- ❌ 修復後重新測試

---

## 💡 測試技巧

### 查看同步日誌

打開瀏覽器控制台，過濾日誌：

```
// 只看員工模式相關日誌
📊  // 員工模式啟用
📥  // 拉取數據
📝  // 同步數據
✅  // 成功
⚠️  // 警告（降級）
❌  // 錯誤
```

### 檢查數據是否有權限欄位

```javascript
// 檢查市集數據
const { db } = await import('/lib/db/index.ts');
const markets = await db.markets.toArray();
console.log('市集數據:', markets[0]);
// 應該看到 access_type, permissions, relationship_owner_id（如果有員工權限）

// 檢查商品數據
const products = await db.products.toArray();
console.log('商品數據:', products[0]);
// 應該看到 access_type, permissions, relationship_owner_id（如果有員工權限）
```

---

**準備好測試了嗎？** 🚀
