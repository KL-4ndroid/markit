# 🔧 事件記錄錯誤修復報告

## 問題描述

**錯誤訊息：**
```
❌ 記錄事件失敗：market_created DexieError
建立市集失敗： DexieError
```

**發生時機：** 嘗試新增市集時

---

## 問題原因

### 1. 缺少類型導入

`lib/db/events.ts` 中缺少 `Settings` 類型的導入，導致 TypeScript 編譯錯誤。

### 2. 資料庫未開啟

在某些情況下，資料庫可能尚未開啟就嘗試執行事務。

---

## 修復內容

### 修復 1：添加缺少的類型導入

**檔案：** `lib/db/events.ts`

**修改前：**
```typescript
import type {
  Event,
  EventType,
  EventHandler,
  Market,
  MarketCreatedPayload,
  MarketStatusChangedPayload,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  InteractionRecordedPayload,
  DealClosedPayload,
} from '@/types/db';
```

**修改後：**
```typescript
import type {
  Event,
  EventType,
  EventHandler,
  Market,
  MarketCreatedPayload,
  MarketStatusChangedPayload,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  InteractionRecordedPayload,
  DealClosedPayload,
  Settings,  // ✅ 新增
} from '@/types/db';
```

### 修復 2：確保資料庫已開啟

**檔案：** `lib/db/events.ts`

**在 `recordEvent` 函數中添加：**
```typescript
// 確保資料庫已開啟
if (!db.isOpen()) {
  await db.open();
}
```

### 修復 3：改進錯誤日誌

**添加詳細的錯誤資訊：**
```typescript
catch (error: any) {
  console.error(`❌ 記錄事件失敗：${type}`, error);
  console.error('錯誤詳情:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  throw error;
}
```

---

## 完整的修復步驟

### 步驟 1：清除資料庫

由於之前的錯誤可能導致資料庫損壞，建議先清除：

**方法 A：使用修復工具**
```
訪問：http://localhost:3000/db-fix.html
點擊「重置資料庫」
```

**方法 B：使用控制台**
```javascript
indexedDB.deleteDatabase('MarketPulseDB');
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 步驟 2：重新啟動開發伺服器

```bash
# 停止當前伺服器（Ctrl + C）
# 重新啟動
npm run dev
```

### 步驟 3：驗證修復

1. 訪問首頁
2. 點擊「市集」
3. 點擊「+」新增市集
4. 填寫表單並提交
5. 檢查是否成功建立

---

## 驗證清單

### 功能測試

- [ ] 可以新增市集
- [ ] 可以新增商品
- [ ] 可以記錄互動
- [ ] 可以完成交易
- [ ] 控制台無錯誤訊息

### 資料庫測試

開啟開發者工具（F12）→ Application → IndexedDB → MarketPulseDB

檢查以下表格：
- [ ] `events` - 有事件記錄
- [ ] `markets` - 有市集記錄
- [ ] `products` - 有商品記錄（如果已新增）
- [ ] `settings` - 有設定記錄

---

## 預防措施

### 1. 確保資料庫初始化

在使用任何資料庫功能前，確保已調用 `initializeDatabase()`：

```typescript
useEffect(() => {
  initializeDatabase()
    .then(() => setIsInitialized(true))
    .catch((error) => {
      console.error('資料庫初始化失敗：', error);
      toast.error('資料庫初始化失敗');
    });
}, []);
```

### 2. 錯誤處理

所有資料庫操作都應該有 try-catch：

```typescript
try {
  await createMarket(data);
  toast.success('市集建立成功');
} catch (error) {
  console.error('建立市集失敗：', error);
  toast.error('建立市集失敗，請稍後再試');
}
```

### 3. 定期備份

未來實作備份功能後，建議定期備份資料。

---

## 常見問題

### Q1: 修復後還是出現錯誤？

**A:** 嘗試以下步驟：

1. 完全清除瀏覽器資料
2. 關閉所有瀏覽器視窗
3. 重新啟動瀏覽器
4. 清除 npm 快取：`npm cache clean --force`
5. 重新安裝依賴：`npm install`

### Q2: 資料會遺失嗎？

**A:** 如果清除資料庫，所有本地資料都會遺失：
- 市集記錄
- 商品資料
- 交易記錄
- 統計資料

### Q3: 如何避免此問題？

**A:** 
1. 確保 TypeScript 編譯無錯誤
2. 定期檢查控制台錯誤
3. 使用最新版本的瀏覽器
4. 避免多個分頁同時操作

### Q4: 可以恢復資料嗎？

**A:** 如果沒有備份，無法恢復。建議未來實作自動備份功能。

---

## 技術細節

### DexieError 的常見原因

1. **ConstraintError** - 違反唯一性約束
2. **DataError** - 資料格式錯誤
3. **TransactionInactiveError** - 事務已關閉
4. **ReadOnlyError** - 嘗試寫入唯讀事務
5. **VersionError** - 資料庫版本衝突

### 事件溯源流程

```
使用者操作（新增市集）
    ↓
createMarket(data)
    ↓
recordEvent('market_created', payload)
    ↓
db.transaction('rw', [...])
    ↓
1. db.events.add(event)  ← 可能在這裡失敗
    ↓
2. handler(event, db)    ← 或在這裡失敗
    ↓
3. db.markets.add(market)
    ↓
返回 eventId
```

### 調試技巧

**啟用 Dexie 調試模式：**

```javascript
// 在控制台執行
Dexie.debug = true;
```

**查看資料庫狀態：**

```javascript
// 檢查資料庫是否開啟
console.log('資料庫開啟:', db.isOpen());

// 檢查資料庫版本
console.log('資料庫版本:', db.verno);

// 列出所有表格
console.log('表格:', db.tables.map(t => t.name));
```

---

## 修復狀態

- ✅ 添加缺少的類型導入
- ✅ 確保資料庫已開啟
- ✅ 改進錯誤日誌
- ✅ 更新資料庫初始化邏輯

---

## 相關文件

- **DATABASE_ERROR_FIX.md** - 資料庫錯誤修復指南
- **DB_QUICK_FIX.md** - 快速修復說明
- **db-fix.html** - 視覺化修復工具

---

**修復時間：** 2026-01-21  
**影響範圍：** 事件記錄系統  
**修復狀態：** ✅ 完成

**下一步：** 清除資料庫並重新測試
