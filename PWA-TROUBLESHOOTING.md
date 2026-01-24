# 🔍 PWA 安裝提示問題排查指南

## 問題現象
在無痕模式下開啟應用：
- ❌ 沒有跳出安裝提示
- ❌ 設置頁面沒有看到安裝按鈕

---

## 🔧 可能的原因與解決方案

### 1. 開發伺服器問題

**問題：** 開發伺服器沒有運行或使用錯誤的端口

**檢查：**
```bash
# 確認伺服器正在運行
npm run dev
```

**當前狀態：**
- ✅ 伺服器已啟動在 `http://localhost:3001`（3000 被佔用）

**解決方案：**
```
請訪問：http://localhost:3001
而不是：http://localhost:3000
```

---

### 2. PWA 安裝提示的觸發條件

#### Android/Desktop 需要的條件：
1. ✅ 使用 HTTPS 或 localhost
2. ✅ 有有效的 manifest.json
3. ✅ 有註冊的 Service Worker
4. ⚠️ **瀏覽器觸發 `beforeinstallprompt` 事件**

**重要：** 
- Chrome 只會在滿足所有 PWA 條件時觸發 `beforeinstallprompt`
- 開發模式下，Service Worker 可能不會完全啟用
- 需要等待 Service Worker 註冊完成

#### iOS 的條件：
1. ✅ 使用 Safari 瀏覽器
2. ✅ 檢測到 iOS 設備
3. ✅ 未在 standalone 模式下運行

---

### 3. 開發模式 vs 生產模式

**問題：** 開發模式下 PWA 功能可能不完整

**建議測試流程：**

#### 方法 A：使用生產模式（推薦）
```bash
# 1. 建置生產版本
npm run build

# 2. 啟動生產伺服器
npm start

# 3. 訪問
http://localhost:3000
```

#### 方法 B：使用開發模式
```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 訪問（注意端口）
http://localhost:3001

# 3. 等待 3 秒
# 4. 檢查 Console 是否有錯誤
```

---

### 4. 瀏覽器檢查

#### 檢查 Service Worker
1. 開啟 Chrome DevTools (F12)
2. 前往 **Application** 標籤
3. 左側選單點擊 **Service Workers**
4. 確認：
   - ✅ 有看到 Service Worker
   - ✅ Status: activated and is running

#### 檢查 Manifest
1. 在 **Application** 標籤
2. 左側選單點擊 **Manifest**
3. 確認：
   - ✅ 名稱：市集誌
   - ✅ 圖示：8 個圖示
   - ✅ 沒有錯誤訊息

#### 檢查 Console
```javascript
// 在 Console 執行以下命令

// 1. 檢查 localStorage
console.log('First shown:', localStorage.getItem('pwa-install-first-shown'));

// 2. 檢查是否已安裝
console.log('Is installed:', window.matchMedia('(display-mode: standalone)').matches);

// 3. 檢查平台
console.log('User agent:', navigator.userAgent);

// 4. 檢查 Service Worker
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('SW registrations:', regs);
});
```

---

### 5. 強制觸發安裝提示

#### 清除 localStorage
```javascript
// 在 Console 執行
localStorage.clear();
location.reload();
// 等待 3 秒
```

#### 手動觸發（測試用）
```javascript
// 在 Console 執行
localStorage.removeItem('pwa-install-first-shown');
location.reload();
```

---

### 6. 設置頁面的安裝按鈕

**按鈕顯示的條件：**
1. ✅ 未安裝 PWA
2. ✅ 可以安裝（iOS 或有 `beforeinstallprompt` 事件）

**檢查方法：**
```javascript
// 在設置頁面的 Console 執行

// 檢查是否已安裝
const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
console.log('Is installed:', isInstalled);

// 檢查平台
const userAgent = navigator.userAgent.toLowerCase();
const isIOS = /iphone|ipad|ipod/.test(userAgent);
const isAndroid = /android/.test(userAgent);
console.log('Platform:', { isIOS, isAndroid });
```

---

## 🧪 完整測試步驟

### 步驟 1：使用生產模式測試

```bash
# 1. 停止開發伺服器
# Ctrl + C

# 2. 建置生產版本
npm run build

# 3. 啟動生產伺服器
npm start

# 4. 開啟無痕視窗
# Chrome: Ctrl + Shift + N

# 5. 訪問
http://localhost:3000

# 6. 等待 3 秒
# 應該會看到安裝提示
```

### 步驟 2：檢查 DevTools

```
1. 按 F12 開啟 DevTools
2. 前往 Application 標籤
3. 檢查：
   - Service Workers（應該有註冊）
   - Manifest（應該正確載入）
   - Console（不應該有錯誤）
```

### 步驟 3：測試設置頁面

```
1. 前往 http://localhost:3000/settings
2. 應該看到「安裝市集誌到主畫面」按鈕
3. 如果沒看到，檢查 Console 錯誤
```

---

## 🐛 常見問題

### Q1: 為什麼開發模式下沒有安裝提示？

**A:** 開發模式下，Chrome 可能不會觸發 `beforeinstallprompt` 事件，因為：
- Service Worker 可能未完全啟用
- 某些 PWA 條件未滿足
- 建議使用生產模式測試

### Q2: 無痕模式下 localStorage 會被清除嗎？

**A:** 是的，關閉無痕視窗後 localStorage 會被清除。這意味著：
- 每次開啟無痕視窗都是「第一次訪問」
- 應該會看到安裝提示

### Q3: iOS Safari 為什麼沒有安裝提示？

**A:** iOS Safari 不支援 `beforeinstallprompt` 事件，所以：
- 會顯示 3 步驟安裝引導
- 需要用戶手動操作
- 檢查是否正確檢測到 iOS 平台

### Q4: 設置頁面沒有安裝按鈕？

**A:** 可能的原因：
1. 已經安裝了 PWA
2. 平台檢測失敗
3. 組件未正確載入
4. 檢查 Console 是否有錯誤

---

## 📝 快速診斷腳本

在 Console 執行以下腳本進行診斷：

```javascript
// PWA 診斷腳本
(function() {
  console.log('=== PWA 診斷報告 ===');
  
  // 1. 檢查安裝狀態
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
  console.log('1. 已安裝:', isInstalled);
  
  // 2. 檢查平台
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  console.log('2. 平台:', { isIOS, isAndroid, ua });
  
  // 3. 檢查 localStorage
  const firstShown = localStorage.getItem('pwa-install-first-shown');
  console.log('3. 第一次已顯示:', firstShown);
  
  // 4. 檢查 Service Worker
  navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('4. Service Worker:', regs.length > 0 ? '已註冊' : '未註冊');
    if (regs.length > 0) {
      console.log('   - Scope:', regs[0].scope);
      console.log('   - Active:', regs[0].active ? '是' : '否');
    }
  });
  
  // 5. 檢查 Manifest
  fetch('/manifest.json')
    .then(r => r.json())
    .then(m => console.log('5. Manifest:', '✅ 載入成功', m.name))
    .catch(e => console.log('5. Manifest:', '❌ 載入失敗', e));
  
  console.log('=== 診斷完成 ===');
})();
```

---

## ✅ 解決方案總結

### 立即嘗試：

1. **使用生產模式**
   ```bash
   npm run build
   npm start
   ```

2. **訪問正確的 URL**
   ```
   http://localhost:3000
   ```

3. **開啟無痕視窗**
   - Chrome: Ctrl + Shift + N
   - 訪問網站
   - 等待 3 秒

4. **檢查 Console**
   - 按 F12
   - 查看是否有錯誤
   - 執行診斷腳本

5. **前往設置頁面**
   ```
   http://localhost:3000/settings
   ```

---

**如果問題仍然存在，請提供：**
1. Console 的錯誤訊息
2. 使用的瀏覽器和版本
3. 診斷腳本的輸出結果

我會根據這些資訊進一步協助您！
