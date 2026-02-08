# 🧪 Service Worker 快速測試指南

## ⚡ 快速開始

### 1. 建置生產版本

```bash
# 清理舊的建置檔案（如果遇到權限問題）
rm -rf .next

# 建置
npm run build
```

**預期輸出**：
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    ...      ...
└ ○ /analytics                           ...      ...

○  (Static)  automatically rendered as static HTML
```

### 2. 啟動生產伺服器

```bash
npm start
```

訪問：`http://localhost:3000`

---

## ✅ 測試檢查清單

### 測試 1: 檢查 Service Worker 註冊

1. 打開 `http://localhost:3000`
2. 按 `F12` 打開開發者工具
3. 切換到 **Application** 標籤
4. 左側選擇 **Service Workers**

**預期結果**：
```
✅ Status: activated and is running
✅ Source: /sw.js
✅ Scope: http://localhost:3000/
```

### 測試 2: 檢查快取

1. 開發者工具 > **Application** > **Cache Storage**
2. 展開查看快取項目

**預期結果**：
```
✅ pages (HTML 頁面)
✅ static-resources (JS/CSS)
✅ images (圖片)
```

### 測試 3: 測試離線功能 🎯

**步驟**：
```bash
1. 正常訪問應用，瀏覽幾個頁面
2. 等待 5 秒（確保資源已快取）
3. 開發者工具 > Network 標籤
4. 勾選 "Offline" 模擬離線
5. 重新整理頁面 (F5)
```

**預期結果**：
```
✅ 頁面正常顯示
✅ 可以瀏覽已訪問過的頁面
✅ IndexedDB 資料可以讀取
✅ 可以新增交易（會儲存到本地）
```

### 測試 4: 測試資料同步

**步驟**：
```bash
1. 在離線狀態下新增一筆交易
2. 檢查 IndexedDB（Application > IndexedDB > MarketPulseDB > events）
3. 確認事件已儲存，sync_status = 'pending'
4. 取消勾選 "Offline" 恢復網路
5. 等待 5-10 秒
6. 再次檢查 IndexedDB
```

**預期結果**：
```
✅ 離線時：事件儲存到 IndexedDB，sync_status = 'pending'
✅ 恢復網路後：useSync 自動同步
✅ 同步完成後：sync_status = 'synced'
✅ Supabase 中可以看到該事件
```

### 測試 5: 使用測試頁面

訪問：`http://localhost:3000/sw-test.html`

**操作**：
1. 點擊「檢查註冊狀態」
2. 點擊「檢查快取」
3. 查看日誌輸出

**預期結果**：
```
✅ 瀏覽器支援 Service Worker
✅ Service Worker 已註冊
✅ 找到 3-5 個快取
```

---

## 🐛 常見問題排查

### 問題 1: Service Worker 沒有註冊

**可能原因**：
- 在開發環境（`npm run dev`）
- 沒有使用 HTTPS 或 localhost

**解決方案**：
```bash
# 確保使用生產模式
npm run build
npm start
```

### 問題 2: 快取沒有生成

**檢查步驟**：
```bash
1. 確認 /public/sw.js 存在
2. 檢查 Console 是否有錯誤
3. 確認網路請求成功
```

**解決方案**：
```bash
# 清除快取重新測試
1. Application > Storage > Clear site data
2. 重新整理頁面
```

### 問題 3: 離線時無法使用

**檢查步驟**：
```bash
1. 確認 Service Worker 已激活
2. 確認快取中有資源
3. 檢查 Network 標籤，看請求是否從 Service Worker 返回
```

**預期行為**：
```
✅ Size 欄位顯示 "(ServiceWorker)"
✅ 不是 "(disk cache)" 或 "(memory cache)"
```

### 問題 4: 更新後看不到新版本

**這是正常的！** 我們的更新機制：

1. Service Worker 檢測到新版本
2. 下載並安裝新版本（背景進行）
3. 顯示更新提示（PWAUpdatePrompt）
4. 用戶點擊「立即更新」
5. 重新載入頁面

**手動強制更新**：
```javascript
// 在 Console 執行
const reg = await navigator.serviceWorker.getRegistration();
await reg.update();
location.reload();
```

---

## 📊 效能驗證

### 使用 Lighthouse

```bash
1. 開發者工具 > Lighthouse
2. 選擇 "Progressive Web App"
3. 點擊 "Generate report"
```

**預期分數**：
```
✅ PWA Score: 90-100
✅ Installable: ✓
✅ Works offline: ✓
✅ Configured for a custom splash screen: ✓
✅ Sets a theme color: ✓
```

### 檢查流量節省

**測試步驟**：
```bash
1. 清除快取
2. 訪問首頁，記錄流量（例如：500 KB）
3. 重新整理頁面
4. 記錄流量（應該 < 50 KB）
```

**計算節省**：
```
節省率 = (首次流量 - 第二次流量) / 首次流量 × 100%
預期：> 90%
```

---

## 🎯 驗證清單

完成以下所有測試後，Service Worker 即為正常運作：

- [ ] Service Worker 已註冊並激活
- [ ] 快取已生成（pages, static-resources, images）
- [ ] 離線時可以正常使用
- [ ] 離線時可以新增交易
- [ ] 恢復網路後自動同步
- [ ] 測試頁面功能正常
- [ ] Lighthouse PWA 分數 > 90
- [ ] 流量節省 > 90%

---

## 📱 手機測試

### Android Chrome

```bash
1. 建置並部署到 Vercel
2. 手機訪問網站
3. Chrome 選單 > "安裝應用程式"
4. 安裝後從主畫面開啟
5. 開啟飛航模式
6. 應用應該仍然可以使用 ✅
```

### iOS Safari

```bash
1. 建置並部署到 Vercel
2. iPhone 訪問網站
3. 點擊分享按鈕 > "加入主畫面"
4. 從主畫面開啟
5. 開啟飛航模式
6. 應用應該仍然可以使用 ✅
```

---

## 🚀 部署驗證

### Vercel 部署後

```bash
1. 訪問 https://your-app.vercel.app
2. 開發者工具 > Application > Service Workers
3. 確認 Service Worker 已註冊
4. 測試離線功能
```

### 檢查 Service Worker 檔案

訪問：`https://your-app.vercel.app/sw.js`

**預期**：
```javascript
// 應該看到 Workbox 生成的 Service Worker 程式碼
importScripts(...);
workbox.routing.registerRoute(...);
```

---

## 💡 除錯技巧

### 查看 Service Worker 日誌

```javascript
// 在 Console 執行
navigator.serviceWorker.ready.then(reg => {
  console.log('Service Worker 已就緒:', reg);
  console.log('Scope:', reg.scope);
  console.log('Active:', reg.active);
  console.log('Waiting:', reg.waiting);
  console.log('Installing:', reg.installing);
});
```

### 查看快取內容

```javascript
// 在 Console 執行
caches.keys().then(names => {
  console.log('快取列表:', names);
  
  names.forEach(async name => {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    console.log(`${name}:`, keys.map(k => k.url));
  });
});
```

### 強制跳過等待

```javascript
// 在 Console 執行
navigator.serviceWorker.ready.then(reg => {
  if (reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
});
```

---

## ✅ 成功標準

當您完成所有測試並看到以下結果時，Service Worker 實作即為成功：

1. ✅ **離線可用**：完全離線時應用仍可使用
2. ✅ **自動同步**：恢復網路後自動同步資料
3. ✅ **流量節省**：第二次訪問節省 > 90% 流量
4. ✅ **載入快速**：快取命中時載入 < 1 秒
5. ✅ **更新機制**：有新版本時顯示更新提示
6. ✅ **PWA 分數**：Lighthouse PWA 分數 > 90

---

**祝測試順利！如有問題請參考文檔或檢查 Console 日誌。** 🎉
