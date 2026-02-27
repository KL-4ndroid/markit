# 🐛 Bug 修復報告 - Session 過期處理器誤判問題

## 問題描述

**症狀：**
當使用者已經登入狀態下，重新進入應用時，系統仍然跳出登入畫面讓使用者輸入帳號密碼。

**預期行為：**
使用者的登入狀態應該保持，自動載入登入狀態，不需要再跳出登入彈窗。

---

## 根本原因分析

### 問題檔案
`components/auth/SessionExpiredHandler.tsx`

### 錯誤程式碼

```typescript
// ❌ 錯誤：使用 useState 而非 useRef
const previousUserRef = useState<string | null>(null);

useEffect(() => {
  // ❌ 錯誤：首次掛載時就會執行這個邏輯
  if (previousUserRef && !user && !session) {
    // 誤判為 Session 過期，觸發登入
    triggerLogin();
  }
  
  // ❌ 錯誤：更新方式不正確
  if (user) {
    previousUserRef[0] = user.id;
  }
}, [user, session]);
```

### 問題分析

1. **useState 誤用**
   - `useState<string | null>(null)` 返回的是 `[value, setValue]` 陣列
   - 直接使用 `previousUserRef` 會得到整個陣列，而非值本身
   - 條件判斷 `if (previousUserRef && !user)` 永遠為 true（陣列永遠是 truthy）

2. **首次掛載誤判**
   - 應用首次載入時，`user` 可能還在載入中（`loading = true`）
   - 此時 `user = null`，但這不代表 Session 過期
   - 沒有跳過首次掛載的邏輯，導致誤判為登出

3. **執行流程**
   ```
   使用者重新進入應用
       ↓
   AuthProvider 初始化（loading = true, user = null）
       ↓
   SessionExpiredHandler 掛載
       ↓
   useEffect 執行
       ↓
   判斷：previousUserRef (陣列，truthy) && !user (true) && !session (true)
       ↓
   誤判為 Session 過期
       ↓
   觸發 triggerLogin()
       ↓
   彈出登入 Modal ❌
   ```

---

## 修復方案

### 修復後的程式碼

```typescript
// ✅ 正確：使用 useRef
const previousUserRef = useRef<string | null>(null);
const isInitialMount = useRef(true);

useEffect(() => {
  // ✅ 跳過首次掛載（避免誤判為登出）
  if (isInitialMount.current) {
    isInitialMount.current = false;
    previousUserRef.current = user?.id || null;
    return; // 提前返回，不執行後續邏輯
  }

  // ✅ 檢測 Session 過期：之前有使用者，現在沒有
  if (previousUserRef.current && !user && !session) {
    console.log('🔐 偵測到 Session 過期', {
      previousUser: previousUserRef.current,
      currentUser: user,
    });
    
    // 檢查是否有暫存的表單
    const savedForms = getAllSavedForms();
    setSavedFormsCount(savedForms.length);
    
    // 只在有暫存表單時顯示對話框
    if (savedForms.length > 0) {
      setShowDialog(true);
    } else {
      // 沒有暫存表單，直接觸發登入
      triggerLogin();
    }
  }

  // ✅ 更新 previousUser
  previousUserRef.current = user?.id || null;
}, [user, session]);
```

### 修復要點

1. **使用 useRef 而非 useState**
   - `useRef` 返回一個可變的 ref 物件
   - 通過 `.current` 屬性訪問和修改值
   - 不會觸發重新渲染

2. **添加首次掛載檢查**
   - 使用 `isInitialMount` ref 追蹤是否為首次掛載
   - 首次掛載時只記錄當前使用者，不執行登出邏輯
   - 提前返回，避免誤判

3. **正確的狀態追蹤**
   - `previousUserRef.current` 儲存上一次的使用者 ID
   - 每次 `user` 變化時更新 `previousUserRef.current`
   - 只有當「之前有使用者，現在沒有」時才判定為登出

---

## 修復後的執行流程

### 場景 1：使用者重新進入應用（已登入）

```
使用者重新進入應用
    ↓
AuthProvider 初始化（loading = true, user = null）
    ↓
SessionExpiredHandler 掛載
    ↓
useEffect 執行（首次掛載）
    ↓
isInitialMount.current === true
    ↓
記錄：previousUserRef.current = null
    ↓
提前返回，不執行登出邏輯 ✅
    ↓
AuthProvider 完成載入（loading = false, user = {...}）
    ↓
useEffect 再次執行
    ↓
isInitialMount.current === false
    ↓
判斷：previousUserRef.current (null) && !user (false)
    ↓
條件不成立，不觸發登入 ✅
    ↓
更新：previousUserRef.current = user.id
    ↓
正常顯示應用內容 ✅
```

### 場景 2：Session 真的過期

```
使用者正在使用應用（已登入）
    ↓
previousUserRef.current = 'user-123'
    ↓
Session 過期（例如：超過有效期限）
    ↓
AuthProvider 偵測到過期，清除 user
    ↓
useEffect 執行
    ↓
isInitialMount.current === false
    ↓
判斷：previousUserRef.current ('user-123') && !user (true) && !session (true)
    ↓
條件成立，確認為 Session 過期 ✅
    ↓
檢查暫存表單
    ↓
顯示「登入已過期」對話框 ✅
    ↓
使用者重新登入
    ↓
表單資料自動恢復 ✅
```

---

## 測試驗證

### 測試場景 1：重新進入應用（已登入）

**步驟：**
1. 登入應用
2. 關閉瀏覽器分頁
3. 重新開啟應用

**預期結果：**
- ✅ 不彈出登入 Modal
- ✅ 直接顯示應用內容
- ✅ 使用者狀態正確載入

**實際結果：**
- ✅ 通過測試

### 測試場景 2：Session 真的過期

**步驟：**
1. 登入應用
2. 等待 Session 過期（或手動清除 localStorage）
3. 嘗試操作

**預期結果：**
- ✅ 彈出「登入已過期」對話框
- ✅ 提示表單資料已保存（如果有）
- ✅ 重新登入後恢復表單

**實際結果：**
- ✅ 通過測試

### 測試場景 3：首次訪問（未登入）

**步驟：**
1. 清除所有資料
2. 訪問應用

**預期結果：**
- ✅ 顯示 WelcomeScreen
- ✅ 不彈出 Session 過期對話框

**實際結果：**
- ✅ 通過測試

---

## 相關檔案

### 修改檔案
- `components/auth/SessionExpiredHandler.tsx` ✅ 已修復

### 相關檔案（無需修改）
- `components/auth/AuthGuard.tsx` - 邏輯正確
- `lib/supabase/auth-context.tsx` - 邏輯正確
- `components/auth/AuthManager.tsx` - 邏輯正確

---

## 學習要點

### 1. useState vs useRef

**useState：**
- 用於需要觸發重新渲染的狀態
- 返回 `[value, setValue]` 陣列
- 修改值會觸發組件重新渲染

**useRef：**
- 用於儲存不需要觸發渲染的可變值
- 返回 `{ current: value }` 物件
- 修改 `.current` 不會觸發重新渲染
- 適合用於追蹤「上一次的值」

### 2. 首次掛載檢查

在處理「狀態變化」的邏輯時，務必考慮首次掛載的情況：

```typescript
const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    // 初始化邏輯
    return;
  }
  
  // 後續變化的邏輯
}, [dependency]);
```

### 3. 邏輯判斷的嚴謹性

在判斷「Session 過期」時，需要確保：
- 之前確實有使用者（`previousUserRef.current` 不為 null）
- 現在沒有使用者（`!user`）
- 現在沒有 Session（`!session`）
- 不是首次掛載（`!isInitialMount.current`）

---

## 總結

### 問題
使用者重新進入應用時，誤判為 Session 過期，彈出登入 Modal。

### 原因
1. 錯誤使用 `useState` 而非 `useRef`
2. 沒有跳過首次掛載的邏輯
3. 條件判斷不夠嚴謹

### 修復
1. 改用 `useRef` 追蹤上一次的使用者
2. 添加 `isInitialMount` 檢查
3. 只在「真正的登出」時觸發對話框

### 結果
✅ 使用者重新進入應用時，正常載入登入狀態  
✅ Session 真的過期時，正確彈出對話框  
✅ 表單自動暫存功能正常運作  

---

**修復狀態：** ✅ 完成  
**測試狀態：** ✅ 通過  
**部署狀態：** ✅ 可以部署  

**修復日期：** 2025-02-27
