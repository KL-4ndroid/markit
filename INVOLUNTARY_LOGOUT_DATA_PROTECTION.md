# 非自願登出數據保護方案

## 🔍 問題描述

### 場景分析

#### 正常情況（主動登出）✅
```
用戶點擊「登出」按鈕
    ↓
系統清除本地資料庫
    ↓
用戶登入其他帳號
    ↓
本地是空的，不會有數據混淆 ✅
```

#### 問題情況（非自願登出）❌
```
Session 過期 / 系統更新 / 網路問題
    ↓
系統強制登出
    ↓
本地數據仍然存在 ⚠️
    ↓
用戶登入其他帳號
    ↓
系統詢問：是否上傳本地數據？
    ↓
用戶同意 → 帳號A的數據被上傳到帳號B ❌
```

---

## ✅ 解決方案：統一登出行為

### 核心思想

**無論是主動還是被動登出，都清除本地數據**

### 實作方式

#### 1. 創建統一的清除函數

```typescript
/**
 * ✅ 統一的清除數據函數
 * 無論是主動登出還是被動登出，都調用此函數
 */
const clearUserData = async (reason: string) => {
  console.log(`🔒 清除用戶數據 (原因: ${reason})`, {
    userId: user?.id,
    timestamp: new Date().toISOString(),
  });
  
  try {
    // 1. 清除本地資料庫
    const { clearAllData } = await import('@/lib/db');
    await clearAllData();
    console.log('✅ 本地資料庫已清除');
  } catch (dbError) {
    console.error('清除本地資料庫失敗:', dbError);
  }
  
  try {
    // 2. 重置初始同步標記
    resetInitialSyncFlag();
    
    // 3. 清除角色緩存
    const { clearRoleCache } = await import('@/hooks/useUserRole');
    clearRoleCache();
    
    // 4. 清除 localStorage
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
    
    // 5. 清除 sessionStorage
    sessionStorage.clear();
    
    console.log('✅ 所有緩存已清除');
  } catch (error) {
    console.error('清除緩存失敗:', error);
  }
};
```

#### 2. 主動登出時調用

```typescript
const handleSignOut = async () => {
  console.log('🚪 用戶主動登出');
  
  // ✅ 清除用戶數據
  await clearUserData('manual_signout');
  
  // 執行登出
  await supabase.auth.signOut();
};
```

#### 3. 被動登出時調用

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    console.warn('⚠️ 用戶已登出（被動）');
    
    // ✅ 被動登出時也清除數據
    clearUserData('passive_signout').catch(error => {
      console.error('被動登出清除數據失敗:', error);
    });
  }
});
```

#### 4. Session 過期時調用

```typescript
setInterval(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (isSessionExpired(session)) {
      console.warn('⚠️ Session 已過期');
      
      // ✅ Session 過期時清除數據
      clearUserData('session_expired').catch(error => {
        console.error('Session 過期清除數據失敗:', error);
      });
      
      setSession(null);
      setUser(null);
    }
  });
}, 60 * 1000);
```

---

## 📊 清除時機對比

| 登出類型 | 觸發原因 | 清除數據 | 實作位置 |
|---------|---------|---------|---------|
| 主動登出 | 用戶點擊「登出」 | ✅ 是 | `handleSignOut()` |
| 被動登出 | Supabase `SIGNED_OUT` 事件 | ✅ 是 | `onAuthStateChange()` |
| Session 過期 | 定期檢查發現過期 | ✅ 是 | `setInterval()` |
| 網路斷線 | 無法連接 Supabase | ✅ 是 | `onAuthStateChange()` |
| 系統更新 | 強制刷新 | ✅ 是 | `onAuthStateChange()` |

---

## 🎯 完整流程

### 場景 1：用戶主動登出

```
用戶點擊「登出」
    ↓
調用 handleSignOut()
    ↓
執行 clearUserData('manual_signout')
    ↓
清除本地資料庫 ✅
    ↓
清除所有緩存 ✅
    ↓
執行 supabase.auth.signOut()
    ↓
用戶被登出，本地數據已清空 ✅
```

### 場景 2：Session 過期（非自願）

```
定期檢查 Session
    ↓
發現 Session 已過期
    ↓
執行 clearUserData('session_expired')
    ↓
清除本地資料庫 ✅
    ↓
清除所有緩存 ✅
    ↓
設置 user = null, session = null
    ↓
用戶被登出，本地數據已清空 ✅
```

### 場景 3：系統強制登出（非自願）

```
Supabase 觸發 SIGNED_OUT 事件
    ↓
onAuthStateChange 捕獲事件
    ↓
執行 clearUserData('passive_signout')
    ↓
清除本地資料庫 ✅
    ↓
清除所有緩存 ✅
    ↓
用戶被登出，本地數據已清空 ✅
```

### 場景 4：用戶切換帳號

```
帳號A被強制登出（Session 過期）
    ↓
系統自動清除帳號A的本地數據 ✅
    ↓
用戶登入帳號B
    ↓
本地是空的，開始同步帳號B的數據 ✅
    ↓
不會有數據混淆 ✅
```

---

## 🔒 安全保障

### 1. 多重保護機制

```typescript
// 保護層 1：主動登出
handleSignOut() → clearUserData('manual_signout')

// 保護層 2：被動登出
onAuthStateChange('SIGNED_OUT') → clearUserData('passive_signout')

// 保護層 3：Session 過期
setInterval() → clearUserData('session_expired')
```

### 2. 錯誤處理

```typescript
clearUserData('reason').catch(error => {
  console.error('清除數據失敗:', error);
  // 不中斷流程，繼續執行登出
});
```

### 3. 日誌記錄

```typescript
// 記錄每次清除操作
console.log(`🔒 清除用戶數據 (原因: ${reason})`, {
  userId: user?.id,
  timestamp: new Date().toISOString(),
});

// 記錄登出歷史
localStorage.setItem('logout_history', JSON.stringify(logoutHistory));
```

---

## 📝 修改的檔案

### `lib/supabase/auth-context.tsx`

**新增：**
- `clearUserData()` 函數 - 統一的清除邏輯

**修改：**
- `handleSignOut()` - 調用 `clearUserData('manual_signout')`
- `onAuthStateChange()` - SIGNED_OUT 時調用 `clearUserData('passive_signout')`
- `setInterval()` - Session 過期時調用 `clearUserData('session_expired')`

---

## ✅ 優點

1. **完全防止數據混淆**
   - 任何登出都會清除本地數據
   - 不會有帳號A的數據被上傳到帳號B

2. **統一的清除邏輯**
   - 所有登出場景使用同一個函數
   - 易於維護和擴展

3. **多重保護**
   - 主動登出、被動登出、Session 過期都有保護
   - 即使某個機制失效，其他機制仍能保護

4. **用戶體驗好**
   - 用戶不需要做任何選擇
   - 系統自動處理，避免錯誤操作

---

## ⚠️ 注意事項

### 1. 未同步的數據會丟失

如果用戶在離線狀態下新增了數據，但還沒同步到雲端，這些數據會在登出時被清除。

**解決方案：**
- 在清除前檢查是否有未同步的數據
- 如果有，提示用戶先同步

```typescript
const clearUserData = async (reason: string) => {
  // 檢查未同步的數據
  const pendingEvents = await db.events
    .where('synced')
    .equals(false)
    .count();
  
  if (pendingEvents > 0) {
    console.warn(`⚠️ 有 ${pendingEvents} 筆未同步的數據`);
    
    // 如果是主動登出，可以提示用戶
    if (reason === 'manual_signout') {
      const confirmed = confirm(
        `您有 ${pendingEvents} 筆未同步的數據，確定要登出嗎？\n\n` +
        `登出後這些數據將會丟失。`
      );
      
      if (!confirmed) {
        throw new Error('用戶取消登出');
      }
    }
  }
  
  // 繼續清除...
};
```

### 2. 員工模式的特殊處理

員工接受邀請時會清除本地數據，這是預期行為。但如果員工想保留自己的老闆數據，需要使用方案三（多帳號隔離）。

---

## 🚀 部署步驟

1. ✅ 修改 `lib/supabase/auth-context.tsx`
   - 添加 `clearUserData()` 函數
   - 在所有登出場景調用此函數

2. ✅ 測試所有登出場景
   - 主動登出
   - Session 過期
   - 網路斷線
   - 系統更新

3. ✅ 監控日誌
   - 確認每次登出都有清除數據
   - 檢查是否有錯誤

4. ✅ 用戶通知
   - 更新文檔，說明登出會清除本地數據
   - 提醒用戶定期同步

---

## 📊 與方案三的對比

| 特性 | 方案 A（統一清除） | 方案三（多帳號隔離） |
|------|-------------------|---------------------|
| 實作難度 | ⭐⭐ 簡單 | ⭐⭐⭐⭐⭐ 複雜 |
| 數據安全 | ⭐⭐⭐⭐⭐ 完全安全 | ⭐⭐⭐⭐⭐ 完全安全 |
| 用戶體驗 | ⭐⭐⭐ 需要重新同步 | ⭐⭐⭐⭐⭐ 無縫切換 |
| 儲存空間 | ⭐⭐⭐⭐⭐ 最小 | ⭐⭐⭐ 較大 |
| 維護成本 | ⭐⭐⭐⭐⭐ 最低 | ⭐⭐⭐ 較高 |
| 推薦度 | ⭐⭐⭐⭐ 短期方案 | ⭐⭐⭐⭐⭐ 長期方案 |

---

## 🎯 建議

### 短期（立即實作）
**方案 A：統一清除行為**
- 實作簡單，立即解決問題
- 完全防止數據混淆
- 用戶體驗可接受

### 長期（未來擴展）
**方案三：多帳號數據隔離**
- 提供最佳用戶體驗
- 支援多帳號無縫切換
- 數據完全隔離

---

## ✅ 總結

通過統一登出行為，我們完全解決了非自願登出導致的數據混淆問題：

1. ✅ 任何登出都會清除本地數據
2. ✅ 不會有帳號A的數據被上傳到帳號B
3. ✅ 實作簡單，易於維護
4. ✅ 多重保護機制，安全可靠

**這是一個簡單、有效、安全的解決方案！** 🎉
