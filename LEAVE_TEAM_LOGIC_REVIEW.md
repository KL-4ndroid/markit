# 「離開團隊」功能邏輯檢驗報告

## 📍 功能位置

**檔案**：`app/settings/page.tsx`  
**函數**：`handleLeaveTeam()`  
**觸發條件**：員工模式下，在設定頁面點擊「離開團隊」按鈕

---

## 🔍 現有實作邏輯分析

### 當前程式碼

```typescript
// 員工離開團隊
const handleLeaveTeam = async () => {
  if (!user || !userRole.ownerId) return;

  const confirmed = confirm(
    '⚠️ 確定要離開團隊嗎？\n\n' +
    '離開後：\n' +
    '• 您將無法再訪問老闆的市集\n' +
    '• 您的本地數據將被清除\n' +
    '• 您可以重新開始使用自己的帳號\n\n' +
    '此操作無法復原！'
  );

  if (!confirmed) return;

  try {
    toast.loading('正在離開團隊...', { id: 'leave-team' });

    // 1. 刪除員工關係
    const { error: relError } = await supabase
      .from('staff_relationships')
      .delete()
      .eq('owner_id', userRole.ownerId)
      .eq('staff_id', user.id);

    if (relError) throw relError;

    // 2. 刪除 market_members 記錄
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

    // 3. 清除本地數據
    await indexedDB.deleteDatabase('MarketPulseDB');

    toast.success('✅ 已離開團隊，即將重新載入...', { id: 'leave-team' });

    // 4. 重新載入頁面
    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error: any) {
    console.error('離開團隊失敗:', error);
    toast.error('離開失敗：' + error.message, { id: 'leave-team' });
  }
};
```

---

## ✅ 正確的部分

### 1. 雲端清除邏輯（完全正確）

✅ **步驟 1：刪除員工關係**
```typescript
await supabase
  .from('staff_relationships')
  .delete()
  .eq('owner_id', userRole.ownerId)
  .eq('staff_id', user.id);
```
- 正確刪除 `staff_relationships` 記錄
- 使用雙重條件確保安全性

✅ **步驟 2：刪除市集成員記錄**
```typescript
// 查詢老闆的所有市集
const { data: markets } = await supabase
  .from('markets')
  .select('id')
  .eq('owner_id', userRole.ownerId);

// 刪除員工在這些市集的成員記錄
await supabase
  .from('market_members')
  .delete()
  .eq('user_id', user.id)
  .eq('role', 'staff')
  .in('market_id', marketIds);
```
- 正確清除所有相關的 `market_members` 記錄
- 確保員工無法再訪問老闆的市集

### 2. 用戶體驗（良好）

✅ **確認對話框**
- 清楚說明離開後的影響
- 提示操作無法復原

✅ **載入提示**
- 使用 toast 顯示進度
- 成功後自動重新載入頁面

---

## ❌ 問題與風險

### 🚨 問題 1：本地數據清除不完整（嚴重）

**現況**：
```typescript
// 3. 清除本地數據
await indexedDB.deleteDatabase('MarketPulseDB');
```

**問題分析**：
1. ❌ **只刪除 IndexedDB，沒有先手動清除數據表**
   - 如果 IndexedDB 刪除被阻擋（多標籤頁），數據會殘留
   - 沒有使用 `db.markets.clear()` 等方法先清除

2. ❌ **沒有清除 localStorage 和 sessionStorage**
   - 可能殘留角色緩存、同步標記等
   - 重新載入後可能讀取到舊的緩存

3. ❌ **沒有調用 `handlePermissionRevoked()` 函數**
   - 這個函數專門處理權限撤銷時的清除邏輯
   - 應該重用這個函數，而不是重複實作

**風險**：
- 🚨 員工離開後，本地可能還有老闆的數據
- 🚨 切換到新老闆時，可能看到混合數據
- 🚨 多標籤頁情況下，數據清除可能失敗

### ⚠️ 問題 2：沒有重置同步標記（中等）

**現況**：
```typescript
// 沒有調用這些函數
resetInitialSyncFlag();
clearRoleCache();
```

**問題分析**：
- ❌ 沒有重置初始同步標記
- ❌ 沒有清除角色緩存
- ❌ 重新載入後可能讀取到舊的狀態

**風險**：
- ⚠️ 重新載入後，可能不會執行初始同步
- ⚠️ 角色緩存可能還是員工模式

### ⚠️ 問題 3：錯誤處理不完整（中等）

**現況**：
```typescript
catch (error: any) {
  console.error('離開團隊失敗:', error);
  toast.error('離開失敗：' + error.message, { id: 'leave-team' });
}
```

**問題分析**：
- ❌ 如果步驟 1 成功，但步驟 2 或 3 失敗，會導致不一致
- ❌ 沒有回滾機制
- ❌ 用戶可能處於「半離開」狀態

**風險**：
- ⚠️ 雲端已刪除關係，但本地數據還在
- ⚠️ 用戶需要手動清除或重新登入

### ⚠️ 問題 4：沒有觸發實時通知（低）

**現況**：
- 沒有通知老闆「員工已離開」
- 老闆需要手動刷新才能看到變化

**風險**：
- 💡 老闆可能不知道員工已離開
- 💡 影響用戶體驗

---

## 🔧 修復建議

### 方案 1：增強本地清除邏輯（推薦）

**目標**：確保本地數據完全清除

**修改後的程式碼**：
```typescript
const handleLeaveTeam = async () => {
  if (!user || !userRole.ownerId) return;

  const confirmed = confirm(
    '⚠️ 確定要離開團隊嗎？\n\n' +
    '離開後：\n' +
    '• 您將無法再訪問老闆的市集\n' +
    '• 您的本地數據將被清除\n' +
    '• 您可以重新開始使用自己的帳號\n\n' +
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

    // ✅ 步驟 3：清除本地數據（增強版）
    console.log('🧹 開始清除本地數據...');
    
    try {
      // 3.1 先手動清除數據表
      const { db } = await import('@/lib/db');
      await db.markets.clear();
      await db.products.clear();
      await db.events.clear();
      await db.dailyStats.clear();
      console.log('✅ 數據表已清除');
    } catch (dbError) {
      console.error('清除數據表失敗:', dbError);
      // 繼續執行，不中斷流程
    }
    
    // 3.2 刪除 IndexedDB
    try {
      await indexedDB.deleteDatabase('MarketPulseDB');
      console.log('✅ IndexedDB 已刪除');
    } catch (idbError) {
      console.error('刪除 IndexedDB 失敗:', idbError);
      // 繼續執行，不中斷流程
    }
    
    // 3.3 清除 localStorage 和 sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ 緩存已清除');
    } catch (storageError) {
      console.error('清除緩存失敗:', storageError);
      // 繼續執行，不中斷流程
    }
    
    // 3.4 重置同步標記
    try {
      const { resetInitialSyncFlag } = await import('@/hooks/useSync');
      const { clearRoleCache } = await import('@/hooks/useUserRole');
      resetInitialSyncFlag();
      clearRoleCache();
      console.log('✅ 同步標記已重置');
    } catch (resetError) {
      console.error('重置標記失敗:', resetError);
      // 繼續執行，不中斷流程
    }

    toast.success('✅ 已離開團隊，即將重新載入...', { id: 'leave-team' });

    // ✅ 步驟 4：強制重新載入頁面
    setTimeout(() => {
      window.location.href = '/';  // 使用 href 而不是 reload，確保完全刷新
    }, 2000);

  } catch (error: any) {
    console.error('離開團隊失敗:', error);
    toast.error('離開失敗：' + error.message, { id: 'leave-team' });
    
    // ✅ 錯誤處理：即使失敗也建議清除本地數據
    const shouldClearLocal = confirm(
      '離開團隊時發生錯誤，但建議清除本地數據以避免數據混亂。\n\n' +
      '是否清除本地數據並重新載入？'
    );
    
    if (shouldClearLocal) {
      try {
        await indexedDB.deleteDatabase('MarketPulseDB');
        localStorage.clear();
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

### 方案 2：重用 `handlePermissionRevoked()` 函數（更好）

**目標**：避免重複實作，重用現有的清除邏輯

**修改後的程式碼**：
```typescript
const handleLeaveTeam = async () => {
  if (!user || !userRole.ownerId) return;

  const confirmed = confirm(
    '⚠️ 確定要離開團隊嗎？\n\n' +
    '離開後：\n' +
    '• 您將無法再訪問老闆的市集\n' +
    '• 您的本地數據將被清除\n' +
    '• 您可以重新開始使用自己的帳號\n\n' +
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

    // ✅ 步驟 3：調用專門的清除函數（重用現有邏輯）
    // 注意：需要先修復 handlePermissionRevoked() 函數（見 DATA_OWNERSHIP_ANALYSIS.md）
    const { handlePermissionRevoked } = await import('@/hooks/useSync');
    await handlePermissionRevoked();

    toast.success('✅ 已離開團隊，即將重新載入...', { id: 'leave-team' });

    // 注意：handlePermissionRevoked() 會自動重新載入頁面
    // 如果沒有自動重新載入，則手動執行
    setTimeout(() => {
      if (!document.hidden) {
        window.location.href = '/';
      }
    }, 2000);

  } catch (error: any) {
    console.error('離開團隊失敗:', error);
    toast.error('離開失敗：' + error.message, { id: 'leave-team' });
  }
};
```

---

## 🎯 測試計劃

### 測試 1：正常離開流程
1. ✅ 使用者B接受A的邀請
2. ✅ 使用者B創建互動和成交紀錄
3. ✅ 使用者B點擊「離開團隊」
4. ✅ 驗證雲端關係已刪除
5. ✅ 驗證本地數據已清除
6. ✅ 驗證頁面重新載入後，沒有A的數據

### 測試 2：多標籤頁情況
1. ✅ 開啟兩個標籤頁
2. ✅ 在標籤頁 1 點擊「離開團隊」
3. ✅ 驗證 IndexedDB 刪除是否被阻擋
4. ✅ 驗證數據表是否已清除
5. ✅ 關閉標籤頁 2
6. ✅ 驗證數據是否完全清除

### 測試 3：錯誤處理
1. ✅ 模擬網路錯誤（步驟 1 失敗）
2. ✅ 驗證錯誤提示
3. ✅ 驗證本地數據狀態
4. ✅ 模擬部分成功（步驟 1 成功，步驟 2 失敗）
5. ✅ 驗證數據一致性

### 測試 4：切換團隊
1. ✅ 使用者B離開A的團隊
2. ✅ 使用者B接受C的邀請
3. ✅ 驗證只有C的數據，沒有A的殘留
4. ✅ 驗證數據所有權正確

---

## 📊 總結

### ✅ 優點

1. **雲端清除邏輯完全正確**
   - 正確刪除 `staff_relationships`
   - 正確刪除 `market_members`
   - 確保員工無法再訪問老闆的市集

2. **用戶體驗良好**
   - 清楚的確認對話框
   - 載入提示和成功提示
   - 自動重新載入頁面

### ❌ 需要改進

1. **本地清除邏輯不完整**（嚴重）
   - 只刪除 IndexedDB，沒有先清除數據表
   - 沒有清除 localStorage 和 sessionStorage
   - 多標籤頁情況下可能失敗

2. **沒有重置同步標記**（中等）
   - 沒有調用 `resetInitialSyncFlag()`
   - 沒有調用 `clearRoleCache()`

3. **錯誤處理不完整**（中等）
   - 沒有回滾機制
   - 部分成功時可能導致不一致

### 🎯 建議

**立即執行**：
1. 使用**方案 1**增強本地清除邏輯
2. 測試多標籤頁情況
3. 測試切換團隊流程

**後續優化**：
1. 修復 `handlePermissionRevoked()` 函數（見 `DATA_OWNERSHIP_ANALYSIS.md`）
2. 使用**方案 2**重用清除邏輯
3. 增加實時通知功能

---

## 🔗 相關文件

- `DATA_OWNERSHIP_ANALYSIS.md` - 資料歸屬權完整性分析
- `STAFF_TEAM_SWITCH_BUG_FIX.md` - 員工切換團隊 BUG 修復方案
- `hooks/useSync.ts` - 同步引擎和 `handlePermissionRevoked()` 函數
- `app/settings/page.tsx` - 設定頁面和 `handleLeaveTeam()` 函數

---

**報告完成時間**：2026-02-26  
**檢驗結果**：⚠️ 功能已實作，但本地清除邏輯需要增強  
**優先級**：🔴 高（建議立即修復）
