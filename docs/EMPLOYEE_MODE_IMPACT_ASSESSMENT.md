# 員工模式實作 - 重大影響評估與避免策略

## 🎯 目的

本文檔評估員工模式實作過程中可能對現有系統產生的重大影響，並提供具體的避免策略。

---

## 📊 影響評估總覽

| 影響類別 | 風險等級 | 影響範圍 | 可逆性 | 優先級 |
|---------|---------|---------|--------|--------|
| 數據庫結構變更 | 🔴 高 | 全局 | 困難 | P0 |
| 現有功能破壞 | 🔴 高 | 全局 | 中等 | P0 |
| 性能下降 | 🟡 中 | 全局 | 容易 | P1 |
| 用戶數據安全 | 🔴 高 | 全局 | 困難 | P0 |
| 同步邏輯變更 | 🟡 中 | 雲端同步 | 中等 | P1 |
| UI/UX 變化 | 🟢 低 | 部分頁面 | 容易 | P2 |

---

## 🔴 P0 級別影響（必須處理）

### 1. 數據庫結構變更

#### 影響分析

**Supabase 變更**：
```sql
-- 影響：market_members 表結構變更
ALTER TABLE market_members 
ADD COLUMN role TEXT,
ADD COLUMN added_by UUID,
ALTER COLUMN market_id DROP NOT NULL;
```

**潛在問題**：
1. ❌ 現有的 `market_members` 記錄沒有 `role` 欄位
2. ❌ 現有查詢可能依賴 `market_id NOT NULL` 約束
3. ❌ RLS 政策變更可能影響現有用戶訪問
4. ❌ 索引變更可能影響查詢性能

**影響用戶**：
- 所有已註冊用戶
- 所有現有市集數據

#### 避免策略

**策略 1：向後兼容的遷移**

```sql
-- Step 1: 添加欄位（允許 NULL）
ALTER TABLE market_members 
ADD COLUMN role TEXT,
ADD COLUMN added_by UUID;

-- Step 2: 為現有記錄設置預設值
UPDATE market_members 
SET role = 'owner' 
WHERE role IS NULL;

UPDATE market_members 
SET added_by = user_id 
WHERE added_by IS NULL;

-- Step 3: 添加約束（確保數據完整性）
ALTER TABLE market_members 
ALTER COLUMN role SET NOT NULL,
ALTER COLUMN role SET DEFAULT 'owner',
ADD CHECK (role IN ('owner', 'staff'));

-- Step 4: 修改 market_id 約束（最後執行）
ALTER TABLE market_members 
ALTER COLUMN market_id DROP NOT NULL;
```

**策略 2：分階段部署**

```
階段 1（第 1 天）：
- 只添加新欄位，不修改現有邏輯
- 監控錯誤日誌
- 確認無異常

階段 2（第 3 天）：
- 遷移現有數據
- 驗證數據完整性
- 確認無異常

階段 3（第 5 天）：
- 啟用新功能
- 逐步開放給用戶
```

**策略 3：自動備份**

```typescript
// 在遷移前自動備份
export async function backupDatabase() {
  const timestamp = Date.now();
  
  // 1. 備份 Supabase 數據
  const { data: marketMembers } = await supabase
    .from('market_members')
    .select('*');
  
  // 2. 備份本地數據
  const localData = {
    markets: await db.markets.toArray(),
    products: await db.products.toArray(),
    events: await db.events.toArray(),
  };
  
  // 3. 存儲備份
  const backup = {
    timestamp,
    supabase: { marketMembers },
    local: localData,
  };
  
  // 4. 保存到多個位置
  localStorage.setItem(`backup_${timestamp}`, JSON.stringify(backup));
  
  // 5. 可選：上傳到雲端存儲
  await uploadBackupToCloud(backup);
  
  console.log(`✅ 備份完成: backup_${timestamp}`);
  return timestamp;
}
```

**策略 4：回滾計畫**

```sql
-- 如果遷移失敗，執行回滾
BEGIN;

-- 1. 移除新欄位
ALTER TABLE market_members 
DROP COLUMN role,
DROP COLUMN added_by;

-- 2. 恢復 market_id 約束
ALTER TABLE market_members 
ALTER COLUMN market_id SET NOT NULL;

-- 3. 移除新索引
DROP INDEX IF EXISTS idx_market_members_user_role;
DROP INDEX IF EXISTS idx_market_members_added_by;

-- 4. 移除 RLS 政策
DROP POLICY IF EXISTS "Users can view their own roles" ON market_members;
DROP POLICY IF EXISTS "Owners can manage staff" ON market_members;

COMMIT;
```

---

### 2. 現有功能破壞

#### 影響分析

**可能受影響的功能**：

1. **市集查詢邏輯**
```typescript
// 現有代碼可能假設 market_id 不為 NULL
const { data } = await supabase
  .from('market_members')
  .select('market_id')
  .eq('user_id', userId);

// 問題：現在 market_id 可能為 NULL（表示所有市集）
```

2. **事件記錄邏輯**
```typescript
// 現有代碼使用 user.id 作為 actor_id
await recordEvent({
  type: 'deal_closed',
  actor_id: user.id, // 問題：員工操作時，這是員工 ID 還是老闆 ID？
  payload: { ... }
});
```

3. **數據過濾邏輯**
```typescript
// 現有代碼可能沒有考慮角色過濾
const markets = await db.markets.toArray();
// 問題：員工應該只看到特定市集，但現在看到所有
```

#### 避免策略

**策略 1：漸進式重構**

```typescript
// Step 1: 創建新的查詢函數（不修改現有函數）
export async function getMarketsForUser(userId: string) {
  const role = await getUserRole(userId);
  
  if (role === 'staff') {
    // 員工邏輯
    const ownerId = await getOwnerIdByStaff(userId);
    return db.markets.where('owner_id').equals(ownerId).toArray();
  } else {
    // 老闆邏輯（現有邏輯）
    return db.markets.where('owner_id').equals(userId).toArray();
  }
}

// Step 2: 逐步替換現有調用
// 不要一次性修改所有地方，而是逐個頁面替換
```

**策略 2：功能開關**

```typescript
// 使用環境變數控制新功能
const ENABLE_STAFF_MODE = process.env.NEXT_PUBLIC_ENABLE_STAFF_MODE === 'true';

export function useMarkets() {
  const { user, role } = useAuth();
  
  if (ENABLE_STAFF_MODE && role === 'staff') {
    // 新邏輯
    return useStaffMarkets(user.id);
  } else {
    // 現有邏輯（保持不變）
    return useOwnerMarkets(user.id);
  }
}
```

**策略 3：單元測試覆蓋**

```typescript
// 為所有受影響的函數添加測試
describe('getMarketsForUser', () => {
  it('should return owner markets for owner role', async () => {
    const markets = await getMarketsForUser('owner-id');
    expect(markets).toHaveLength(3);
  });
  
  it('should return staff accessible markets for staff role', async () => {
    const markets = await getMarketsForUser('staff-id');
    expect(markets).toHaveLength(2);
  });
  
  it('should handle null market_id (all markets access)', async () => {
    // 測試 market_id = NULL 的情況
  });
});
```

**策略 4：兼容層**

```typescript
// 創建兼容層，確保現有代碼繼續工作
export function legacyGetMarkets(userId: string) {
  // 保持現有邏輯不變
  return db.markets.where('owner_id').equals(userId).toArray();
}

export function getMarkets(userId: string) {
  // 新邏輯，考慮角色
  return getMarketsForUser(userId);
}

// 現有代碼可以繼續使用 legacyGetMarkets
// 新代碼使用 getMarkets
```

---

### 3. 用戶數據安全

#### 影響分析

**潛在安全風險**：

1. **權限繞過**
```typescript
// 風險：員工通過修改 URL 訪問受限頁面
// http://localhost:3000/markets/past-market-id
// 如果沒有後端驗證，員工可能看到過去的市集
```

2. **敏感數據洩露**
```typescript
// 風險：前端過濾不完整，敏感數據仍在 DOM 中
<div style={{ display: role === 'staff' ? 'none' : 'block' }}>
  利潤：{market.totalProfit} {/* ❌ 數據仍在 DOM，可通過開發者工具查看 */}
</div>
```

3. **API 端點未保護**
```typescript
// 風險：Supabase RLS 政策不完整
// 員工可能通過直接調用 API 獲取敏感數據
const { data } = await supabase
  .from('markets')
  .select('*')
  .eq('id', marketId); // ❌ 沒有角色檢查
```

#### 避免策略

**策略 1：多層防護**

```typescript
// Layer 1: 路由層保護
export default function MarketDetailPage({ params }) {
  const { role } = useRole();
  const market = useMarket(params.id);
  
  // 檢查訪問權限
  if (role === 'staff' && !canStaffAccessMarket(params.id)) {
    return <AccessDenied />;
  }
  
  return <MarketDetail market={market} />;
}

// Layer 2: 數據層過濾
export function useMarket(marketId: string) {
  const { role } = useRole();
  const market = await db.markets.get(marketId);
  
  if (role === 'staff') {
    // 完全移除敏感數據，而不是隱藏
    const { totalProfit, commissionRate, ...safeData } = market;
    return safeData;
  }
  
  return market;
}

// Layer 3: API 層保護（Supabase RLS）
CREATE POLICY "Staff cannot view profit data"
ON markets FOR SELECT
USING (
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM market_members 
      WHERE user_id = auth.uid() AND role = 'staff'
    )
    THEN (
      -- 員工只能查看特定欄位
      -- 注意：RLS 無法過濾欄位，需要在應用層處理
      owner_id IN (
        SELECT added_by FROM market_members 
        WHERE user_id = auth.uid() AND role = 'staff'
      )
    )
    ELSE true
  END
);
```

**策略 2：數據脫敏**

```typescript
// 在序列化時移除敏感數據
export function sanitizeMarketForStaff(market: Market): Partial<Market> {
  return {
    id: market.id,
    name: market.name,
    location: market.location,
    startDate: market.startDate,
    endDate: market.endDate,
    totalRevenue: market.totalRevenue, // ✅ 員工可見
    boothCost: market.boothCost, // ✅ 員工可見
    // 敏感數據完全不返回
    // totalProfit: undefined,
    // commissionRate: undefined,
  };
}
```

**策略 3：審計日誌**

```typescript
// 記錄所有敏感操作
export async function logSensitiveAccess(
  userId: string,
  action: string,
  resource: string,
  allowed: boolean
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource,
    allowed,
    timestamp: new Date().toISOString(),
    ip_address: await getClientIP(),
    user_agent: navigator.userAgent,
  });
  
  // 如果是未授權訪問，發送警報
  if (!allowed) {
    await sendSecurityAlert({
      userId,
      action,
      resource,
    });
  }
}
```

**策略 4：定期安全審計**

```typescript
// 創建安全檢查腳本
export async function runSecurityAudit() {
  const issues = [];
  
  // 1. 檢查是否有員工訪問了受限資源
  const { data: unauthorizedAccess } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('allowed', false)
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  if (unauthorizedAccess.length > 0) {
    issues.push({
      severity: 'high',
      message: `發現 ${unauthorizedAccess.length} 次未授權訪問嘗試`,
      details: unauthorizedAccess,
    });
  }
  
  // 2. 檢查是否有 RLS 政策缺失
  const { data: tables } = await supabase.rpc('get_tables_without_rls');
  
  if (tables.length > 0) {
    issues.push({
      severity: 'critical',
      message: `發現 ${tables.length} 個表缺少 RLS 政策`,
      details: tables,
    });
  }
  
  return issues;
}
```

---

## 🟡 P1 級別影響（應該處理）

### 4. 性能下降

#### 影響分析

**潛在性能問題**：

1. **權限檢查開銷**
```typescript
// 每次渲染都查詢角色
function MarketCard({ market }) {
  const role = await getUserRole(user.id); // ❌ 每次都查詢數據庫
  
  if (role === 'staff') {
    // ...
  }
}
```

2. **Realtime 訂閱增加**
```typescript
// 每個組件都訂閱權限變更
useEffect(() => {
  const subscription = supabase
    .channel('role_changes')
    .on('postgres_changes', { ... }, handleChange)
    .subscribe();
  
  return () => subscription.unsubscribe();
}, []);
// 問題：如果有 10 個組件，就有 10 個訂閱
```

3. **數據過濾開銷**
```typescript
// 在客戶端過濾大量數據
const allMarkets = await db.markets.toArray(); // 1000 個市集
const filteredMarkets = allMarkets.filter(m => {
  return canStaffAccessMarket(m.id); // ❌ 每個市集都檢查一次
});
```

#### 避免策略

**策略 1：權限緩存**

```typescript
// 使用 React Context 緩存角色
export function RoleProvider({ children }) {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  
  useEffect(() => {
    if (!user) return;
    
    // 只查詢一次
    getUserRole(user.id).then(setRole);
    
    // 訂閱變更（只訂閱一次）
    const subscription = supabase
      .channel('role_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'market_members',
        filter: `user_id=eq.${user.id}`
      }, () => {
        getUserRole(user.id).then(setRole);
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [user]);
  
  return (
    <RoleContext.Provider value={{ role }}>
      {children}
    </RoleContext.Provider>
  );
}

// 所有組件共享同一個角色狀態
function MarketCard({ market }) {
  const { role } = useRole(); // ✅ 從 Context 讀取，無需查詢
}
```

**策略 2：數據庫層過濾**

```typescript
// 在數據庫層過濾，而不是客戶端
export async function getStaffMarkets(staffUserId: string) {
  // 1. 獲取老闆 ID
  const { data: relation } = await supabase
    .from('market_members')
    .select('added_by')
    .eq('user_id', staffUserId)
    .eq('role', 'staff')
    .single();
  
  if (!relation) return [];
  
  // 2. 直接查詢老闆的市集（數據庫層過濾）
  const { data: markets } = await supabase
    .from('markets')
    .select('*')
    .eq('owner_id', relation.added_by);
  
  return markets;
}
```

**策略 3：索引優化**

```sql
-- 為常用查詢創建索引
CREATE INDEX idx_market_members_user_role 
ON market_members(user_id, role);

CREATE INDEX idx_markets_owner_id 
ON markets(owner_id);

-- 複合索引
CREATE INDEX idx_market_members_staff_lookup 
ON market_members(user_id, role, added_by) 
WHERE role = 'staff';
```

**策略 4：性能監控**

```typescript
// 監控關鍵操作的性能
export async function getUserRoleWithMetrics(userId: string) {
  const startTime = performance.now();
  
  const role = await getUserRole(userId);
  
  const duration = performance.now() - startTime;
  
  // 記錄性能指標
  if (duration > 100) {
    console.warn(`⚠️ getUserRole 耗時過長: ${duration}ms`);
    
    // 發送到監控服務
    sendMetric('getUserRole.duration', duration);
  }
  
  return role;
}
```

---

### 5. 同步邏輯變更

#### 影響分析

**潛在同步問題**：

1. **事件歸屬混淆**
```typescript
// 員工創建的事件，actor_id 是誰？
await recordEvent({
  type: 'deal_closed',
  actor_id: staffUserId, // 員工 ID
  market_id: marketId,
  payload: { ... }
});

// 問題：老闆同步時，如何知道這是員工創建的？
```

2. **權限數據同步**
```typescript
// 老闆添加員工後，員工如何知道？
// 需要同步 market_members 表
```

3. **離線衝突**
```typescript
// 老闆和員工同時離線操作，上線後如何合併？
```

#### 避免策略

**策略 1：清晰的事件歸屬**

```typescript
// 在事件中明確記錄操作者和所有者
interface Event {
  id: string;
  type: EventType;
  actor_id: string; // 實際操作者（可能是員工）
  owner_id: string; // 數據所有者（老闆）
  created_by_role: 'owner' | 'staff'; // 操作者角色
  payload: any;
}

// 記錄事件時
await recordEvent({
  type: 'deal_closed',
  actor_id: staffUserId,
  owner_id: ownerId, // 從 market 獲取
  created_by_role: 'staff',
  payload: { ... }
});
```

**策略 2：權限數據同步**

```typescript
// 在 useSync 中添加權限同步
export function useSync() {
  // ... 現有同步邏輯
  
  // 同步權限數據
  useEffect(() => {
    if (!user) return;
    
    syncUserRoles(user.id);
  }, [user]);
}

async function syncUserRoles(userId: string) {
  // 1. 從 Supabase 拉取權限
  const { data: roles } = await supabase
    .from('market_members')
    .select('*')
    .eq('user_id', userId);
  
  // 2. 更新本地數據庫
  await db.userRoles.clear();
  await db.userRoles.bulkAdd(roles);
  
  console.log('✅ 權限同步完成');
}
```

**策略 3：衝突解決策略**

```typescript
// 使用時間戳 + 優先級解決衝突
async function resolveEventConflict(
  localEvent: Event,
  remoteEvent: Event
) {
  // 1. 時間戳優先（最後寫入者勝出）
  if (localEvent.timestamp > remoteEvent.timestamp) {
    return localEvent;
  }
  
  // 2. 角色優先（老闆優先於員工）
  if (localEvent.created_by_role === 'owner' && 
      remoteEvent.created_by_role === 'staff') {
    return localEvent;
  }
  
  // 3. 默認使用遠端版本
  return remoteEvent;
}
```

---

## 🟢 P2 級別影響（可以接受）

### 6. UI/UX 變化

#### 影響分析

**用戶可見的變化**：

1. 導航欄變化（根據角色顯示不同項目）
2. 部分數據隱藏（員工看不到利潤）
3. 新增角色切換按鈕（開發模式）

**影響**：
- 用戶需要適應新的 UI
- 可能需要用戶教育

#### 避免策略

**策略 1：漸進式推出**

```typescript
// 使用功能開關，逐步開放
const ENABLE_STAFF_MODE = process.env.NEXT_PUBLIC_ENABLE_STAFF_MODE === 'true';

// 第一週：只對內部測試用戶開放
// 第二週：開放給 10% 用戶
// 第三週：開放給 50% 用戶
// 第四週：全面開放
```

**策略 2：用戶引導**

```typescript
// 首次使用時顯示引導
export function StaffModeOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  if (!showOnboarding) return null;
  
  return (
    <Modal>
      <h2>歡迎使用員工模式！</h2>
      <p>您現在可以：</p>
      <ul>
        <li>✅ 新增交易記錄</li>
        <li>✅ 查看今日收入</li>
        <li>✅ 記錄互動</li>
      </ul>
      <Button onClick={() => setShowOnboarding(false)}>
        開始使用
      </Button>
    </Modal>
  );
}
```

**策略 3：用戶反饋收集**

```typescript
// 收集用戶反饋
export function FeedbackButton() {
  return (
    <Button onClick={() => {
      // 打開反饋表單
      openFeedbackForm({
        feature: 'staff_mode',
        version: '1.0.0',
      });
    }}>
      💬 反饋
    </Button>
  );
}
```

---

## 📋 實作前最終檢查清單

### 數據安全 ✅
- [ ] 已設計多層權限檢查
- [ ] 已實現數據脫敏
- [ ] 已設置審計日誌
- [ ] 已配置 RLS 政策
- [ ] 已準備安全審計腳本

### 數據完整性 ✅
- [ ] 已設計備份策略
- [ ] 已實現回滾機制
- [ ] 已準備遷移腳本
- [ ] 已測試遷移流程
- [ ] 已驗證數據一致性

### 性能優化 ✅
- [ ] 已實現權限緩存
- [ ] 已優化查詢邏輯
- [ ] 已創建必要索引
- [ ] 已設置性能監控
- [ ] 已測試大數據量場景

### 功能完整性 ✅
- [ ] 已實現所有核心功能
- [ ] 已添加錯誤處理
- [ ] 已實現兼容層
- [ ] 已編寫單元測試
- [ ] 已進行集成測試

### 用戶體驗 ✅
- [ ] 已設計清晰的 UI
- [ ] 已提供用戶引導
- [ ] 已準備用戶文檔
- [ ] 已設置反饋渠道
- [ ] 已規劃漸進式推出

### 應急準備 ✅
- [ ] 已準備回滾計畫
- [ ] 已設置監控告警
- [ ] 已準備應急聯絡方式
- [ ] 已進行災難演練
- [ ] 已準備用戶通知模板

---

## 🚀 實作建議

### 建議的實作順序

1. **第一週**：數據層 + 備份/回滾機制
   - 先確保數據安全
   - 測試遷移和回滾

2. **第二週**：權限系統 + 安全措施
   - 實現多層防護
   - 測試權限繞過場景

3. **第三週**：UI 實現 + 功能測試
   - 實現員工頁面
   - 端到端測試

4. **第四週**：性能優化 + 部署準備
   - 優化性能
   - 準備上線

### 關鍵決策點

**決策點 1**：是否立即遷移所有用戶？
- ✅ 建議：分批遷移，先測試用戶，再全量
- ❌ 不建議：一次性遷移所有用戶

**決策點 2**：是否保留舊的查詢邏輯？
- ✅ 建議：保留兼容層，逐步遷移
- ❌ 不建議：立即刪除舊代碼

**決策點 3**：是否使用功能開關？
- ✅ 建議：使用功能開關，方便回滾
- ❌ 不建議：直接上線新功能

---

## 📞 應急聯絡

**如遇重大問題，立即執行**：

1. **停止部署**
2. **執行回滾**
3. **通知用戶**
4. **分析問題**
5. **修復後重新部署**

**聯絡方式**：
- 技術負責人：[電話/Email]
- 數據庫管理員：[電話/Email]
- 產品經理：[電話/Email]

---

## ✅ 結論

通過以上策略，我們可以最大程度地降低實作風險：

1. ✅ **數據安全**：多層防護 + 審計日誌
2. ✅ **數據完整性**：備份 + 回滾機制
3. ✅ **性能優化**：緩存 + 索引 + 監控
4. ✅ **功能完整性**：兼容層 + 測試覆蓋
5. ✅ **用戶體驗**：漸進式推出 + 用戶引導

**準備好開始實作了嗎？** 🚀
