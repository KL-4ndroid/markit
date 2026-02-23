# 員工模式實作風險評估報告

## 🚨 風險等級定義

- 🔴 **高風險**：可能導致數據丟失、系統崩潰、安全漏洞
- 🟡 **中風險**：可能影響用戶體驗、性能下降
- 🟢 **低風險**：輕微影響，容易修復

---

## 🔴 高風險項目

### 1. 數據庫遷移風險

**風險描述**：
- Supabase Schema 變更可能導致現有數據不兼容
- Dexie 版本升級可能觸發數據遷移失敗
- 用戶在遷移過程中可能丟失數據

**影響範圍**：
- 所有現有用戶
- 所有市集、商品、交易數據

**預防措施**：

1. **備份策略**
```typescript
// 在遷移前自動備份
export async function backupBeforeMigration() {
  const backup = {
    version: 5,
    timestamp: Date.now(),
    data: {
      markets: await db.markets.toArray(),
      products: await db.products.toArray(),
      events: await db.events.toArray(),
      dailyStats: await db.dailyStats.toArray(),
    }
  };
  
  // 存儲到 localStorage
  localStorage.setItem('backup_v5', JSON.stringify(backup));
  console.log('✅ 備份完成');
}
```

2. **分階段遷移**
```typescript
// Step 1: 添加新欄位（不刪除舊欄位）
ALTER TABLE market_members ADD COLUMN role TEXT;

// Step 2: 遷移數據
UPDATE market_members SET role = 'owner' WHERE role IS NULL;

// Step 3: 添加約束
ALTER TABLE market_members 
ALTER COLUMN role SET NOT NULL,
ADD CHECK (role IN ('owner', 'staff'));
```

3. **回滾機制**
```typescript
// 如果遷移失敗，自動回滾
this.version(5).stores({...}).upgrade(async (trans) => {
  try {
    // 遷移邏輯
    await migrateToVersion5(trans);
  } catch (error) {
    console.error('❌ 遷移失敗，執行回滾');
    await rollbackToVersion4(trans);
    throw error;
  }
});
```

4. **測試環境驗證**
- ✅ 在測試環境完整測試遷移流程
- ✅ 使用真實數據副本測試
- ✅ 驗證遷移前後數據一致性

**應急方案**：
```typescript
// 提供手動回滾功能
export async function rollbackToVersion4() {
  const backup = localStorage.getItem('backup_v5');
  if (!backup) {
    throw new Error('找不到備份數據');
  }
  
  const data = JSON.parse(backup);
  
  // 清空數據庫
  await db.delete();
  
  // 重新創建 version 4
  await db.open();
  
  // 恢復數據
  await db.markets.bulkAdd(data.data.markets);
  await db.products.bulkAdd(data.data.products);
  // ...
  
  console.log('✅ 回滾完成');
}
```

---

### 2. 權限繞過風險

**風險描述**：
- 員工可能通過修改 URL 訪問受限頁面
- 前端權限檢查可能被繞過
- API 端點缺少權限驗證

**影響範圍**：
- 數據安全
- 商業機密（成本、利潤）

**預防措施**：

1. **多層權限檢查**
```typescript
// Layer 1: 路由層（app/markets/[id]/page.tsx）
export default function MarketDetailPage({ params }) {
  const { role } = useRole();
  
  if (role === 'staff') {
    const canAccess = checkStaffAccess(params.id);
    if (!canAccess) {
      return <AccessDenied />;
    }
  }
  
  return <MarketDetail />;
}

// Layer 2: 組件層（components/markets/MarketFinancialCard.tsx）
export function MarketFinancialCard({ market }) {
  const { role } = useRole();
  const visibility = DATA_VISIBILITY[role];
  
  if (!visibility.profit) {
    return null; // 不渲染利潤數據
  }
  
  return <ProfitDisplay />;
}

// Layer 3: API 層（Supabase RLS）
CREATE POLICY "Staff cannot view profit data"
ON markets FOR SELECT
USING (
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM market_members 
      WHERE user_id = auth.uid() AND role = 'staff'
    )
    THEN (owner_id = auth.uid()) -- 員工只能看自己是 owner 的市集
    ELSE true -- 老闆可以看所有
  END
);
```

2. **敏感數據過濾**
```typescript
// hooks/useMarket.ts
export function useMarket(marketId: string) {
  const { role } = useRole();
  const market = await db.markets.get(marketId);
  
  if (role === 'staff') {
    // 過濾敏感數據
    return {
      ...market,
      totalProfit: undefined,
      commissionRate: undefined,
      // 保留員工可見的數據
      totalRevenue: market.totalRevenue,
      boothCost: market.boothCost,
    };
  }
  
  return market;
}
```

3. **審計日誌**
```typescript
// 記錄所有權限檢查失敗的嘗試
export function logAccessDenied(userId: string, resource: string) {
  console.warn(`⚠️ 權限拒絕: ${userId} 嘗試訪問 ${resource}`);
  
  // 記錄到 Supabase
  supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'access_denied',
    resource: resource,
    timestamp: new Date().toISOString(),
  });
}
```

**應急方案**：
- 發現權限漏洞後立即部署修復
- 通知所有用戶更新應用
- 審查審計日誌，確認是否有數據洩露

---

### 3. 數據同步衝突

**風險描述**：
- 老闆和員工同時操作同一市集
- 離線操作後上線可能產生衝突
- 權限變更時的數據一致性

**影響範圍**：
- 交易記錄準確性
- 庫存數據一致性

**預防措施**：

1. **樂觀鎖機制**
```typescript
// 在事件中添加版本號
interface Event {
  id: string;
  type: EventType;
  payload: any;
  version: number; // ✅ 版本號
  timestamp: number;
}

// 衝突檢測
async function syncEvent(event: Event) {
  const existing = await supabase
    .from('events')
    .select('version')
    .eq('id', event.id)
    .single();
  
  if (existing && existing.version > event.version) {
    // 衝突：雲端版本更新
    console.warn('⚠️ 衝突檢測：雲端版本較新');
    return { conflict: true };
  }
  
  // 上傳事件
  await supabase.from('events').upsert({
    ...event,
    version: event.version + 1,
  });
}
```

2. **最後寫入者勝出（Last Write Wins）**
```typescript
// 使用時間戳決定優先級
async function resolveConflict(localEvent: Event, remoteEvent: Event) {
  if (localEvent.timestamp > remoteEvent.timestamp) {
    return localEvent; // 本地較新
  } else {
    return remoteEvent; // 雲端較新
  }
}
```

3. **衝突通知**
```typescript
// 檢測到衝突時通知用戶
if (conflict) {
  toast.warning('檢測到數據衝突，已自動合併最新數據');
  
  // 重新載入數據
  await pullEventsWithSnapshot(userId);
}
```

**應急方案**：
- 提供手動解決衝突的 UI
- 允許用戶選擇保留哪個版本
- 記錄所有衝突事件供後續分析

---

## 🟡 中風險項目

### 4. 性能影響

**風險描述**：
- 權限檢查增加查詢次數
- Realtime 訂閱增加網路負載
- 數據過濾影響渲染性能

**預防措施**：

1. **權限緩存**
```typescript
// 緩存用戶角色，避免重複查詢
const roleCache = new Map<string, { role: string; expiry: number }>();

export async function getUserRole(userId: string) {
  const cached = roleCache.get(userId);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.role;
  }
  
  const role = await fetchRoleFromDB(userId);
  
  roleCache.set(userId, {
    role,
    expiry: Date.now() + 5 * 60 * 1000, // 5 分鐘
  });
  
  return role;
}
```

2. **批次查詢**
```typescript
// 一次查詢獲取所有權限
const { data: permissions } = await supabase
  .from('market_members')
  .select('market_id, role')
  .eq('user_id', userId);

// 構建權限映射
const permissionMap = new Map(
  permissions.map(p => [p.market_id, p.role])
);
```

3. **虛擬滾動**
```typescript
// 員工查看大量市集時使用虛擬滾動
import { useVirtualizer } from '@tanstack/react-virtual';

export function MarketList({ markets }) {
  const virtualizer = useVirtualizer({
    count: markets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });
  
  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map(item => (
        <MarketCard key={item.key} market={markets[item.index]} />
      ))}
    </div>
  );
}
```

---

### 5. 用戶體驗問題

**風險描述**：
- 角色切換不直觀
- 權限拒絕提示不友好
- 員工不知道自己的權限範圍

**預防措施**：

1. **清晰的角色指示**
```typescript
// 在導航欄顯示當前角色
<Header>
  <RoleBadge role={role}>
    {role === 'staff' ? '👷 員工模式' : '👔 老闆模式'}
  </RoleBadge>
</Header>
```

2. **友好的權限提示**
```typescript
// 當員工嘗試訪問受限功能時
<AccessDenied>
  <Icon>🔒</Icon>
  <Title>此功能僅限老闆使用</Title>
  <Description>
    您目前是員工身份，無法查看利潤數據。
    如需訪問，請聯絡市集老闆。
  </Description>
</AccessDenied>
```

3. **權限說明頁面**
```typescript
// app/staff/permissions/page.tsx
export default function PermissionsPage() {
  return (
    <div>
      <h1>員工權限說明</h1>
      
      <Section title="您可以做什麼">
        <PermissionItem icon="✅" text="新增交易記錄" />
        <PermissionItem icon="✅" text="查看今日收入" />
        <PermissionItem icon="✅" text="記錄互動" />
      </Section>
      
      <Section title="您無法做什麼">
        <PermissionItem icon="❌" text="查看利潤數據" />
        <PermissionItem icon="❌" text="管理商品" />
        <PermissionItem icon="❌" text="修改設置" />
      </Section>
    </div>
  );
}
```

---

## 🟡 P1 級別影響（應該處理）

### 6. 事件溯源架構衝突

**風險描述**：
- 員工創建的事件可能與老闆的事件產生時間戳衝突
- Event Sourcing 的重放順序可能影響最終狀態
- 員工和老闆同時修改同一商品的庫存

**影響範圍**：
- 數據一致性
- 庫存準確性
- 事件重放邏輯

**預防措施**：

1. **事件時間戳精確化**
```typescript
// 使用高精度時間戳 + UUID 確保唯一性
interface Event {
  id: string; // UUID
  timestamp: number; // 毫秒級時間戳
  sequence: number; // 序列號（同一毫秒內的順序）
  actor_id: string;
  created_by_role: 'owner' | 'staff';
}

// 生成事件時
const event = {
  id: generateUUID(),
  timestamp: Date.now(),
  sequence: await getNextSequence(Date.now()),
  actor_id: userId,
  created_by_role: role,
};
```

2. **樂觀鎖機制**
```typescript
// 商品庫存更新時檢查版本
interface Product {
  id: string;
  stock: number;
  version: number; // 版本號
}

async function updateStock(productId: string, quantity: number) {
  const product = await db.products.get(productId);
  
  // 檢查版本
  const updated = await db.products
    .where('id').equals(productId)
    .and(p => p.version === product.version)
    .modify({ 
      stock: product.stock - quantity,
      version: product.version + 1 
    });
  
  if (updated === 0) {
    throw new Error('庫存已被其他用戶修改，請重試');
  }
}
```

3. **事件重放順序保證**
```typescript
// 按時間戳 + 序列號排序
const events = await db.events
  .orderBy('timestamp')
  .toArray();

// 同一時間戳的事件按序列號排序
const sortedEvents = events.sort((a, b) => {
  if (a.timestamp === b.timestamp) {
    return a.sequence - b.sequence;
  }
  return a.timestamp - b.timestamp;
});
```

---

### 7. 離線模式下的權限失效

**風險描述**：
- 員工離線時，老闆移除了員工權限
- 員工上線後仍可能操作數據
- 權限檢查依賴網路連接

**影響範圍**：
- 權限控制失效
- 未授權操作

**預防措施**：

1. **權限過期機制**
```typescript
// 本地緩存的權限帶有過期時間
interface CachedRole {
  role: 'owner' | 'staff';
  expiresAt: number; // 過期時間
  lastSyncAt: number;
}

async function getUserRole(userId: string) {
  const cached = await db.userRoles.get(userId);
  
  // 檢查是否過期（1 小時）
  if (cached && cached.expiresAt > Date.now()) {
    return cached.role;
  }
  
  // 過期或不存在，從雲端獲取
  const role = await fetchRoleFromCloud(userId);
  
  await db.userRoles.put({
    user_id: userId,
    role,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 小時後過期
    lastSyncAt: Date.now(),
  });
  
  return role;
}
```

2. **上線時強制權限驗證**
```typescript
// 監聽網路狀態
window.addEventListener('online', async () => {
  console.log('🌐 網路已連線，驗證權限...');
  
  const currentRole = await getUserRole(user.id);
  const cloudRole = await fetchRoleFromCloud(user.id);
  
  if (currentRole !== cloudRole) {
    console.warn('⚠️ 權限已變更');
    
    if (cloudRole === null) {
      // 權限已被移除
      toast.error('您的員工權限已被移除');
      await signOut();
    } else {
      // 更新本地權限
      await updateLocalRole(user.id, cloudRole);
      window.location.reload();
    }
  }
});
```

3. **事件上傳時二次驗證**
```typescript
// 上傳事件時驗證權限
async function pushEvents(userId: string) {
  // 獲取待上傳事件
  const events = await db.events
    .where('sync_status').equals('pending')
    .toArray();
  
  for (const event of events) {
    // 上傳前驗證權限
    const hasPermission = await verifyPermissionOnCloud(userId, event.type);
    
    if (!hasPermission) {
      console.warn(`⚠️ 無權限執行操作: ${event.type}`);
      
      // 標記為 local_only
      await db.events.update(event.id, {
        sync_status: 'local_only',
        metadata: {
          ...event.metadata,
          permission_denied: true,
        }
      });
      
      continue;
    }
    
    // 上傳事件
    await uploadEvent(event);
  }
}
```

---

## 🟢 低風險項目

### 8. 開發環境配置

**風險描述**：
- 環境變數配置錯誤
- 開發/正式環境混淆

**預防措施**：

1. **環境檢查**
```typescript
// lib/env.ts
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`缺少環境變數: ${key}`);
    }
  }
}
```

2. **環境指示器**
```typescript
// 在開發環境顯示明顯標記
{process.env.NODE_ENV === 'development' && (
  <DevBanner>
    🧪 開發環境 - 角色切換已啟用
  </DevBanner>
)}
```

---

## 📋 風險矩陣

| 風險項目 | 等級 | 發生概率 | 影響程度 | 優先級 |
|---------|------|---------|---------|--------|
| 數據庫遷移失敗 | 🔴 | 中 | 高 | P0 |
| 權限繞過 | 🔴 | 低 | 高 | P0 |
| 數據同步衝突 | 🔴 | 中 | 中 | P1 |
| 性能下降 | 🟡 | 中 | 低 | P2 |
| 用戶體驗問題 | 🟡 | 高 | 低 | P2 |
| 環境配置錯誤 | 🟢 | 低 | 低 | P3 |

---

## ✅ 實作前檢查清單

### 數據安全
- [ ] 已設計備份策略
- [ ] 已實現回滾機制
- [ ] 已測試遷移流程
- [ ] 已設置 RLS 政策

### 權限控制
- [ ] 已實現多層權限檢查
- [ ] 已過濾敏感數據
- [ ] 已添加審計日誌
- [ ] 已測試權限繞過場景

### 性能優化
- [ ] 已實現權限緩存
- [ ] 已優化查詢邏輯
- [ ] 已測試大數據量場景
- [ ] 已監控性能指標

### 用戶體驗
- [ ] 已設計清晰的角色指示
- [ ] 已提供友好的錯誤提示
- [ ] 已撰寫用戶文檔
- [ ] 已測試完整用戶流程

---

## 🚀 部署檢查清單

### 部署前
- [ ] 所有測試通過
- [ ] 代碼審查完成
- [ ] 文檔已更新
- [ ] 備份已創建

### 部署中
- [ ] 數據庫遷移成功
- [ ] 環境變數已配置
- [ ] RLS 政策已啟用
- [ ] 監控已設置

### 部署後
- [ ] 驗證核心功能
- [ ] 檢查錯誤日誌
- [ ] 監控性能指標
- [ ] 收集用戶反饋

---

## 📞 應急聯絡

**如遇緊急問題，請立即聯絡**：
- 技術負責人：[聯絡方式]
- 數據庫管理員：[聯絡方式]
- 產品經理：[聯絡方式]

---

## 📚 參考資料

- [Supabase RLS 文檔](https://supabase.com/docs/guides/auth/row-level-security)
- [Dexie 遷移指南](https://dexie.org/docs/Tutorial/Design#database-versioning)
- [RBAC 最佳實踐](https://auth0.com/docs/manage-users/access-control/rbac)
