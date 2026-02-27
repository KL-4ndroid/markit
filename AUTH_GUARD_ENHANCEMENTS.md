# 認證守衛系統 - 增強功能實作報告

## 🎯 新增功能概覽

在基礎認證守衛系統之上，我們實作了三個重要的增強功能：

1. **資料脫敏（Data Sanitization）** - 員工身分自動過濾敏感資料
2. **表單自動暫存（Form Auto-Save）** - Session 過期時保護使用者資料
3. **PWA Splash Screen** - 優化 PWA 啟動體驗

---

## 1️⃣ 資料脫敏系統

### 功能說明

當使用者身分為「員工」時，系統會自動過濾掉成本、利潤等敏感資訊，確保資料安全。

### 核心檔案

#### `lib/data-sanitization.ts`

提供完整的資料脫敏工具函數：

```typescript
// 檢查使用者是否可以查看敏感資料
canViewSensitiveData(userRole: UserRole): boolean

// 過濾物件中的敏感欄位
sanitizeObject<T>(obj: T, type: 'product' | 'market' | 'deal' | 'event' | 'stats', userRole: UserRole): T

// 過濾陣列中的敏感欄位
sanitizeArray<T>(array: T[], type: string, userRole: UserRole): T[]

// 過濾事件資料（移除成本相關事件）
sanitizeEvents<T>(events: T[], userRole: UserRole): T[]

// 替換敏感資料為遮罩
maskSensitiveValue(value: any, type: 'currency' | 'text'): string

// 條件渲染敏感資料
renderSensitiveData(value: any, userRole: UserRole, maskValue: string): any
```

### 敏感欄位定義

```typescript
const SENSITIVE_FIELDS = {
  product: ['cost', 'profit_margin', 'supplier_info'],
  market: ['total_cost', 'net_profit', 'profit_margin'],
  deal: ['cost', 'profit', 'profit_margin'],
  event: ['cost', 'total_cost'],
  stats: ['total_cost', 'net_profit', 'profit_margin', 'cost_breakdown'],
};
```

### 整合到 SyncContext

`lib/sync-context.tsx` 已增強，新增 `isDataSanitized` 標記：

```typescript
interface SyncContextType {
  // ... 其他屬性
  isDataSanitized: boolean; // 標記資料是否已脫敏
}
```

### 使用範例

#### 範例 1：產品列表

```typescript
import { useUserRole } from '@/hooks/useUserRole';
import { sanitizeArray, canViewSensitiveData } from '@/lib/data-sanitization';

function ProductList() {
  const { userRole } = useUserRole();
  const products = [...]; // 原始產品資料

  // ✅ 自動過濾敏感欄位
  const sanitizedProducts = sanitizeArray(products, 'product', userRole);

  return (
    <div>
      {sanitizedProducts.map(product => (
        <div key={product.id}>
          <p>名稱：{product.name}</p>
          <p>售價：${product.price}</p>
          
          {/* ✅ 條件顯示成本（只有老闆可見） */}
          {canViewSensitiveData(userRole) && (
            <p>成本：${product.cost}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### 範例 2：統計資料

```typescript
import { renderSensitiveData } from '@/lib/data-sanitization';

function Stats() {
  const { userRole } = useUserRole();
  const stats = { total_revenue: 10000, total_cost: 6000 };

  return (
    <div>
      <p>總收入：${stats.total_revenue}</p>
      
      {/* ✅ 自動遮罩敏感資料 */}
      <p>總成本：{renderSensitiveData(`$${stats.total_cost}`, userRole, '***')}</p>
    </div>
  );
}
```

#### 範例 3：事件過濾

```typescript
import { sanitizeEvents } from '@/lib/data-sanitization';

function EventLog() {
  const { userRole } = useUserRole();
  const events = [...]; // 原始事件資料

  // ✅ 自動移除成本相關事件
  const sanitizedEvents = sanitizeEvents(events, userRole);

  return (
    <div>
      {sanitizedEvents.map(event => (
        <div key={event.id}>{event.type}</div>
      ))}
    </div>
  );
}
```

### 安全考量

1. **離線模式限制**：員工在離線時無法驗證權限是否被撤銷，因此禁止寫入操作
2. **前端過濾**：資料脫敏在前端進行，後端 RLS 仍需正確配置
3. **事件過濾**：成本相關事件（`cost_added`, `cost_updated` 等）會被完全移除
4. **緩存清理**：角色變更時需清除緩存，確保資料同步

### 測試場景

```
✅ 老闆登入 → 可以查看所有資料（成本、利潤等）
✅ 員工登入 → 成本欄位被移除或顯示為 ***
✅ 員工登入 → 成本相關事件不顯示
✅ 角色切換 → 資料立即更新
✅ 離線模式 → 員工無法編輯資料
```

---

## 2️⃣ 表單自動暫存系統

### 功能說明

當 Session 過期時，自動保存使用者正在填寫的表單資料，登入成功後自動恢復，避免資料丟失。

### 核心檔案

#### `lib/form-autosave.ts`

提供完整的表單暫存工具：

```typescript
// 保存表單資料
saveFormData(formId: string, data: Record<string, any>, pathname?: string): void

// 載入表單資料
loadFormData(formId: string): FormAutoSaveData | null

// 清除表單資料
clearFormData(formId: string): void

// 清除所有表單資料
clearAllFormData(): void

// 獲取所有暫存的表單
getAllSavedForms(): FormAutoSaveData[]

// React Hook: 自動保存
useFormAutoSave(formId: string, formData: Record<string, any>, options?: {...}): { clearSaved: () => void }

// React Hook: 載入暫存
useFormAutoLoad(formId: string): { savedData, hasSavedData, clearSaved }
```

#### `components/auth/SessionExpiredHandler.tsx`

Session 過期處理器，自動檢測並提示使用者：

- 檢測 Session 過期
- 統計暫存的表單數量
- 顯示友善的提示對話框
- 登入成功後發送恢復事件

### 使用範例

#### 基本用法

```typescript
import { useFormAutoSave, useFormAutoLoad } from '@/lib/form-autosave';

function MyForm() {
  const formId = 'my-form';
  const [formData, setFormData] = useState({ name: '', email: '' });

  // ✅ 自動保存（防抖 1 秒）
  useFormAutoSave(formId, formData, {
    enabled: true,
    debounceMs: 1000,
  });

  // ✅ 載入暫存資料
  const { savedData, hasSavedData, clearSaved } = useFormAutoLoad(formId);

  useEffect(() => {
    if (hasSavedData && savedData) {
      // 詢問使用者是否恢復
      if (confirm('偵測到未完成的表單，是否要恢復？')) {
        setFormData(savedData.data);
      } else {
        clearSaved();
      }
    }
  }, []);

  const handleSubmit = () => {
    // 提交成功後清除暫存
    clearSaved();
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### 監聽恢復事件

```typescript
useEffect(() => {
  const handleFormRestored = (event: CustomEvent) => {
    toast.success(`已恢復 ${event.detail.count} 個表單的資料`);
  };

  window.addEventListener('form:restored', handleFormRestored);
  
  return () => {
    window.removeEventListener('form:restored', handleFormRestored);
  };
}, []);
```

### 暫存機制

1. **儲存位置**：使用 `sessionStorage`（分頁關閉後自動清除）
2. **過期時間**：30 分鐘（可配置）
3. **防抖機制**：預設 1 秒，避免頻繁寫入
4. **智能過濾**：只保存非空表單

### 資料結構

```typescript
interface FormAutoSaveData {
  formId: string;           // 表單 ID
  data: Record<string, any>; // 表單資料
  timestamp: number;         // 保存時間
  pathname: string;          // 頁面路徑
}
```

### Session 過期流程

```
1. 使用者填寫表單
   ↓
2. 表單資料自動暫存到 sessionStorage（防抖 1 秒）
   ↓
3. Session 過期
   ↓
4. SessionExpiredHandler 偵測到過期
   ↓
5. 顯示對話框：「您的表單資料已自動保存」
   ↓
6. 使用者點擊「重新登入」
   ↓
7. 登入成功
   ↓
8. 發送 'form:restored' 事件
   ↓
9. 表單組件自動恢復資料
   ↓
10. 顯示 Toast：「已恢復 N 個表單的資料」
```

### 測試場景

```
✅ 填寫表單 → 資料自動暫存
✅ Session 過期 → 顯示提示對話框
✅ 重新登入 → 表單資料自動恢復
✅ 提交表單 → 暫存資料被清除
✅ 30 分鐘後 → 暫存資料自動過期
✅ 關閉分頁 → sessionStorage 自動清除
```

---

## 3️⃣ PWA Splash Screen

### 功能說明

在 PWA 模式下，顯示美觀的啟動畫面，提升使用者體驗，消除白屏時間。

### 核心檔案

#### `components/PWASplashScreen.tsx`

智能啟動畫面組件：

- 自動檢測 PWA 模式
- 最少顯示 800ms
- 平滑淡出動畫
- 漸層背景 + 動態裝飾
- Logo 彈跳動畫
- 載入點動畫

### 設計特色

```typescript
// 漸層背景
bg-gradient-to-br from-[#7B9FA6] via-[#8AACB3] to-[#9BB9C0]

// Logo 容器
w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl animate-bounce-slow

// 載入點動畫（錯開延遲）
<div className="animate-bounce" style={{ animationDelay: '0ms' }} />
<div className="animate-bounce" style={{ animationDelay: '150ms' }} />
<div className="animate-bounce" style={{ animationDelay: '300ms' }} />
```

### 顯示邏輯

```typescript
1. 檢測是否為 PWA 模式
   - window.matchMedia('(display-mode: standalone)')
   - window.navigator.standalone (iOS)

2. 非 PWA 模式 → 立即隱藏

3. PWA 模式 → 顯示至少 800ms
   - 等待 DOM 完全載入
   - 計算已經過的時間
   - 補足剩餘時間

4. 開始淡出動畫（300ms）

5. 完全隱藏
```

### 整合到 Layout

已整合到 `app/layout.tsx`，在最外層渲染：

```tsx
<body>
  {/* ✅ PWA Splash Screen - 啟動畫面 */}
  <PWASplashScreen />
  
  {/* 其他組件 */}
  <AuthProvider>...</AuthProvider>
</body>
```

### 測試方式

#### 桌面測試

1. 打開 Chrome DevTools
2. 切換到 Application 標籤
3. 點擊 Manifest
4. 點擊「Install」按鈕
5. 從桌面啟動應用
6. 觀察啟動畫面

#### 手機測試

1. 在手機瀏覽器打開應用
2. 點擊「加入主畫面」
3. 從主畫面啟動應用
4. 觀察啟動畫面

### 效能指標

```
✅ 最少顯示時間：800ms
✅ 淡出動畫：300ms
✅ 總時長：約 1.1 秒
✅ 無白屏閃爍
✅ 平滑過渡到內容
```

---

## 📊 整體架構

### 組件層級

```
PWASplashScreen (最外層，z-index: 9999)
  ↓
AuthProvider
  ↓
SyncProvider (包含 isDataSanitized 標記)
  ↓
NavigationProvider
  ↓
AuthGuard (防閃爍 + 白名單路由)
  ↓
主要內容
  ↓
AuthManager (登入 Modal)
  ↓
SessionExpiredHandler (Session 過期處理)
```

### 資料流

```
使用者登入
  ↓
useUserRole 檢查身分
  ↓
SyncContext 設置 isDataSanitized
  ↓
組件使用 sanitizeArray/sanitizeObject 過濾資料
  ↓
UI 顯示脫敏後的資料
```

```
使用者填寫表單
  ↓
useFormAutoSave 自動暫存（防抖）
  ↓
Session 過期
  ↓
SessionExpiredHandler 偵測
  ↓
顯示對話框 + 統計暫存表單
  ↓
使用者重新登入
  ↓
useFormAutoLoad 自動恢復
  ↓
發送 'form:restored' 事件
```

---

## 🧪 完整測試指南

### 測試場景 1：資料脫敏

```
1. 以老闆身分登入
   ✅ 可以看到成本、利潤等資料
   ✅ 可以看到成本相關事件

2. 登出，以員工身分登入
   ✅ 成本欄位被移除或顯示為 ***
   ✅ 利潤欄位被移除
   ✅ 成本相關事件不顯示
   ✅ 頂部顯示「員工模式」提示

3. 檢查 SyncContext
   ✅ isDataSanitized === true
```

### 測試場景 2：表單自動暫存

```
1. 開始填寫新增產品表單
   - 輸入產品名稱：「測試產品」
   - 輸入售價：100
   - 輸入成本：60

2. 等待 1 秒（防抖時間）
   ✅ Console 顯示：「💾 表單已暫存」

3. 模擬 Session 過期
   - 方法 1：等待 Session 自然過期
   - 方法 2：手動清除 localStorage 中的 session

4. 觀察 SessionExpiredHandler
   ✅ 彈出對話框
   ✅ 顯示「您的表單資料已自動保存」
   ✅ 顯示「重新登入後將自動恢復 1 個表單的內容」

5. 點擊「重新登入」
   ✅ 彈出登入 Modal

6. 輸入帳號密碼登入
   ✅ Modal 關閉
   ✅ Toast 顯示：「已恢復 1 個表單的資料」

7. 返回表單頁面
   ✅ 表單資料已恢復
   ✅ 產品名稱：「測試產品」
   ✅ 售價：100
   ✅ 成本：60

8. 提交表單
   ✅ 暫存資料被清除
```

### 測試場景 3：PWA Splash Screen

```
1. 在瀏覽器中打開應用
   ✅ 不顯示 Splash Screen

2. 安裝 PWA
   - Chrome: 點擊網址列的「安裝」圖示
   - Safari: 點擊「加入主畫面」

3. 從桌面/主畫面啟動應用
   ✅ 顯示 Splash Screen
   ✅ 漸層背景
   ✅ Logo 彈跳動畫
   ✅ 載入點動畫

4. 等待約 1 秒
   ✅ Splash Screen 淡出
   ✅ 平滑過渡到內容
   ✅ 無白屏閃爍
```

---

## 📝 使用文檔

### 如何在新表單中啟用自動暫存

```typescript
import { useFormAutoSave, useFormAutoLoad } from '@/lib/form-autosave';

function MyNewForm() {
  const formId = 'my-new-form'; // 唯一的表單 ID
  const [formData, setFormData] = useState({...});

  // 1. 啟用自動保存
  useFormAutoSave(formId, formData);

  // 2. 載入暫存資料
  const { savedData, hasSavedData, clearSaved } = useFormAutoLoad(formId);

  // 3. 初始化時恢復
  useEffect(() => {
    if (hasSavedData && savedData) {
      setFormData(savedData.data);
    }
  }, []);

  // 4. 提交後清除
  const handleSubmit = () => {
    // ... 提交邏輯
    clearSaved();
  };

  return <form>...</form>;
}
```

### 如何在新組件中使用資料脫敏

```typescript
import { useUserRole } from '@/hooks/useUserRole';
import { sanitizeArray, canViewSensitiveData } from '@/lib/data-sanitization';

function MyComponent() {
  const { userRole } = useUserRole();
  const data = [...]; // 原始資料

  // 方法 1：過濾整個陣列
  const sanitizedData = sanitizeArray(data, 'product', userRole);

  // 方法 2：條件渲染
  return (
    <div>
      {canViewSensitiveData(userRole) && (
        <p>成本：${data.cost}</p>
      )}
    </div>
  );
}
```

### 如何自訂 Splash Screen

編輯 `components/PWASplashScreen.tsx`：

```typescript
// 修改最少顯示時間
const minDisplayTime = 1000; // 改為 1 秒

// 修改漸層顏色
className="bg-gradient-to-br from-[你的顏色] via-[你的顏色] to-[你的顏色]"

// 修改 Logo
<span className="text-6xl">你的 Emoji</span>

// 修改標題
<h1>你的應用名稱</h1>
```

---

## 🎉 總結

### 已完成的增強功能

1. ✅ **資料脫敏系統**
   - 完整的工具函數庫
   - 整合到 SyncContext
   - 自動過濾敏感欄位
   - 事件過濾機制

2. ✅ **表單自動暫存**
   - 自動保存機制（防抖）
   - Session 過期處理
   - 自動恢復功能
   - 友善的 UI 提示

3. ✅ **PWA Splash Screen**
   - 智能檢測 PWA 模式
   - 美觀的啟動動畫
   - 平滑的過渡效果
   - 無白屏閃爍

### 檔案清單

**新增檔案：**
- `lib/data-sanitization.ts` - 資料脫敏工具
- `lib/form-autosave.ts` - 表單暫存工具
- `components/auth/SessionExpiredHandler.tsx` - Session 過期處理器
- `components/PWASplashScreen.tsx` - PWA 啟動畫面
- `components/examples/DataSanitizationExample.tsx` - 脫敏範例
- `components/examples/FormAutoSaveExample.tsx` - 暫存範例

**修改檔案：**
- `lib/sync-context.tsx` - 新增 isDataSanitized 標記
- `app/layout.tsx` - 整合新組件

### 下一步建議

1. **資料脫敏**
   - 在實際的產品/市集組件中應用脫敏函數
   - 測試不同角色的資料顯示
   - 優化敏感欄位列表

2. **表單暫存**
   - 在所有重要表單中啟用自動暫存
   - 測試不同場景的恢復流程
   - 考慮添加「草稿」功能

3. **PWA 優化**
   - 自訂 Splash Screen 以符合品牌
   - 測試不同裝置的顯示效果
   - 優化載入時間

---

所有增強功能已完成並準備好測試！🚀
