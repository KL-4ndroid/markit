# 認證守衛系統 - 快速參考卡

## 🔐 資料脫敏 API

### 基本函數

```typescript
import { 
  canViewSensitiveData,
  sanitizeObject,
  sanitizeArray,
  renderSensitiveData 
} from '@/lib/data-sanitization';
import { useUserRole } from '@/hooks/useUserRole';

const { userRole } = useUserRole();

// 檢查權限
if (canViewSensitiveData(userRole)) {
  // 顯示敏感資料
}

// 過濾物件
const clean = sanitizeObject(product, 'product', userRole);

// 過濾陣列
const cleanList = sanitizeArray(products, 'product', userRole);

// 條件渲染
<span>{renderSensitiveData(cost, userRole, '***')}</span>
```

### 敏感欄位類型

```typescript
'product'  // cost, profit_margin, supplier_info
'market'   // total_cost, net_profit, profit_margin
'deal'     // cost, profit, profit_margin
'event'    // cost, total_cost
'stats'    // total_cost, net_profit, profit_margin, cost_breakdown
```

---

## 💾 表單自動暫存 API

### 基本用法

```typescript
import { useFormAutoSave, useFormAutoLoad } from '@/lib/form-autosave';

function MyForm() {
  const formId = 'unique-form-id';
  const [formData, setFormData] = useState({...});

  // 自動保存
  useFormAutoSave(formId, formData, {
    enabled: true,
    debounceMs: 1000, // 防抖時間
  });

  // 載入暫存
  const { savedData, hasSavedData, clearSaved } = useFormAutoLoad(formId);

  // 初始化恢復
  useEffect(() => {
    if (hasSavedData && savedData) {
      setFormData(savedData.data);
    }
  }, []);

  // 提交後清除
  const handleSubmit = () => {
    // ... 提交邏輯
    clearSaved();
  };
}
```

### 手動操作

```typescript
import { 
  saveFormData, 
  loadFormData, 
  clearFormData,
  getAllSavedForms 
} from '@/lib/form-autosave';

// 手動保存
saveFormData('form-id', { name: 'test' });

// 手動載入
const data = loadFormData('form-id');

// 手動清除
clearFormData('form-id');

// 獲取所有暫存
const allForms = getAllSavedForms();
```

### 監聽恢復事件

```typescript
useEffect(() => {
  const handleFormRestored = (event: CustomEvent) => {
    toast.success(`已恢復 ${event.detail.count} 個表單`);
  };

  window.addEventListener('form:restored', handleFormRestored);
  return () => window.removeEventListener('form:restored', handleFormRestored);
}, []);
```

---

## 🎨 PWA Splash Screen

### 自訂配置

編輯 `components/PWASplashScreen.tsx`：

```typescript
// 最少顯示時間
const minDisplayTime = 800; // 毫秒

// 漸層顏色
className="bg-gradient-to-br from-[#7B9FA6] via-[#8AACB3] to-[#9BB9C0]"

// Logo
<span className="text-6xl">🎪</span>

// 標題
<h1>市集誌</h1>
```

### 檢測 PWA 模式

```typescript
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              (window.navigator as any).standalone === true;
```

---

## 🔄 認證事件系統

### 觸發登入

```typescript
// 方法 1：全域事件
window.dispatchEvent(new CustomEvent('auth:open-login'));

// 方法 2：舊方法（仍支援）
import { triggerLogin } from '@/components/auth/AuthManager';
triggerLogin();
```

### 監聽登入成功

```typescript
useEffect(() => {
  const handleLoginSuccess = () => {
    console.log('使用者已登入');
  };

  window.addEventListener('auth:login-success', handleLoginSuccess);
  return () => window.removeEventListener('auth:login-success', handleLoginSuccess);
}, []);
```

### 監聽登出

```typescript
// 在 auth-context.tsx 中自動處理
// 跨分頁同步使用 BroadcastChannel
```

---

## 🛡️ 安全檢查清單

### 資料脫敏

```
□ 所有敏感資料使用 canViewSensitiveData 檢查
□ 產品列表使用 sanitizeArray 過濾
□ 統計資料使用 sanitizeStats 過濾
□ 事件日誌使用 sanitizeEvents 過濾
□ 離線模式禁止員工編輯
```

### 表單暫存

```
□ 重要表單啟用 useFormAutoSave
□ 初始化時檢查 hasSavedData
□ 提交成功後調用 clearSaved
□ 監聽 form:restored 事件
□ 測試 Session 過期場景
```

### 認證守衛

```
□ 白名單路由正確配置
□ 離線模式正常運作
□ 跨分頁登出同步
□ Session 過期自動處理
□ 無閃爍或跳動
```

---

## 🧪 快速測試命令

### 測試資料脫敏

```typescript
// 在 Console 執行
import { useUserRole } from '@/hooks/useUserRole';
const { userRole } = useUserRole();
console.log('isStaff:', userRole.isStaff);
console.log('canViewSensitiveData:', !userRole.isStaff);
```

### 測試表單暫存

```typescript
// 在 Console 執行
import { getAllSavedForms } from '@/lib/form-autosave';
console.table(getAllSavedForms());
```

### 測試 Session 過期

```typescript
// 在 Console 執行
localStorage.clear();
location.reload();
```

### 測試 PWA 模式

```typescript
// 在 Console 執行
console.log('isPWA:', window.matchMedia('(display-mode: standalone)').matches);
```

---

## 📦 檔案位置速查

```
lib/
├── data-sanitization.ts      # 資料脫敏工具
├── form-autosave.ts           # 表單暫存工具
├── sync-context.tsx           # 同步上下文（含脫敏標記）
└── supabase/
    └── auth-context.tsx       # 認證上下文（含跨分頁同步）

components/
├── auth/
│   ├── AuthGuard.tsx          # 認證守衛
│   ├── WelcomeScreen.tsx      # 歡迎頁面
│   ├── GlobalLoadingSkeleton.tsx  # 載入骨架
│   ├── OfflineBanner.tsx      # 離線橫幅
│   ├── SessionExpiredHandler.tsx  # Session 過期處理
│   └── AuthManager.tsx        # 認證管理器
├── PWASplashScreen.tsx        # PWA 啟動畫面
└── examples/
    ├── DataSanitizationExample.tsx  # 脫敏範例
    └── FormAutoSaveExample.tsx      # 暫存範例

app/
├── layout.tsx                 # 全域佈局（整合所有組件）
├── globals.css                # 全域樣式（含動畫）
├── privacy/page.tsx           # 隱私政策（白名單）
├── terms/page.tsx             # 服務條款（白名單）
└── about/page.tsx             # 關於頁面（白名單）
```

---

## 🎯 常見問題

### Q: 如何判斷資料是否已脫敏？

```typescript
import { useSyncContext } from '@/lib/sync-context';
const { isDataSanitized } = useSyncContext();

if (isDataSanitized) {
  // 顯示提示：「員工模式，部分資料已隱藏」
}
```

### Q: 表單暫存在哪裡？

A: 使用 `sessionStorage`，分頁關閉後自動清除，過期時間 30 分鐘。

### Q: PWA Splash Screen 為什麼不顯示？

A: 只在 PWA 模式下顯示。請先安裝 PWA，然後從桌面/主畫面啟動。

### Q: 如何清除所有暫存資料？

```typescript
import { clearAllFormData } from '@/lib/form-autosave';
clearAllFormData();
```

### Q: 如何自訂敏感欄位？

編輯 `lib/data-sanitization.ts` 中的 `SENSITIVE_FIELDS` 物件。

---

## 🚀 部署前檢查

```bash
# 1. 建置測試
npm run build

# 2. 檢查 TypeScript 錯誤
npx tsc --noEmit

# 3. 測試所有功能
- 資料脫敏（老闆 vs 員工）
- 表單暫存（Session 過期）
- PWA Splash Screen（安裝後啟動）
- 跨分頁同步
- 離線模式

# 4. 檢查 Console 無錯誤

# 5. 測試不同瀏覽器和裝置
```

---

## 📞 需要協助？

查看完整文檔：
- `AUTH_GUARD_IMPLEMENTATION_REPORT.md` - 基礎實作
- `AUTH_GUARD_ENHANCEMENTS.md` - 增強功能
- `AUTH_GUARD_QUICK_START.md` - 快速啟動

---

**版本：** v1.0.0  
**最後更新：** 2025-02-27
