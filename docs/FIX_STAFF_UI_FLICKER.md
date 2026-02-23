# 🚀 員工模式 UI 閃爍問題修復

## 問題描述

用戶報告：在員工模式下切換導航欄項目時，會先顯示一般的 UI（老闆模式），過 0.3~1.5 秒後才會變成員工模式的 UI 設計，造成明顯的閃爍。

**症狀：**
- 切換頁面時先顯示青綠色主題（老闆模式）
- 0.3~1.5 秒後突然變成紫色主題（員工模式）
- 統計數據先顯示完整，然後變成遮罩
- 用戶體驗不佳，感覺不流暢

---

## 根本原因

這是一個典型的 **FOUC（Flash of Unstyled Content）** 問題。

### 問題流程

1. **頁面渲染**：
   - React 組件立即渲染
   - `useUserRole()` hook 初始化，預設 `isStaff: false`
   - UI 使用老闆模式渲染（青綠色）

2. **異步查詢**：
   - `useUserRole()` 查詢 Supabase 的 `staff_relationships` 表
   - 網路延遲：0.3~1.5 秒

3. **狀態更新**：
   - 查詢完成，確認用戶是員工
   - `setUserRole({ isStaff: true })`
   - React 重新渲染，UI 變成員工模式（紫色）

4. **視覺閃爍**：
   - 用戶看到：青綠色 → 紫色
   - 數據看到：完整 → 遮罩

---

## 解決方案：localStorage 緩存

### 核心思路

在 `useUserRole` hook 中添加 localStorage 緩存：
- ✅ **首次查詢**：從 Supabase 查詢角色，保存到緩存
- ✅ **後續訪問**：直接從緩存讀取，立即渲染正確的 UI
- ✅ **緩存過期**：24 小時後自動失效，重新查詢
- ✅ **登出清除**：用戶登出時清除緩存

### 實作細節

#### 1. 緩存讀取函數

```typescript
const ROLE_CACHE_KEY = 'user_role_cache';

function getCachedRole(userId: string): UserRole | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(ROLE_CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    
    // 檢查是否為同一用戶
    if (data.userId !== userId) return null;
    
    // 檢查緩存是否過期（24 小時）
    const now = Date.now();
    if (now - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(ROLE_CACHE_KEY);
      return null;
    }
    
    return data.role;
  } catch {
    return null;
  }
}
```

#### 2. 緩存保存函數

```typescript
function setCachedRole(userId: string, role: UserRole): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({
      userId,
      role,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('保存角色緩存失敗:', error);
  }
}
```

#### 3. 初始化時使用緩存

```typescript
const [userRole, setUserRole] = useState<UserRole>(() => {
  if (user) {
    const cached = getCachedRole(user.id);
    if (cached) {
      console.log('✅ 使用緩存的角色:', cached.isStaff ? '員工' : '老闆');
      return cached;
    }
  }
  return { isStaff: false };
});
```

#### 4. 查詢完成後更新緩存

```typescript
const role: UserRole = {
  isStaff: true,
  ownerId: data[0].owner_id,
  ownerEmail: ownerProfile?.email || '未知',
  permissions: data[0].permissions,
};

setUserRole(role);
setCachedRole(user.id, role); // ✅ 保存到緩存
```

#### 5. 登出時清除緩存

```typescript
// auth-context.tsx
const handleSignOut = async () => {
  await supabase.auth.signOut();
  
  // ✅ 清除角色緩存
  const { clearRoleCache } = await import('@/hooks/useUserRole');
  clearRoleCache();
};
```

---

## 效果對比

### 修復前

```
時間軸：
0ms    → 渲染開始（老闆模式 UI）
300ms  → Supabase 查詢中...
800ms  → 查詢完成，確認是員工
801ms  → 重新渲染（員工模式 UI）✨ 閃爍！

用戶看到：
青綠色 Header → 等待 → 突然變紫色 ❌
```

### 修復後

```
時間軸：
0ms    → 從緩存讀取角色（員工）
1ms    → 渲染開始（員工模式 UI）✅ 直接正確！
300ms  → 後台查詢 Supabase（驗證緩存）
800ms  → 查詢完成，更新緩存

用戶看到：
紫色 Header → 一直是紫色 ✅ 無閃爍！
```

---

## 優勢

### 1. 性能提升
- ✅ 首次渲染即正確，無需等待網路請求
- ✅ 減少不必要的重新渲染
- ✅ 降低 Supabase 查詢頻率

### 2. 用戶體驗
- ✅ 消除 UI 閃爍
- ✅ 頁面切換更流暢
- ✅ 視覺一致性更好

### 3. 可靠性
- ✅ 緩存過期機制（24 小時）
- ✅ 用戶切換時自動清除
- ✅ 後台仍會驗證角色（雙重保險）

---

## 緩存策略

### 緩存結構

```typescript
{
  userId: "uuid-xxx",
  role: {
    isStaff: true,
    ownerId: "uuid-yyy",
    ownerEmail: "boss@example.com",
    permissions: {
      can_view: true,
      can_edit: true
    }
  },
  timestamp: 1708876543210
}
```

### 緩存生命週期

1. **創建**：首次查詢 Supabase 後保存
2. **使用**：每次頁面載入時讀取
3. **驗證**：後台仍會查詢 Supabase 驗證
4. **更新**：如果角色變更，更新緩存
5. **過期**：24 小時後自動失效
6. **清除**：用戶登出時清除

### 安全性考慮

- ✅ **用戶隔離**：緩存包含 userId，不同用戶不會混淆
- ✅ **定期驗證**：後台仍會查詢 Supabase，確保角色正確
- ✅ **自動過期**：24 小時後強制重新查詢
- ✅ **登出清除**：用戶登出時立即清除緩存

---

## 測試場景

### 場景 1：首次登入（無緩存）
```
1. 用戶登入
2. 查詢 Supabase（0.5 秒）
3. 確認是員工
4. 保存到緩存
5. 渲染員工模式 UI

結果：首次有輕微延遲（正常）
```

### 場景 2：再次訪問（有緩存）
```
1. 用戶打開頁面
2. 從緩存讀取角色（1ms）
3. 立即渲染員工模式 UI ✅
4. 後台查詢 Supabase 驗證
5. 如果角色變更，更新 UI

結果：無閃爍，體驗流暢 ✅
```

### 場景 3：角色變更
```
1. 老闆將員工權限撤銷
2. 員工刷新頁面
3. 從緩存讀取（仍是員工）
4. 後台查詢 Supabase
5. 發現角色變更為老闆
6. 更新緩存和 UI

結果：短暫顯示員工 UI，然後切換為老闆 UI
```

### 場景 4：用戶登出
```
1. 用戶點擊登出
2. 清除角色緩存
3. 清除 Supabase session
4. 跳轉到登入頁

結果：下次登入時重新查詢角色
```

---

## 相關文件

- `hooks/useUserRole.ts` - 角色檢查 Hook（已添加緩存）
- `lib/supabase/auth-context.tsx` - 認證上下文（登出時清除緩存）
- `lib/theme-config.ts` - 主題配置
- `app/page.tsx` - 首頁（使用角色主題）
- `app/settings/page.tsx` - 設置頁面（使用角色主題）

---

## 未來優化

### 1. React Context 優化
將角色狀態提升到全局 Context，避免每個頁面重複查詢。

### 2. Service Worker 緩存
使用 Service Worker 緩存角色數據，支援離線訪問。

### 3. 實時更新
使用 Supabase Realtime 監聽角色變更，即時更新 UI。

### 4. 預加載
在登入時預加載角色數據，進一步減少延遲。

---

## 總結

通過添加 localStorage 緩存，我們成功解決了員工模式 UI 閃爍問題：

- ✅ **消除閃爍**：首次渲染即正確
- ✅ **提升性能**：減少網路請求
- ✅ **改善體驗**：頁面切換更流暢
- ✅ **保持安全**：後台仍會驗證角色

用戶現在可以享受無縫的員工模式體驗！🎉
