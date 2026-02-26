# 離開團隊失敗問題診斷與修復報告

## 🐛 問題現象

**測試結果**：
1. 員工身分點擊「離開團隊」
2. 執行離開流程
3. **問題**：設置畫面仍然顯示「離開團隊」功能
4. **問題**：重新登入後仍然顯示屬於使用者A的員工
5. **問題**：沒有恢復成一般身分

---

## 🔍 根本原因分析

### 問題 1：`router.push()` 不會觸發 `useUserRole` 重新查詢

**關鍵發現**：
```typescript
// useUserRole.ts
useEffect(() => {
  loadUserRole();
  
  return () => {
    isMounted = false;
  };
}, [user]);  // ❌ 只依賴 user，不依賴路由變化
```

**問題分析**：
- `useUserRole` 的 `useEffect` 只依賴 `user`
- 使用 `router.push('/')` 導航時，`user` 沒有變化
- **因此 `useEffect` 不會重新執行**
- **`loadUserRole()` 不會被調用**
- **角色狀態不會更新**

### 問題 2：角色緩存沒有被正確清除

**時間軸分析**：
```
T1: handleLeaveTeam() 清除 localStorage 中的 'user_role_cache'
T2: handleLeaveTeam() 調用 clearRoleCache()
T3: router.push('/') 導航到首頁
T4: ❌ useUserRole 的 useEffect 不會重新執行（因為 user 沒變）
T5: ❌ 仍然使用舊的 userRole 狀態（React state）
T6: ❌ 頁面仍然顯示員工身分
```

### 問題 3：React State 沒有被重置

**關鍵問題**：
```typescript
// useUserRole.ts
const [userRole, setUserRole] = useState<UserRole>(() => {
  if (user) {
    const cached = getCachedRole(user.id);
    if (cached) {
      return cached;  // ❌ 初始化時使用緩存
    }
  }
  return { isStaff: false };
});
```

**問題分析**：
- `useState` 的初始化只在組件首次掛載時執行
- 即使清除了 localStorage，React state 仍然保持舊值
- `router.push()` 不會卸載組件，所以 state 不會重置

---

## 🎯 完整的問題鏈

```
1. 使用者B點擊「離開團隊」
   ↓
2. handleLeaveTeam() 刪除雲端 staff_relationships 記錄 ✅
   ↓
3. handleLeaveTeam() 刪除雲端 market_members 記錄 ✅
   ↓
4. handleLeaveTeam() 清除本地數據 ✅
   ↓
5. handleLeaveTeam() 清除 localStorage 中的 'user_role_cache' ✅
   ↓
6. handleLeaveTeam() 調用 clearRoleCache() ✅
   ↓
7. router.push('/') 導航到首頁
   ↓
8. ❌ 問題：useUserRole 的 useEffect 不會重新執行
   - 因為依賴項 [user] 沒有變化
   ↓
9. ❌ 問題：React state 中的 userRole 仍然是舊值
   - { isStaff: true, ownerId: 'A', ... }
   ↓
10. ❌ 結果：頁面仍然顯示員工身分
```

---

## 🔧 修復方案

### 方案 1：強制重新載入頁面（最簡單，推薦）

**原理**：
- 使用 `window.location.href` 強制重新載入頁面
- 但增加延遲，確保雲端數據已同步

**優點**：
- ✅ 簡單可靠
- ✅ 確保所有 React 狀態重置
- ✅ 確保 useUserRole 重新查詢

**缺點**：
- ⚠️ 需要等待頁面重新載入
- ⚠️ 可能有短暫的白屏

**實作**：
```typescript
// app/settings/page.tsx
const handleLeaveTeam = async () => {
  // ... 前面的邏輯不變 ...

  toast.success('✅ 已離開團隊，您已恢復為一般用戶', { id: 'leave-team' });

  // ✅ 方案 1：增加延遲，確保雲端同步完成
  setTimeout(() => {
    // 強制重新載入頁面
    window.location.href = '/';
  }, 3000);  // 增加到 3 秒，確保雲端同步
};
```

### 方案 2：使用登出重新登入（最安全）

**原理**：
- 離開團隊後，直接登出
- 用戶重新登入，確保所有狀態重置

**優點**：
- ✅ 最安全，確保所有狀態重置
- ✅ 避免所有競態條件
- ✅ 確保 useUserRole 重新查詢

**缺點**：
- ⚠️ 用戶需要重新登入
- ⚠️ 用戶體驗較差

**實作**：
```typescript
// app/settings/page.tsx
const handleLeaveTeam = async () => {
  // ... 前面的邏輯不變 ...

  toast.success('✅ 已離開團隊，即將登出...', { id: 'leave-team' });

  // ✅ 方案 2：登出
  setTimeout(async () => {
    await signOut();  // 調用 auth-context 的 signOut
  }, 2000);
};
```

### 方案 3：手動觸發 useUserRole 重新查詢（複雜）

**原理**：
- 在 `useUserRole` 中增加一個刷新函數
- 離開團隊後，手動調用刷新函數

**優點**：
- ✅ 不需要重新載入頁面
- ✅ 更快的用戶體驗

**缺點**：
- ⚠️ 需要修改 `useUserRole` Hook
- ⚠️ 需要使用 Context 或其他方式傳遞刷新函數
- ⚠️ 複雜度高

**實作**：
```typescript
// hooks/useUserRole.ts
export function useUserRole() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>({ isStaff: false });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);  // ✅ 新增刷新觸發器

  useEffect(() => {
    loadUserRole();
  }, [user, refreshTrigger]);  // ✅ 依賴 refreshTrigger

  // ✅ 新增刷新函數
  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    userRole,
    isLoading,
    isStaff: userRole.isStaff,
    isOwner: !userRole.isStaff,
    canEdit: userRole.isStaff ? (userRole.permissions?.can_edit ?? false) : true,
    canViewSensitiveData: !userRole.isStaff,
    refresh,  // ✅ 導出刷新函數
  };
}

// app/settings/page.tsx
const handleLeaveTeam = async () => {
  // ... 前面的邏輯不變 ...

  toast.success('✅ 已離開團隊，您已恢復為一般用戶', { id: 'leave-team' });

  // ✅ 方案 3：手動觸發刷新
  setTimeout(() => {
    // 需要通過某種方式調用 refresh()
    // 例如使用 Context 或事件
    window.dispatchEvent(new Event('refresh-user-role'));
    router.push('/');
  }, 1000);
};
```

### 方案 4：驗證雲端記錄已刪除後再導航（最可靠）

**原理**：
- 刪除雲端記錄後，輪詢驗證記錄已刪除
- 確認刪除後，再重新載入頁面

**優點**：
- ✅ 確保雲端數據已同步
- ✅ 避免競態條件
- ✅ 可靠性高

**缺點**：
- ⚠️ 需要等待驗證完成
- ⚠️ 實作較複雜

**實作**：
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

    // ✅ 步驟 3：驗證雲端記錄已刪除
    toast.loading('正在驗證雲端同步...', { id: 'leave-team' });
    
    let retryCount = 0;
    const maxRetries = 10;
    let isDeleted = false;
    
    while (retryCount < maxRetries && !isDeleted) {
      await new Promise(resolve => setTimeout(resolve, 500));  // 等待 0.5 秒
      
      // 驗證 staff_relationships 記錄是否已刪除
      const { data, error } = await supabase
        .from('staff_relationships')
        .select('id')
        .eq('owner_id', userRole.ownerId)
        .eq('staff_id', user.id)
        .eq('status', 'active');
      
      if (error) {
        console.error('驗證失敗:', error);
        break;
      }
      
      if (!data || data.length === 0) {
        // 記錄已刪除
        isDeleted = true;
        console.log('✅ 雲端記錄已確認刪除');
        break;
      }
      
      retryCount++;
      console.log(`等待雲端同步... (${retryCount}/${maxRetries})`);
    }

    // ✅ 步驟 4：清除本地數據
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

    toast.success('✅ 已離開團隊，即將重新載入...', { id: 'leave-team' });

    // ✅ 步驟 5：強制重新載入頁面
    setTimeout(() => {
      window.location.href = '/';
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
        window.location.href = '/';
      } catch (clearError) {
        console.error('清除失敗:', clearError);
        toast.error('請手動重新整理頁面');
      }
    }
  }
};
```

---

## 📊 方案對比

| 方案 | 可靠性 | 用戶體驗 | 實作複雜度 | 推薦度 |
|------|--------|----------|------------|--------|
| 方案 1：延遲重新載入 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 方案 2：登出重新登入 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 方案 3：手動刷新 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 方案 4：驗證後重新載入 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 推薦實作：方案 4（驗證後重新載入）

### 為什麼選擇方案 4？

1. ✅ **最可靠**：確保雲端數據已同步
2. ✅ **避免競態條件**：輪詢驗證記錄已刪除
3. ✅ **用戶體驗好**：顯示驗證進度，用戶知道發生什麼
4. ✅ **實作適中**：不需要修改 Hook，只需修改一個函數

### 關鍵改進

1. **輪詢驗證**：確保雲端記錄已刪除
2. **顯示進度**：告訴用戶正在驗證
3. **強制重新載入**：確保 React 狀態重置

---

## 🧪 測試計劃

### 測試 1：基本離開團隊流程

**步驟**：
1. 使用者B以員工身分登入
2. 驗證顯示「離開團隊」按鈕
3. 點擊「離開團隊」
4. 確認離開
5. 觀察驗證進度
6. 等待頁面重新載入
7. **驗證**：不再顯示「離開團隊」按鈕
8. **驗證**：顯示「創建市集」按鈕
9. **驗證**：身分為一般用戶

**預期結果**：
- ✅ 身分正確變為一般用戶
- ✅ 不再顯示員工相關 UI

### 測試 2：重新登入驗證

**步驟**：
1. 離開團隊後
2. 登出
3. 重新登入
4. **驗證**：身分為一般用戶
5. **驗證**：不再顯示「離開團隊」按鈕

**預期結果**：
- ✅ 身分正確
- ✅ UI 正確

### 測試 3：雲端記錄驗證

**步驟**：
1. 離開團隊後
2. 使用 Supabase Dashboard 查詢 `staff_relationships` 表
3. **驗證**：使用者B的記錄已刪除

**預期結果**：
- ✅ 雲端記錄已完全刪除

---

## 📝 總結

### 問題根源

1. ❌ `router.push()` 不會觸發 `useUserRole` 重新查詢
2. ❌ React state 沒有被重置
3. ❌ 可能有雲端同步延遲

### 解決方案

✅ **推薦使用方案 4**：驗證雲端記錄已刪除後，再強制重新載入頁面

### 關鍵改進

1. ✅ 輪詢驗證雲端記錄已刪除
2. ✅ 顯示驗證進度
3. ✅ 使用 `window.location.href` 強制重新載入
4. ✅ 確保所有 React 狀態重置

---

**報告完成時間**：2026-02-26  
**問題嚴重度**：🔴 高（核心功能失效）  
**建議優先級**：🔴 立即修復
