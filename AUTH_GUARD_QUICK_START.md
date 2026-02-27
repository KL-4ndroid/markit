# 認證守衛系統 - 快速啟動指南

## 🚀 立即測試

### 1. 啟動開發伺服器

```bash
npm run dev
```

### 2. 開啟瀏覽器

訪問 `http://localhost:3000`

### 3. 預期看到的畫面

**首次訪問（未登入）：**
1. 短暫的載入骨架屏（< 1 秒）
2. 全螢幕歡迎頁面，包含：
   - 🎪 市集誌 Logo（彈跳動畫）
   - 三大特色介紹
   - 「開始使用」按鈕

**點擊「開始使用」：**
- 彈出登入 Modal
- 可以選擇登入或註冊

**登入成功後：**
- Modal 關閉
- 顯示首頁內容
- 底部導航可見

---

## 🧪 快速測試清單

### ✅ 基本功能測試（5 分鐘）

```
□ 首次訪問顯示歡迎頁面
□ 點擊「開始使用」彈出登入 Modal
□ 登入成功後顯示首頁
□ 登出後返回歡迎頁面
□ 重新整理頁面不會閃爍
```

### ✅ 白名單路由測試（2 分鐘）

```
□ 訪問 /privacy 可以直接查看
□ 訪問 /terms 可以直接查看
□ 訪問 /about 可以直接查看
□ 點擊「返回首頁」回到歡迎頁面
```

### ✅ 跨分頁同步測試（3 分鐘）

```
□ 開啟兩個分頁
□ 在分頁 A 登出
□ 分頁 B 立即顯示歡迎頁面
```

### ✅ 離線模式測試（3 分鐘）

```
□ 登入並同步資料
□ 開啟 DevTools > Network > Offline
□ 登出
□ 重新整理頁面
□ 看到橙色離線橫幅
□ 可以查看本地資料
```

---

## 🎯 關鍵檔案位置

### 新增的檔案

```
components/auth/
├── AuthGuard.tsx           # 認證守衛（核心）
├── WelcomeScreen.tsx       # 歡迎頁面
├── GlobalLoadingSkeleton.tsx  # 載入骨架屏
└── OfflineBanner.tsx       # 離線橫幅

app/
├── privacy/page.tsx        # 隱私政策
├── terms/page.tsx          # 服務條款
└── about/page.tsx          # 關於頁面
```

### 修改的檔案

```
lib/supabase/auth-context.tsx  # 增強：跨分頁同步、Session 過期檢查
components/auth/AuthManager.tsx  # 增強：全域事件支援
app/layout.tsx                 # 整合：AuthGuard 包裹
app/globals.css                # 新增：動畫樣式
```

---

## 🔧 常見問題排查

### 問題 1：歡迎頁面不顯示

**可能原因：**
- 已經登入（檢查 localStorage 是否有 session）
- AuthGuard 未正確包裹

**解決方案：**
```javascript
// 在 Console 執行
localStorage.clear();
location.reload();
```

### 問題 2：登入後仍顯示歡迎頁面

**可能原因：**
- Supabase 配置錯誤
- Session 未正確儲存

**檢查方式：**
```javascript
// 在 Console 執行
import { supabase } from '@/lib/supabase/client';
const { data } = await supabase.auth.getSession();
console.log(data);
```

### 問題 3：跨分頁同步不工作

**可能原因：**
- 瀏覽器不支援 BroadcastChannel
- 已自動 Fallback 到 localStorage 事件

**檢查方式：**
```javascript
// 在 Console 執行
console.log('BroadcastChannel' in window);
```

### 問題 4：頁面閃爍

**可能原因：**
- `isInitialized` 狀態未正確設置
- 骨架屏顯示時間過短

**檢查方式：**
打開 React DevTools，觀察 AuthGuard 的 state 變化

---

## 📊 效能檢查

### 使用 Chrome DevTools

1. 打開 DevTools > Performance
2. 點擊 Record
3. 重新整理頁面
4. 停止錄製

**預期指標：**
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s

---

## 🎨 自訂樣式

### 修改歡迎頁面顏色

編輯 `components/auth/WelcomeScreen.tsx`：

```tsx
// 修改漸層背景
<div className="... bg-gradient-to-br from-[你的顏色] via-[你的顏色] to-[你的顏色]">
```

### 修改載入骨架屏

編輯 `components/auth/GlobalLoadingSkeleton.tsx`：

```tsx
// 調整骨架屏佈局以符合你的首頁設計
```

### 修改離線橫幅

編輯 `components/auth/OfflineBanner.tsx`：

```tsx
// 修改顏色或文字
<div className="... bg-gradient-to-r from-amber-500 to-orange-500">
```

---

## 🔐 安全性檢查清單

```
□ Session 過期時自動登出
□ 跨分頁登出同步
□ 離線時禁止寫入操作
□ 登出時清除本地資料
□ 白名單路由正確配置
□ 無敏感資料洩漏到 Console
```

---

## 📱 PWA 測試

### 安裝 PWA 後測試

1. 點擊瀏覽器的「安裝」按鈕
2. 從桌面啟動應用
3. 測試認證流程

**預期行為：**
- 認證守衛正常運作
- 離線模式正常顯示
- 登入狀態持久化

---

## 🐛 除錯技巧

### 啟用詳細日誌

在 `lib/supabase/auth-context.tsx` 中，所有關鍵事件都有 console.log：

```typescript
// 查看 Auth 狀態變化
🔐 Auth 狀態變化: SIGNED_IN
🔐 Auth 狀態變化: SIGNED_OUT

// 查看跨分頁訊息
📡 收到跨分頁訊息: { type: 'SIGNED_OUT' }

// 查看 Session 過期
⚠️ Session 已過期，觸發登出
```

### 查看登出歷史

```javascript
// 在 Console 執行
const history = JSON.parse(localStorage.getItem('logout_history') || '[]');
console.table(history);
```

---

## 🎓 進階使用

### 程式化觸發登入

```typescript
// 在任何組件中
window.dispatchEvent(new CustomEvent('auth:open-login'));
```

### 監聽登入成功

```typescript
useEffect(() => {
  const handleLoginSuccess = () => {
    console.log('使用者已登入');
    // 執行後續操作
  };

  window.addEventListener('auth:login-success', handleLoginSuccess);
  
  return () => {
    window.removeEventListener('auth:login-success', handleLoginSuccess);
  };
}, []);
```

### 檢查離線狀態

```typescript
const isOnline = navigator.onLine;

// 監聽狀態變化
window.addEventListener('online', () => console.log('已連線'));
window.addEventListener('offline', () => console.log('已離線'));
```

---

## 📞 需要協助？

如果遇到問題，請檢查：

1. **Console 錯誤訊息**：打開 DevTools > Console
2. **Network 請求**：打開 DevTools > Network
3. **React 狀態**：使用 React DevTools
4. **完整文檔**：查看 `AUTH_GUARD_IMPLEMENTATION_REPORT.md`

---

## ✅ 部署前檢查

```bash
# 1. 建置測試
npm run build

# 2. 啟動生產模式
npm start

# 3. 測試所有場景
- 首次訪問
- 登入/登出
- 跨分頁同步
- 離線模式
- 白名單路由

# 4. 檢查 Console 無錯誤

# 5. 測試不同瀏覽器
- Chrome
- Safari
- Firefox
- Edge

# 6. 測試不同裝置
- 桌面
- 平板
- 手機
```

---

## 🎉 完成！

認證守衛系統已準備就緒。開始測試吧！

如有任何問題，請參考 `AUTH_GUARD_IMPLEMENTATION_REPORT.md` 獲取詳細資訊。
