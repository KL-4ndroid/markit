# 階段 0: 環境準備 - 執行指南

> **預計時間：** 1-2 小時  
> **難度：** ⭐ 簡單

---

## 📋 任務清單

### ✅ 任務 1: 安裝依賴套件（5 分鐘）

打開終端機，執行以下命令：

```bash
# 進入專案目錄
cd e:\market2

# 安裝 UUID 套件
npm install uuid
npm install --save-dev @types/uuid

# 安裝 Supabase 客戶端
npm install @supabase/supabase-js

# 可選：安裝 Supabase CLI（用於本地開發）
npm install -g supabase
```

**驗證安裝：**
```bash
npm list uuid @supabase/supabase-js
```

---

### ✅ 任務 2: 創建 Supabase 專案（10 分鐘）

#### 步驟 1: 註冊/登入 Supabase
1. 前往：https://supabase.com/dashboard
2. 使用 GitHub 或 Email 登入

#### 步驟 2: 創建新專案
1. 點擊「New Project」
2. 填寫以下資訊：
   ```
   Organization: 選擇或創建組織
   Project Name: market-pulse-collab
   Database Password: [請設置一個強密碼並記住！]
   Region: Southeast Asia (Singapore) - ap-southeast-1
   Pricing Plan: Free（足夠開發使用）
   ```
3. 點擊「Create new project」
4. 等待 2-3 分鐘（專案建立中...）

#### 步驟 3: 獲取 API 金鑰
專案建立完成後：
1. 點擊左側選單「Settings」（齒輪圖示）
2. 點擊「API」
3. 你會看到以下資訊：

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
API Keys:
  - anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  - service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ 重要：請複製這些資訊，稍後會用到！**

---

### ✅ 任務 3: 設置環境變數（5 分鐘）

#### 步驟 1: 創建 `.env.local` 檔案

在專案根目錄（`e:\market2`）創建一個新檔案：`.env.local`

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://你的專案ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_public_key

# 僅用於開發/測試（不要提交到 Git）
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
```

**替換說明：**
- `你的專案ID` → 從 Project URL 複製
- `你的_anon_public_key` → 從 API Keys 複製 anon public
- `你的_service_role_key` → 從 API Keys 複製 service_role

#### 步驟 2: 更新 `.gitignore`

確保 `.gitignore` 包含以下內容（避免洩漏金鑰）：

```gitignore
# 環境變數
.env.local
.env*.local

# Supabase
.supabase
```

---

### ✅ 任務 4: 備份現有資料（10 分鐘）

**⚠️ 非常重要！在進行 UUID 遷移前，請務必備份資料！**

#### 方法 A: 使用瀏覽器 Console（推薦）

1. 打開你的應用程式（http://localhost:3000）
2. 按 `F12` 打開開發者工具
3. 切換到「Console」標籤
4. 複製並執行以下代碼：

```javascript
// 備份 IndexedDB 資料
(async function backupData() {
  const { MarketPulseDB } = await import('./lib/db/index.ts');
  const db = new MarketPulseDB();
  
  const backup = {
    version: 2,
    timestamp: new Date().toISOString(),
    data: {
      markets: await db.markets.toArray(),
      products: await db.products.toArray(),
      events: await db.events.toArray(),
      dailyStats: await db.dailyStats.toArray(),
      settings: await db.settings.toArray(),
    }
  };
  
  console.log('✅ 備份完成！');
  console.log('請複製以下 JSON 並保存到文件：');
  console.log(JSON.stringify(backup, null, 2));
  
  // 自動下載備份檔案
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `market-pulse-backup-${Date.now()}.json`;
  a.click();
  
  return backup;
})();
```

5. 檔案會自動下載為 `market-pulse-backup-[時間戳].json`
6. 請妥善保存這個檔案！

#### 方法 B: 使用瀏覽器內建工具

1. 打開 Chrome DevTools（F12）
2. 切換到「Application」標籤
3. 左側選單：Storage → IndexedDB → MarketPulseDB
4. 右鍵點擊每個表 → Export
5. 保存為 JSON 檔案

---

### ✅ 任務 5: 驗證環境（5 分鐘）

創建一個測試檔案來驗證 Supabase 連線：

**創建 `lib/supabase/test-connection.ts`：**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function testSupabaseConnection() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 測試連線
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    
    if (error && error.code !== 'PGRST204') {
      // PGRST204 = 表不存在（正常，因為我們還沒創建表）
      console.log('✅ Supabase 連線成功！');
      return true;
    }
    
    console.log('✅ Supabase 連線成功！');
    return true;
  } catch (error) {
    console.error('❌ Supabase 連線失敗：', error);
    return false;
  }
}
```

**在 Console 中測試：**

```javascript
import { testSupabaseConnection } from './lib/supabase/test-connection';
await testSupabaseConnection();
```

---

## ✅ 完成檢查清單

請確認以下所有項目都已完成：

- [ ] ✅ UUID 套件已安裝（`npm list uuid`）
- [ ] ✅ Supabase 客戶端已安裝（`npm list @supabase/supabase-js`）
- [ ] ✅ Supabase 專案已創建
- [ ] ✅ API 金鑰已複製並保存
- [ ] ✅ `.env.local` 檔案已創建並填寫正確資訊
- [ ] ✅ `.gitignore` 已更新
- [ ] ✅ IndexedDB 資料已備份（JSON 檔案已保存）
- [ ] ✅ Supabase 連線測試成功

---

## 🎉 完成！

恭喜你完成了階段 0！現在你已經準備好開始 UUID 遷移了。

### 下一步

告訴我：**"開始階段 1"**，我會為你生成所有必要的代碼。

---

## ❓ 常見問題

### Q1: 找不到 `.env.local` 檔案？
A: 這是一個隱藏檔案。在 VS Code 中：
1. 右鍵點擊專案根目錄
2. 選擇「New File」
3. 輸入檔名：`.env.local`

### Q2: Supabase 連線失敗？
A: 檢查以下項目：
1. `.env.local` 中的 URL 和 Key 是否正確
2. 是否有多餘的空格或換行
3. 重啟開發伺服器（`npm run dev`）

### Q3: 如何恢復備份資料？
A: 如果遷移失敗，可以使用以下代碼恢復：

```javascript
// 在 Console 中執行
const backup = /* 貼上你的備份 JSON */;
const db = new MarketPulseDB();

// 清空現有資料
await db.markets.clear();
await db.products.clear();
await db.events.clear();

// 恢復備份
await db.markets.bulkAdd(backup.data.markets);
await db.products.bulkAdd(backup.data.products);
await db.events.bulkAdd(backup.data.events);

console.log('✅ 資料已恢復！');
```

### Q4: 我可以跳過備份嗎？
A: **強烈不建議！** UUID 遷移會修改所有資料的 ID，如果出現問題，沒有備份就無法恢復。

---

## 📞 需要協助？

如果遇到任何問題，請告訴我：
- 具體的錯誤訊息
- 你執行到哪一步
- 截圖（如果有的話）

我會立即協助你解決！🚀
