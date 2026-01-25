# PWA 應用更新機制

## 概述

本應用使用 Service Worker 實現 PWA 功能，當有新版本發布時，會自動提示用戶更新。

---

## 更新流程

### 1. 開發者發布新版本

```bash
# 1. 修改 Service Worker 版本號
# 編輯 public/sw.js
const CACHE_VERSION = '1.0.2';  # 增加版本號

# 2. 提交代碼
git add .
git commit -m "feat: 新功能或修復"
git push

# 3. 部署到生產環境
# Vercel 會自動部署
```

### 2. 用戶端自動檢測更新

```
用戶打開 APP
    ↓
Service Worker 檢查更新（每 30 分鐘）
    ↓
發現新版本
    ↓
顯示更新提示對話框
    ↓
用戶點擊「立即更新」
    ↓
下載新版本
    ↓
自動重新載入
    ↓
更新完成 ✅
```

---

## 技術實現

### 1. Service Worker 版本管理

**文件**：`public/sw.js`

```javascript
// 版本號（每次更新時增加）
const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `market-pulse-v${CACHE_VERSION}`;
```

**重要**：每次發布新版本時，必須修改 `CACHE_VERSION`！

### 2. 自動檢查更新

**文件**：`app/register-sw.tsx`

```javascript
// 定期檢查更新（每 30 分鐘）
setInterval(() => {
  console.log('[PWA] 檢查更新...');
  registration.update();
}, 30 * 60 * 1000);
```

### 3. 更新提示組件

**文件**：`components/PWAUpdatePrompt.tsx`

**功能**：
- 監聽 Service Worker 的 `updatefound` 事件
- 顯示友好的更新對話框
- 提供「立即更新」和「稍後提醒」選項
- 更新時顯示載入動畫

### 4. 跳過等待機制

```javascript
// 用戶點擊「立即更新」
registration.waiting.postMessage({ type: 'SKIP_WAITING' });

// Service Worker 收到訊息
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();  // 立即啟用新版本
  }
});

// 控制權變更後自動重新載入
navigator.serviceWorker.addEventListener('controllerchange', () => {
  window.location.reload();
});
```

---

## 更新觸發時機

### 自動檢查
1. **用戶打開 APP 時**：立即檢查一次
2. **定期檢查**：每 30 分鐘檢查一次
3. **頁面重新獲得焦點時**：從後台切回前台時檢查

### 手動觸發
開發者可以在控制台手動觸發更新檢查：

```javascript
// 在瀏覽器控制台執行
navigator.serviceWorker.ready.then(reg => reg.update());
```

---

## 版本號規範

使用語義化版本號（Semantic Versioning）：

```
主版本號.次版本號.修訂號
   ↓        ↓       ↓
  1    .    0   .   1

主版本號：重大變更（不向下兼容）
次版本號：新增功能（向下兼容）
修訂號：  錯誤修復（向下兼容）
```

### 示例

```javascript
// 修復 Bug
'1.0.0' → '1.0.1'

// 新增功能
'1.0.1' → '1.1.0'

// 重大變更
'1.1.0' → '2.0.0'
```

---

## 更新對話框設計

### 視覺效果
- ✅ 全屏半透明遮罩
- ✅ 居中卡片設計
- ✅ 漸變色圖標
- ✅ 清晰的標題和描述
- ✅ 兩個操作按鈕（主要 + 次要）
- ✅ 更新時的載入動畫

### 用戶體驗
- ✅ 不強制更新（可稍後提醒）
- ✅ 清楚說明更新內容
- ✅ 顯示預計更新時間
- ✅ 更新過程有視覺反饋
- ✅ 更新完成自動重新載入

---

## 測試更新流程

### 方法 1：修改版本號測試

```bash
# 1. 修改 public/sw.js
const CACHE_VERSION = '1.0.2';

# 2. 重新啟動開發伺服器
npm run dev

# 3. 打開瀏覽器
# 4. 等待 30 秒（或手動觸發更新）
# 5. 應該看到更新提示
```

### 方法 2：使用 Chrome DevTools

```
1. 打開 Chrome DevTools
2. 切換到 Application 標籤
3. 點擊左側 Service Workers
4. 勾選 "Update on reload"
5. 修改 sw.js 版本號
6. 重新載入頁面
7. 應該看到新的 SW 在等待
8. 點擊 "skipWaiting" 或等待更新提示
```

### 方法 3：模擬生產環境

```bash
# 1. 構建生產版本
npm run build

# 2. 啟動生產伺服器
npm start

# 3. 打開瀏覽器測試
```

---

## 常見問題

### Q1: 為什麼沒有看到更新提示？

**可能原因**：
1. 版本號沒有修改
2. Service Worker 還沒檢查更新（等待 30 分鐘）
3. 瀏覽器快取了舊的 sw.js

**解決方法**：
```javascript
// 在控制台手動觸發更新
navigator.serviceWorker.ready.then(reg => reg.update());

// 或清除 Service Worker
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
location.reload();
```

### Q2: 更新後還是舊版本？

**可能原因**：
1. 瀏覽器快取
2. Service Worker 沒有正確啟用

**解決方法**：
```javascript
// 強制重新載入（繞過快取）
location.reload(true);

// 或清除所有快取
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

### Q3: 如何強制用戶更新？

修改 `PWAUpdatePrompt.tsx`：

```typescript
// 移除「稍後提醒」按鈕
// 只保留「立即更新」按鈕
// 並設置 3 秒後自動更新

useEffect(() => {
  if (showPrompt) {
    const timer = setTimeout(() => {
      handleUpdate();
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [showPrompt]);
```

---

## 最佳實踐

### ✅ 應該做的

1. **每次發布都修改版本號**
   ```javascript
   const CACHE_VERSION = '1.0.2';  // 必須修改
   ```

2. **在更新說明中描述變更**
   ```typescript
   <p>包含功能改進和錯誤修復</p>
   // 改為
   <p>新增：市集統計功能<br/>修復：同步錯誤</p>
   ```

3. **測試更新流程**
   - 在開發環境測試
   - 在生產環境驗證

4. **監控更新成功率**
   ```javascript
   // 記錄更新事件
   console.log('[PWA] Update completed', {
     oldVersion: '1.0.0',
     newVersion: '1.0.1',
     timestamp: Date.now()
   });
   ```

### ❌ 不應該做的

1. **不要忘記修改版本號**
   - 否則用戶不會收到更新

2. **不要強制立即更新**
   - 可能中斷用戶操作
   - 給用戶選擇權

3. **不要頻繁發布更新**
   - 避免打擾用戶
   - 合併多個修復一起發布

4. **不要在更新時清除用戶數據**
   - IndexedDB 數據應該保留
   - 只清除快取

---

## 版本發布檢查清單

發布新版本前，請確認：

- [ ] 修改 `public/sw.js` 中的 `CACHE_VERSION`
- [ ] 測試更新流程是否正常
- [ ] 確認 IndexedDB 數據不會遺失
- [ ] 確認 Supabase 同步正常
- [ ] 更新 CHANGELOG.md
- [ ] 提交代碼並推送
- [ ] 驗證生產環境部署成功
- [ ] 在真實設備上測試更新

---

## 監控和分析

### 記錄更新事件

```javascript
// 在 PWAUpdatePrompt.tsx 中添加
const handleUpdate = () => {
  // 記錄更新事件
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'pwa_update', {
      old_version: getCurrentVersion(),
      new_version: getNewVersion(),
    });
  }
  
  // 執行更新
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
};
```

### 查看更新統計

在 Google Analytics 中查看：
- 更新成功率
- 更新所需時間
- 用戶選擇「稍後提醒」的比例

---

## 總結

通過以上機制，我們實現了：

1. ✅ **自動檢測更新**：每 30 分鐘檢查一次
2. ✅ **友好的更新提示**：清晰的對話框設計
3. ✅ **用戶可控**：可選擇立即更新或稍後提醒
4. ✅ **無縫更新**：自動重新載入，數據不遺失
5. ✅ **版本管理**：語義化版本號

**核心原則**：讓用戶知道有更新，但不強制打斷他們的操作！
