# 多帳號數據隔離系統實作指南

## 📋 概述

本系統實作了完整的多帳號數據隔離機制，支援：
- ✅ 老闆模式：每個老闆有獨立資料庫
- ✅ 員工模式：每個「員工-老闆」組合有獨立資料庫
- ✅ 無縫切換：切換帳號或身份時自動切換資料庫
- ✅ 數據保護：不同身份的數據完全隔離

---

## 🎯 解決的問題

### 問題場景
```
帳號A使用中 → 系統更新強制登出 → 本地數據仍存在
    ↓
用戶登入帳號B → 系統詢問是否上傳本地數據
    ↓
用戶同意 → 帳號A的數據被上傳到帳號B ❌
```

### 解決方案
```
帳號A使用中 → 數據存在 MarketPulseDB_owner_A
    ↓
用戶登入帳號B → 系統自動切換到 MarketPulseDB_owner_B
    ↓
帳號A和帳號B的數據完全隔離 ✅
```

---

## 🏗️ 架構設計

### 資料庫命名策略

```typescript
// 老闆模式
MarketPulseDB_owner_{userId}

// 員工模式
MarketPulseDB_staff_{staffId}_for_{ownerId}

// 範例
MarketPulseDB_owner_abc123                    // 老闆 abc123
MarketPulseDB_staff_xyz789_for_abc123         // 員工 xyz789 為老闆 abc123 工作
MarketPulseDB_staff_xyz789_for_def456         // 同一員工為老闆 def456 工作
```

### 數據隔離示意圖

```
用戶 John (ID: abc123)
├── MarketPulseDB_owner_abc123          ← 老闆模式（自己的市集）
└── MarketPulseDB_staff_abc123_for_xyz  ← 員工模式（為老闆 xyz 工作）

用戶 Mary (ID: def456)
├── MarketPulseDB_owner_def456          ← 老闆模式（自己的市集）
├── MarketPulseDB_staff_def456_for_abc  ← 員工模式（為老闆 abc 工作）
└── MarketPulseDB_staff_def456_for_xyz  ← 員工模式（為老闆 xyz 工作）
```

---

## 📦 核心檔案

### 1. `lib/db/multi-account.ts`
多帳號管理核心邏輯

**主要功能：**
- `getDatabaseName()` - 獲取資料庫名稱
- `getDatabase()` - 獲取或創建資料庫
- `switchToOwnerMode()` - 切換到老闆模式
- `switchToStaffMode()` - 切換到員工模式
- `listAllDatabases()` - 列出所有本地資料庫
- `deleteDatabase()` - 刪除指定資料庫

### 2. `components/account/AccountSwitcher.tsx`
帳號切換器 UI 組件

**主要功能：**
- 顯示所有可用帳號
- 切換帳號
- 刪除不需要的帳號數據
- 顯示當前使用的帳號

---

## 🔧 實作步驟

### 步驟 1：修改 `lib/db/index.ts`

將現有的單一資料庫改為動態資料庫：

```typescript
// 舊版（單一資料庫）
export const db = new Dexie('MarketPulseDB');

// 新版（動態資料庫）
import { getDatabase } from './multi-account';

// 導出獲取資料庫的函數
export async function getDb() {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  
  if (!user) {
    throw new Error('用戶未登入');
  }
  
  return await getDatabase(
    user.id,
    userRole.isStaff,
    userRole.ownerId
  );
}

// 向後兼容：保留 db 導出（但會在首次使用時初始化）
let _db: Dexie | null = null;

export const db = new Proxy({} as Dexie, {
  get(target, prop) {
    if (!_db) {
      throw new Error('資料庫尚未初始化，請先調用 initializeDatabase()');
    }
    return (_db as any)[prop];
  }
});

// 初始化函數
export async function initializeDatabase() {
  if (_db) return _db;
  
  const { user } = useAuth();
  const { userRole } = useUserRole();
  
  if (!user) {
    throw new Error('用戶未登入');
  }
  
  _db = await getDatabase(
    user.id,
    userRole.isStaff,
    userRole.ownerId
  );
  
  return _db;
}
```

### 步驟 2：修改 `lib/supabase/auth-context.tsx`

在登入時自動切換資料庫：

```typescript
import { switchToOwnerMode, switchToStaffMode } from '@/lib/db/multi-account';

// 在 onAuthStateChange 中添加
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    // 檢查用戶身份
    const { data: staffRelation } = await supabase
      .from('staff_relationships')
      .select('owner_id')
      .eq('staff_id', session.user.id)
      .eq('status', 'active')
      .single();
    
    if (staffRelation) {
      // 員工模式
      await switchToStaffMode(session.user.id, staffRelation.owner_id);
    } else {
      // 老闆模式
      await switchToOwnerMode(session.user.id);
    }
  }
});
```

### 步驟 3：修改 `components/staff/StaffInvitationDialog.tsx`

員工接受邀請時的處理：

```typescript
import { handleStaffInvitationAccepted } from '@/lib/db/multi-account';

const handleAccept = async () => {
  // ... 原有的確認邏輯 ...
  
  try {
    // 1. 處理資料庫切換
    await handleStaffInvitationAccepted(user.id, invitation.owner_id);
    
    // 2. 更新 Supabase 狀態
    await supabase
      .from('staff_relationships')
      .update({ status: 'active' })
      .eq('id', invitation.id);
    
    // 3. 從雲端同步老闆的數據
    // ... 同步邏輯 ...
    
    // 4. 重新載入頁面
    window.location.reload();
  } catch (error) {
    console.error('接受邀請失敗:', error);
  }
};
```

### 步驟 4：修改設定頁面

在設定頁面添加帳號切換器：

```typescript
// app/settings/page.tsx
import { AccountSwitcher } from '@/components/account/AccountSwitcher';

export default function SettingsPage() {
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  
  return (
    <div>
      {/* 其他設定 */}
      
      {/* 帳號切換器按鈕 */}
      <button
        onClick={() => setShowAccountSwitcher(true)}
        className="w-full px-4 py-3 rounded-2xl bg-[#7B9FA6] text-white"
      >
        切換帳號
      </button>
      
      {/* 帳號切換器對話框 */}
      <AccountSwitcher
        isOpen={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
      />
    </div>
  );
}
```

### 步驟 5：修改離開團隊功能

```typescript
// app/settings/page.tsx
import { handleStaffLeftTeam } from '@/lib/db/multi-account';

const handleLeaveTeam = async () => {
  // ... 確認邏輯 ...
  
  try {
    // 1. 處理資料庫切換
    await handleStaffLeftTeam(user.id, userRole.ownerId);
    
    // 2. 刪除 Supabase 關係
    await supabase
      .from('staff_relationships')
      .delete()
      .eq('staff_id', user.id)
      .eq('owner_id', userRole.ownerId);
    
    // 3. 重新載入頁面
    window.location.reload();
  } catch (error) {
    console.error('離開團隊失敗:', error);
  }
};
```

---

## 🎨 UI 設計

### 帳號切換器界面

```
┌─────────────────────────────────┐
│ 👥 切換帳號                      │
│ 選擇要使用的帳號模式              │
├─────────────────────────────────┤
│ 💡 說明                          │
│ • 老闆模式：管理自己的市集        │
│ • 員工模式：協助老闆記錄          │
├─────────────────────────────────┤
│ 👑 老闆模式                      │
│ 15 筆數據              [使用中]  │
├─────────────────────────────────┤
│ 🛡️ 員工模式 (為老闆 abc... 工作) │
│ 8 筆數據                    [🗑️] │
├─────────────────────────────────┤
│ 🛡️ 員工模式 (為老闆 def... 工作) │
│ 3 筆數據                    [🗑️] │
└─────────────────────────────────┘
```

---

## 🔄 完整流程示例

### 場景 1：用戶首次登入

```typescript
// 1. 用戶登入
const { data } = await supabase.auth.signInWithPassword({
  email: 'john@example.com',
  password: 'password',
});

// 2. 系統自動切換到老闆模式
await switchToOwnerMode(data.user.id);
// → 創建 MarketPulseDB_owner_abc123

// 3. 用戶開始使用
// 所有數據存儲在 MarketPulseDB_owner_abc123
```

### 場景 2：員工接受邀請

```typescript
// 1. 員工登入（已有自己的老闆資料庫）
// 當前使用：MarketPulseDB_owner_xyz789

// 2. 接受老闆 abc123 的邀請
await handleStaffInvitationAccepted('xyz789', 'abc123');
// → 保留 MarketPulseDB_owner_xyz789
// → 創建 MarketPulseDB_staff_xyz789_for_abc123
// → 切換到員工資料庫

// 3. 從雲端同步老闆的數據
// 數據下載到 MarketPulseDB_staff_xyz789_for_abc123

// 4. 員工開始工作
// 所有操作在員工資料庫中進行
```

### 場景 3：員工離開團隊

```typescript
// 1. 員工離開團隊
await handleStaffLeftTeam('xyz789', 'abc123');
// → 刪除 MarketPulseDB_staff_xyz789_for_abc123
// → 切換回 MarketPulseDB_owner_xyz789

// 2. 員工恢復老闆身份
// 原本的數據仍然存在
```

### 場景 4：用戶切換帳號

```typescript
// 1. 用戶登出帳號A
await supabase.auth.signOut();

// 2. 用戶登入帳號B
const { data } = await supabase.auth.signInWithPassword({
  email: 'mary@example.com',
  password: 'password',
});

// 3. 系統自動切換到帳號B的資料庫
await switchToOwnerMode(data.user.id);
// → 切換到 MarketPulseDB_owner_def456

// 4. 帳號A和帳號B的數據完全隔離 ✅
```

---

## ⚠️ 注意事項

### 1. 同步機制需要調整

現有的同步機制需要知道當前使用的資料庫：

```typescript
// hooks/useSync.ts
const sync = async () => {
  const currentDb = getCurrentDatabaseInfo();
  
  if (!currentDb) {
    throw new Error('無法獲取當前資料庫資訊');
  }
  
  // 根據資料庫類型決定同步策略
  if (currentDb.type === 'owner') {
    // 老闆模式：上傳自己的數據
    await uploadOwnerData(currentDb.userId);
  } else if (currentDb.type === 'staff') {
    // 員工模式：只下載老闆的數據，不上傳
    await downloadOwnerData(currentDb.ownerId);
  }
};
```

### 2. 員工模式的限制

員工資料庫是**只讀**的（從老闆的角度）：
- ✅ 員工可以記錄互動和成交
- ✅ 這些記錄會上傳到老闆的雲端
- ❌ 員工不能修改老闆的市集和商品
- ❌ 員工離開後，這些記錄仍屬於老闆

### 3. 資料庫大小管理

每個資料庫都會佔用空間，建議：
- 定期清理不需要的員工資料庫
- 提供「清理舊數據」功能
- 在帳號切換器中顯示資料庫大小

### 4. 離線支援

多資料庫不影響離線功能：
- 每個資料庫都是獨立的 IndexedDB
- 離線時仍可正常使用當前資料庫
- 網路恢復後自動同步

---

## 🧪 測試場景

### 測試 1：基本切換
1. 登入帳號A → 新增市集 → 登出
2. 登入帳號B → 確認看不到帳號A的市集 ✅
3. 登出帳號B → 登入帳號A → 確認市集仍在 ✅

### 測試 2：員工模式
1. 帳號A邀請帳號B為員工
2. 帳號B接受邀請 → 確認切換到員工資料庫 ✅
3. 帳號B記錄互動 → 確認數據上傳到帳號A ✅
4. 帳號B離開團隊 → 確認切換回老闆資料庫 ✅

### 測試 3：多員工
1. 帳號A為老闆B工作
2. 帳號A同時為老闆C工作
3. 確認有兩個員工資料庫 ✅
4. 切換帳號時確認數據隔離 ✅

### 測試 4：數據遷移
1. 舊版用戶（單一資料庫）登入
2. 系統自動遷移到新版（多資料庫）✅
3. 確認數據完整性 ✅

---

## 📊 效能考量

### 資料庫切換速度
- 切換資料庫需要關閉舊資料庫、打開新資料庫
- 預計耗時：< 100ms
- 用戶體驗：幾乎無感

### 儲存空間
- 每個資料庫獨立佔用空間
- 建議定期清理不需要的資料庫
- IndexedDB 限制：通常 > 50MB（足夠使用）

### 同步效能
- 多資料庫不影響同步速度
- 每次只同步當前資料庫
- 員工模式只下載，不上傳（更快）

---

## 🚀 部署檢查清單

- [ ] 實作 `lib/db/multi-account.ts`
- [ ] 實作 `components/account/AccountSwitcher.tsx`
- [ ] 修改 `lib/db/index.ts`（動態資料庫）
- [ ] 修改 `lib/supabase/auth-context.tsx`（自動切換）
- [ ] 修改 `components/staff/StaffInvitationDialog.tsx`（接受邀請）
- [ ] 修改 `app/settings/page.tsx`（離開團隊）
- [ ] 修改 `hooks/useSync.ts`（同步機制）
- [ ] 添加資料庫遷移邏輯（舊版 → 新版）
- [ ] 測試所有場景
- [ ] 更新文檔

---

## 📝 總結

### 優點
- ✅ 完全隔離：不同帳號的數據絕對不會混淆
- ✅ 支援多身份：同一用戶可以是老闆也可以是員工
- ✅ 數據保留：切換身份時原數據不會丟失
- ✅ 用戶友善：提供直觀的帳號切換器

### 缺點
- ⚠️ 實作複雜：需要修改多個核心檔案
- ⚠️ 測試成本：需要測試更多場景
- ⚠️ 儲存空間：多個資料庫會佔用更多空間

### 建議
- 先實作核心功能（資料庫隔離）
- 再實作 UI（帳號切換器）
- 最後優化（清理、遷移）

---

**實作完成後，您的應用將擁有企業級的多帳號支援！** 🎉
