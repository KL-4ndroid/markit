# 🚀 PWA 完整設定指南

## ✅ 已完成的功能

### 1. Service Worker 快取策略 ✅
- **靜態資源**：Cache First（HTML, CSS, JS, 圖片）
- **API 請求**：Network First（絕不快取，確保即時性）
- **Supabase 路徑**：嚴格 Network-First，不干擾即時同步
- **離線支援**：優雅的離線頁面

### 2. PWA Manifest ✅
- App 名稱：市集誌
- 主題色：#7B9FA6
- 背景色：#FAFAF8
- 顯示模式：standalone（全螢幕 App 體驗）
- 快捷方式：新增市集、新增商品、數據分析

### 3. 安裝提示組件 ✅
- iOS 安裝引導（分步驟說明）
- Android 一鍵安裝按鈕
- 智慧型平台偵測
- 7 天內不重複提示

### 4. Meta Tags 優化 ✅
- iOS Web App 支援
- Android 主題色
- 防止縮放（提升 App 體驗）
- 狀態列樣式設定

---

## 📋 待完成：圖示生成

### 方法 A：自動生成（推薦）

**步驟：**

1. 確保 `logo.png` 在專案根目錄
2. 安裝 sharp：
   ```bash
   npm install sharp --save-dev
   ```
3. 執行生成腳本：
   ```bash
   node scripts/generate-icons.js
   ```

### 方法 B：線上工具

使用 PWA Builder：
1. 前往：https://www.pwabuilder.com/imageGenerator
2. 上傳您的 `logo.png`
3. 下載生成的圖示包
4. 解壓縮到 `public/icons/` 資料夾

### 方法 C：手動生成

詳細步驟請參考：`scripts/generate-icons-manual.md`

---

## 🧪 測試 PWA 功能

### 1. 本地測試

```bash
# 開發模式（Service Worker 不會完全啟用）
npm run dev

# 生產模式測試（推薦）
npm run build
npm start
```

### 2. 手機測試

#### Android：
1. 在 Chrome 開啟網站
2. 點擊右上角選單 → "安裝應用程式"
3. 或等待自動彈出安裝提示

#### iOS：
1. 在 Safari 開啟網站
2. 點擊底部分享按鈕
3. 選擇「加入主畫面」

### 3. 檢查清單

- [ ] 圖示正確顯示
- [ ] 安裝提示正常彈出
- [ ] 安裝後可從主畫面啟動
- [ ] 離線模式正常運作
- [ ] API 請求不被快取
- [ ] 靜態資源正確快取

---

## 🔍 Service Worker 快取策略詳解

### Cache First（靜態資源）
```
請求 → 檢查快取 → 有：返回快取 → 無：網路請求 → 存入快取
```

**適用於：**
- HTML 頁面
- CSS 樣式
- JavaScript 檔案
- 圖片、字體

### Network First（API 請求）
```
請求 → 網路請求 → 成功：返回 → 失敗：返回錯誤（不使用快取）
```

**適用於：**
- `/api/*` 路徑
- Supabase API (`*.supabase.co`)
- 即時同步 (`/realtime`)
- 認證請求 (`/auth/v1/`)

### 為什麼 API 不快取？

1. **即時性**：確保數據永遠是最新的
2. **團隊協作**：多人同時編輯時不會看到過期數據
3. **Supabase 同步**：不干擾 Realtime 訂閱
4. **安全性**：認證 token 不會被快取

---

## 📱 PWA 功能清單

### ✅ 已實作
- [x] Service Worker 註冊
- [x] 快取策略（Cache First + Network First）
- [x] Manifest.json 設定
- [x] 安裝提示（iOS + Android）
- [x] 離線頁面
- [x] Meta Tags 優化
- [x] 主題色設定
- [x] App 快捷方式

### 🔄 未來增強
- [ ] 背景同步（Background Sync）
- [ ] 推送通知（Push Notifications）
- [ ] 定期背景同步（Periodic Background Sync）
- [ ] 分享目標 API（Share Target API）
- [ ] 檔案處理 API（File Handling API）

---

## 🐛 常見問題

### Q1: Service Worker 沒有更新？
**A:** 在 Chrome DevTools → Application → Service Workers → 勾選 "Update on reload"

### Q2: 安裝提示沒有出現？
**A:** 
- 確認使用 HTTPS 或 localhost
- 檢查是否已安裝
- 清除 localStorage 中的 `pwa-install-dismissed`

### Q3: 離線模式不工作？
**A:**
- 確認 Service Worker 已註冊
- 檢查 `sw.js` 是否正確載入
- 查看 Console 是否有錯誤

### Q4: API 請求被快取了？
**A:** 
- 檢查 `sw.js` 中的 `API_PATTERNS`
- 確認路徑符合正則表達式
- 查看 Network 面板的 "Size" 欄位（應顯示實際大小，不是 "from ServiceWorker"）

---

## 📊 效能指標

### 目標：
- **首次載入**：< 3 秒
- **重複訪問**：< 1 秒（快取）
- **離線啟動**：< 0.5 秒
- **安裝大小**：< 5 MB

### 監控工具：
- Chrome Lighthouse
- WebPageTest
- Chrome DevTools Performance

---

## 🚀 部署檢查清單

部署到生產環境前，請確認：

- [ ] 所有圖示已生成並放置正確
- [ ] `manifest.json` 中的 `start_url` 正確
- [ ] Service Worker 在生產環境正常運作
- [ ] HTTPS 已啟用
- [ ] Meta tags 完整
- [ ] 在真實手機上測試過

---

## 📞 需要協助？

如果遇到問題：

1. 檢查 Console 錯誤訊息
2. 查看 Chrome DevTools → Application → Service Workers
3. 確認 Network 面板的請求狀態
4. 參考 `scripts/generate-icons-manual.md`

---

**最後更新：** 2026-01-24
**版本：** 1.0.0
