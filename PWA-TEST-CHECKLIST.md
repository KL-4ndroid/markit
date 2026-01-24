# 🧪 PWA 測試檢查清單

## ✅ 已完成的設定

### 1. Service Worker
- [x] `public/sw.js` - 快取策略設定完成
- [x] Cache First 策略（靜態資源）
- [x] Network First 策略（API 請求）
- [x] Supabase 路徑嚴格不快取
- [x] 離線頁面支援

### 2. PWA Manifest
- [x] `public/manifest.json` - App 設定完成
- [x] App 名稱：市集誌
- [x] 主題色：#7B9FA6
- [x] 圖示：8 個尺寸完整

### 3. 圖示資源
- [x] favicon.ico (32x32)
- [x] apple-touch-icon.png (180x180)
- [x] icon-72x72.png
- [x] icon-96x96.png
- [x] icon-128x128.png
- [x] icon-144x144.png
- [x] icon-152x152.png
- [x] icon-192x192.png
- [x] icon-384x384.png
- [x] icon-512x512.png

### 4. React 組件
- [x] `RegisterServiceWorker` - SW 註冊與更新管理
- [x] `PWAInstallPrompt` - iOS/Android 安裝引導
- [x] 整合到 `app/layout.tsx`

### 5. Meta Tags
- [x] PWA 相關 meta tags
- [x] iOS Web App 支援
- [x] Android 主題色
- [x] 防止縮放設定

---

## 🧪 測試步驟

### 階段 1：本地開發測試

```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 開啟瀏覽器
# http://localhost:3000
```

**檢查項目：**
- [ ] 頁面正常載入
- [ ] Console 沒有錯誤
- [ ] 圖示正確顯示（瀏覽器標籤頁）

---

### 階段 2：生產模式測試

```bash
# 1. 構建生產版本
npm run build

# 2. 啟動生產伺服器
npm start

# 3. 開啟瀏覽器
# http://localhost:3000
```

**檢查項目：**
- [ ] Service Worker 成功註冊
- [ ] Manifest 正確載入
- [ ] 安裝提示出現（等待 3 秒）

---

### 階段 3：Chrome DevTools 檢查

#### 3.1 Application 面板

**Service Workers：**
- [ ] Status: Activated and running
- [ ] Source: /sw.js
- [ ] Scope: /

**Manifest：**
- [ ] Name: 市集誌 - Market Pulse
- [ ] Short name: 市集誌
- [ ] Start URL: /
- [ ] Theme color: #7B9FA6
- [ ] Icons: 8 個圖示全部顯示

**Storage：**
- [ ] Cache Storage 中有 `market-pulse-v1`
- [ ] 快取包含靜態資源

#### 3.2 Network 面板

**測試快取策略：**

1. **靜態資源（應該被快取）：**
   - [ ] 重新整理頁面
   - [ ] Size 欄位顯示 "from ServiceWorker" 或 "disk cache"
   - [ ] 載入速度明顯變快

2. **API 請求（不應該被快取）：**
   - [ ] 發送 API 請求
   - [ ] Size 欄位顯示實際大小（例如：1.2 KB）
   - [ ] 不顯示 "from ServiceWorker"

#### 3.3 Lighthouse 測試

```bash
# 在 Chrome DevTools 中
# 1. 開啟 Lighthouse 面板
# 2. 選擇 "Progressive Web App"
# 3. 點擊 "Generate report"
```

**目標分數：**
- [ ] PWA Score: > 90
- [ ] Performance: > 80
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90

**必須通過的項目：**
- [ ] ✅ Installable
- [ ] ✅ Provides a valid manifest
- [ ] ✅ Has a service worker
- [ ] ✅ Works offline
- [ ] ✅ Configured for a custom splash screen
- [ ] ✅ Sets a theme color

---

### 階段 4：離線功能測試

#### 4.1 模擬離線

1. 開啟 Chrome DevTools → Network
2. 勾選 "Offline"
3. 重新整理頁面

**檢查項目：**
- [ ] 頁面仍然可以載入（從快取）
- [ ] 顯示離線提示或正常運作
- [ ] 不會出現 "無法連線" 錯誤

#### 4.2 API 請求離線測試

1. 保持離線模式
2. 嘗試發送 API 請求

**預期行為：**
- [ ] 返回 503 錯誤
- [ ] 錯誤訊息：「網路連線失敗，請檢查網路狀態」
- [ ] 不使用舊的快取數據

---

### 階段 5：手機實機測試

#### 5.1 Android 測試

**準備工作：**
1. 確保手機和電腦在同一網路
2. 找到電腦的 IP 位址（例如：192.168.1.100）
3. 在手機 Chrome 開啟：`http://[電腦IP]:3000`

**測試項目：**
- [ ] 頁面正常載入
- [ ] 3 秒後出現安裝提示
- [ ] 點擊「立即安裝」
- [ ] 成功安裝到主畫面
- [ ] 從主畫面啟動（全螢幕模式）
- [ ] 圖示正確顯示
- [ ] 啟動畫面顯示（splash screen）

**離線測試：**
- [ ] 開啟飛航模式
- [ ] 從主畫面啟動 App
- [ ] 可以瀏覽已快取的頁面
- [ ] 顯示適當的離線提示

#### 5.2 iOS 測試

**準備工作：**
1. 在 iPhone Safari 開啟：`http://[電腦IP]:3000`

**測試項目：**
- [ ] 頁面正常載入
- [ ] 3 秒後出現安裝引導
- [ ] 按照步驟操作：
  - [ ] 點擊分享按鈕
  - [ ] 選擇「加入主畫面」
  - [ ] 點擊「加入」
- [ ] 成功加入主畫面
- [ ] 從主畫面啟動
- [ ] 圖示正確顯示
- [ ] 狀態列樣式正確

**離線測試：**
- [ ] 開啟飛航模式
- [ ] 從主畫面啟動
- [ ] 可以瀏覽已快取的頁面

---

### 階段 6：更新機制測試

#### 6.1 測試 Service Worker 更新

1. 修改 `public/sw.js` 中的版本號：
   ```javascript
   const CACHE_NAME = 'market-pulse-v2'; // 改成 v2
   ```

2. 重新構建：
   ```bash
   npm run build
   npm start
   ```

3. 重新整理頁面

**檢查項目：**
- [ ] Console 顯示「有新版本可用」
- [ ] 彈出更新提示
- [ ] 點擊「更新」後頁面重新載入
- [ ] 新的 Service Worker 啟用

---

## 🐛 常見問題排查

### 問題 1：Service Worker 沒有註冊

**檢查：**
```javascript
// 在 Console 執行
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs));
```

**解決方案：**
- 確認使用 HTTPS 或 localhost
- 檢查 `sw.js` 路徑是否正確
- 查看 Console 錯誤訊息

---

### 問題 2：安裝提示沒有出現

**檢查：**
```javascript
// 在 Console 執行
localStorage.getItem('pwa-install-dismissed');
```

**解決方案：**
```javascript
// 清除已關閉的記錄
localStorage.removeItem('pwa-install-dismissed');
// 重新整理頁面
```

---

### 問題 3：API 請求被快取

**檢查：**
1. 開啟 Network 面板
2. 發送 API 請求
3. 查看 Size 欄位

**如果顯示 "from ServiceWorker"：**
- 檢查 `sw.js` 中的 `API_PATTERNS`
- 確認 API 路徑符合正則表達式
- 清除快取並重新測試

---

### 問題 4：圖示不顯示

**檢查：**
```bash
# 確認圖示檔案存在
ls public/icons/
ls public/apple-touch-icon.png
ls public/favicon.ico
```

**解決方案：**
- 重新執行 `node scripts/generate-icons.js`
- 清除瀏覽器快取
- 檢查 manifest.json 中的路徑

---

## 📊 效能基準

### 首次載入（冷啟動）
- **目標：** < 3 秒
- **測量：** Lighthouse Performance Score

### 重複訪問（已快取）
- **目標：** < 1 秒
- **測量：** Network 面板 DOMContentLoaded

### 離線啟動
- **目標：** < 0.5 秒
- **測量：** 從主畫面啟動到可互動

### 安裝大小
- **目標：** < 5 MB
- **測量：** Application → Storage

---

## ✅ 最終檢查清單

部署到生產環境前，確認：

- [ ] 所有測試階段都通過
- [ ] Lighthouse PWA 分數 > 90
- [ ] 在真實 Android 手機測試通過
- [ ] 在真實 iPhone 測試通過
- [ ] 離線功能正常運作
- [ ] API 請求不被快取
- [ ] 更新機制正常運作
- [ ] 圖示在所有平台正確顯示
- [ ] 沒有 Console 錯誤
- [ ] 效能符合基準

---

## 🎉 測試完成！

如果所有項目都通過，恭喜您！PWA 已經完全設定好了。

**下一步：**
1. 部署到生產環境（Vercel/Netlify）
2. 使用真實域名測試
3. 開始推廣給用戶使用

**記得：**
- PWA 需要 HTTPS 才能在生產環境運作
- 定期測試更新機制
- 監控 Service Worker 錯誤
- 收集用戶反饋

---

**測試日期：** ___________
**測試人員：** ___________
**測試環境：** ___________
**測試結果：** ⭐⭐⭐⭐⭐
