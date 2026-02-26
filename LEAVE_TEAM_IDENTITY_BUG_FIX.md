# 離開團隊後仍保持員工身分問題修復報告

## 🐛 問題描述

**場景**：
1. 使用者B以員工身分登入
2. 在設定頁面點擊「離開團隊」
3. 確認離開團隊後，清除本地資料
4. **問題**：身分仍是使用者A的員工，並且再次載入使用者A的數據
5. **預期**：應該恢復成一般身分（非員工），不再載入使用者A的數據

---

## 🔍 根本原因分析

### 問題 1：頁面重新載入的時機問題

**現況**：`handleLeaveTeam()` 函數
```typescript
// ❌ 問題：使用 window.location.href = '/' 重新載入
setTimeout(() => {
  window.location.href = '/';
}, 2000);
```

**問題分析**：
- 頁面重新載入後，`useUserRole` Hook 會重新執行
- `useUserRole` 會查詢 Supabase 的 `staff_relationships` 表
- **但是**：雲端的 `staff_relationships` 記錄已經被刪除
- **理論上**：應該查詢不到，返回 `isStaff: false`

### 問題 2：角色緩存沒有被清除

**現況**：`useUserRole.ts` 中的緩存邏輯
```typescript
// ✅ 優化：初始化時先從緩存讀取，避免閃爍
const [userRole, setUserRole] = useState<UserRole>(() => {
  if (user) {
    const cached = getCachedRole(user.id);
    if (cached) {
      return cached;  // ❌ 問題：使用舊的緩存
    }
  }
  return { isStaff: false };
});
```

**問題分析**：
- `handleLeaveTeam()` 中雖然調用了 `clearRoleCache()`
- **但是**：清除緩存後，立即重新載入頁面
- 頁面重新載入時，`useUserRole` 重新執行
- `useUserRole` 會重新查詢 Supabase 並**重新緩存**
- 如果查詢時機不對，可能查到舊數據

### 問題 3：Supabase 查詢的時機問題

**可能的競態條件**：
```
時間軸：
T1: handleLeaveTeam() 刪除 staff_relationships 記錄
T2: handleLeaveTeam() 清除本地緩存
T3: handleLeaveTeam() 觸發頁面重新載入
T4: 頁面開始重新載入
T5: useUserRole 開始查詢 Supabase
T6: ❌ 問題：Supabase 可能還沒有完全同步刪除
T7: useUserRole 查到舊的 staff_relationships 記錄
T8: useUserRole 設置為員工身分並緩存
```

### 問題 4：同步引擎可能重新拉取數據

**現況**：`useSync.ts` 中的同步邏輯
```typescript
// 頁面重新載入後，useSync 會自動執行
useEffect(() => {
  if (!enabled || !isConfigured || !user) {
    return;
  }

  // ✅ 初始同步（只執行一次）
  if (!hasExecutedInitialSync) {
    hasExecutedInitialSync = true;
    throttledSyncFnRef.current?.();  // ❌ 可能重新拉取數據
  }
}, [enabled, isConfigured, user, interval]);
```

**問題分析**：
- 頁面重新載入後，`useSync` 會執行初始同步
- 初始同步會調用 `pullEventsFromViews()` 或 `pullAllEvents()`
- 這些函數會查詢 `market_members` 表
- 如果 `market_members` 記錄還沒被刪除，會重新拉取數據

---

## 🎯 完整的問題鏈

```
1. 使用者B點擊「離開團隊」
   ↓
2. handleLeaveTeam() 刪除雲端 staff_relationships 記錄
   ↓
3. handleLeaveTeam() 刪除雲端 market_members 記錄
   ↓
4. handleLeaveTeam() 清除本地數據（IndexedDB、localStorage）
   ↓
5. handleLeaveTeam() 清除角色緩存
   ↓
6. handleLeaveTeam() 觸發頁面重新載入
   ↓
7. 頁面重新載入，useUserRole 重新執行
   ↓
8. ❌ 問題點 A：useUserRole 查詢 Supabase
   - 可能因為網路延遲，查到舊的 staff_relationships 記錄
   - 或者 Supabase 的 RLS 政策還沒更新
   ↓
9. ❌ 問題點 B：useUserRole 設置為員工身分並緩存
   ↓
10. ❌ 問題點 C：useSync 執行初始同步
    - 查詢 market_members 表
    - 如果記錄還在，重新拉取數據
    ↓
11. ❌ 結果：使用者B仍然是員工身分，並載入使用者A的數據
```

---

## 🔧 修復方案

### 方案 1：不重新載入頁面，直接更新狀態（推薦）

**原理**：
- 不使用 `window.location.href` 重新載入頁面
- 直接更新 React 狀態
- 手動觸發 `useUserRole` 重新查詢

**優點**：
- ✅ 避免頁面重新載入的競態條件
- ✅ 更快的用戶體驗
- ✅ 更可控的狀態更新

**實作**：
```typescript
// 修改 handleLeaveTeam()
const handleLeaveTeam = async () => {
  // ... 前面的邏輯不變 ...

  // ✅ 步驟 3：清除本地數據
  // ... 清除邏輯不變 ...

  toast.success('✅ 已離開團隊', { id: 'leave-team' });

  // ✅ 步驟 4：不重新載入頁面，直接更新狀態
  // 4.1 清除角色緩存
  const { clearRoleCache } = await import('@/hooks/useUserRole');
  clearRoleCache();

  // 4.2 強制 useUserRole 重新查詢（通過改變 key）
  // 使用 router.push 導航到首頁，觸發重新渲染
  router.push('/');
  
  // 4.3 顯示提示
  setTimeout(() => {
    toast.info('您已恢復為一般用戶身分');
  }, 500);
};
```

### 方案 2：延遲重新載入，確保雲端同步完成（備用）

**原理**：
- 增加延遲時間，確保 Supabase 完全同步
- 在重新載入前，再次驗證雲端記錄已刪除

**優點**：
- ✅ 確保雲端數據已同步
- ✅ 避免競態條件

**缺點**：
- ⚠️ 用戶需要等待更長時間
- ⚠️ 仍然可能有網路延遲問題

**實作**：
```typescript
// 修改 handleLeaveTeam()
const handleLeaveTeam = async () => {
  // ... 前面的邏輯不變 ...

  // ✅ 步驟 3：清除本地數據
  // ... 清除邏輯不變 ...

  // ✅ 步驟 4：驗證雲端記錄已刪除
  let retryCount = 0;
  const maxRetries = 5;
  
  while (retryCount < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
    
    // 驗證 staff_relationships 記錄是否已刪除
    const { data, error } = await supabase
      .from('staff_relationships')
      .select('id')
      .eq('owner_id', userRole.ownerId)
      .eq('staff_id', user.id)
      .eq('status', 'active');
    
    if (error || !data || data.length === 0) {
      // 記錄已刪除，可以重新載入
      break;
    }
    
    retryCount++;
    console.log(`等待雲端同步... (${retryCount}/${maxRetries})`);
  }

  toast.success('✅ 已離開團隊，即將重新載入...', { id: 'leave-team' });

  // ✅ 步驟 5：重新載入頁面
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
};
```

### 方案 3：使用登出重新登入（最安全）

**原理**：
- 離開團隊後，直接登出
- 用戶重新登入，確保所有狀態重置

**優點**：
- ✅ 最安全，確保所有狀態重置
- ✅ 避免所有競態條件

**缺點**：
- ⚠️ 用戶需要重新登入
- ⚠️ 用戶體驗較差

**實作**：
```typescript
// 修改 handleLeaveTeam()
const handleLeaveTeam = async () => {
  // ... 前面的邏輯不變 ...

  // ✅ 步驟 3：清除本地數據
  // ... 清除邏輯不變 ...

  toast.success('✅ 已離開團隊，即將登出...', { id: 'leave-team' });

  // ✅ 步驟 4：登出
  setTimeout(async () => {
    await signOut(); // 調用 auth-context 的 signOut
  }, 2000);
};
```

---

## 📊 方案對比

| 方案 | 優點 | 缺點 | 推薦度 |
|------|------|------|--------|
| 方案 1：不重新載入 | 快速、可控 | 需要手動更新狀態 | ⭐⭐⭐⭐⭐ |
| 方案 2：延遲重新載入 | 確保同步 | 等待時間長 | ⭐⭐⭐ |
| 方案 3：登出重新登入 | 最安全 | 用戶體驗差 | ⭐⭐ |

---

## 🎯 推薦實作：方案 1（不重新載入頁面）

### 完整程式碼

```typescript
// app/settings/page.tsx

const handleLeaveTeam = async () => {
  if (!user || !userRole.ownerId) return;

  const confirmed = confirm(
    '⚠️ 確定要離開團隊嗎？\n\n' +
    '離開後：\n' +
    '• 您將無法再訪問老闆的市集\n' +
    '• 您的本地數據將被清除\n' +
    '• 您將恢復為一般用戶身分\n\n' +
    '此操作無法復原！'
  );

  if (!confirmed) return;

  try {
    toast.loading('正在離開團隊...', { id: 'leave-team' });

    // ✅ 步驟 1：刪除員工關係（雲端）
    const { error: relError } = await supabase
      .from('staff_relationships')
      .delete()
      .eq('owner_id', userRole.ownerId)
      .eq('staff_id', user.id);

    if (relError) throw relError;

    // ✅ 步驟 2：刪除 market_members 記錄（雲端）
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('id')
      .eq('owner_id', userRole.ownerId);

    if (marketsError) throw marketsError;

    if (markets && markets.length > 0) {
      const marketIds = markets.map(m => m.id);
      
      const { error: membersError } = await supabase
        .from('market_members')
        .delete()
        .eq('user_id', user.id)
        .eq('role', 'staff')
        .in('market_id', marketIds);

      if (membersError) throw membersError;
    }

    // ✅ 步驟 3：清除本地數據
    console.log('🧹 開始清除本地數據...');
    
    try {
      const { db } = await import('@/lib/db');
      await db.markets.clear();
      await db.products.clear();
      await db.events.clear();
      await db.dailyStats.clear();
      console.log('✅ 數據表已清除');
    } catch (dbError) {
      console.error('清除數據表失敗:', dbError);
    }
    
    try {
      await indexedDB.deleteDatabase('MarketPulseDB');
      console.log('✅ IndexedDB 已刪除');
    } catch (idbError) {
      console.error('刪除 IndexedDB 失敗:', idbError);
    }
    
    try {
      const keysToRemove = [
        'user_role_cache',
        'logout_history',
        'hasCompletedInitialSync',
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`清除 ${key} 失敗:`, e);
        }
      });
      
      sessionStorage.clear();
      console.log('✅ 緩存已清除');
    } catch (storageError) {
      console.error('清除緩存失敗:', storageError);
    }
    
    try {
      const { resetInitialSyncFlag } = await import('@/hooks/useSync');
      const { clearRoleCache } = await import('@/hooks/useUserRole');
      resetInitialSyncFlag();
      clearRoleCache();
      console.log('✅ 同步標記已重置');
    } catch (resetError) {
      console.error('重置標記失敗:', resetError);
    }

    toast.success('✅ 已離開團隊，您已恢復為一般用戶', { id: 'leave-team' });

    // ✅ 步驟 4：不重新載入頁面，使用 router 導航
    // 這會觸發 React 重新渲染，useUserRole 會重新查詢
    setTimeout(() => {
      router.push('/');
      
      // 顯示提示
      setTimeout(() => {
        toast.info('💡 您現在可以創建自己的市集了');
      }, 500);
    }, 1000);

  } catch (error: any) {
    console.error('離開團隊失敗:', error);
    toast.error('離開失敗：' + error.message, { id: 'leave-team' });
    
    const shouldClearLocal = confirm(
      '離開團隊時發生錯誤，但建議清除本地數據以避免數據混亂。\n\n' +
      '是否清除本地數據並重新載入？'
    );
    
    if (shouldClearLocal) {
      try {
        await indexedDB.deleteDatabase('MarketPulseDB');
        localStorage.removeItem('user_role_cache');
        localStorage.removeItem('logout_history');
        sessionStorage.clear();
        router.push('/');
      } catch (clearError) {
        console.error('清除失敗:', clearError);
        toast.error('請手動重新整理頁面');
      }
    }
  }
};
```

---

## 🧪 測試計劃

### 測試 1：基本離開團隊流程

**步驟**：
1. 使用者B以員工身分登入
2. 驗證身分為員工（顯示老闆資訊）
3. 點擊「離開團隊」
4. 確認離開
5. 等待處理完成
6. **驗證**：身分變為一般用戶（不是員工）
7. **驗證**：不再顯示老闆資訊
8. **驗證**：不再載入使用者A的數據

**預期結果**：
- ✅ 身分正確變為一般用戶
- ✅ 本地數據已清除
- ✅ 不再載入使用者A的數據

### 測試 2：驗證雲端記錄已刪除

**步驟**：
1. 離開團隊後
2. 使用 Supabase Dashboard 查詢 `staff_relationships` 表
3. **驗證**：使用者B的記錄已刪除
4. 查詢 `market_members` 表
5. **驗證**：使用者B的記錄已刪除

**預期結果**：
- ✅ 雲端記錄已完全刪除

### 測試 3：重新登入後的狀態

**步驟**：
1. 離開團隊後
2. 登出
3. 重新登入
4. **驗證**：身分為一般用戶
5. **驗證**：沒有使用者A的數據

**預期結果**：
- ✅ 身分正確
- ✅ 數據正確

---

## 📝 總結

### 問題根源

1. ❌ 頁面重新載入導致的競態條件
2. ❌ useUserRole 可能查到舊的緩存或雲端數據
3. ❌ useSync 可能重新拉取數據

### 解決方案

✅ **推薦使用方案 1**：不重新載入頁面，使用 `router.push('/')` 導航

### 關鍵改進

1. ✅ 使用 `router.push('/')` 而不是 `window.location.href`
2. ✅ 觸發 React 重新渲染，useUserRole 會重新查詢
3. ✅ 避免頁面重新載入的競態條件
4. ✅ 更快的用戶體驗

---

**報告完成時間**：2026-02-26  
**問題嚴重度**：🔴 高（影響核心功能）  
**建議優先級**：🔴 立即修復
